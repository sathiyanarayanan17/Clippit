/*
 * Clippit detector: rule-based, on-device, no network, nothing stored.
 * Works as a browser global (ClippitDetector) and as a Node module.
 *
 * scan(text)   -> array of hits (signals found in the text)
 * score(hits)  -> { score, level, reasons }   (hits deduped by id)
 * analyze(txt) -> score(scan(txt))
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ClippitDetector = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // Words that, shortly before a match in the same sentence, mean the text is
  // WARNING about the thing rather than asking for it.
  const NEGATION =
    /\b(do not|don't|dont|never|won't|will not|shall not|should not|must not|beware|avoid|not to|nobody|no one)\b/i;

  // negatable: true  -> ignored when preceded by a negation ("never share your OTP")
  // cat: used for the diversity bonus (many different kinds of signal = more suspicious)
  const SIGNALS = [
    // --- fake authority & legal threats
    { id: "digital_arrest", cat: "authority", w: 4, negatable: true,
      re: /digital arrest|arrest warrant|you (are|will be) (being )?arrested|under arrest/i,
      label: "Threat of arrest",
      why: "Real police and courts never arrest people over a call or video chat, and never ask for money to avoid it." },
    { id: "authority", cat: "authority", w: 1.5, negatable: true,
      re: /\b(cbi|narcotics|customs (dept|department|officer)|cyber ?crime|trai|enforcement directorate|income tax (dept|department|officer)|police|rbi|supreme court)\b/i,
      label: "Claims to be an official body",
      why: "Scammers pretend to be police, the RBI or customs to scare you." },
    { id: "legal_threat", cat: "authority", w: 2.5, negatable: true,
      re: /case (has been |is |was )?(registered|filed)|money laundering|legal action|\bfir\b/i,
      label: "Legal threat",
      why: "Threats of a legal case are used to make you panic and pay." },
    { id: "id_misuse", cat: "authority", w: 3, negatable: true,
      re: /aadhaar[^.\n]{0,30}(misused|linked to|illegal)|sim[^.\n]{0,25}(illegal|used in|will be blocked)|(narcotics|drugs?)[^.\n]{0,30}(parcel|package|found)/i,
      label: "Says your ID or SIM was misused",
      why: "This is a common opening line for digital-arrest scams." },

    // --- pressure
    { id: "urgency", cat: "pressure", w: 1.5, negatable: false,
      re: /\bimmediately\b|within \d+ ?(minutes|mins|hours|hrs)|\burgent(ly)?\b|last warning|final warning|right now|tonight|today only|expires? today/i,
      label: "Rushing you",
      why: "Scammers hurry you so you do not have time to think or ask anyone." },
    { id: "secrecy", cat: "pressure", w: 3, negatable: false,
      re: /(do not|don't|dont) (tell|inform|disclose|share this)|tell (no one|nobody)|keep (this )?(confidential|secret)|confidential (government )?matter/i,
      label: "Asks you to keep it secret",
      why: "Asking for secrecy is a big warning sign. Scammers want to stop family from helping you." },
    { id: "stay_on_call", cat: "pressure", w: 2.5, negatable: false,
      re: /video call|skype|stay on (the )?(line|call)|do not disconnect|don't disconnect|\bpress 1\b/i,
      label: "Keeps you on a call",
      why: "Scammers keep you on the line so nobody else can warn you." },
    { id: "account_blocked", cat: "pressure", w: 2, negatable: true,
      re: /(account|card|sim|number|upi)[^.\n]{0,30}(blocked|suspended|deactivated|frozen|will be closed)/i,
      label: "Says something will be blocked",
      why: "Fear of losing access is used to make you click or pay." },
    { id: "family_emergency", cat: "pressure", w: 2.5, negatable: false,
      re: /(new number|accident|hospital|arrested)[^.\n]{0,60}(send|transfer|pay)[^.\n]{0,30}(money|rs|₹|\d)|(send|transfer|pay)[^.\n]{0,30}(money|rs|₹)[^.\n]{0,40}(urgent|accident|hospital)/i,
      label: "Family emergency money request",
      why: "Call the person on their old, known number before sending anything." },

    // --- asking for secrets
    { id: "otp", cat: "secrets", w: 3.5, negatable: true,
      re: /\b(share|send|tell|give|provide|read out|enter|forward)\b[^.\n]{0,25}\b(otp|pin|cvv|password|one[- ]time)\b|\b(otp|cvv)\b[^.\n]{0,20}\b(and|&)\b[^.\n]{0,10}\b(otp|cvv|pin)\b/i,
      label: "Asks for an OTP, PIN or CVV",
      why: "No bank or company will ever ask for your OTP, PIN or CVV." },
    { id: "remote_access", cat: "secrets", w: 6, negatable: true,
      re: /anydesk|teamviewer|quick ?support|rustdesk|remote (access|support) app|screen ?share/i,
      label: "Asks you to install a remote-access app",
      why: "These apps let a stranger see and control your phone or computer." },
    { id: "upi_collect", cat: "secrets", w: 4, negatable: true,
      re: /(approve|accept)[^.\n]{0,20}(collect|request)|enter (your )?upi pin to (receive|get)/i,
      label: "UPI trick: you must PAY to receive money",
      why: "You never need a PIN to receive money. Entering it sends money out." },
    { id: "kyc", cat: "secrets", w: 2.5, negatable: true,
      re: /kyc[^.\n]{0,40}(expir|updat|suspend|block|pending|verify)|(update|complete|verify)[^.\n]{0,15}kyc/i,
      label: "Fake KYC update",
      why: "Banks do not ask you to complete KYC through a link in a message." },

    // --- money
    { id: "safe_account", cat: "money", w: 4, negatable: true,
      re: /safe account|secure account|rbi account|verification account|government account/i,
      label: "Asks you to move money to a 'safe account'",
      why: "There is no such thing. Money sent to a 'safe account' goes to the scammer." },
    { id: "payment_ask", cat: "money", w: 1.5, negatable: true,
      re: /\b(pay|transfer|send|deposit|remit)\b[^\n]{0,30}?(₹|\brs\.?|\binr)\s*[\d,]{3,}/i,
      label: "Asks you to pay a specific amount",
      why: "Be careful when an unexpected message asks for a fixed amount." },
    { id: "fee", cat: "money", w: 2, negatable: true,
      re: /(processing|clearance|registration|release|customs|handling) (fee|charge)s?/i,
      label: "Asks for an upfront fee",
      why: "Real prizes, parcels and jobs do not need you to pay first." },
    { id: "gift_crypto", cat: "money", w: 3, negatable: true,
      re: /gift ?cards?|google play (card|code)|itunes card|bitcoin|\busdt\b|crypto wallet|\bcrypto\b/i,
      label: "Asks for gift cards or crypto",
      why: "Only scammers ask to be paid in gift cards or crypto." },
    { id: "parcel", cat: "money", w: 2.5, negatable: true,
      re: /(parcel|package|courier|shipment)[^.\n]{0,40}(held|seized|customs|undelivered|fee|charge|pending)/i,
      label: "Fake parcel problem",
      why: "Fake courier messages are a common way to get a 'small fee' from you." },
    { id: "prize", cat: "money", w: 2.5, negatable: true,
      re: /lucky draw|you (have )?won\b|you('ve| have) been selected|prize (money|amount)|\blottery\b/i,
      label: "Prize you never entered for",
      why: "You cannot win a contest you did not enter." },
    { id: "refund", cat: "money", w: 2, negatable: true,
      re: /refund[^.\n]{0,30}(click|link|claim|code)/i,
      label: "Refund bait",
      why: "Refund messages with links or codes are usually traps." },
    { id: "invest", cat: "money", w: 3, negatable: true,
      re: /guaranteed (returns?|profit)|double your money|\d+ ?% (daily|weekly) (returns?|profit)/i,
      label: "Guaranteed investment returns",
      why: "No genuine investment can guarantee profit." },
    { id: "task_job", cat: "money", w: 2.5, negatable: true,
      re: /work from home[^.\n]{0,50}(earn|per day|daily)|(task|youtube|like)[^.\n]{0,30}(earn|commission)/i,
      label: "Too-good-to-be-true job",
      why: "Easy-money 'task' jobs are a known scam." },
    { id: "electricity", cat: "money", w: 3, negatable: true,
      re: /electricity[^.\n]{0,40}(disconnect|cut|off)[^.\n]{0,40}(tonight|today|\d)/i,
      label: "Fake electricity cut-off",
      why: "Utilities do not threaten same-night cut-offs by message." },

    // --- links
    { id: "short_link", cat: "link", w: 2, negatable: true,
      re: /\b(bit\.ly|tinyurl\.com|cutt\.ly|rb\.gy|t\.co|is\.gd|shorturl\.at)\//i,
      label: "Shortened link",
      why: "Short links hide where they really go." },
    { id: "odd_domain", cat: "link", w: 2.5, negatable: true,
      re: /https?:\/\/[^\s/]*\.(xyz|top|click|icu|vip|buzz|cfd|sbs)\b/i,
      label: "Link on a suspicious website ending",
      why: "Real banks do not use these website endings." },
    { id: "ip_link", cat: "link", w: 3, negatable: true,
      re: /https?:\/\/\d{1,3}(\.\d{1,3}){3}/i,
      label: "Link to a raw number address",
      why: "Genuine websites do not use a number address." },
    { id: "click_verify", cat: "link", w: 1.5, negatable: true,
      re: /(click|tap|open)[^.\n]{0,15}(here|link|below)|verify now|login now/i,
      label: "Pushes you to click",
      why: "Do not open links from unexpected messages." },
  ];

  // Things that make a message look genuine. They lower the score.
  const MITIGATORS = [
    { id: "m_receipt", w: -2.5,
      re: /\b(debited|credited)\b[^\n]{0,25}(₹|\brs\.?|\binr)|(₹|\brs\.?|\binr)\s*[\d,.]+[^\n]{0,25}\b(debited|credited)\b/i },
    { id: "m_txnref", w: -1,
      re: /\b(txn|transaction|ref(erence)?|order)\b[^\n]{0,6}\b(id|no|number|#)/i },
    { id: "m_advisory", w: -2,
      re: /\b(never|do not|don't) (share|disclose|ask)\b[^.\n]{0,40}(otp|pin|cvv|password)|will never ask/i },
    { id: "m_notyou", w: -1.5,
      re: /if (this was )?not you|if you did not|number (printed )?on (the back of )?your card/i },
  ];

  const THRESHOLD_SCAM = 6;
  const THRESHOLD_SUSPICIOUS = 3.5;

  function isNegated(text, index) {
    // Look back at most 50 chars, but only inside the same sentence/line.
    const start = Math.max(0, index - 50);
    let before = text.slice(start, index);
    const cut = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("!"), before.lastIndexOf("?"));
    if (cut >= 0) before = before.slice(cut + 1);
    return NEGATION.test(before);
  }

  function scan(text) {
    const hits = [];
    if (!text) return hits;
    for (const s of SIGNALS) {
      const m = s.re.exec(text);
      if (!m) continue;
      if (s.negatable && isNegated(text, m.index)) continue;
      hits.push({ id: s.id, cat: s.cat, w: s.w, label: s.label, why: s.why, match: m[0] });
    }
    for (const m of MITIGATORS) {
      const r = m.re.exec(text);
      if (r) hits.push({ id: m.id, cat: "mitigator", w: m.w, label: "", why: "", match: r[0] });
    }
    return hits;
  }

  // ---- scam types: a plain name plus "what usually happens next"
  const TYPES = [
    { id: "digital_arrest", name: "Digital-arrest script",
      signals: ["digital_arrest", "authority", "legal_threat", "id_misuse", "stay_on_call", "secrecy"],
      next: ["They keep you on a video call and say you cannot hang up.",
             "They say your money must be 'checked' by moving it to a safe account.",
             "They tell you to tell nobody, then ask for a transfer."],
      doNow: "Hang up. No police or court arrests anyone over a call. Tell a family member." },
    { id: "safe_account", name: "'Safe account' scam",
      signals: ["safe_account", "payment_ask", "authority"],
      next: ["They create fear about your savings.",
             "They give you an 'RBI' or 'secure' account number.",
             "Your money is moved and cannot easily be brought back."],
      doNow: "Stop. No bank or RBI account is ever needed to 'protect' your money." },
    { id: "kyc", name: "Fake KYC / account-blocked link",
      signals: ["kyc", "account_blocked", "short_link", "odd_domain", "ip_link", "click_verify"],
      next: ["The link opens a copy of your bank's website.",
             "It asks for your card number, OTP or login.",
             "The scammer uses them to empty your account."],
      doNow: "Do not click. Open your bank's app yourself, or call the number on your card." },
    { id: "otp", name: "OTP / PIN theft",
      signals: ["otp"],
      next: ["They say they need the code 'to verify' or 'to cancel' something.",
             "The code actually approves a payment or login for them."],
      doNow: "Never share an OTP, PIN or CVV with anyone, ever." },
    { id: "remote_access", name: "Remote-access scam",
      signals: ["remote_access", "refund"],
      next: ["They ask you to install an app 'to help'.",
             "They watch your screen and see your banking.",
             "They move money or make you approve payments."],
      doNow: "Do not install it. Uninstall it if you already did and call your bank." },
    { id: "upi_collect", name: "UPI 'collect request' trick",
      signals: ["upi_collect"],
      next: ["They say money is coming to you.",
             "They send a request that looks like a receipt.",
             "Entering your PIN sends money OUT."],
      doNow: "Decline. You never need a PIN to receive money." },
    { id: "parcel", name: "Fake parcel / customs fee",
      signals: ["parcel", "fee"],
      next: ["A small 'fee' is asked for.",
             "After you pay, a bigger 'problem' appears.",
             "They keep asking for more."],
      doNow: "Check the courier's official app or website yourself. Do not use the link." },
    { id: "prize", name: "Prize / lottery scam",
      signals: ["prize", "fee"],
      next: ["They ask for a 'processing fee' to release the prize.",
             "More fees follow. The prize never arrives."],
      doNow: "Ignore it. You cannot win a contest you did not enter." },
    { id: "invest_job", name: "Investment / task-job scam",
      signals: ["invest", "task_job", "gift_crypto"],
      next: ["Small early 'profits' are shown to build trust.",
             "You are asked to deposit more.",
             "Withdrawals are blocked until you pay 'taxes' or 'fees'."],
      doNow: "Do not deposit. Guaranteed returns do not exist." },
    { id: "family", name: "Fake family emergency",
      signals: ["family_emergency"],
      next: ["A 'relative' contacts you from a new number.",
             "There is an accident or arrest and money is needed fast.",
             "They ask you to keep it from other family."],
      doNow: "Call the person on their old number first. Ask a question only they would know." },
    { id: "electricity", name: "Fake electricity cut-off",
      signals: ["electricity"],
      next: ["They threaten a same-night cut-off.",
             "They ask you to call 'an officer' or pay by link."],
      doNow: "Check your bill in the official utility app. Do not call the number in the message." },
  ];

  function classify(hits) {
    let best = null;
    let bestW = 0;
    for (const t of TYPES) {
      let w = 0;
      for (const h of hits) if (h.w > 0 && t.signals.includes(h.id)) w += h.w;
      if (w > bestW) { bestW = w; best = t; }
    }
    return best ? { id: best.id, name: best.name, next: best.next, doNow: best.doNow } : null;
  }

  function score(hits) {
    const byId = new Map();
    for (const h of hits) if (!byId.has(h.id)) byId.set(h.id, h);
    let total = 0;
    const cats = new Set();
    const reasons = [];
    for (const h of byId.values()) {
      total += h.w;
      if (h.w > 0) {
        cats.add(h.cat);
        reasons.push({ id: h.id, label: h.label, why: h.why, match: h.match, w: h.w });
      }
    }
    // Several different KINDS of signal together is much more suspicious.
    if (cats.size >= 3) total *= 1.25;
    total = Math.max(0, Math.round(total * 100) / 100);
    reasons.sort((a, b) => b.w - a.w);
    const level = total >= THRESHOLD_SCAM ? "scam" : total >= THRESHOLD_SUSPICIOUS ? "suspicious" : "safe";
    const scamType = level === "safe" ? null : classify([...byId.values()]);
    return { score: total, level, reasons, scamType };
  }

  function analyze(text) {
    return score(scan(text));
  }

  return { scan, score, analyze, SIGNALS, THRESHOLD_SCAM, THRESHOLD_SUSPICIOUS };
});
