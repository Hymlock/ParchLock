const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  async function dump(story, cmds) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
    await page.waitForTimeout(1100);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 14 && !(await page.locator(".Input.LineInput").count()); i++) {
      await page.keyboard.press("Space"); await page.waitForTimeout(220);
    }
    if (await page.locator(".Input.LineInput").count()) {
      for (const c of cmds) {
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, c);
        await page.waitForTimeout(800);
      }
    }
    const r = await page.evaluate(() => {
      ZvmCapture.tick();
      const mem = ZRamProvider.getMem();
      const h = ZRamReader.header(mem);
      const count = ZRamReader.objectCount(mem, h);
      // Find yourself-like and room-like globals
      const globals = [];
      for (let g = 0; g < 200; g++) {
        const val = ZRamReader.u16(mem, h.globals + g * 2);
        if (val < 2 || val > count) continue;
        const nm = ZRamReader.shortName(mem, val) || "";
        if (!nm || nm.charAt(0) === "(") continue;
        const obj = ZRamReader.objectLinks(mem, val);
        const kids = ZRamReader.children(mem, val);
        if (/you|self|grunk|adventurer|player/i.test(nm) || (obj && obj.parent === 0 && kids.length >= 2 && !/class|compass/i.test(nm))) {
          globals.push({ g, val, nm, parent: obj && obj.parent, kids: kids.length });
        }
      }
      // Advent: search names containing you
      const you = [];
      for (let id = 1; id <= Math.min(count, 400); id++) {
        const nm = ZRamReader.shortName(mem, id) || "";
        if (/you|self|cretin|adventurer|grunk/i.test(nm) && nm.charAt(0) !== "(") {
          const o = ZRamReader.objectLinks(mem, id);
          you.push({ id, nm, parent: o && o.parent, parentName: o && o.parent ? ZRamReader.shortName(mem, o.parent) : "" });
        }
      }
      return { ver: h.version, count, globals: globals.slice(0, 25), you: you.slice(0, 15) };
    });
    await page.close();
    return r;
  }
  const files = fs.readdirSync("games");
  const pick = (re) => "games/" + files.find((f) => re.test(f));
  console.log("ADVENT", JSON.stringify(await dump(pick(/advent/i), ["look"]), null, 2));
  console.log("ANCHOR", JSON.stringify(await dump(pick(/anchor/i), ["look", "southeast", "look"]), null, 2));
  console.log("YAG", JSON.stringify(await dump(pick(/yagwad/i), ["look"]), null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
