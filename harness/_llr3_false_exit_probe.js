/**
 * Live LLR3 false-exit probe: dump lookAheadExits, direction props, try up/e,
 * report map ExitMeta vs engine acceptance.
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem("PL_MobileTutorialSeen", "1");
    localStorage.setItem("PL_TutorialSeen", "1");
  });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/LLR3.z8.js&t=" + Date.now(), {
    waitUntil: "domcontentloaded"
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const start = document.querySelector(".parchlock-splash__start");
    if (start) start.click();
    try { Message.Hide(); } catch (e) {}
  });
  await page.waitForTimeout(1800);
  for (let i = 0; i < 25; i++) {
    const ready = await page.evaluate(() => !!document.querySelector(".Input.LineInput"));
    if (ready) break;
    await page.keyboard.press("Space").catch(() => {});
    await page.waitForTimeout(200);
  }
  const restore = await page.evaluate(() => /restore a saved game/i.test(document.body.innerText || ""));
  if (restore) {
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} Input.Clear(); Input.Inject("no", true); });
    await page.waitForTimeout(1500);
  }
  for (let i = 0; i < 30; i++) {
    const ready = await page.evaluate(() => {
      try {
        if (window.ZvmCapture) ZvmCapture.tick();
        const mem = ZRamProvider.getMem();
        return !!(mem && ZRamReader.resolvePlayer(mem).id);
      } catch (e) { return false; }
    });
    if (ready) break;
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => {
    try { Message.Hide(); } catch (e) {}
    try { ZvmCapture.tick(); } catch (e) {}
    try { WorldModel.tick(); } catch (e) {}
    try { TranslatorUI.tick(); } catch (e) {}
  });
  await page.waitForTimeout(400);
}

async function inject(page, cmd) {
  await page.evaluate((c) => { try { Message.Hide(); } catch (e) {} Input.Clear(); Input.Inject(c, true); }, cmd);
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    try { ZvmCapture.tick(); } catch (e) {}
    try { WorldModel.tick(); } catch (e) {}
    try { TranslatorUI.tick(); } catch (e) {}
    try { Actionable.Refresh(); } catch (e) {}
  });
}

async function dump(page, tag) {
  return page.evaluate((tag) => {
    const mem = ZRamProvider.getMem();
    const snap = ZRamReader.snapshot(mem);
    const roomId = snap && snap.roomId;
    const exits = roomId ? ZRamReader.lookAheadExits(mem, roomId) : [];
    const dp = ZRamReader.directionProps || {};
    const profile = dp.PROFILE || {};
    const props = {};
    const count = ZRamReader.objectCount(mem, ZRamReader.header(mem));
    function short(id) {
      try { return ZRamReader.shortName(mem, id) || ""; } catch (e) { return ""; }
    }
    function plaus(id) {
      try {
        return {
          mapRoom: !!(ZRamReader.isPlausibleMapRoom && ZRamReader.isPlausibleMapRoom(mem, id)),
          exitTarget: !!(ZRamReader.isPlausibleExitTarget && ZRamReader.isPlausibleExitTarget(mem, id)),
          location: !!(ZRamReader.isLocationObject && ZRamReader.isLocationObject(mem, id, 0)),
          name: short(id),
          attrs: ZRamReader.attrsFromObject(mem, id) || {},
          links: ZRamReader.objectLinks(mem, id)
        };
      } catch (e) { return { err: String(e) }; }
    }
    (dp.candidates || Object.keys(profile).map(Number)).forEach((p) => {
      const v = ZRamReader.readProp(mem, roomId, p);
      if (v >= 1 && v <= count) {
        props[p] = {
          label: ZRamReader.directionLabelForProp(p),
          profile: profile[p] || null,
          dest: v,
          info: plaus(v)
        };
      }
    });
    // also scan 1-48 for object-valued props
    const scan = [];
    for (let p = 1; p <= 48; p++) {
      const v = ZRamReader.readProp(mem, roomId, p);
      if (!(v >= 2 && v <= count)) continue;
      const info = plaus(v);
      scan.push({ prop: p, dest: v, label: ZRamReader.directionLabelForProp(p), info });
    }
    const rooms = (ParchLockMap.Rooms || []).map((r) => ({
      Name: r.Name, ObjectId: r.ObjectId, HasRealId: !!r.HasRealId,
      Exits: r.Exits || {}, ExitMeta: r.ExitMeta || {}
    }));
    const body = (document.body.innerText || "").slice(-1200);
    const status = (document.querySelector(".GridWindow") || {}).innerText || "";
    const stats = (document.querySelector("#map-stats") || {}).textContent || "";
    const blocked = (() => {
      try {
        const t = ExitCalibrator.hydrate(mem);
        return t && t.blocked || {};
      } catch (e) { return {}; }
    })();
    return {
      tag,
      roomId,
      roomName: snap && snap.roomName,
      roomSource: snap && snap.probe && snap.probe.roomSource,
      playerId: snap && snap.playerId,
      status,
      stats,
      exits,
      props,
      scan,
      rooms,
      blocked,
      bodyTail: body,
      isInform: ZRamReader.isInformCompiled(mem)
    };
  }, tag);
}

(async () => {
  const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await boot(page);

  // Try several boots / moves to find a room with UP-like look-ahead mismatch
  const results = [];
  results.push(await dump(page, "boot"));

  // explore a bit: look, then try compasses that might reveal false exits
  for (const cmd of ["look", "e", "look", "w", "look", "n", "look", "s", "look", "up", "look", "down"]) {
    await inject(page, cmd);
    results.push(Object.assign(await dump(page, "after:" + cmd), { cmd }));
  }

  // Focus: for each dump, find exits where command would fail? We already tried up/down.
  // Summarize mismatches: exits whose label we tried and body contains can't go
  const out = {
    summary: results.map((r) => ({
      tag: r.tag,
      roomId: r.roomId,
      roomName: r.roomName,
      exitLabels: (r.exits || []).map((e) => e.label + "->" + e.targetRoomId + ":" + (e.targetRoomName || "")),
      propDirs: Object.keys(r.props || {}).map((p) => p + "=" + r.props[p].label + "->" + r.props[p].dest + ":" + (r.props[p].info.name || "")),
      roomCount: (r.rooms || []).length,
      stats: r.stats,
      status: (r.status || "").replace(/\s+/g, " ").trim().slice(0, 120),
      blocked: r.blocked,
      bodyHasCant: /can'?t go that way/i.test(r.bodyTail || "")
    })),
    fullLast: results[results.length - 1],
    // find any room dump where look-ahead has up/down
    withVertical: results.filter((r) => (r.exits || []).some((e) => /^(up|down|u|d)$/i.test(e.label))).map((r) => ({
      tag: r.tag,
      roomId: r.roomId,
      roomName: r.roomName,
      exits: r.exits,
      props: r.props,
      status: (r.status || "").replace(/\s+/g, " ").trim(),
      bodyTail: (r.bodyTail || "").slice(-500),
      rooms: r.rooms
    }))
  };

  fs.writeFileSync("harness/_llr3_false_exit_probe.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log("VERTICAL_CASES", out.withVertical.length);
  if (out.withVertical[0]) {
    console.log("FIRST_VERTICAL", JSON.stringify(out.withVertical[0], null, 2).slice(0, 4000));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
