const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const story = "http://127.0.0.1:8765/harness/fixtures/wump2ka.z5";
  await page.goto(`http://127.0.0.1:8765/lib/parchment-modern/parchment-single-tapped.html?autoplay=1&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  const r = await page.evaluate(() => {
    const text = (document.body.innerText || "").toLowerCase().replace(/\s+/g, " ");
    const scanned = typeof RemGlkTapProvider !== "undefined" && RemGlkTapProvider.scanDomSpecials && RemGlkTapProvider.scanDomSpecials();
    const collected = typeof RemGlkTapProvider !== "undefined" && RemGlkTapProvider.collect && RemGlkTapProvider.collect();
    const payload = WorldModel && WorldModel.tick && WorldModel.tick();
    return { text: text.slice(0, 200), scanned, collectedSpecial: collected && collected.specialCommands, payloadSpecial: payload && payload.specialCommands, providers: WorldModel && WorldModel.providers && WorldModel.providers.map(p=>p.name) };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
