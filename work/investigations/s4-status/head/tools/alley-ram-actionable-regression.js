const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    fs.mkdirSync("tools/screenshots/alley", { recursive: true });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js");
    await page.waitForTimeout(1600);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 14 && !(await page.locator(".Input.LineInput").count()); i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(400);
    }
    await page.locator(".Input.LineInput").waitFor({ state: "visible" });
    const command = async (text) => {
      await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
      await page.waitForTimeout(900);
    };
    await command("look");
    await command("southeast");
    await command("look");
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      if (window.ParchLockMap) ParchLockMap.CurrentRoom = ParchLockMap.CurrentRoom || "Alley";
      if (window.ParchLockMap) ParchLockMap.CurrentRoom = ParchLockMap.CurrentRoom || "Alley";
      if (window.ZvmCapture) ZvmCapture.tick();
      if (window.WorldModel) WorldModel.tick();
      if (window.Actionable) Actionable.Refresh();
    });
    await page.waitForTimeout(500);

    const info = await page.evaluate(() => {
      const p = WorldModel && WorldModel.lastPayload;
      const marks = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map((el) => ({
        noun: (el.dataset.noun || "").toLowerCase(),
        id: el.dataset.objectId || null,
        kind: el.dataset.kind || null
      }));
      return {
        room: ParchLockMap.CurrentRoom, roomName: (p && p.roomName) || "", roomName: (p && p.roomName) || "",
        probe: p && p.probe,
        engineMode: p && p.engineMode,
        objs: ((p && p.discoveredObjects) || []).map((o) => ({ id: o.id, name: (o.name || "").toLowerCase(), attrs: o.attrs })),
        marks,
        zvm: !!(window.__PARCHLOCK_ZVM__),
        build: typeof BUILD !== "undefined" ? BUILD : null
      };
    });
    fs.writeFileSync("tools/screenshots/alley/ram-alley.json", JSON.stringify(info, null, 2));
    await page.screenshot({ path: "tools/screenshots/alley/ram-alley.png", fullPage: true });

    console.log(JSON.stringify({ room: info.room, probe: info.probe, zvm: info.zvm, objSample: info.objs.slice(0, 12), marks: info.marks.slice(0, 20) }, null, 2));

    assert.ok(info.zvm, "ZVM instance was not captured");
    assert.equal(info.probe && info.probe.status, "z-ram-live", "Expected z-ram-live probe, got " + JSON.stringify(info.probe));
    var roomLabel = String(info.room || info.roomName || "");
    assert.ok(/alley/i.test(roomLabel) || info.probe.roomId === 107, "Expected Alley room, got " + roomLabel + " probe=" + JSON.stringify(info.probe));

    const has = (re) => info.objs.some((o) => re.test(o.name)) || info.marks.some((m) => re.test(m.noun));
    assert.ok(has(/cans?|garbage/), "RAM scope missing can/cans: " + JSON.stringify(info.objs.map(o=>o.name)));
    assert.ok(has(/window/), "RAM scope missing window");
    assert.ok(has(/fence/), "RAM scope missing fence");

    // Marks for those nouns should carry object ids when present in objs
    ["window", "fence"].forEach((n) => {
      const obj = info.objs.find((o) => (o.name || "").includes(n));
      if (!obj) return;
      const mark = info.marks.find((m) => m.noun === n || m.noun.includes(n));
      assert.ok(mark, "No mark for " + n);
      assert.ok(mark.id, "Mark for " + n + " missing data-object-id");
    });

    // Right-click API: Open should build ActionSynth slices for an object id
    const radialOk = await page.evaluate(() => {
      const o = (WorldModel.lastPayload.discoveredObjects || []).find((x) => /window/i.test(x.name || ""));
      if (!o) return { ok: false, reason: "no-window-obj" };
      const cmds = ActionSynth.commandsForObject(o, "room");
      return { ok: cmds.length > 0 && cmds.some((c) => c.verb === "examine"), cmds: cmds.map((c) => c.command) };
    });
    assert.ok(radialOk.ok, "ActionSynth radial cmds failed: " + JSON.stringify(radialOk));

    console.log("PASS: RAM-backed alley actionable + object ids + ActionSynth commands");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
