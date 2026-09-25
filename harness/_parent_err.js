const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  page.on("pageerror", e => { console.log("PAGEERR", e.message); console.log(e.stack); });
  page.on("console", m => { if (m.type()==="error") console.log("CON", m.text()); });
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(10000);
  const info = await page.evaluate(() => ({
    host: document.documentElement.classList.contains("pl-host-emglken"),
    frame: !!document.getElementById("pl-emglken-frame"),
    current: ParchLockMap && ParchLockMap.CurrentRoom,
    rooms: ParchLockMap && ParchLockMap.Rooms.length,
    payload: window.__PARCHLOCK_WORLD__ || (WorldModel && WorldModel.lastPayload),
    ui: window.__PARCHLOCK_TRANSLATOR_UI__
  }));
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "harness/shots-build43/emglken-chrome-lostpig2.png", fullPage: true });
  // specialized
  const wump = "http://127.0.0.1:8765/harness/fixtures/wump2ka.z5";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(wump)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  const spec = await page.evaluate(() => ({
    current: ParchLockMap && ParchLockMap.CurrentRoom,
    payload: window.__PARCHLOCK_WORLD__ || (WorldModel && WorldModel.lastPayload)
  }));
  console.log("wump", JSON.stringify(spec, null, 2));
  await page.screenshot({ path: "harness/shots-build43/emglken-chrome-wump2ka.png", fullPage: true });
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
