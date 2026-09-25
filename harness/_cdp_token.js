const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);
  await client.send("Debugger.enable");
  client.on("Debugger.scriptFailedToParse", p => {
    console.log("FAILPARSE", p.url, p.errorText || p.exceptionDetails || "");
  });
  page.on("pageerror", e => console.log("PAGE", e.message, e.stack));
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);
  const snap = await page.evaluate(() => {
    const f = document.getElementById("pl-emglken-frame");
    let child = null;
    try {
      const w = f.contentWindow;
      child = {
        room: w.WorldModel && w.WorldModel.lastPayload && w.WorldModel.lastPayload.roomName,
        text: (w.document.body.innerText || "").slice(0, 200)
      };
    } catch (e) { child = String(e); }
    return {
      parentRoom: ParchLockMap && ParchLockMap.CurrentRoom,
      payloadRoom: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
      child,
      storyReserved: window.__PL_EMGLKEN_STORY__,
      href: location.href
    };
  });
  console.log(JSON.stringify(snap, null, 2));
  await page.screenshot({ path: "harness/shots-build43/emglken-chrome-stable.png", fullPage: true });
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
