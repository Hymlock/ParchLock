const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(10000);
  const r = await page.evaluate(() => {
    const f = document.getElementById("pl-emglken-frame");
    if (!f) return { err: "no frame" };
    try {
      const w = f.contentWindow;
      return {
        href: w.location.href,
        hasWM: typeof w.WorldModel,
        room: w.WorldModel && w.WorldModel.lastPayload && w.WorldModel.lastPayload.roomName,
        text: (w.document.body && w.document.body.innerText || "").slice(0, 120)
      };
    } catch (e) {
      return { err: String(e) };
    }
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
