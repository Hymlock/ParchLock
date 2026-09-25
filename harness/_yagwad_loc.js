const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const story = "games/" + fs.readdirSync("games").find((f) => /yagwad/i.test(f));
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 20 && !(await page.locator(".Input.LineInput").count()); i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
  }
  // specialized may need yes
  const text = await page.evaluate(() => (document.querySelector("#windowport") || document.body).innerText.slice(0, 500));
  console.log("TEXT", text.slice(0, 300));
  if (await page.locator(".Input.LineInput").count()) {
    await page.evaluate(() => { Input.Clear(); Input.Inject("look", true); });
    await page.waitForTimeout(900);
  } else {
    await page.keyboard.type("yes");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);
    if (await page.locator(".Input.LineInput").count()) {
      await page.evaluate(() => { Input.Clear(); Input.Inject("look", true); });
      await page.waitForTimeout(900);
    }
  }
  const r = await page.evaluate(() => {
    ZvmCapture.tick();
    const mem = ZRamProvider.getMem();
    const h = ZRamReader.header(mem);
    const count = ZRamReader.objectCount(mem, h);
    const playerId = ZRamReader.findPlayerId(mem);
    const locG = ZRamReader.findLocationGlobal(mem, playerId);
    const rooms = [];
    for (let g = 0; g < 50; g++) {
      const val = ZRamReader.u16(mem, h.globals + g * 2);
      if (val < 2 || val > count) continue;
      const nm = ZRamReader.shortName(mem, val) || "";
      const obj = ZRamReader.objectLinks(mem, val);
      const kids = ZRamReader.children(mem, val);
      if (obj && obj.parent === 0 && kids.length) rooms.push({ g, val, nm, kids: kids.length });
    }
    return { playerId, player: playerId ? ZRamReader.shortName(mem, playerId) : "", locG, locName: locG ? ZRamReader.shortName(mem, locG) : "", rooms: rooms.slice(0, 15), payload: ZRamProvider.collect() };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
