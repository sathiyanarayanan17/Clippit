// Real-browser test: loads the Clippit extension into Chromium and checks the demo pages and web app.
// One-time setup:  npx playwright-core install chromium
// Run:             npm run e2e      (opens a browser window for about 40 seconds)
// Not part of `npm test` because it needs a downloaded browser and a display.
const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.join(__dirname, "..");
const EXT = path.join(ROOT, "extension");
const SHOTS = path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); };

// tiny static server so content scripts run on http:// (file:// needs a manual permission)
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, p.startsWith("/site/") ? p : p.startsWith("/demo/") ? p : "/site" + (p === "/" ? "/index.html" : p));
  fs.readFile(file, (e, d) => {
    if (e) { res.writeHead(404); return res.end("nf"); }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" }[ext] || "application/octet-stream" });
    res.end(d);
  });
}).listen(0);

const hostText = (page) => page.evaluate(() => {
  const h = document.getElementById("clippit-host");
  return h && h.shadowRoot ? h.shadowRoot.textContent : null;
});

(async () => {
  const port = server.address().port;
  const base = `http://localhost:${port}`;
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "clippit-e2e-"));
  const ctx = await chromium.launchPersistentContext(userData, {
    headless: false,
    viewport: { width: 1100, height: 800 },
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--no-first-run",
    ],
  });

  try {
    // ---- find the extension id
    const ext = await ctx.newPage();
    await ext.goto("chrome://extensions");
    await ext.waitForTimeout(1000);
    const id = await ext.locator("extensions-item").first().getAttribute("id").catch(() => null);
    check("extension loaded in Chrome", !!id, id || "");
    if (!id) throw new Error("extension did not load");

    // ---- 1. genuine page stays silent
    const g = await ctx.newPage();
    await g.goto(`${base}/demo/genuine-payment.html`);
    await g.waitForTimeout(1500);
    check("genuine page: no warning shown", (await hostText(g)) === null);
    await g.click("#pay");
    await g.waitForTimeout(500);
    check("genuine page: Pay button works, no pause", (await hostText(g)) === null && (await g.textContent("#result")).includes("silent"));
    await g.screenshot({ path: path.join(SHOTS, "1-genuine.png") });

    // ---- 2. scam page: banner, X-ray, payment pause
    const s = await ctx.newPage();
    await s.goto(`${base}/demo/scam-payment.html`);
    await s.waitForTimeout(1800);
    let t = await hostText(s);
    check("scam page: warning banner appears", !!t && /scam/i.test(t), t ? t.slice(0, 80).replace(/\s+/g, " ") : "");
    check("scam page: scam type named", !!t && /Digital-arrest|arrest/i.test(t));
    const hl = await s.evaluate(() => (CSS.highlights && CSS.highlights.get("clippit-xray") ? CSS.highlights.get("clippit-xray").size : 0));
    check("scam page: X-ray highlights phrases", hl > 0, `${hl} ranges`);
    await s.screenshot({ path: path.join(SHOTS, "2-scam-banner.png") });

    await s.click("#pay");
    await s.waitForTimeout(600);
    t = await hostText(s);
    check("scam page: payment paused with 'robbed' message", !!t && /robbed/i.test(t));
    check("scam page: payment NOT submitted while paused", (await s.textContent("#result")) === "");
    check("scam page: report helper shows 1930", !!t && /1930/.test(t));
    const inView = await s.evaluate(() => {
      const r = document.getElementById("clippit-host").shadowRoot;
      return [...r.querySelectorAll("button")].filter((b) => /Cancel payment|Ask family|Continue anyway/.test(b.textContent)).map((b) => { const x = b.getBoundingClientRect(); return x.bottom <= window.innerHeight && x.top >= 0; });
    });
    check("scam page: Cancel, Ask family and Continue are visible without scrolling", inView.length === 3 && inView.every(Boolean), JSON.stringify(inView));
    const dupes = await s.evaluate(() => { const r = document.getElementById("clippit-host").shadowRoot; const q = [...r.querySelectorAll("q")].map((x) => x.textContent.toLowerCase()); return q.length - new Set(q).size; });
    check("scam page: no duplicate reasons", dupes === 0);
    await s.screenshot({ path: path.join(SHOTS, "3-scam-pause.png") });

    // cancel works
    await s.evaluate(() => { const r = document.getElementById("clippit-host").shadowRoot; [...r.querySelectorAll("button")].find((b) => /Cancel payment/.test(b.textContent)).click(); });
    await s.waitForTimeout(300);
    check("cancel closes the pause", (await hostText(s)) === null && (await s.textContent("#result")) === "");

    // continue anyway must be disabled at first, and work after the wait
    await s.click("#pay");
    await s.waitForTimeout(400);
    const disabled = await s.evaluate(() => { const r = document.getElementById("clippit-host").shadowRoot; const b = [...r.querySelectorAll("button")].find((x) => /Continue anyway/.test(x.textContent)); return b && b.disabled; });
    check("continue anyway is disabled during cooling-off", disabled === true);
    await s.waitForTimeout(15500);
    await s.evaluate(() => { const r = document.getElementById("clippit-host").shadowRoot; [...r.querySelectorAll("button")].find((x) => /^Continue anyway$/.test(x.textContent.trim())).click(); });
    await s.waitForTimeout(500);
    check("continue anyway always works after the wait", (await s.textContent("#result")).includes("Payment submitted"));

    // ---- 3. business scam page
    const b = await ctx.newPage();
    await b.goto(`${base}/demo/business-scam.html`);
    await b.waitForTimeout(1800);
    t = await hostText(b);
    check("business page: warning appears", !!t && /scam/i.test(t), t ? t.slice(0, 80).replace(/\s+/g, " ") : "");
    await b.click("#pay");
    await b.waitForTimeout(500);
    check("business page: 'Transfer Now' is paused", /robbed/i.test((await hostText(b)) || "") && (await b.textContent("#result")) === "");
    await b.screenshot({ path: path.join(SHOTS, "4-business.png") });

    // ---- 4. settings: Hindi + Grandpa Mode through the real popup
    const pop = await ctx.newPage();
    await pop.goto(`chrome-extension://${id}/popup.html`);
    await pop.selectOption("#lang", "hi");
    await pop.check("#simple");
    await pop.fill("#family", "919876543210");
    await pop.dispatchEvent("#family", "change");
    await pop.waitForTimeout(400);
    await pop.screenshot({ path: path.join(SHOTS, "5-popup.png") });

    // fresh scam page picks up the new settings; dismissals/budget live in storage.local so use a new host name
    const h = await ctx.newPage();
    await h.goto(`http://127.0.0.1:${port}/demo/scam-payment.html`);
    await h.waitForTimeout(1800);
    t = await hostText(h);
    check("Hindi: banner is in Hindi", !!t && /स्कैम|धोखाधड़ी/.test(t), t ? t.slice(0, 60).replace(/\s+/g, " ") : "banner missing");
    await h.screenshot({ path: path.join(SHOTS, "6-hindi-simple-banner.png") });
    await h.click("#pay");
    await h.waitForTimeout(600);
    t = await hostText(h);
    check("Hindi + Grandpa Mode: pause shown in Hindi", !!t && /ठगे/.test(t));
    const big = await h.evaluate(() => { const c = document.getElementById("clippit-host").shadowRoot.querySelector(".card"); return parseFloat(getComputedStyle(c).fontSize); });
    check("Grandpa Mode: text is at least 20px", big >= 20, `${big}px`);
    const fam = await h.evaluate(() => null);
    await h.screenshot({ path: path.join(SHOTS, "7-hindi-simple-pause.png") });

    // ---- 5. web app
    const w = await ctx.newPage();
    await w.goto(`${base}/index.html`);
    await w.waitForTimeout(800);
    await w.click("#sampleBtn");
    await w.waitForTimeout(400);
    const rt = await w.textContent("#result");
    check("web app: example is flagged as scam with a type", /scam/i.test(rt) && /KYC|arrest/i.test(rt));
    check("web app: report box has 1930", /1930/.test(rt));
    await w.screenshot({ path: path.join(SHOTS, "8-site-result.png"), fullPage: false });
    await w.selectOption("#lang", "ta");
    await w.waitForTimeout(300);
    check("web app: result switches to Tamil", /மோசடி/.test(await w.textContent("#result")));
    await w.fill("#msg", "Lunch at 1? I'll grab a table.");
    await w.click("#checkBtn");
    await w.waitForTimeout(300);
    check("web app: harmless message is not flagged", !/KYC|arrest/i.test(await w.textContent("#result")) && !(await w.$("#result .result.scam")));
  } catch (e) {
    check("test run finished without a crash", false, String(e).slice(0, 200));
  } finally {
    await ctx.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
