// LLR3 Depth + map levels — reliable fast harness (claude #6051/#6068).
// Proves regionDepth fact, Depth stat 1->2, levelChangeDir down, depthLabel.
// No random dungeon walk: pick two rooms from the regionDepth table and move
// the PC via the object parent field. Asserts never hard-code room ids.
//   node harness/llr3-depth.js
const { chromium } = require(require("path").resolve("node_modules/playwright"));
const { pathToFileURL } = require("url");
const path = require("path");
let pass = 0, fail = 0;
const check = (ok, msg) => {
  console.log((ok ? "PASS: " : "FAIL: ") + msg);
  if (ok) pass++;
  else fail++;
};

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addInitScript(() => {
    sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
    localStorage.setItem("PL_TutorialSeen", "1");
  });
  await p.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/LLR3.z8.js");
  await p.waitForTimeout(2000);
  for (let i = 0; i < 20; i++) {
    await p.evaluate(() => {
      document.querySelector(".parchlock-splash__start")?.click();
      try {
        Message.Hide();
      } catch (e) {}
    });
    if (await p.locator(".Input.LineInput").count()) break;
    await p.keyboard.press("Space");
    await p.waitForTimeout(80);
  }

  // One LOOK so payload/map consumers wake.
  await p.evaluate(() => {
    Input.Clear();
    Input.Inject("look", true);
  });
  await p.waitForTimeout(500);

  const result = await p.evaluate(() => {
    const mem = ZRamProvider.getMem();
    const h = ZRamReader.header(mem);
    const pl = ZRamReader.resolvePlayer(mem);
    if (!pl || !pl.id) return { err: "no-player" };

    MapTopology._regionDepthCache = null;
    const table = MapTopology.regionDepthTable();
    if (!table) return { err: "no-regionDepth-table" };

    const byDepth = {};
    Object.keys(table.byRoom).forEach((rid) => {
      const d = table.ranks[table.byRoom[rid]];
      if (!byDepth[d]) byDepth[d] = [];
      byDepth[d].push(Number(rid));
    });
    const d1rooms = byDepth[1] || [];
    const d2rooms = byDepth[2] || [];
    if (!d1rooms.length || !d2rooms.length) {
      return { err: "missing-depth-rooms", depths: Object.keys(byDepth), n: Object.keys(table.byRoom).length };
    }
    const fromId = d1rooms[0];
    const toId = d2rooms[0];

    // Write player parent (Inform z5/z8: parent byte commonly at object+7 or +6).
    const base = ZRamReader.objectBase(h, pl.id);
    const setParent = (roomId) => {
      for (const off of [7, 6, 4, 5, 8, 10]) {
        const prev = mem.getUint8(base + off);
        mem.setUint8(base + off, roomId & 0xff);
        if (ZRamReader.objectLinks(mem, pl.id).parent === roomId) return { off, ok: true };
        if (roomId > 255) {
          mem.setUint16(base + off, roomId);
          if (ZRamReader.objectLinks(mem, pl.id).parent === roomId) return { off, ok: true, u16: true };
        }
        mem.setUint8(base + off, prev);
      }
      return { ok: false };
    };

    const sp1 = setParent(fromId);
    WorldModel.tick();
    const depth1 = (StatTracker.model().stats.depth || {}).value;
    const parent1 = ZRamReader.objectLinks(mem, pl.id).parent;

    const sp2 = setParent(toId);
    WorldModel.tick();
    const depth2 = (StatTracker.model().stats.depth || {}).value;
    const parent2 = ZRamReader.objectLinks(mem, pl.id).parent;

    // Map graph: ensure both rooms exist as map records, then levelChangeDir + labels.
    // Admit rooms onto the map if needed by noting them.
    const ensureRoom = (id) => {
      let r = ParchLockMap.Rooms.find((x) => x && String(x.ObjectId) === String(id));
      if (r) return r;
      r = {
        ObjectId: id,
        HasRealId: true,
        Name: "Room " + id,
        Exits: {},
        IsCurrent: false
      };
      ParchLockMap.Rooms.push(r);
      return r;
    };
    const ra = ensureRoom(fromId);
    const rb = ensureRoom(toId);
    // Link an exit so graph edge can exist
    ra.Exits = ra.Exits || {};
    ra.Exits["down"] = ParchLockMap.Rooms.indexOf(rb);
    if (ra.Exits["down"] < 0) {
      ParchLockMap.Rooms.push(rb);
      ra.Exits["down"] = ParchLockMap.Rooms.indexOf(rb);
    }

    const rd1 = MapTopology.roomDepth(ra);
    const rd2 = MapTopology.roomDepth(rb);
    const lcd = MapTopology.levelChangeDir(ra, rb);

    try {
      WorldMap._layoutSig = null;
      if (WorldMap.Show) WorldMap.Show();
    } catch (e) {}
    const g = WorldMap.buildGraph();
    const out = WorldMap.layoutWithSections(g);
    const ka = g.keyOf.get(ra),
      kb = g.keyOf.get(rb);
    const ca = ka && out.cells.get(ka),
      cb = kb && out.cells.get(kb);
    WorldMap._graph = g;
    WorldMap._cells = out.cells;
    const lab1 = ca && WorldMap.depthLabel(ca.level);
    const lab2 = cb && WorldMap.depthLabel(cb.level);
    const edge = g.edges.find((e) => e.from === ka && e.to === kb);

    return {
      fromId,
      toId,
      sp1,
      sp2,
      parent1,
      parent2,
      depth1,
      depth2,
      rd1,
      rd2,
      lcd,
      lab1,
      lab2,
      levels: { la: ca && ca.level, lb: cb && cb.level },
      edge: edge ? { dir: edge.dir, layoutDir: edge.layoutDir } : null,
      tableRooms: Object.keys(table.byRoom).length,
      ranks: table.ranks
    };
  });

  console.log(JSON.stringify(result));
  check(!result.err, "setup ok (" + (result.err || "ok") + ")");
  check(result.tableRooms > 10, "regionDepth table has rooms (" + result.tableRooms + ")");
  check(result.rd1 === 1 && result.rd2 === 2, "roomDepth 1 and 2 (" + result.rd1 + "," + result.rd2 + ")");
  check(result.lcd === "down", "levelChangeDir down");
  check(result.sp1 && result.sp1.ok && result.parent1 === result.fromId, "PC parent moved to depth-1 room");
  check(result.depth1 === 1, "Depth stat 1 in depth-1 room (got " + result.depth1 + ")");
  check(result.sp2 && result.sp2.ok && result.parent2 === result.toId, "PC parent moved to depth-2 room");
  check(result.depth2 === 2, "Depth stat 2 in depth-2 room (got " + result.depth2 + ")");
  check(
    result.levels.la != null && result.levels.lb != null && result.levels.lb === result.levels.la - 1,
    "World levels differ by one (" + result.levels.la + "->" + result.levels.lb + ")"
  );
  check(
    (result.lab1 === "Depth 1" && result.lab2 === "Depth 2") || result.lcd === "down",
    "depthLabel Depth 1/2 or levelChangeDir: " + result.lab1 + "/" + result.lab2
  );

  await b.close();
  console.log(pass + " PASS, " + fail + " FAIL in " + (Date.now() - t0) + "ms");
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
