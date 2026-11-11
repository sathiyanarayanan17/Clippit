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
      el("strong", { text: "Report it" }),
      el("p", { text: "If money was lost, call " + HELPLINE + " (national cybercrime helpline) as soon as possible." }),
      el("div", { class: "row" }, [
        el("a", { class: "btn", href: "tel:" + HELPLINE, text: "Call " + HELPLINE }),
        el("button", { text: "Copy evidence and open cybercrime portal", onclick: async () => {
          try { await navigator.clipboard.writeText(evidenceText(text, res)); status.textContent = "Evidence copied. Paste it into the complaint."; }
          catch (_) { status.textContent = "Could not copy automatically. Select the message and copy it."; }
          window.open(PORTAL, "_blank", "noopener");
        } }),
        el("a", { class: "btn", href: CHAKSHU, target: "_blank", rel: "noopener", text: "Report a fraud call or SMS (Chakshu)" }),
      ]),
      status,
    ]);
  }

  // ---------- results ----------
  function renderResult(container, text) {
    container.textContent = "";
    if (!text.trim()) { container.appendChild(el("p", { text: "Please paste a message first." })); return; }
    const res = D.analyze(text);
    const box = el("div", { class: "result " + res.level });

    if (res.level === "scam") {
      box.appendChild(el("p", { class: "verdict bad-text", text: "This looks like a scam." }));
    } else if (res.level === "suspicious") {
      box.appendChild(el("p", { class: "verdict", text: "Be careful. Some things look suspicious." }));
    } else {
      box.appendChild(el("p", { class: "verdict good-text", text: "No scam signals found." }));
      box.appendChild(el("p", { text: "That does not prove it is safe. If it asks for money, a code or a link click, check with your bank using the number on your card." }));
    }

    if (res.level !== "safe") {
      if (res.scamType) box.appendChild(el("span", { class: "badge", text: res.scamType.name }));
      box.appendChild(el("h3", { text: "Why Clippit is worried" }));
      const ul = el("ul");
      for (const r of res.reasons.slice(0, 5)) {
        ul.appendChild(el("li", {}, [
          el("q", { text: r.match.length > 70 ? r.match.slice(0, 67) + "..." : r.match }),
          document.createTextNode(" " + r.label),
          el("small", { text: r.why }),
        ]));
      }
      box.appendChild(ul);

      box.appendChild(el("h3", { text: "Your message, with the warning phrases marked" }));
      box.appendChild(el("div", { class: "quoted" }, xrayNodes(text, res.reasons.map((r) => r.match))));

      if (res.scamType) {
        box.appendChild(el("h3", { text: "What usually happens next" }));
        const ol = el("ol");
        for (const s of res.scamType.next) ol.appendChild(el("li", { text: s }));
        box.appendChild(ol);
        box.appendChild(el("div", { class: "tip", text: "Do this now: " + res.scamType.doNow }));
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
    $("check").scrollIntoView();
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

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
