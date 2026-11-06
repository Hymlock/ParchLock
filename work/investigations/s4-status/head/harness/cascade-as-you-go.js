const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");

async function probe(story, cmds) {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
    await page.waitForTimeout(1200);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 16 && !(await page.locator(".Input.LineInput").count()); i++) {
      await page.keyboard.press("Space"); await page.waitForTimeout(250);
    }
    if (await page.locator(".Input.LineInput").count()) {
      for (const c of cmds) {
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, c);
        await page.waitForTimeout(850);
      }
    }
    return await page.evaluate(() => {
      ZvmCapture.tick();
      const mem = ZRamProvider.getMem();
      const playerId = ZRamReader.findPlayerId(mem);
      const pl = playerId ? ZRamReader.objectLinks(mem, playerId) : null;
      const parentName = pl && pl.parent ? ZRamReader.shortName(mem, pl.parent) : "";
      const payload = ZRamProvider.collect();
      const loc = payload.roomId || 0;
      return {
        build: BUILD,
        playerId,
        playerName: playerId ? ZRamReader.shortName(mem, playerId) : "",
        parentId: pl && pl.parent,
        parentName,
        loc,
        locName: loc ? ZRamReader.shortName(mem, loc) : "",
        roomId: payload.roomId,
        roomName: payload.roomName,
        scope: (payload.discoveredObjects || []).map((o) => o.name + ":" + o.id).slice(0, 10),
        scopeCount: payload.probe && payload.probe.scopeCount,
        exits: (payload.exits || []).slice(0, 6).map((e) => e.label + (e.isNonCardinal ? "*" : "")),
        viaParent: !!(pl && pl.parent && loc === pl.parent)
      };
    });
  } finally {
    await browser.close();
  }
}

(async () => {
  const files = fs.readdirSync("games");
  const pick = (re) => "games/" + files.find((f) => re.test(f));
  const rows = [];
  rows.push(["lostpig", await probe(pick(/lost.?pig/i), ["look"])]);
  rows.push(["anchor", await probe(pick(/anchor/i), ["look", "southeast", "look"])]);
  rows.push(["advent", await probe(pick(/advent/i), ["look"])]);
  rows.push(["yagwad", await probe(pick(/yagwad/i), ["look"])]);
  for (const [name, r] of rows) {
    console.log(name, JSON.stringify({ player: r.playerName, parent: r.parentName, room: r.roomName, scope: r.scopeCount, viaParent: r.viaParent, exits: r.exits }));
  }
  fs.mkdirSync("tools/screenshots/matrix", { recursive: true });
  fs.writeFileSync("tools/screenshots/matrix/cascade-as-you-go.json", JSON.stringify(Object.fromEntries(rows), null, 2));
})().catch((e) => { console.error(e); process.exitCode = 1; });
