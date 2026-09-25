const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const failed = [];
  page.on("pageerror", e => failed.push("err " + e.message));
  page.on("response", r => { if (r.status() >= 400) failed.push(r.status() + " " + r.url()); });
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  let best = null;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const snap = await page.evaluate(() => {
      const f = document.getElementById("pl-emglken-frame");
      let child = null;
      try {
        const w = f && f.contentWindow;
        child = w && {
          room: w.WorldModel && w.WorldModel.lastPayload && w.WorldModel.lastPayload.roomName,
          text: (w.document.body && w.document.body.innerText || "").slice(0, 160),
          sources: w.WorldModel && w.WorldModel.lastPayload && w.WorldModel.lastPayload.sources
        };
      } catch (e) { child = { err: String(e) }; }
      return {
        parentRoom: ParchLockMap && ParchLockMap.CurrentRoom,
        parentRooms: ParchLockMap && ParchLockMap.Rooms.length,
        payloadRoom: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
        child
      };
    });
    best = snap;
    if (snap.payloadRoom || (snap.child && snap.child.room)) break;
  }
  console.log(JSON.stringify({ best, failed: failed.slice(0, 20) }, null, 2));
  await page.screenshot({ path: "harness/shots-build43/emglken-chrome-final.png", fullPage: true });
  // specialized wump after lostpig path works or not
  const wump = "http://127.0.0.1:8765/harness/fixtures/wump2ka.z5";
  await page.goto(`http://127.0.0.1:8765/lib/parchment-modern/parchment-single-tapped.html?autoplay=1&story=${encodeURIComponent(wump)}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  const w = await page.evaluate(() => WorldModel && WorldModel.lastPayload);
  console.log("wump direct", w && w.roomName, (w && w.discoveredObjects || []).slice(0,3));
  await page.screenshot({ path: "harness/shots-build43/wump-direct.png", fullPage: true });
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
