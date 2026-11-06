#!/usr/bin/env node
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const stories = [
  "games/Ballyhoo.z3.js",
  "games/Advent.z5.js",
  "games/lost.z5.js",
  "games/wump2ka.z5.js",
  "games/yagwad.z5.js",
  "games/LostPig.z8.js",
  "games/anchor.z8.js",
  "games/Accuse.zblorb.js"
];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const results = [];
  for (const rel of stories) {
    if (!fs.existsSync(rel)) { results.push({ rel, ok: false, reason: "missing" }); continue; }
    const url = "http://127.0.0.1:8765/play.html?story=" + encodeURIComponent("http://127.0.0.1:8765/" + rel);
    const row = { rel, ok: false };
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(6000);
      const snap = await page.evaluate(() => ({
        path: location.pathname,
        hasMap: !!document.getElementById("map"),
        hasTools: !!document.getElementById("tools-toggle"),
        autocomplete: typeof Autocomplete,
        translator: typeof TranslatorUI,
        world: typeof WorldModel,
        input: !!document.querySelector(".Input.LineInput, input.Input"),
        errs: window.__PL_BOOT_ERRS || null
      }));
      row.snap = snap;
      row.ok = snap.path.indexOf("play.html") >= 0 && snap.hasMap && snap.hasTools && snap.translator === "object" && snap.autocomplete === "object";
    } catch (e) {
      row.reason = String(e.message || e);
    }
    results.push(row);
    console.log(row.ok ? "PASS" : "FAIL", rel, row.reason || "");
  }
  const out = path.join(__dirname, "shots-build43", "matrix-playhtml.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const failed = results.filter(r => !r.ok);
  await browser.close();
  if (failed.length) { console.error("matrix failures", failed.length); process.exit(1); }
  console.log("matrix-playhtml PASS", results.length);
})().catch(e => { console.error(e); process.exit(1); });
