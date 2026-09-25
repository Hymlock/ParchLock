const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  const frame = page.frames().find(f => f.url().includes("parchment-single"));
  const logs = [];
  if (frame) {
    frame.on("console", m => logs.push(m.type() + ":" + m.text()));
    page.on("console", m => logs.push("p:" + m.type() + ":" + m.text()));
    // attach pageerror on frame via evaluate?
  }
  await page.waitForTimeout(12000);
  const childErr = await frame.evaluate(() => {
    return {
      room: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
      text: (document.body.innerText || "").slice(0, 300),
      glk: typeof GlkOte,
      parch: typeof parchment,
      opts: typeof parchment_options !== "undefined" ? parchment_options : null,
      errors: window.__PL_CHILD_ERRS || null
    };
  }).catch(e => ({ evalErr: String(e) }));
  console.log(JSON.stringify({ childErr, logs: logs.slice(0, 40) }, null, 2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
