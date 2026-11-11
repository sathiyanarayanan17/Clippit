/*
 * Clippit content script.
 * - Silent by default. Reads page text locally, scans only NEW lines.
 * - Warns when the page looks like a scam: type label, X-ray of scary phrases, playbook.
 * - Pauses Pay/Send/Transfer buttons only when the page already shows scam signals.
 * - Interruption budget: limited passive warnings, and it stops after repeated dismissals.
 * Nothing leaves the device. No page text is stored.
 */
(() => {
  const D = self.ClippitDetector;
  const I18N = self.ClippitI18n;
  if (!D || !I18N || window.top !== window) return; // top frame only

  const HOST_ID = "clippit-host";
  const PAY_RE = /\b(pay|pay now|send money|send|transfer|make payment|proceed to pay|confirm payment|submit payment|approve)\b/i;
  const COOLING_SECONDS = 15;
  const MAX_SEEN = 5000;
  // Interruption budget
  const BANNER_LIMIT = 3; // passive banners ...
  const BANNER_WINDOW_MS = 10 * 60 * 1000; // ... per 10 minutes
  const DISMISS_LIMIT = 2; // after this many dismissals on a site, stop passive banners there
  // India helplines
  const HELPLINE = "1930";
  const PORTAL = "https://cybercrime.gov.in";
  const CHAKSHU = "https://sancharsaathi.gov.in/sfc/";

  const settings = { enabled: true, light: false, simple: false, lang: "en", mutedSites: [], familyNumber: "" };
  const T = (key, vars) => I18N.ui(settings.lang, key, vars);
  const hits = new Map(); // id -> hit, accumulated across the page
  const seen = new Set(); // lines already scanned
  const allowed = new WeakSet(); // buttons the user chose to continue on
  const pending = [];
  let bannerShown = false;
  let current = { score: 0, level: "safe", reasons: [], scamType: null };
  let timer = null;

  const muted = () => settings.mutedSites.includes(location.hostname);
  const active = () => settings.enabled && !muted();

  // ---------- scanning ----------
  function queueText(text) {
    if (!text) return;
    for (const raw of text.split(/\n+/)) {
      const line = raw.trim();
      if (line.length < 8 || seen.has(line)) continue;
      if (seen.size > MAX_SEEN) seen.clear();
      seen.add(line);
      pending.push(line);
    }
    clearTimeout(timer);
    timer = setTimeout(flush, 400);
  }

  function flush() {
    if (!active() || pending.length === 0) return;
    const text = pending.splice(0).join("\n");
    for (const h of D.scan(text)) if (!hits.has(h.id)) hits.set(h.id, h);
    current = D.score([...hits.values()]);
    if (current.level === "scam") {
      xray();
      if (!bannerShown) maybeShowBanner();
    }
  }

  function start() {
    if (!active()) return;
    queueText(document.body ? document.body.innerText : "");
    new MutationObserver((muts) => {
      if (!active()) return;
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && n.id === HOST_ID) continue;
          queueText(n.nodeType === 1 ? n.innerText : n.textContent);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  // ---------- Scam X-ray: highlight the exact phrases without changing the page ----------
  function xray() {
    if (!window.CSS || !CSS.highlights || typeof Highlight === "undefined") return;
    if (!document.getElementById("clippit-xray-style")) {
      const st = document.createElement("style");
      st.id = "clippit-xray-style";
      st.textContent = "::highlight(clippit-xray){background-color:#ffe082;color:#000;text-decoration:underline wavy #b3261e;}";
      (document.head || document.documentElement).appendChild(st);
    }
    const phrases = current.reasons.map((r) => r.match.toLowerCase()).filter((p) => p.length >= 4);
    if (!phrases.length || !document.body) return;
    const ranges = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest("#" + HOST_ID) || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode() && ranges.length < 200) {
      const node = walker.currentNode;
      const low = node.data.toLowerCase();
      for (const ph of phrases) {
        let i = low.indexOf(ph);
        while (i !== -1 && ranges.length < 200) {
          const r = new Range();
          r.setStart(node, i);
          r.setEnd(node, i + ph.length);
          ranges.push(r);
          i = low.indexOf(ph, i + ph.length);
        }
      }
    }
    CSS.highlights.set("clippit-xray", new Highlight(...ranges));
  }

  // ---------- UI (Shadow DOM) ----------
  const CSS_TEXT = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, Segoe UI, Arial, sans-serif; }
    .card { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; width: 360px; max-height: 88vh; overflow: auto;
      background: #fff; color: #1b1b1f; border: 2px solid #b3261e; border-radius: 14px;
      box-shadow: 0 8px 28px rgba(0,0,0,.28); padding: 14px; font-size: 15px; line-height: 1.4;
      animation: pop .18s ease-out; }
    .modal { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.55);
      display: flex; align-items: center; justify-content: center; }
    .modal .card { position: static; width: min(460px, 92vw); }
    @keyframes pop { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
    h2 { margin: 0 0 6px; font-size: 17px; }
    .shield { font-size: 22px; margin-right: 6px; }
    .type { display: inline-block; background: #fdecea; color: #8c1d18; border-radius: 6px; padding: 2px 8px; font-weight: 600; margin-bottom: 6px; }
    ul, ol { margin: 6px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    small { color: #555; display: block; }
    q { font-style: normal; background: #ffe082; padding: 0 3px; border-radius: 3px; }
    details { margin-top: 8px; }
    summary { cursor: pointer; font-weight: 600; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    button, a.btn { font: inherit; padding: 8px 12px; border-radius: 8px; border: 1px solid #888;
      background: #f3f3f3; cursor: pointer; color: inherit; text-decoration: none; }
    button:focus-visible, a.btn:focus-visible { outline: 3px solid #1a73e8; outline-offset: 2px; }
    button.safe { background: #1b6e3c; color: #fff; border-color: #1b6e3c; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .tip { background: #fff4e5; border-radius: 8px; padding: 8px; margin-top: 8px; }
    .report { background: #eef3fd; border-radius: 8px; padding: 8px; margin-top: 8px; }
    /* Grandpa Mode: bigger text, bigger buttons, high contrast, fewer things on screen */
    .simple .card { font-size: 21px; width: min(500px, 94vw); border-width: 4px; }
    .simple h2 { font-size: 26px; }
    .simple button, .simple a.btn { font-size: 21px; padding: 14px 20px; border-width: 2px; }
    .simple .tip { background: #fff0cc; border: 2px solid #8a5a00; }
    .simple small { color: #222; }
    .linkish { background: none; border: none; text-decoration: underline; color: #333; padding: 6px 2px; font-size: 16px; }
  `;

  function mount(contentNode, modal) {
    unmount();
    const host = document.createElement("div");
    host.id = HOST_ID;
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS_TEXT;
    const wrap = document.createElement("div");
    wrap.className = (modal ? "modal " : "") + (settings.simple ? "simple" : "");
    wrap.appendChild(contentNode);
    root.append(style, wrap);
    document.documentElement.appendChild(host);
    return root;
  }
  function unmount() {
    const old = document.getElementById(HOST_ID);
    if (old) old.remove();
  }

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

  // X-ray list: the exact phrase and the tactic it shows
  function reasonList(max) {
    const ul = el("ul");
    for (const r of current.reasons.slice(0, max)) {
      ul.appendChild(el("li", {}, [
        el("q", { text: r.match.length > 60 ? r.match.slice(0, 57) + "..." : r.match }),
        document.createTextNode(" " + r.label),
        el("small", { text: r.why }),
      ]));
    }
    return ul;
  }

  function typeBadge() {
    const t = current.scamType;
    return t ? el("div", { class: "type", text: I18N.typeInfo(settings.lang, t).name }) : el("span");
  }

  // "What usually happens next" + what to do now
  function playbook() {
    const t = current.scamType;
    if (!t) return el("span");
    const ol = el("ol");
    for (const s of t.next) ol.appendChild(el("li", { text: s })); // steps stay in English for now
    const d = el("details", {}, [
      el("summary", { text: T("next_label") }),
      ol,
      el("div", { class: "tip", text: T("do_now") + " " + I18N.typeInfo(settings.lang, t).doNow }),
    ]);
    if (!settings.light) d.open = true;
    return d;
  }

  // Evidence is only the matched phrases plus page and time, never the full page text.
  function evidenceText() {
    const t = current.scamType ? current.scamType.name : "Suspected scam";
    const lines = current.reasons.slice(0, 6).map((r) => '- "' + r.match + '" (' + r.label + ")");
    return [
      "Suspected online fraud",
      "Type: " + t,
      "Page: " + location.href,
      "Time: " + new Date().toString(),
      "Suspicious phrases:",
      ...lines,
    ].join("\n");
  }

  function reportBox() {
    const status = el("small", { text: "" });
    const copyOpen = el("button", { text: T("copy_open"), onclick: async () => {
      try {
        await navigator.clipboard.writeText(evidenceText());
        status.textContent = T("copied");
      } catch (_) {
        status.textContent = T("copy_failed");
      }
      window.open(PORTAL, "_blank", "noopener");
    } });
    return el("div", { class: "report" }, [
      el("strong", { text: T("report_title") }),
      el("div", { text: T("report_text") }),
      el("div", { class: "row" }, [
        copyOpen,
        el("a", { class: "btn", href: CHAKSHU, target: "_blank", rel: "noopener", text: T("chakshu") }),
      ]),
      status,
    ]);
  }

  // ---------- read aloud (uses the voices already on the device; nothing is sent anywhere) ----------
  function speak() {
    const lang = settings.lang;
    if (!("speechSynthesis" in window)) { alert(T("no_speech")); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(I18N.spoken(lang, current.scamType));
    const code = I18N.LANGS[lang].speech;
    u.lang = code;
    u.rate = 0.9;
    const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(lang));
    if (voice) u.voice = voice;
    else if (lang !== "en") alert(T("no_voice")); // be honest when the device has no voice for this language
    speechSynthesis.speak(u);
  }

  function readAloudButton() {
    return el("button", { text: "\u{1F50A} " + T("read_aloud"), onclick: () => speak() });
  }

  function doNowTip() {
    const t = current.scamType;
    return el("div", { class: "tip", text: t ? T("do_now") + " " + I18N.typeInfo(settings.lang, t).doNow : T("generic_do_now") });
  }

  function whatsappUrl() {
    const why = current.reasons.slice(0, 3).map((r) => "- " + r.label).join("\n");
    const msg = T("family_msg") + "\nPage: " + location.hostname + "\nWhy Clippit is worried:\n" + why;
    const digits = String(settings.familyNumber || "").replace(/\D/g, "");
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(msg);
  }

  // ---------- interruption budget ----------
  function maybeShowBanner() {
    chrome.storage.local.get({ bannerTimes: [], dismissals: {} }, (s) => {
      const now = Date.now();
      const recent = s.bannerTimes.filter((t) => now - t < BANNER_WINDOW_MS);
      const dismissed = s.dismissals[location.hostname] || 0;
      if (recent.length >= BANNER_LIMIT || dismissed >= DISMISS_LIMIT) return; // stay quiet
      recent.push(now);
      chrome.storage.local.set({ bannerTimes: recent });
      showBanner();
    });
  }

  function recordDismissal() {
    chrome.storage.local.get({ dismissals: {} }, (s) => {
      s.dismissals[location.hostname] = (s.dismissals[location.hostname] || 0) + 1;
      chrome.storage.local.set({ dismissals: s.dismissals });
    });
  }

  // ---------- passive warning ----------
  function showBanner() {
    bannerShown = true;
    const s = settings.simple;
    const children = [
      el("h2", {}, [el("span", { class: "shield", text: "\u{1F6E1}\uFE0F" }), document.createTextNode(T("banner_title"))]),
      typeBadge(),
      reasonList(s ? 1 : settings.light ? 2 : 3),
      s ? doNowTip() : playbook(),
    ];
    if (!s) {
      children.push(el("div", { class: "tip", text: T("otp_tip") }));
      children.push(reportBox());
    }
    const row = [
      el("button", { text: T("dismiss"), onclick: () => { recordDismissal(); unmount(); } }),
      el("button", { text: T("ask_family"), onclick: () => window.open(whatsappUrl(), "_blank", "noopener") }),
      readAloudButton(),
    ];
    if (!s) row.push(el("button", { text: T("not_scam"), onclick: () => { muteSite(); clearXray(); unmount(); } }));
    children.push(el("div", { class: "row" }, row));
    mount(el("div", { class: "card", role: "alert" }, children), false);
  }

  function clearXray() {
    if (window.CSS && CSS.highlights) CSS.highlights.delete("clippit-xray");
  }

  // ---------- payment pause ----------
  function pausePayment(button) {
    const s = settings.simple;
    let secs = settings.light ? 0 : COOLING_SECONDS;
    const guided = el("div", { class: "tip", text: "", hidden: "" });
    const cont = el("button", { text: "", class: s ? "linkish" : "" });
    const tick = () => {
      cont.disabled = secs > 0;
      cont.textContent = secs > 0 ? T("cont_wait", { n: secs }) : T("cont");
    };
    tick();
    const iv = setInterval(() => { if (secs > 0) { secs--; tick(); } else clearInterval(iv); }, 1000);

    const close = () => { clearInterval(iv); if ("speechSynthesis" in window) speechSynthesis.cancel(); unmount(); };
    cont.addEventListener("click", () => {
      if (secs > 0) return;
      close();
      allowed.add(button);
      button.click();
    });

    const yes = el("button", { text: s ? T("yes") : T("yes_long"), onclick: () => {
      guided.hidden = false;
      guided.textContent = T("hangup");
    } });
    const no = el("button", { text: T("no"), onclick: () => { guided.hidden = true; } });

    const children = [
      el("h2", {}, [el("span", { class: "shield", text: "\u{1F6E1}\uFE0F" }), document.createTextNode(T("pause_title"))]),
      typeBadge(),
      reasonList(s ? 1 : 3),
      el("div", { text: T("pause_question") }),
      el("div", { class: "row" }, [yes, no]),
      guided,
      s ? doNowTip() : playbook(),
      el("div", { class: "row" }, [
        el("button", { class: "safe", text: T("cancel"), onclick: close }),
        el("button", { text: T("ask_family"), onclick: () => window.open(whatsappUrl(), "_blank", "noopener") }),
        readAloudButton(),
        ...(s ? [] : [cont]),
      ]),
    ];
    if (!s) {
      children.push(reportBox());
      children.push(el("div", { class: "row" }, [
        el("button", { text: T("not_scam_site"), onclick: () => { close(); muteSite(); clearXray(); allowed.add(button); button.click(); } }),
      ]));
    } else {
      // "Continue anyway" always exists, but small and last, so it is never the easy tap.
      children.push(el("div", { class: "row" }, [cont]));
    }
    const card = el("div", { class: "card", role: "alertdialog", "aria-modal": "true" }, children);
    const root = mount(card, true);
    const first = root.querySelector(".safe");
    if (first) first.focus();
  }

  document.addEventListener(
    "click",
    (e) => {
      if (!active() || current.level !== "scam") return;
      const t = e.target instanceof Element ? e.target.closest('button, a, input[type="submit"], input[type="button"], [role="button"]') : null;
      if (!t || allowed.has(t) || t.closest("#" + HOST_ID)) return;
      const label = (t.innerText || t.value || t.getAttribute("aria-label") || "").trim();
      if (!label || label.length > 40 || !PAY_RE.test(label)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      pausePayment(t); // the payment pause is user-triggered, so it is not limited by the budget
    },
    true
  );

  // ---------- settings ----------
  function muteSite() {
    if (!settings.mutedSites.includes(location.hostname)) settings.mutedSites.push(location.hostname);
    chrome.storage.sync.set({ mutedSites: settings.mutedSites });
  }

  chrome.storage.sync.get({ enabled: true, light: false, simple: false, lang: "en", mutedSites: [], familyNumber: "" }, (s) => {
    Object.assign(settings, s);
    start();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const k of Object.keys(changes)) settings[k] = changes[k].newValue;
  });
})();
