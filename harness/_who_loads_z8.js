const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  page.on("request", r => {
    const u = r.url();
    if (/LostPig|\\.z8|\\.z5/.test(u)) {
      console.log("REQ", r.resourceType(), u, "initiator", JSON.stringify(r.headers()["referer"]||""));
    }
  });
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  // dump script tags
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  console.log("scripts", scripts.filter(s => /LostPig|fixtures|story/i.test(s)));
  const iframeScripts = await page.evaluate(() => {
    const f = document.getElementById("pl-emglken-frame");
    try { return [...f.contentDocument.scripts].map(s => s.src).filter(Boolean).slice(0, 30); }
    catch (e) { return [String(e)]; }
  });
  console.log("iframe scripts sample", iframeScripts.filter(s => /LostPig|fixture|emglken|bocfel/i.test(s) || s.includes("z8")));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
