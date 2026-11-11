// Evaluates the detector. Exit code 1 if the holdout set has ANY false alarm.
// Usage: node eval/run.js [--verbose]
const D = require("../extension/detector.js");
const data = require("./dataset.json");
const verbose = process.argv.includes("--verbose");

function run(name, set) {
  let caught = 0;
  let falseAlarms = 0;
  const missed = [];
  const wrong = [];
  for (const t of set.scam) {
    const r = D.analyze(t);
    if (r.level === "scam") caught++;
    else missed.push({ t, r });
  }
  for (const t of set.normal) {
    const r = D.analyze(t);
    if (r.level === "scam") { falseAlarms++; wrong.push({ t, r }); }
  }
  console.log(`${name.padEnd(8)} caught ${caught}/${set.scam.length}   false alarms ${falseAlarms}/${set.normal.length}`);
  if (verbose || name === "tune") {
    for (const m of missed) console.log(`   MISSED  (${m.r.score}) ${m.t.slice(0, 80)}`);
    for (const w of wrong) console.log(`   FALSE   (${w.r.score}) ${w.t.slice(0, 80)} [${w.r.reasons.map((x) => x.id).join(",")}]`);
  }
  return { caught, falseAlarms };
}

run("tune", data.tune);
const h = run("holdout", data.holdout);

// speed
const all = [...data.holdout.scam, ...data.holdout.normal];
const N = 2000;
const t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) for (const t of all) D.analyze(t);
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / (N * all.length);
console.log(`speed    ${ms.toFixed(4)} ms per check`);

if (h.falseAlarms > 0) {
  console.error("FAIL: holdout has false alarms. Clippit must stay quiet.");
  process.exit(1);
}
