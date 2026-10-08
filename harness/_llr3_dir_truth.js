/**
 * LLR3: for current room, try every look-ahead command and record which
 * actually move. Also dump raw prop values and PROFILE labels.
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
    const s = document.querySelector(".parchlock-splash__start");
    if (s) s.click();
    try { Message.Hide(); } catch (e) {}
  });
  await page.waitForTimeout(1800);
  for (let i = 0; i < 25; i++) {
    if (await page.evaluate(() => !!document.querySelector(".Input.LineInput"))) break;
    await page.keyboard.press("Space").catch(() => {});
    await page.waitForTimeout(200);
  }
  if (await page.evaluate(() => /restore a saved game/i.test(document.body.innerText || ""))) {
    await page.evaluate(() => { Input.Clear(); Input.Inject("no", true); });
    await page.waitForTimeout(1500);
  }
  for (let i = 0; i < 30; i++) {
    const ok = await page.evaluate(() => {
      try { ZvmCapture.tick(); return !!(ZRamProvider.getMem() && ZRamReader.resolvePlayer(ZRamProvider.getMem()).id); }
      catch (e) { return false; }
    });
    if (ok) break;
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => { try { Message.Hide(); } catch (e) {} try { WorldModel.tick(); } catch (e) {} });
  await page.waitForTimeout(400);
}

async function inject(page, cmd) {
  await page.evaluate((c) => { try { Message.Hide(); } catch (e) {} Input.Clear(); Input.Inject(c, true); }, cmd);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { try { ZvmCapture.tick(); WorldModel.tick(); TranslatorUI.tick(); } catch (e) {} });
}

async function roomInfo(page) {
  return page.evaluate(() => {
    const mem = ZRamProvider.getMem();
    const snap = ZRamReader.snapshot(mem);
    const roomId = snap.roomId;
    const exits = ZRamReader.lookAheadExits(mem, roomId);
    const dp = ZRamReader.directionProps;
    const profile = dp.PROFILE || {};
    const count = ZRamReader.objectCount(mem, ZRamReader.header(mem));
    const props = {};
    for (let p = 1; p <= 40; p++) {
      const v = ZRamReader.readProp(mem, roomId, p);
      if (v >= 1 && v <= count) {
        props[p] = { v, profile: profile[p] || null, label: ZRamReader.directionLabelForProp(p),
          name: (ZRamReader.shortName(mem, v) || ""),
          exitTarget: ZRamReader.isPlausibleExitTarget(mem, v),
          mapRoom: ZRamReader.isPlausibleMapRoom(mem, v),
          location: ZRamReader.isLocationObject(mem, v, 0)
        };
      }
    }
    const status = ((document.querySelector(".GridWindow") || {}).innerText || "").replace(/\s+/g, " ").trim();
    const body = (document.body.innerText || "").slice(-800);
    return { roomId, status, exits, props, body, playerId: snap.playerId };
  });
}

(async () => {
  const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await boot(page);
  await inject(page, "look");
  const start = await roomInfo(page);

  // Try every look-ahead exit command from start room; undo via restoring room if moved
  // Save start room id; for each exit label try command; record moved?
  const trials = [];
  const cmds = Array.from(new Set([
    ...start.exits.map(e => e.command || e.label),
    "n","s","e","w","ne","nw","se","sw","u","d","up","down","in","out",
    "north","south","east","west","northeast","northwest","southeast","southwest"
  ]));

  for (const cmd of cmds) {
    const before = await roomInfo(page);
    await inject(page, cmd);
    const after = await roomInfo(page);
    const moved = before.roomId !== after.roomId;
    const cant = /can'?t go that way/i.test(after.body);
    trials.push({
      cmd, from: before.roomId, to: after.roomId, moved, cant,
      fromStatus: before.status, toStatus: after.status,
      lookAheadHad: before.exits.some(e => (e.command || e.label) === cmd || e.label === cmd)
    });
    // if moved, try to return by undoing — use `undo` if available
    if (moved) {
      await inject(page, "undo");
      const back = await roomInfo(page);
      if (back.roomId !== before.roomId) {
        // undo failed; try opposite guess later — restart by going back if look-ahead has reverse
        // For probe integrity, reboot if we're lost
        if (back.roomId !== start.roomId) {
          // attempt to get back to start via looking at exits - skip remaining if drifted far
        }
      }
    }
  }

  // After exploring, also move once to a neighbor and retest there
  let neighborTrial = null;
  const openCmd = trials.find(t => t.moved);
  if (openCmd) {
    // ensure at neighbor
    let cur = await roomInfo(page);
    if (cur.roomId === start.roomId) {
      await inject(page, openCmd.cmd);
      cur = await roomInfo(page);
    }
    const neighborExits = cur.exits;
    const nTrials = [];
    for (const e of neighborExits) {
      const cmd = e.command || e.label;
      const before = await roomInfo(page);
      await inject(page, cmd);
      const after = await roomInfo(page);
      nTrials.push({
        cmd, lookTarget: e.targetRoomId, from: before.roomId, to: after.roomId,
        moved: before.roomId !== after.roomId,
        cant: /can'?t go that way/i.test(after.body),
        status: after.status
      });
      if (before.roomId !== after.roomId) await inject(page, "undo");
    }
    // also try east/west specifically
    for (const cmd of ["e","w","east","west","up","down","n","s"]) {
      if (nTrials.some(t => t.cmd === cmd)) continue;
      const before = await roomInfo(page);
      await inject(page, cmd);
      const after = await roomInfo(page);
      nTrials.push({
        cmd, lookTarget: null, from: before.roomId, to: after.roomId,
        moved: before.roomId !== after.roomId,
        cant: /can'?t go that way/i.test(after.body),
        status: after.status,
        notInLookAhead: true
      });
      if (before.roomId !== after.roomId) await inject(page, "undo");
    }
    neighborTrial = { room: cur, trials: nTrials };
  }

  const out = { start, trials, neighborTrial, profile: null };
  out.profile = await page.evaluate(() => ZRamReader.directionProps.PROFILE);
  fs.writeFileSync("harness/_llr3_dir_truth.json", JSON.stringify(out, null, 2));
  console.log("START", start.status, "room", start.roomId);
  console.log("START_EXITS", JSON.stringify(start.exits));
  console.log("START_PROPS", JSON.stringify(start.props));
  console.log("TRIALS", JSON.stringify(trials.filter(t => t.moved || t.lookAheadHad || t.cant), null, 2));
  if (neighborTrial) {
    console.log("NEIGHBOR", neighborTrial.room.status, neighborTrial.room.roomId);
    console.log("NEIGHBOR_EXITS", JSON.stringify(neighborTrial.room.exits));
    console.log("NEIGHBOR_TRIALS", JSON.stringify(neighborTrial.trials, null, 2));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
