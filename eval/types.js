// Checks that scam-type labels are right on the TUNE set (never the holdout).
const D = require("../extension/detector.js");
const assert = require("assert");

const cases = [
  ["This is Officer Sharma from the CBI. A case has been registered against you. You are under digital arrest. Do not tell anyone and stay on the video call.", "digital_arrest"],
  ["Transfer Rs 50,000 to the RBI safe account right now to protect your savings. Do not inform bank staff.", "safe_account"],
  ["Your courier parcel is held at customs. Pay a clearance fee of Rs 3,200 today. bit.ly/4abCd", "parcel"],
  ["Please install AnyDesk and tell me the code so I can process your refund.", "remote_access"],
  ["Approve the collect request and enter your UPI PIN to receive Rs 1,500 cashback.", "upi_collect"],
  ["Guaranteed returns: double your money in 10 days. Send USDT to this crypto wallet.", "invest_job"],
  ["Sir, our bank details have changed. Please transfer the pending invoice amount of Rs 1,20,000 to the new account immediately.", "bank_change"],
  ["Payment done sir. Screenshot sent. It will reflect in 2 hours, please dispatch the goods now.", "fake_paid"],
  ["Scan this QR code to receive your payment of Rs 8,000.", "qr_receive"],
  ["I sent Rs 15,000 to your number by mistake. Please send it back urgently.", "sent_by_mistake"],
];

let ok = 0;
for (const [text, expected] of cases) {
  const r = D.analyze(text);
  assert.strictEqual(r.scamType && r.scamType.id, expected, `expected ${expected}, got ${r.scamType && r.scamType.id}: ${text.slice(0, 50)}`);
  assert.ok(r.scamType.next.length >= 2 && r.scamType.doNow);
  ok++;
}
// Safe text must have no type.
assert.strictEqual(D.analyze("Lunch at 1? I'll grab a table.").scamType, null);

// Lookalike links: fake names are flagged, real domains are not.
const ids = (t) => D.scan(t).map((h) => h.id);
for (const bad of ["http://sbi-kyc-update.xyz", "https://hdfcbank-secure-login.com", "https://paytm.verify-now.in", "http://www.irctc-refund.net"]) {
  assert.ok(ids("Open " + bad).includes("lookalike_link"), "should flag " + bad);
}
for (const good of ["https://www.onlinesbi.sbi/", "https://retail.onlinesbi.sbi/login", "https://www.hdfcbank.com", "https://www.amazon.in/orders", "https://example.com/casbin", "https://www.rbi.org.in"]) {
  assert.ok(!ids("Open " + good).includes("lookalike_link"), "should NOT flag " + good);
}
assert.ok(!ids("Beware of fake sites like http://sbi-kyc-update.xyz").includes("lookalike_link"));
console.log(`types    ${ok}/${cases.length} labelled correctly, safe text has no label`);
