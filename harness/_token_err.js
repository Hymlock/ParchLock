const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  page.on("pageerror", e => {
    console.log("PAGEERR", e.message);
    console.log(e.stack);
  });
  page.on("console", m => {
    if (m.type() === "error") console.log("CON", m.text());
  });
  // Also open tapped page directly
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  const url = `http://127.0.0.1:8765/lib/parchment-modern/parchment-single-tapped.html?autoplay=1&story=${encodeURIComponent(story)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  const info = await page.evaluate(() => ({
    text: (document.body.innerText || "").slice(0, 400),
    hasInput: !!document.querySelector(".Input, input, textarea"),
    wm: typeof WorldModel,
    rem: typeof RemGlkTapProvider,
    payload: window.__PARCHLOCK_WORLD__ || null
  }));
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "harness/shots-build43/tapped-direct.png", fullPage: true });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
