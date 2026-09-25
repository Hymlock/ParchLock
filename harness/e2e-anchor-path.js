const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const out = path.join(__dirname, "shots-build49");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.addInitScript(() => sessionStorage.setItem("PL_ParchLockSplashSeen", "1"));
  const story = "games/anchor.z8.js";
  await page.goto("http://127.0.0.1:8765/play.html?story=" + encodeURIComponent(story), { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => !!document.querySelector(".Input.LineInput"))) break;
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2000);
  async function cmd(t) {
    await page.fill(".Input.LineInput", t);
    await page.press(".Input.LineInput", "Enter");
    await page.waitForTimeout(1500);
  }
  await cmd("look");
  await cmd("se");
  await cmd("look");
  const state = await page.evaluate(() => {
    const rooms = (ParchLockMap.Rooms || []).map(r => ({ Id: r.Id, Name: r.Name, Exits: r.Exits }));
    const from = ParchLockMap.CurrentRoom;
    const to = rooms.find(r => r.Name !== from);
    let path = null;
    let msg = "";
    if (to) {
      path = Navigator.FindRoute(from, to.Name);
      msg = (($("#message h2").text()||"") + " " + ($("#message div").first().text()||"")).slice(0,240);
    }
    return {
      current: from,
      rooms,
      path,
      msg,
      pmActs: Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map(e => e.textContent).slice(0,25)
    };
  });
  fs.writeFileSync(path.join(out, "e2e-anchor-state.json"), JSON.stringify(state, null, 2));
  await page.screenshot({ path: path.join(out, "e2e-anchor-path.png"), fullPage: true });
  console.log(JSON.stringify(state, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
