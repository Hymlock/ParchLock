const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const outDir = path.join(__dirname, "..", "harness", "shots-build43");
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));

  // 1) Emglken under ParchLock chrome ? Lost Pig
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  const url = `http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const frame = page.frameLocator("#pl-emglken-frame");
  // wait for world model bridge
  let payload = null;
  for (let i = 0; i < 20; i++) {
    payload = await page.evaluate(() => window.__PARCHLOCK_WORLD__ || (window.WorldModel && WorldModel.lastPayload) || null);
    if (payload && (payload.roomName || (payload.sources && payload.sources.length))) break;
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(outDir, "emglken-chrome-lostpig.png"), fullPage: true });
  const chrome = await page.evaluate(() => ({
    hostClass: document.documentElement.classList.contains("pl-host-emglken"),
    frame: !!document.getElementById("pl-emglken-frame"),
    translator: typeof TranslatorUI,
    mapRooms: (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms && ParchLockMap.Rooms.length) || 0,
    current: (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) || "",
    build: (typeof Consts !== "undefined" && Consts.BUILD) || null,
    payload: window.__PARCHLOCK_WORLD__ || (WorldModel && WorldModel.lastPayload) || null
  }));

  // 2) Specialized wump2ka via play-emglken redirect if fixture exists
  let specialized = { ok: false };
  const candidates = [
    "games/wump2ka.z5.js",
    "harness/fixtures/wump2ka.z5",
    "games/wump2ka.z5"
  ];
  let specUrl = null;
  for (const c of candidates) {
    if (fs.existsSync(path.join(__dirname, "..", c))) {
      specUrl = "http://127.0.0.1:8765/" + c.replace(/\\/g, "/");
      break;
    }
  }
  if (specUrl && !specUrl.endsWith(".js")) {
    await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(specUrl)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(outDir, "emglken-chrome-wump2ka.png"), fullPage: true });
    specialized = await page.evaluate(() => ({
      ok: !!document.getElementById("pl-emglken-frame"),
      payload: window.__PARCHLOCK_WORLD__ || (WorldModel && WorldModel.lastPayload) || null
    }));
  } else {
    specialized = { ok: false, reason: "raw z5 fixture missing", candidates };
  }

  // 3) Quixe sanity ? story boot still has TranslatorUI
  await page.goto("http://127.0.0.1:8765/play.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const quixe = await page.evaluate(() => ({
    translator: typeof TranslatorUI,
    world: typeof WorldModel,
    autocomplete: typeof Autocomplete
  }));
  await page.screenshot({ path: path.join(outDir, "quixe-chrome-idle.png"), fullPage: true });

  const report = { errs: errs.slice(0, 10), chrome, specialized, quixe };
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!chrome.hostClass || !chrome.frame) process.exit(2);
  if (quixe.translator !== "object" || quixe.autocomplete !== "object") process.exit(3);
})().catch(e => { console.error(e); process.exit(1); });
