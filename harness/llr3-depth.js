// LLR3 depth — exact small design (claude #6073). NO walking. <30s.
// Boot → regionDepthTable → prop checks → levelChangeDir → Depth stat → WorldMap labels → Advent null.
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

async function boot(story) {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addInitScript(() => {
    sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
    localStorage.setItem("PL_TutorialSeen", "1");
  });
  await p.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/" + story);
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
    await p.waitForTimeout(60);
  }
  await p.evaluate(() => {
    try {
      Input.Clear();
      Input.Inject("look", true);
    } catch (e) {}
  });
  await p.waitForTimeout(400);
  return { b, p };
}

(async () => {
  const t0 = Date.now();
  const { b, p } = await boot("LLR3.z8.js");

  const r = await p.evaluate(() => {
    const mem = ZRamProvider.getMem();
    MapTopology._regionDepthCache = null;
    const t = MapTopology.regionDepthTable();
    if (!t) return { err: "no-table" };

    const room = (id) => ({ ObjectId: id, HasRealId: true, Name: "R" + id, Exits: {} });
    const r219 = room(219),
      r233 = room(233);
    const prop7_219 = ZRamReader.readProp(mem, 219, 7);
    const prop7_233 = ZRamReader.readProp(mem, 233, 7);
    const d219 = MapTopology.roomDepth(r219);
    const d233 = MapTopology.roomDepth(r233);
    const down = MapTopology.levelChangeDir(r219, r233);
    const up = MapTopology.levelChangeDir(r233, r219);

    WorldModel.tick();
    const depthStat = (StatTracker.model().stats.depth || {}).value;

    // World map: two fake rooms joined by enter trapdoor
    r219.Exits = { "enter trapdoor": 1 };
    const rooms = [r219, r233];
    // minimal map list
    const save = ParchLockMap.Rooms.slice();
    ParchLockMap.Rooms.length = 0;
    ParchLockMap.Rooms.push(r219, r233);
    r219.Exits["enter trapdoor"] = 1; // index of r233

    let lab1 = null,
      lab2 = null,
      la = null,
      lb = null,
      edge = null;
    try {
      WorldMap._layoutSig = null;
      const g = WorldMap.buildGraph();
      const out = WorldMap.layoutWithSections(g);
      const ka = g.keyOf.get(r219),
        kb = g.keyOf.get(r233);
      const ca = ka && out.cells.get(ka),
        cb = kb && out.cells.get(kb);
      WorldMap._graph = g;
      WorldMap._cells = out.cells;
      lab1 = ca && WorldMap.depthLabel(ca.level);
      lab2 = cb && WorldMap.depthLabel(cb.level);
      la = ca && ca.level;
      lb = cb && cb.level;
      edge = g.edges.find((e) => e.from === ka && e.to === kb);
    } catch (e) {
      return { err: "map:" + e.message, prop7_219, prop7_233, d219, d233, down, up, depthStat };
    }
    ParchLockMap.Rooms.length = 0;
    save.forEach((x) => ParchLockMap.Rooms.push(x));

    return {
      prop7_219,
      prop7_233,
      d219,
      d233,
      down,
      up,
      depthStat,
      lab1,
      lab2,
      la,
      lb,
      edge: edge ? { dir: edge.dir, layoutDir: edge.layoutDir } : null,
      ranks: t.ranks,
      nRooms: Object.keys(t.byRoom).length
    };
  });

  console.log(JSON.stringify(r));
  check(!r.err, "no error (" + (r.err || "ok") + ")");
  check(r.prop7_219 === 214, "room 219 prop 7 === 214 (got " + r.prop7_219 + ")");
  check(r.prop7_233 === 224, "room 233 prop 7 === 224 (got " + r.prop7_233 + ")");
  check(r.d219 === 1, "roomDepth(219)===1 (got " + r.d219 + ")");
  check(r.d233 === 2, "roomDepth(233)===2 (got " + r.d233 + ")");
  check(r.down === "down", "levelChangeDir(219,233)==='down'");
  check(r.up === "up", "levelChangeDir(233,219)==='up'");
  check(r.depthStat === 1, "Depth stat at boot === 1 (got " + r.depthStat + ")");
  check(r.la != null && r.lb != null && r.lb === r.la - 1, "World levels differ by -1 (" + r.la + "->" + r.lb + ")");
  check(r.lab1 === "Depth 1" && r.lab2 === "Depth 2", "depthLabel Depth 1 / Depth 2: " + r.lab1 + "/" + r.lab2);

  await b.close();

  // Negative: Advent has no regionDepth fact
  const a = await boot("Advent.z5.js");
  const neg = await a.p.evaluate(() => {
    MapTopology._regionDepthCache = null;
    return MapTopology.regionDepthTable();
  });
  check(neg == null, "Advent.z5.js regionDepthTable() is null");
  await a.b.close();

  console.log(pass + " PASS, " + fail + " FAIL in " + (Date.now() - t0) + "ms");
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
