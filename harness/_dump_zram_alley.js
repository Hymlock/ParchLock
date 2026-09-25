const fs = require("fs");
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js");
  await page.waitForTimeout(1600);
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 14 && !(await page.locator(".Input.LineInput").count()); i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(350);
  }
  await page.locator(".Input.LineInput").waitFor({ state: "visible" });
  const go = async (t) => { await page.evaluate((x) => { Input.Clear(); Input.Inject(x, true); }, t); await page.waitForTimeout(900); };
  await go("look"); await go("southeast"); await go("look");
  await page.waitForTimeout(800);

  const dump = await page.evaluate(() => {
    ZvmCapture.tick();
    const mem = ZRamProvider.getMem();
    if (!mem) return { err: "no-mem" };
    const h = ZRamReader.header(mem);
    const count = ZRamReader.objectCount(mem, h);
    const playerId = 654;
    const roomId = 89;
    const player = ZRamReader.objectLinks(mem, playerId);
    const room = ZRamReader.objectLinks(mem, roomId);
    const kids = ZRamReader.children(mem, roomId);
    const names = kids.map((id) => ({ id, name: ZRamReader.shortName(mem, id), parent: (ZRamReader.objectLinks(mem, id)||{}).parent }));
    // Also dump first 20 children of room via sibling chain manually
    let child = room && room.child;
    const chain = [];
    let guard = 0;
    while (child && guard++ < 40) {
      const o = ZRamReader.objectLinks(mem, child);
      chain.push({ id: child, name: ZRamReader.shortName(mem, child), sibling: o && o.sibling, parent: o && o.parent });
      child = o && o.sibling;
    }
    // Find objects named can/window/fence/alley
    const hits = [];
    for (let id = 1; id <= Math.min(count, 1200); id++) {
      const nm = (ZRamReader.shortName(mem, id) || "").toLowerCase();
      if (/can|window|fence|alley|garbage/.test(nm)) {
        const o = ZRamReader.objectLinks(mem, id);
        hits.push({ id, name: nm, parent: o && o.parent, child: o && o.child });
      }
    }
    const snap = ZRamReader.snapshot(mem);
    return {
      count, h: { ver: h.version, objs: h.objTable, entry: h.entrySize },
      playerName: ZRamReader.shortName(mem, playerId),
      roomName: ZRamReader.shortName(mem, roomId),
      player, room, kids, names, chain,
      hits: hits.slice(0, 40),
      snap: { playerId: snap.playerId, roomId: snap.roomId, roomName: snap.roomName, n: (snap.discoveredObjects||[]).length, sample: (snap.discoveredObjects||[]).slice(0,15) }
    };
  });
  fs.writeFileSync("tools/screenshots/alley/zram-dump.json", JSON.stringify(dump, null, 2));
  console.log(JSON.stringify(dump, null, 2).slice(0, 4500));
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
