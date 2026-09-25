const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  for (const name of ["wump2ka.z5", "yagwad.z5"]) {
    const story = `http://127.0.0.1:8765/harness/fixtures/${name}`;
    await page.goto(`http://127.0.0.1:8765/lib/parchment-modern/parchment-single-tapped.html?autoplay=1&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    let room = "", objs = [];
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const s = await page.evaluate(() => ({
        room: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
        objs: (WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.discoveredObjects || []).map(o => o.name).slice(0, 6),
        special: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.specialCommands,
        text: (document.body.innerText || "").slice(0, 120)
      }));
      room = s.room; objs = s.objs;
      if (room || (s.text && s.text.length > 40 && !/pending-emglken/.test(s.text))) {
        console.log(name, JSON.stringify(s));
        break;
      }
      if (i === 19) console.log(name, "TIMEOUT", JSON.stringify(s));
    }
    await page.screenshot({ path: `harness/shots-build43/final-${name}.png`, fullPage: true });
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
