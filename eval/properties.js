// Property-based tests for the detector (fast-check).
// These check rules that must hold for ANY input, not just hand-picked examples.
const fc = require("fast-check");
const D = require("../extension/detector.js");
const data = require("./dataset.json");

const LEVELS = ["safe", "suspicious", "scam"];
const RUNS = 300;

// Harmless words. None of them trigger a signal or a discount.
const BENIGN = ["lunch", "tomorrow", "meeting", "slides", "dinner", "hello", "thanks", "weather", "football",
  "homework", "birthday", "photos", "movie", "coffee", "weekend", "library", "garden", "music", "see", "you"];
const benignText = fc.array(fc.constantFrom(...BENIGN), { minLength: 1, maxLength: 30 }).map((w) => w.join(" "));

const allScams = [...data.tune.scam, ...data.holdout.scam].filter((t) => D.analyze(t).level === "scam");
const scamText = fc.constantFrom(...allScams);

// Words that exercise the regexes hardest (for the speed / ReDoS check).
const TRIGGERS = ["pay", "send", "transfer", "rs", "₹", "1,000", "otp", "share", "never", "do not", "kyc", "account",
  "bank", "new", "changed", "details", "loan", "approved", "fee", "scan", "qr", "code", "receive", "sent", "mistake",
  "parcel", "held", "gst", "notice", "penalty", " ", ".", "\n", "!", "http://", "bit.ly/", "a", "0"];
const triggerSoup = fc.array(fc.constantFrom(...TRIGGERS), { maxLength: 800 }).map((w) => w.join(" "));

function check(name, prop, runs = RUNS) {
  fc.assert(prop, { numRuns: runs });
  console.log(`  ok  ${name}`);
}

console.log(`properties (${allScams.length} scam examples available)`);

// 1. Never crashes, always returns a sane result.
check("never throws and always returns a valid result for any text",
  fc.property(fc.string({ unit: "binary", maxLength: 2000 }), (t) => {
    const r = D.analyze(t);
    return LEVELS.includes(r.level) && Number.isFinite(r.score) && r.score >= 0 && Array.isArray(r.reasons);
  }));

// 2. Quiet by default: ordinary chat must never be flagged.
check("harmless text is always 'safe'",
  fc.property(benignText, (t) => D.analyze(t).level === "safe" && D.analyze(t).scamType === null));

// 3. Padding with harmless text must not hide a scam (and never lowers the score).
check("adding harmless text never lowers a scam's score",
  fc.property(scamText, benignText, (s, b) =>
    D.analyze(s + "\n" + b).score >= D.analyze(s).score &&
    D.analyze(b + "\n" + s).score >= D.analyze(s).score));

// 4. Warnings are not scams: a negation before a risky request cancels it.
const NEGATORS = ["Never", "Do not", "Don't", "You should never", "Please do not", "Beware, never"];
const RISKY = ["share your OTP", "install AnyDesk", "send your CVV", "buy gift cards", "use a safe account"];
check("negated warnings are never flagged as a scam",
  fc.property(fc.constantFrom(...NEGATORS), fc.constantFrom(...RISKY), benignText, (n, r, b) =>
    D.analyze(`${b}\n${n} ${r} with anyone.`).level !== "scam"));

// 4b. Same rule in Hinglish and Hindi, where the "not" comes AFTER the thing.
const HI_WARNINGS = [
  "Apna OTP kisi ko mat batana.", "OTP kisi ko nahi batana chahiye.", "Kabhi bhi apna PIN share mat karein.",
  "आपका ओटीपी किसी को न बताएं।", "अपना पिन किसी को मत बताइए।", "सीवीवी कभी किसी को नहीं बताना चाहिए।",
];
check("Hinglish and Hindi warnings are never flagged as a scam",
  fc.property(fc.constantFrom(...HI_WARNINGS), benignText, (w, b) =>
    D.analyze(`${b}\n${w}`).level !== "scam" && D.analyze(`${w}\n${b}`).level !== "scam"));

// 5. Case and spacing must not change the verdict.
check("upper/lower case does not change the verdict",
  fc.property(scamText, fc.constantFrom("upper", "lower"), (s, mode) => {
    const t = mode === "upper" ? s.toUpperCase() : s.toLowerCase();
    return D.analyze(t).level === D.analyze(s).level;
  }));

// 6. Deterministic.
check("same text always gives the same result",
  fc.property(fc.string({ maxLength: 500 }), (t) => JSON.stringify(D.analyze(t)) === JSON.stringify(D.analyze(t))));

// 7. Speed: no input should make the rules slow (guards against regex blow-ups).
check("a check on hostile input stays under 100 ms",
  fc.property(triggerSoup, (t) => {
    const t0 = process.hrtime.bigint();
    D.analyze(t);
    return Number(process.hrtime.bigint() - t0) / 1e6 < 100;
  }), 150);

// 8. Splitting a page into lines (as the extension does) never invents a scam out of harmless lines.
check("scanning harmless lines one by one never reaches 'scam'",
  fc.property(fc.array(benignText, { minLength: 1, maxLength: 20 }), (lines) => {
    const hits = [];
    for (const l of lines) hits.push(...D.scan(l));
    return D.score(hits).level === "safe";
  }));

console.log("all properties hold");
