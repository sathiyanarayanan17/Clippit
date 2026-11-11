// Keeps site/ in sync with the single source of truth.
//   node scripts/sync-site.js          copy files into site/
//   node scripts/sync-site.js --check  fail if site/ copies are out of date
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pairs = [
  ["extension/detector.js", "site/detector.js"],
  ["eval/dataset.json", "site/dataset.json"],
];
const check = process.argv.includes("--check");
let bad = 0;

for (const [from, to] of pairs) {
  const src = fs.readFileSync(path.join(root, from));
  const dst = path.join(root, to);
  const same = fs.existsSync(dst) && fs.readFileSync(dst).equals(src);
  if (check) {
    if (!same) { console.error(`OUT OF SYNC: ${to} (run: npm run sync)`); bad++; }
  } else if (!same) {
    fs.writeFileSync(dst, src);
    console.log(`copied ${from} -> ${to}`);
  }
}
if (check) {
  if (bad) process.exit(1);
  console.log("sync     site/ copies match the source");
}
