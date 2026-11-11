// Checks that every language is complete: no missing messages, no missing scam types.
const assert = require("assert");
const I = require("../extension/i18n.js");
const D = require("../extension/detector.js");

// Collect type ids by analysing one example of each (ids live in detector TYPES via scamType.id)
const typeIds = new Set();
const probes = require("./dataset.json");
for (const t of [...probes.tune.scam, ...probes.holdout.scam]) {
  const r = D.analyze(t);
  if (r.scamType) typeIds.add(r.scamType.id);
}
// Types that the datasets do not reach are still listed from the English UI source of truth below.
const ALL_TYPE_IDS = ["digital_arrest", "safe_account", "kyc", "otp", "remote_access", "upi_collect", "parcel", "prize",
  "invest_job", "family", "bank_change", "fake_paid", "qr_receive", "tax_notice", "loan_fee", "sent_by_mistake", "electricity"];
for (const id of typeIds) assert.ok(ALL_TYPE_IDS.includes(id), "unknown type id in detector: " + id);
// every scam type defined in the detector must be translated
assert.deepStrictEqual(D.TYPES.map((t) => t.id).sort(), [...ALL_TYPE_IDS].sort(), "detector TYPES and the i18n list differ");

let problems = 0;
for (const lang of Object.keys(I.LANGS)) {
  const enKeys = Object.keys(I.UI.en);
  for (const k of enKeys) {
    if (!I.UI[lang] || !I.UI[lang][k]) { console.error(`  missing UI "${k}" in ${lang}`); problems++; }
  }
  if (lang === "en") continue;
  for (const id of ALL_TYPE_IDS) {
    const t = I.TYPES[lang] && I.TYPES[lang][id];
    if (!t || !t[0] || !t[1]) { console.error(`  missing type "${id}" in ${lang}`); problems++; }
  }
  // placeholders must survive translation
  assert.ok(I.UI[lang].cont_wait.includes("{n}"), lang + " cont_wait needs {n}");
  // spoken text must be non-empty and different from English
  const sp = I.spoken(lang, D.analyze(probes.tune.scam[0]).scamType);
  assert.ok(sp.length > 20 && (lang === "en" || sp !== I.spoken("en", D.analyze(probes.tune.scam[0]).scamType)));
}
assert.strictEqual(problems, 0, problems + " translation gaps");
console.log(`i18n     ${Object.keys(I.LANGS).length} languages complete (${ALL_TYPE_IDS.length} scam types each)`);
