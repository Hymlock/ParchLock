const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const failed = [];
  page.on("requestfailed", r => failed.push("fail " + r.url() + " " + (r.failure()&&r.failure().errorText)));
  page.on("response", r => { if (r.status() >= 400) failed.push(r.status() + " " + r.url()); });
  page.on("pageerror", e => failed.push("err " + e.message));
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  console.log(failed.slice(0, 30).join("\n"));
  const frame = page.frames().find(f => f.url().includes("parchment-single"));
  if (frame) {
    const t = await frame.evaluate(() => document.body && document.body.innerText.slice(0, 500));
    console.log("--- body ---\n", t);
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
