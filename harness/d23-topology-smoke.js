const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");
const assert = require("assert");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  try {
  const page = await browser.newPage();
  const story = "games/" + fs.readdirSync("games").find((f) => /lost.?pig/i.test(f));
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
  await page.waitForTimeout(1400);
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 16 && !(await page.locator(".Input.LineInput").count()); i++) {
    await page.keyboard.press("Space"); await page.waitForTimeout(250);
  }
  await page.locator(".Input.LineInput").waitFor({ state: "visible" });
  const go = async (t) => { await page.evaluate((x) => { Input.Clear(); Input.Inject(x, true); }, t); await page.waitForTimeout(900); };
  await go("look");
  const r = await page.evaluate(() => {
    ZvmCapture.tick(); WorldModel.tick();
    if (TranslatorUI && TranslatorUI.tick) TranslatorUI.tick();
    MapTopology.noteCommand("enter portal");
    const cur = WorldModel.lastPayload.roomName || "Here";
    MapTopology.prevRoomName = cur;
    MapTopology.prevRoomId = WorldModel.lastPayload.roomId || 1;
    // A name-only transition is the honest fixture here. The old synthetic
    // object id 99999 is structurally impossible in the live story and is
    // correctly rejected by isPlausibleMapRoom before link creation.
    MapTopology.applyStateDelta(Object.assign({}, WorldModel.lastPayload, { roomName: cur + " Annex", roomId: null }));
    const rooms = ParchLockMap.Rooms.map((room) => ({
      name: room.Name,
      exits: Object.keys(room.Exits || {}).map((k) => ({ k: k, meta: (room.ExitMeta || {})[k] }))
    }));
    return {
      build: BUILD,
      hasTopo: typeof MapTopology !== "undefined",
      hasPortalEdge: rooms.some((room) => (room.exits || []).some((e) => e.k === "enter portal" && e.meta && e.meta.isNonCardinal)),
      ncExits: (WorldModel.lastPayload.exits || []).filter((e) => e.isNonCardinal).length,
      allExits: (WorldModel.lastPayload.exits || []).length
    };
  });
  console.log(JSON.stringify(r, null, 2));
  assert.ok(r.hasTopo, "MapTopology missing");
  assert.ok(r.hasPortalEdge, "state-delta non-cardinal edge missing");
  console.log("PASS D23 topology smoke");
  } finally {
  await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
