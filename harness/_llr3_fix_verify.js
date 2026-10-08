const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
process.chdir(path.resolve(__dirname, ".."));

async function boot(page, story) {
  await page.addInitScript(() => {
    localStorage.setItem("PL_MobileTutorialSeen", "1");
    localStorage.setItem("PL_TutorialSeen", "1");
    // clear any diagonal calib so we test discovery alone
    Object.keys(localStorage).forEach(k => { if (/PL_DiagonalCalib_|PL_ExitCalib/.test(k)) localStorage.removeItem(k); });
  });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/" + story + "&t=" + Date.now(), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(350);
  await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); try { Message.Hide(); } catch (e) {} });
  await page.waitForTimeout(1600);
  for (let i = 0; i < 25; i++) {
    if (await page.evaluate(() => !!document.querySelector(".Input.LineInput"))) break;
    await page.keyboard.press("Space").catch(() => {});
    await page.waitForTimeout(200);
  }
  if (await page.evaluate(() => /restore a saved game/i.test(document.body.innerText || ""))) {
    await page.evaluate(() => { Input.Clear(); Input.Inject("no", true); });
    await page.waitForTimeout(1200);
  }
  for (let i = 0; i < 30; i++) {
    const ok = await page.evaluate(() => { try { ZvmCapture.tick(); return !!(ZRamProvider.getMem() && ZRamReader.header(ZRamProvider.getMem())); } catch (e) { return false; } });
    if (ok) break;
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => { try { Message.Hide(); WorldModel.tick(); } catch (e) {} });
}
async function inject(page, cmd) {
  await page.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, cmd);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { try { ZvmCapture.tick(); WorldModel.tick(); TranslatorUI.tick(); } catch (e) {} });
}

(async () => {
  const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const out = {};

  // --- LLR3 ---
  {
    const page = await browser.newPage();
    await boot(page, "LLR3.z8.js");
    await inject(page, "look");
    const disc = await page.evaluate(() => {
      const mem = ZRamProvider.getMem();
      const d = ZRamReader.discoverCompassProfile(mem);
      const snap = ZRamReader.snapshot(mem);
      const exits = ZRamReader.lookAheadExits(mem, snap.roomId);
      return {
        doorProp: d && d.doorProp,
        labeled: d && d.labeled,
        profile: d && d.profile,
        roomId: snap.roomId,
        status: ((document.querySelector(".GridWindow") || {}).innerText || "").replace(/\s+/g, " ").trim(),
        exits: exits.map(e => ({ label: e.label, prop: e.prop, dest: e.targetRoomId, name: e.targetRoomName, amb: !!e.ambiguousDiagonal }))
      };
    });
    // Move east then check exits don't include false up
    await inject(page, "east");
    const afterEast = await page.evaluate(() => {
      const mem = ZRamProvider.getMem();
      const snap = ZRamReader.snapshot(mem);
      const exits = ZRamReader.lookAheadExits(mem, snap.roomId);
      const rooms = (ParchLockMap.Rooms || []).map(r => ({ Name: r.Name, Exits: r.Exits, ExitMeta: Object.keys(r.ExitMeta || {}) }));
      return {
        roomId: snap.roomId,
        status: ((document.querySelector(".GridWindow") || {}).innerText || "").replace(/\s+/g, " ").trim(),
        exits: exits.map(e => ({ label: e.label, prop: e.prop, dest: e.targetRoomId })),
        stats: (document.querySelector("#map-stats") || {}).textContent || "",
        rooms,
        falseUp: exits.some(e => e.label === "up"),
        hasWest: exits.some(e => e.label === "west"),
        hasNorth214: exits.some(e => e.label === "north" && e.targetRoomId === 214)
      };
    });
    // Try up — should fail; west should work if west is in look-ahead to previous
    const beforeUp = afterEast.roomId;
    await inject(page, "up");
    const afterUp = await page.evaluate(() => ZRamReader.snapshot(ZRamProvider.getMem()).roomId);
    await inject(page, "west");
    const afterWest = await page.evaluate(() => ({
      roomId: ZRamReader.snapshot(ZRamProvider.getMem()).roomId,
      status: ((document.querySelector(".GridWindow") || {}).innerText || "").replace(/\s+/g, " ").trim()
    }));
    // Stats
    const stats = await page.evaluate(() => {
      try { WorldModel.tick(); StatTracker.Render && StatTracker.Render(); } catch (e) {}
      const model = StatTracker.model ? StatTracker.model() : null;
      return {
        model,
        hud: (WorldModel.lastPayload && WorldModel.lastPayload.hudMetrics) || null,
        status: ((document.querySelector(".GridWindow") || {}).innerText || "").replace(/\s+/g, " ").trim()
      };
    });
    out.llr = { disc, afterEast, upMoved: afterUp !== beforeUp, westBack: afterWest, stats };
    await page.close();
  }

  // --- Anchorhead ---
  {
    const page = await browser.newPage();
    await boot(page, "anchor.z8.js");
    await inject(page, "look");
    const info = await page.evaluate(() => {
      const mem = ZRamProvider.getMem();
      const d = ZRamReader.discoverCompassProfile(mem);
      const snap = ZRamReader.snapshot(mem);
      const exits = ZRamReader.lookAheadExits(mem, snap.roomId);
      return {
        doorProp: d && d.doorProp,
        labeled: d && d.labeled,
        profile: d && d.profile,
        status: ((document.querySelector(".GridWindow") || {}).innerText || "").replace(/\s+/g, " ").trim(),
        exits: exits.map(e => ({ label: e.label, prop: e.prop, dest: e.targetRoomId, name: e.targetRoomName, amb: !!e.ambiguousDiagonal })),
        hasEast: exits.some(e => e.label === "east"),
        hasWest: exits.some(e => e.label === "west"),
        hasAmbiguousAlley: exits.some(e => e.ambiguousDiagonal)
      };
    });
    out.anchor = info;
    await page.close();
  }

  fs.writeFileSync("harness/_llr3_fix_verify.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
