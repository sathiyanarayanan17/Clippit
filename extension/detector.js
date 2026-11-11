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
    /(?:\b(?:do not|don't|dont|never|won't|will not|shall not|should not|must not|beware|avoid|not to|nobody|no one|nahi|nahin|nhi|mat|kabhi nahi)\b)|नहीं|मत/i;
  // Hindi puts the "not" AFTER the thing ("OTP kisi ko mat batao"), so also look just after a match.
  const NEGATION_AFTER = /\b(mat|nahi|nahin|nhi)\b|\bna\s+(bata|batay|share|de)|नहीं|मत|कभी न|(?:^|\s)न\s/i;

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

    // --- business scams (shops, suppliers, small firms)
    { id: "bank_change", cat: "money", w: 5, negatable: true,
      re: /(changed|new|updated|different)[^.\n]{0,15}(bank|account)[^.\n]{0,15}(details|number|account)|(bank|account) details[^.\n]{0,15}(changed|updated)|(pay|transfer|remit)[^.\n]{0,40}(new|updated|changed) (bank )?account/i,
      label: "Says the bank account has changed",
      why: "Fake 'we changed our account' messages redirect real invoices to a scammer. Always confirm by calling the supplier on a number you already have." },
    { id: "fake_paid", cat: "money", w: 6, negatable: false,
      re: /(payment|money|amount)[^.\n]{0,30}(sent|done|paid|transferred)[^.\n]{0,60}(send|dispatch|release|deliver)[^.\n]{0,20}(goods|items|stock|order|material|parcel)|(already|just) (paid|transferred)[^.\n]{0,40}(screenshot|will (reflect|credit))|will (reflect|be credited) (in|within) \d+/i,
      label: "Says it is paid but wants goods sent first",
      why: "Fake payment screenshots and 'it will reflect later' are used to get goods. Check your own bank balance, never a screenshot." },
    { id: "qr_receive", cat: "secrets", w: 6, negatable: true,
      re: /scan[^.\n]{0,20}(qr|code)[^.\n]{0,40}(receive|get|credit|refund|cashback)/i,
      label: "Scan a QR code to 'receive' money",
      why: "Scanning a QR code only ever sends money out. You never need to scan to receive." },
    { id: "tax_notice", cat: "authority", w: 3.5, negatable: true,
      re: /gst[^.\n]{0,40}(notice|penalty|cancel|suspend|default)|income tax[^.\n]{0,30}(notice|refund)|(penalty|fine) of rs/i,
      label: "Fake tax or GST notice",
      why: "Real notices come through the official portal. Never pay through a link in a message." },
    { id: "loan_fee", cat: "money", w: 4, negatable: true,
      re: /(loan|subsidy|grant|mudra|scheme)[^.\n]{0,50}(approved|sanctioned|eligible)[^.\n]{0,80}(fee|charge|deposit|insurance|processing)|pre-?approved loan|(loan|subsidy)[^.\n]{0,40}pre-?approved/i,
      label: "Loan or subsidy that needs a fee first",
      why: "Genuine lenders take fees from the loan amount. They never ask you to pay first." },
    { id: "sent_by_mistake", cat: "money", w: 6, negatable: true,
      re: /(sent|transferred)[^.\n]{0,45}(by mistake|wrongly|wrong number)[^\n]{0,50}(return|refund|send (it )?back)/i,
      label: "'I sent money by mistake, send it back'",
      why: "The first payment is often fake or reversed later. Check your own balance before returning anything." },

    // --- Hinglish (Hindi in English letters) and Hindi (Devanagari)
    { id: "hi_arrest", cat: "authority", w: 4, negatable: true, hi: true,
      re: /girf?taar|giraftar|girftar|गिरफ़?्?तार/i,
      label: "Threat of arrest (Hindi)",
      why: "Real police never arrest anyone over a call or video chat, and never ask for money to avoid it." },
    { id: "hi_police", cat: "authority", w: 1.5, negatable: true, hi: true,
      re: /पुलिस|सीबीआई|साइबर सेल|आरबीआई|crime branch|cyber cell/i,
      label: "Claims to be police or an official body (Hindi)",
      why: "Scammers pretend to be police, the CBI or the RBI to scare you." },
    { id: "hi_otp", cat: "secrets", w: 3.5, negatable: true, hi: true,
      re: /(otp|pin|cvv|password)[^.\n]{0,25}\b(bata|batao|batayiye|bataiye|bhej|bhejo|bhejiye|de do|dijiye|share)|\b(bata|batao|bhej|bhejo|de do)\b[^.\n]{0,20}(otp|pin|cvv)|(ओटीपी|ओ\.?टी\.?पी|सीवीवी)[^.\n]{0,25}(बता|भेज|दीजिए|दे दो)/i,
      label: "Asks for your OTP, PIN or CVV (Hindi)",
      why: "No bank or company will ever ask for your OTP, PIN or CVV." },
    { id: "hi_kyc", cat: "secrets", w: 2.5, negatable: true, hi: true,
      re: /kyc[^.\n]{0,40}(update|expire|pending|karwa|karo|karein|kijiye)|केवाईसी/i,
      label: "Fake KYC update (Hindi)",
      why: "Banks do not ask you to complete KYC through a message or link." },
    { id: "hi_block", cat: "pressure", w: 2, negatable: true, hi: true,
      re: /(account|card|sim|number|khata|खाता|कार्ड|सिम)[^.\n]{0,30}(\bband\b|\bbandh\b|block|suspend|बंद|ब्लॉक)/i,
      label: "Says something will be blocked (Hindi)",
      why: "Fear of losing access is used to make you click or pay." },
    { id: "hi_urgent", cat: "pressure", w: 1.5, negatable: false,
      re: /\bturant\b|\bforan\b|ghante (ke )?andar|तुरंत|फौरन|फ़ौरन|घंटे (के )?अंदर/i,
      label: "Rushing you (Hindi)",
      why: "Scammers hurry you so you do not have time to think or ask anyone." },
    { id: "hi_secret", cat: "pressure", w: 3, negatable: false,
      re: /kisi (ko|se) (bhi )?(mat |na )?(bata|batao|bolna|kehna)|gopniya|किसी (को|से) (भी )?(मत |न )?(बता|बोल|कह)|गोपनीय/i,
      label: "Asks you to keep it secret (Hindi)",
      why: "Asking for secrecy is a big warning sign. Scammers want to stop family from helping you." },
    { id: "hi_stay_on_call", cat: "pressure", w: 2.5, negatable: false,
      re: /call (mat )?(kaat|cut|disconnect)|phone mat (kaat|rakh)|line par bane rahiye|call par bane rahiye|कॉल (मत )?(काट|कट)|लाइन पर बने रहिए/i,
      label: "Keeps you on the call (Hindi)",
      why: "Scammers keep you on the line so nobody else can warn you." },
    { id: "hi_pay_ask", cat: "money", w: 2, negatable: true, hi: true,
      re: /(paise|paisa|rupaye|rupay|raashi|रुपये|पैसे)[^.\n]{0,25}(bhej|transfer|jama|भेज|जमा|ट्रांसफर)|(bhej|transfer|jama|भेज|जमा)[^.\n]{0,25}(₹|\brs\.?|rupaye|रुपये)\s*[\d,]+/i,
      label: "Asks you to send money (Hindi)",
      why: "Be careful when an unexpected message asks you to send money." },
    { id: "hi_safe_account", cat: "money", w: 4, negatable: true, hi: true,
      re: /(surakshit|safe|secure)\s*(khata|account)|सुरक्षित खाता/i,
      label: "Asks you to move money to a 'safe account' (Hindi)",
      why: "There is no such thing. Money sent to a 'safe account' goes to the scammer." },
    { id: "hi_prize", cat: "money", w: 2.5, negatable: true, hi: true,
      re: /inaam (jeeta|mila|jeet)|aapne (\w+ )?(jeeta|jita)|इनाम (जीता|मिला)|लॉटरी/i,
      label: "Prize you never entered for (Hindi)",
      why: "You cannot win a contest you did not enter." },

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
      re: /(click|tap|open)[^.\n]{0,15}(here|link|below)|verify now|login now|log ?in at|sign in at/i,
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
    { id: "m_hi_advisory", w: -2.5,
      re: /(otp|pin|cvv|password)[^.\n]{0,40}\b(mat|na|nahi|nahin|kabhi)\b|(ओटीपी|पिन|सीवीवी)[^.\n]{0,40}(मत|नहीं|कभी|\sन\s)/i },
  ];

  const THRESHOLD_SCAM = 6;
  const THRESHOLD_SUSPICIOUS = 3.5;

  function isNegated(text, index, end, hi) {
    // Look back at most 50 chars, but only inside the same sentence/line.
    const start = Math.max(0, index - 50);
    let before = text.slice(start, index);
    const cut = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("!"), before.lastIndexOf("?"));
    if (cut >= 0) before = before.slice(cut + 1);
    if (NEGATION.test(before)) return true;
    if (hi && end != null) {
      // Hindi word order: the "not" often comes right after ("OTP kisi ko mat batao")
      let after = text.slice(end, end + 35);
      const stop = after.search(/[.!?\n]/);
      if (stop >= 0) after = after.slice(0, stop);
      if (NEGATION_AFTER.test(after)) return true;
    }
    return false;
  }

  // ---- lookalike links: a famous name inside a web address that does not belong to it
  // brand token -> the real domains for that brand
  const BRANDS = {
    sbi: ["sbi.co.in", "onlinesbi.sbi", "onlinesbi.com", "sbicard.com", "sbi.bank.in"],
    hdfc: ["hdfcbank.com", "hdfc.com", "hdfclife.com", "hdfcergo.com"],
    icici: ["icicibank.com", "icicidirect.com", "iciciprulife.com", "icicilombard.com"],
    axisbank: ["axisbank.com"],
    paytm: ["paytm.com", "paytmbank.com"],
    phonepe: ["phonepe.com"],
    rbi: ["rbi.org.in"],
    npci: ["npci.org.in"],
    irctc: ["irctc.co.in"],
    uidai: ["uidai.gov.in"],
    incometax: ["incometax.gov.in", "incometaxindia.gov.in"],
    amazon: ["amazon.in", "amazon.com"],
    flipkart: ["flipkart.com"],
  };

  function belongsTo(host, domains) {
    return domains.some((d) => host === d || host.endsWith("." + d));
  }

  function lookalikeLink(text) {
    const re = /\b(?:https?:\/\/|www\.)([a-z0-9][a-z0-9.-]{2,80})/gi;
    let m;
    while ((m = re.exec(text))) {
      const host = m[1].toLowerCase().replace(/\.+$/, "");
      const parts = host.split(/[.-]/);
      for (const [token, real] of Object.entries(BRANDS)) {
        const named = parts.some((p) => (token.length <= 4 ? p === token || p.startsWith(token) : p.includes(token)));
        if (named && !belongsTo(host, real)) {
          if (isNegated(text, m.index)) continue;
          return {
            id: "lookalike_link", cat: "link", w: 5,
            label: "Link imitates a well-known name",
            why: "The address '" + host + "' uses the name '" + token + "' but is not their real website. Type the real address yourself.",
            match: m[0],
          };
        }
      }
    }
    return null;
  }

  function scan(text) {
    const hits = [];
    if (!text) return hits;
    const lk = lookalikeLink(text);
    if (lk) hits.push(lk);
    for (const s of SIGNALS) {
      const m = s.re.exec(text);
      if (!m) continue;
      if (s.negatable && isNegated(text, m.index, m.index + m[0].length, s.hi)) continue;
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
      signals: ["digital_arrest", "authority", "legal_threat", "id_misuse", "stay_on_call", "secrecy", "hi_arrest", "hi_police", "hi_secret", "hi_stay_on_call"],
      next: ["They keep you on a video call and say you cannot hang up.",
             "They say your money must be 'checked' by moving it to a safe account.",
             "They tell you to tell nobody, then ask for a transfer."],
      doNow: "Hang up. No police or court arrests anyone over a call. Tell a family member." },
    { id: "safe_account", name: "'Safe account' scam",
      signals: ["safe_account", "payment_ask", "authority", "hi_safe_account", "hi_pay_ask"],
      next: ["They create fear about your savings.",
             "They give you an 'RBI' or 'secure' account number.",
             "Your money is moved and cannot easily be brought back."],
      doNow: "Stop. No bank or RBI account is ever needed to 'protect' your money." },
    { id: "kyc", name: "Fake KYC / account-blocked link",
      signals: ["kyc", "account_blocked", "short_link", "odd_domain", "ip_link", "click_verify", "lookalike_link", "hi_kyc", "hi_block"],
      next: ["The link opens a copy of your bank's website.",
             "It asks for your card number, OTP or login.",
             "The scammer uses them to empty your account."],
      doNow: "Do not click. Open your bank's app yourself, or call the number on your card." },
    { id: "otp", name: "OTP / PIN theft",
      signals: ["otp", "hi_otp"],
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
      signals: ["prize", "fee", "hi_prize"],
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
    { id: "bank_change", name: "Fake bank-detail change (supplier scam)",
      signals: ["bank_change"],
      next: ["A message or email says a supplier's bank account has changed.",
             "Your next real invoice is paid into the scammer's account.",
             "The real supplier never receives the money."],
      doNow: "Call the supplier on a number you already have. Never use the number in the message." },
    { id: "fake_paid", name: "Fake 'payment done' trick",
      signals: ["fake_paid"],
      next: ["A screenshot or message says payment was made.",
             "You are asked to send the goods before it 'reflects'.",
             "The money never arrives."],
      doNow: "Open your own bank or UPI app and check the balance. Send goods only after the money shows there." },
    { id: "qr_receive", name: "QR 'receive money' trick",
      signals: ["qr_receive"],
      next: ["You are told to scan a QR code to receive money.",
             "The QR code is a payment request.",
             "Money leaves your account."],
      doNow: "Do not scan. Receiving money never needs a scan or a PIN." },
    { id: "tax_notice", name: "Fake tax / GST notice",
      signals: ["tax_notice"],
      next: ["A notice threatens a penalty or cancellation.",
             "It gives a link or number to 'settle' it.",
             "Paying goes to the scammer, or the link steals your login."],
      doNow: "Log in to the official portal yourself to see real notices. Do not use the link." },
    { id: "loan_fee", name: "Fake loan / subsidy fee",
      signals: ["loan_fee"],
      next: ["A loan or subsidy is said to be approved.",
             "A 'processing fee' or 'insurance' must be paid first.",
             "More fees follow and no loan arrives."],
      doNow: "Do not pay anything up front. Check with the bank or scheme office directly." },
    { id: "sent_by_mistake", name: "'Sent by mistake' refund trick",
      signals: ["sent_by_mistake"],
      next: ["Someone says they sent you money by mistake.",
             "They ask you to send it back at once.",
             "The first payment is fake or reversed, and your refund is real."],
      doNow: "Check your own balance first. Return money only through your bank." },
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

  return { scan, score, analyze, SIGNALS, TYPES, THRESHOLD_SCAM, THRESHOLD_SUSPICIOUS };
});
