const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const failed = [];
  page.on("pageerror", e => failed.push(e.message + " :: " + (e.stack||"").split("\n")[0]));
  page.on("response", async r => {
    if (r.status() >= 400) failed.push(r.status() + " " + r.url());
  });
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/lib/parchment-modern/parchment-single-tapped.html?autoplay=1&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  const info = await page.evaluate(() => ({
    room: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
    objs: (WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.discoveredObjects || []).map(o=>o.name),
    text: (document.body.innerText||"").slice(0,220)
  }));
  console.log(JSON.stringify({ info, failed }, null, 2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
