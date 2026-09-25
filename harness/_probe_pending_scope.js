const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");

async function probe(story, cmds) {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 18 && !(await page.locator(".Input.LineInput").count()); i++) {
    await page.keyboard.press("Space"); await page.waitForTimeout(250);
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
    if (!mem) return { err: "no-mem" };
    const h = ZRamReader.header(mem);
    const count = ZRamReader.objectCount(mem, h);
    const playerId = ZRamReader.findPlayerId(mem);
    const player = playerId ? ZRamReader.objectLinks(mem, playerId) : null;
    const pname = player && player.parent ? ZRamReader.shortName(mem, player.parent) : "";
    const status = ZRamProvider.resolveStatusRoom();
    const hits = status ? ZRamReader.findRoomsByName(mem, status).slice(0, 5) : [];
    // sample objects with children (rooms)
    const rooms = [];
    for (let id = 1; id <= Math.min(count, 400); id++) {
      const nm = ZRamReader.shortName(mem, id);
      if (!nm || nm.charAt(0) === "(") continue;
      const o = ZRamReader.objectLinks(mem, id);
      const kids = ZRamReader.children(mem, id);
      if (kids.length >= 2 && o && o.parent === 0) rooms.push({ id, nm, kids: kids.length });
      if (rooms.length >= 8) break;
    }
    const snap = ZRamReader.snapshot(mem);
    const col = ZRamProvider.collect();
    return {
      ver: h.version, count, playerId,
      playerName: playerId ? ZRamReader.shortName(mem, playerId) : "",
      parent: player && player.parent, pname,
      status, hits, rooms,
      snap: { roomId: snap.roomId, roomName: snap.roomName, n: (snap.discoveredObjects||[]).length },
      col: { roomId: col.roomId, roomName: col.roomName, scope: col.probe && col.probe.scopeCount }
    };
  });
  await browser.close();
  return r;
}

(async () => {
  const files = fs.readdirSync("games");
  const advent = "games/" + files.find((f) => /advent/i.test(f));
  const wump = "games/" + files.find((f) => /wump2ka/i.test(f));
  const zb = "games/" + files.find((f) => /\.zblorb\.js$/i.test(f));
  console.log("ADVENT", JSON.stringify(await probe(advent, ["look"]), null, 2));
  console.log("WUMP", JSON.stringify(await probe(wump, ["look"]), null, 2));
  console.log("ZBLORB", zb, JSON.stringify(await probe(zb, ["look"]), null, 2));
})().catch((e) => { console.error(e); process.exitCode = 1; });
