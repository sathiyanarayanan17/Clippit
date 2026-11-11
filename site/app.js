(() => {
  const D = window.ClippitDetector;
  const $ = (id) => document.getElementById(id);
  const HELPLINE = "1930";
  const PORTAL = "https://cybercrime.gov.in";
  const CHAKSHU = "https://sancharsaathi.gov.in/sfc/";

  // ---------- small DOM helper (no innerHTML, so pasted text can never run as code) ----------
  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "text") n.textContent = v;
      else if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children) n.appendChild(c);
    return n;
  }

  // Build text with the scary phrases highlighted (Scam X-ray)
  function xrayNodes(text, phrases) {
    const low = text.toLowerCase();
    const ranges = [];
    for (const p of phrases) {
      const ph = p.toLowerCase();
      if (ph.length < 3) continue;
      let i = low.indexOf(ph);
      while (i !== -1) { ranges.push([i, i + ph.length]); i = low.indexOf(ph, i + ph.length); }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([...r]);
    }
    const nodes = [];
    let pos = 0;
    for (const [s, e] of merged) {
      if (s > pos) nodes.push(document.createTextNode(text.slice(pos, s)));
      nodes.push(el("mark", { text: text.slice(s, e) }));
      pos = e;
    }
    if (pos < text.length) nodes.push(document.createTextNode(text.slice(pos)));
    return nodes;
  }

  function evidenceText(text, res) {
    return [
      "Suspected online fraud",
      "Type: " + (res.scamType ? res.scamType.name : "Suspected scam"),
      "Time: " + new Date().toString(),
      "Message:",
      text.trim(),
    ].join("\n");
  }

  function reportBox(text, res) {
    const status = el("small", { text: "" });
    return el("div", { class: "report" }, [
      el("strong", { text: T("report_title") }),
      el("p", { text: T("report_text") }),
      el("div", { class: "row" }, [
        el("a", { class: "btn", href: "tel:" + HELPLINE, text: "\u260E " + HELPLINE }),
        el("button", { text: T("copy_open"), onclick: async () => {
          try { await navigator.clipboard.writeText(evidenceText(text, res)); status.textContent = T("copied"); }
          catch (_) { status.textContent = T("copy_failed"); }
          window.open(PORTAL, "_blank", "noopener");
        } }),
        el("a", { class: "btn", href: CHAKSHU, target: "_blank", rel: "noopener", text: T("chakshu") }),
      ]),
      status,
    ]);
  }

  // ---------- language ----------
  const I18N = window.ClippitI18n;
  let lang = "en";
  try { lang = localStorage.getItem("clippit-lang") || "en"; } catch (_) {}
  if (!I18N.LANGS[lang]) lang = "en";
  const T = (key, vars) => I18N.ui(lang, key, vars);
  let lastText = "";
  $("lang").value = lang;
  $("lang").addEventListener("change", () => {
    lang = $("lang").value;
    try { localStorage.setItem("clippit-lang", lang); } catch (_) {}
    if (lastText) renderResult($("result"), lastText); // show the current result in the new language
  });

  // ---------- Grandpa Mode + read aloud (voices already on the device, nothing is sent) ----------
  const bigBox = $("bigMode");
  try { bigBox.checked = localStorage.getItem("clippit-big") === "1"; } catch (_) {}
  document.body.classList.toggle("big", bigBox.checked);
  bigBox.addEventListener("change", () => {
    document.body.classList.toggle("big", bigBox.checked);
    try { localStorage.setItem("clippit-big", bigBox.checked ? "1" : "0"); } catch (_) {}
  });

  function speak(text) {
    // Inside the Android app, use the phone's own speech engine (works for Hindi, Tamil, ...)
    if (window.ClippitNative && ClippitNative.speak) {
      const r = ClippitNative.speak(text, I18N.LANGS[lang].speech);
      if (r === "nolang") alert(T("no_voice"));
      return;
    }
    if (!("speechSynthesis" in window)) { alert(T("no_speech")); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = I18N.LANGS[lang].speech;
    u.rate = 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith(lang));
    if (v) u.voice = v;
    else if (lang !== "en") alert(T("no_voice")); // be honest when the device has no voice for this language
    speechSynthesis.speak(u);
  }

  function spokenVerdict(res) {
    if (res.level === "safe") return T("verdict_safe") + " " + T("safe_note");
    return I18N.spoken(lang, res.scamType);
  }

  // ---------- results ----------
  function renderResult(container, text) {
    container.textContent = "";
    lastText = text;
    if (!text.trim()) { container.appendChild(el("p", { text: "Please paste a message first." })); return; }
    const res = D.analyze(text);
    const info = I18N.typeInfo(lang, res.scamType);
    const box = el("div", { class: "result " + res.level });
    box.appendChild(el("button", { text: "\u{1F50A} " + T("read_aloud"), onclick: () => speak(spokenVerdict(res)) }));

    if (res.level === "scam") {
      box.appendChild(el("p", { class: "verdict bad-text", text: T("banner_title") }));
    } else if (res.level === "suspicious") {
      box.appendChild(el("p", { class: "verdict", text: T("verdict_susp") }));
    } else {
      box.appendChild(el("p", { class: "verdict good-text", text: T("verdict_safe") }));
      box.appendChild(el("p", { text: T("safe_note") }));
    }

    if (res.level !== "safe") {
      if (info) box.appendChild(el("span", { class: "badge", text: info.name }));
      box.appendChild(el("h3", { text: T("why_worried") }));
      const ul = el("ul");
      for (const r of res.reasons.slice(0, 5)) {
        // phrase + short reason; the explanation stays in English for now
        ul.appendChild(el("li", {}, [
          el("q", { text: r.match.length > 70 ? r.match.slice(0, 67) + "..." : r.match }),
          document.createTextNode(" " + r.label),
          el("small", { text: r.why }),
        ]));
      }
      box.appendChild(ul);

      box.appendChild(el("h3", { text: T("marked_msg") }));
      box.appendChild(el("div", { class: "quoted" }, xrayNodes(text, res.reasons.map((r) => r.match))));

      if (res.scamType) {
        box.appendChild(el("h3", { text: T("next_label") }));
        const ol = el("ol");
        for (const s of res.scamType.next) ol.appendChild(el("li", { text: s }));
        box.appendChild(ol);
        box.appendChild(el("div", { class: "tip", text: T("do_now") + " " + info.doNow }));
      }
      box.appendChild(reportBox(text, res));
    }
    container.appendChild(box);
  }

  // ---------- checker ----------
  const EXAMPLES = [
    "Dear customer your SBI KYC is expiring today. Update immediately at http://sbi-kyc-update.xyz or your account will be blocked.",
    "This is Officer Verma from Mumbai Police cyber cell. A case has been registered against your Aadhaar. You are under digital arrest. Do not tell anyone and stay on the video call.",
  ];
  let exampleIdx = 0;
  $("checkBtn").addEventListener("click", () => renderResult($("result"), $("msg").value));
  $("clearBtn").addEventListener("click", () => { $("msg").value = ""; $("result").textContent = ""; $("msg").focus(); });
  $("sampleBtn").addEventListener("click", () => {
    $("msg").value = EXAMPLES[exampleIdx++ % EXAMPLES.length];
    renderResult($("result"), $("msg").value);
  });

  // Phone share target: Android passes the shared text in the URL
  const params = new URLSearchParams(location.search);
  const shared = [params.get("title"), params.get("text"), params.get("url")].filter(Boolean).join("\n");
  if (shared) {
    $("msg").value = shared;
    renderResult($("result"), shared);
    $("result").scrollIntoView();
  }

  // ---------- practice mode ----------
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  async function initPractice() {
    const game = $("game");
    let data;
    try { data = await (await fetch("dataset.json")).json(); }
    catch (_) { game.textContent = "Practice needs a connection the first time. Try again later."; return; }

    const scams = [...data.tune.scam, ...data.holdout.scam].map((t) => ({ t, scam: true }));
    const normals = [...data.tune.normal, ...data.holdout.normal].map((t) => ({ t, scam: false }));
    const start = () => {
      const rounds = shuffle([...shuffle(scams).slice(0, 5), ...shuffle(normals).slice(0, 5)]);
      let i = 0, score = 0;
      const show = () => {
        game.textContent = "";
        if (i >= rounds.length) {
          const verdict = score >= 9 ? "Excellent. You would spot most scams." : score >= 7 ? "Good. Review the ones you missed." : "Keep practicing. Scammers count on rushing you.";
          game.appendChild(el("div", { class: "box" }, [
            el("p", { class: "verdict", text: "Score: " + score + " / " + rounds.length }),
            el("p", { text: verdict }),
            el("button", { class: "primary", text: "Play again", onclick: start }),
          ]));
          return;
        }
        const round = rounds[i];
        const feedback = el("div", { "aria-live": "polite" });
        const answer = (saysScam) => {
          const right = saysScam === round.scam;
          if (right) score++;
          for (const b of game.querySelectorAll("button.ans")) b.disabled = true;
          const res = D.analyze(round.t);
          feedback.appendChild(el("p", { class: right ? "good-text" : "bad-text", text: right ? "Correct." : "Not quite." }));
          feedback.appendChild(el("p", { text: round.scam ? "This was a scam." : "This was a normal message." }));
          if (round.scam && res.reasons.length) {
            const ul = el("ul");
            for (const r of res.reasons.slice(0, 3)) ul.appendChild(el("li", {}, [el("q", { text: r.match }), document.createTextNode(" " + r.label)]));
            feedback.appendChild(ul);
          }
          feedback.appendChild(el("button", { class: "primary", text: i === rounds.length - 1 ? "See score" : "Next message", onclick: () => { i++; show(); } }));
        };
        game.appendChild(el("div", { class: "box" }, [
          el("small", { text: "Message " + (i + 1) + " of " + rounds.length }),
          el("div", { class: "quoted", text: round.t }),
          el("div", { class: "row" }, [
            el("button", { class: "ans bad", text: "Scam", onclick: () => answer(true) }),
            el("button", { class: "ans good", text: "Not a scam", onclick: () => answer(false) }),
          ]),
          feedback,
        ]));
      };
      show();
    };
    game.appendChild(el("button", { class: "primary", text: "Start practice", onclick: start }));
  }
  initPractice();

  // ---------- install (PWA) ----------
  if (window.ClippitNative) {
    // Already the installed Android app: the "get the phone version" box is not needed.
    document.body.classList.add("native");
  }
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    $("installBtn").hidden = false;
  });
  $("installBtn").addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    $("installBtn").hidden = true;
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !window.ClippitNative) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
