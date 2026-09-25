const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const out = path.join(__dirname, "shots-build43");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const report = { errs: [] };
  page.on("pageerror", e => report.errs.push(e.message));

  // Emglken via play.html host= redirects into tapped
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  report.emglkenUrl = page.url();
  report.emglken = await page.evaluate(() => ({
    room: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
    objs: (WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.discoveredObjects || []).map(o => o.name).slice(0, 5),
    sources: (WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.sources || []).map(s => s.name),
    text: (document.body.innerText || "").slice(0, 180)
  }));
  await page.screenshot({ path: path.join(out, "final-emglken-lostpig.png"), fullPage: true });

  const wump = "http://127.0.0.1:8765/harness/fixtures/wump2ka.z5";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(wump)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  report.wump = await page.evaluate(() => ({
    room: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
    objs: (WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.discoveredObjects || []).map(o => o.name).slice(0, 5),
    special: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.specialCommands
  }));
  await page.screenshot({ path: path.join(out, "final-emglken-wump2ka.png"), fullPage: true });

  // Quixe translator present
  await page.goto("http://127.0.0.1:8765/play.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  report.quixe = await page.evaluate(() => ({
    TranslatorUI: typeof TranslatorUI,
    WorldModel: typeof WorldModel,
    Autocomplete: typeof Autocomplete,
    TextGate: typeof TextGate,
    MapIdentity: typeof MapIdentity,
    ActionSynth: typeof ActionSynth
  }));
  await page.screenshot({ path: path.join(out, "final-quixe-idle.png"), fullPage: true });

  fs.writeFileSync(path.join(out, "final-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const ok = report.emglken.room && report.quixe.TranslatorUI === "object" && report.quixe.Autocomplete === "object";
  await browser.close();
  process.exit(ok ? 0 : 2);
})().catch(e => { console.error(e); process.exit(1); });
