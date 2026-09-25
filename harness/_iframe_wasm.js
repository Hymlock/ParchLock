const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const reqs = [];
  page.on("request", r => {
    const u = r.url();
    if (/wasm|bocfel|glulxe|LostPig|emglken/i.test(u)) reqs.push(r.resourceType() + " " + r.url());
  });
  page.on("response", r => {
    if (r.status() >= 400) reqs.push("HTTP" + r.status() + " " + r.url());
  });
  page.on("pageerror", e => reqs.push("ERR " + e.message));
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(15000);
  const snap = await page.evaluate(() => {
    const f = document.getElementById("pl-emglken-frame");
    const rect = f ? f.getBoundingClientRect() : null;
    let child = null;
    try {
      const w = f.contentWindow;
      child = {
        room: w.WorldModel && w.WorldModel.lastPayload && w.WorldModel.lastPayload.roomName,
        text: (w.document.body.innerText || "").slice(0, 250),
        ready: w.document.readyState,
        hasGlk: typeof w.GlkOte,
        inputs: w.document.querySelectorAll("input, textarea, .Input").length
      };
    } catch (e) { child = String(e); }
    return { rect, child, parentRoom: ParchLockMap && ParchLockMap.CurrentRoom };
  });
  console.log(JSON.stringify({ snap, reqs: reqs.slice(0, 40) }, null, 2));
  await page.screenshot({ path: "harness/shots-build43/emglken-chrome-now.png", fullPage: true });
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
