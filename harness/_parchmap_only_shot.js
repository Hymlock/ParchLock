const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const out = path.join(__dirname, "shots-build43");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const story = "http://127.0.0.1:8765/games/LostPig.z8.js";
  await page.goto("http://127.0.0.1:8765/play.html?story=" + encodeURIComponent(story), { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  // open map like a player might
  try { await page.click("#tools-toggle", { timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(500);
  const snap = await page.evaluate(() => ({
    path: location.pathname,
    title: document.title,
    hasMap: !!document.getElementById("map"),
    hasWindowport: !!document.getElementById("windowport"),
    hudHidden: getComputedStyle(document.getElementById("pl-hud-metrics") || document.createElement("div")).display === "none" || !document.getElementById("pl-hud-metrics"),
    wmPanel: !!document.getElementById("wm-panel"),
    translator: typeof TranslatorUI,
    world: typeof WorldModel
  }));
  await page.screenshot({ path: path.join(out, "parchmap-only-lostpig.png"), fullPage: true });
  fs.writeFileSync(path.join(out, "parchmap-only-report.json"), JSON.stringify(snap, null, 2));
  console.log(JSON.stringify(snap, null, 2));
  await browser.close();
  if (snap.path.indexOf("play.html") < 0) process.exit(2);
  if (snap.wmPanel) process.exit(3);
})().catch(e => { console.error(e); process.exit(1); });
