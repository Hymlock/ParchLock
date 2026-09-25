const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push("parent:" + e.message));
  page.on("console", m => { if (m.type()==="error") errs.push("pcon:"+m.text()); });
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  const frameEl = await page.$("#pl-emglken-frame");
  const src = frameEl ? await frameEl.getAttribute("src") : null;
  console.log("frame src", src);
  const frame = page.frames().find(f => f.url().includes("parchment-single"));
  if (frame) {
    frame.on("pageerror", e => errs.push("child:" + e.message));
    await page.waitForTimeout(4000);
    const child = await frame.evaluate(() => ({
      url: location.href,
      hasWM: typeof WorldModel,
      hasRem: typeof RemGlkTapProvider,
      payload: window.__PARCHLOCK_WORLD__ || (typeof WorldModel!=="undefined" && WorldModel.lastPayload) || null,
      bodyLen: document.body ? document.body.innerText.slice(0,200) : ""
    }));
    console.log(JSON.stringify(child, null, 2));
  } else {
    console.log("no parchment frame", page.frames().map(f=>f.url()));
  }
  console.log("errs", errs.slice(0,15));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
