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
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/LLR3.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); try { Message.Hide(); } catch (e) {} });
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
    const ok = await page.evaluate(() => { try { ZvmCapture.tick(); return !!(ZRamProvider.getMem() && ZRamReader.resolvePlayer(ZRamProvider.getMem()).id); } catch (e) { return false; } });
    if (ok) break;
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => { try { Message.Hide(); WorldModel.tick(); } catch (e) {} });
  await page.waitForTimeout(300);
}
async function inject(page, cmd) {
  await page.evaluate((c) => { Input.Clear(); Input.Inject(c, true); }, cmd);
  await page.waitForTimeout(900);
  await page.evaluate(() => { try { ZvmCapture.tick(); WorldModel.tick(); } catch (e) {} });
}

(async () => {
  const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const page = await browser.newPage();
  await boot(page);
  await inject(page, "look");

  const info = await page.evaluate(() => {
    const mem = ZRamProvider.getMem();
    const h = ZRamReader.header(mem);
    const count = ZRamReader.objectCount(mem, h);
    function dumpObj(id) {
      const name = ZRamReader.shortName(mem, id) || "";
      const links = ZRamReader.objectLinks(mem, id);
      const attrs = ZRamReader.attrsFromObject(mem, id) || {};
      const words = (ZRamReader.parserWordsAny && ZRamReader.parserWordsAny(mem, id)) || [];
      const props = {};
      for (let p = 1; p <= 64; p++) {
        const v = ZRamReader.readProp(mem, id, p);
        if (v != null && v !== 0) props[p] = v;
      }
      // children
      const kids = (ZRamReader.children(mem, id) || []).map(k => ({ id: k, name: ZRamReader.shortName(mem, k) || "" }));
      return { id, name, links, attrs, words, props, kids,
        mapRoom: ZRamReader.isPlausibleMapRoom(mem, id),
        exitTarget: ZRamReader.isPlausibleExitTarget(mem, id),
        location: ZRamReader.isLocationObject(mem, id, 0)
      };
    }
    const snap = ZRamReader.snapshot(mem);
    const roomId = snap.roomId;
    // Compare prop vectors across a few known room ids near start (210-230)
    const roomProps = {};
    for (let id = 210; id <= 230; id++) {
      const loc = ZRamReader.isLocationObject(mem, id, 0);
      const name = ZRamReader.shortName(mem, id) || "";
      if (!loc && name) continue;
      if (!loc && !name) {
        // still check if parent 0 location-shaped
        const lk = ZRamReader.objectLinks(mem, id);
        if (!lk || lk.parent !== 0) continue;
      }
      const props = {};
      for (let p = 1; p <= 30; p++) {
        const v = ZRamReader.readProp(mem, id, p);
        if (v >= 1 && v <= count) props[p] = v;
      }
      roomProps[id] = {
        name, loc, exitTarget: ZRamReader.isPlausibleExitTarget(mem, id),
        mapRoom: ZRamReader.isPlausibleMapRoom(mem, id),
        props, child: (ZRamReader.objectLinks(mem, id) || {}).child,
        parent: (ZRamReader.objectLinks(mem, id) || {}).parent
      };
    }
    // After travel calibration candidates: find which prop changed to hold destination
    return {
      player: dumpObj(snap.playerId),
      room: dumpObj(roomId),
      obj214: dumpObj(214),
      obj13: dumpObj(13),
      profile: ZRamReader.directionProps.PROFILE,
      roomProps,
      status: ((document.querySelector(".GridWindow") || {}).innerText || "").trim()
    };
  });

  // Travel east and see which prop on source held destination, and which on dest holds source
  const before = await page.evaluate(() => ZRamReader.snapshot(ZRamProvider.getMem()).roomId);
  const beforeProps = await page.evaluate((id) => {
    const mem = ZRamProvider.getMem();
    const count = ZRamReader.objectCount(mem, ZRamReader.header(mem));
    const props = {};
    for (let p = 1; p <= 30; p++) {
      const v = ZRamReader.readProp(mem, id, p);
      if (v >= 1 && v <= count) props[p] = v;
    }
    return props;
  }, before);
  await inject(page, "east");
  const after = await page.evaluate(() => {
    const mem = ZRamProvider.getMem();
    const snap = ZRamReader.snapshot(mem);
    const count = ZRamReader.objectCount(mem, ZRamReader.header(mem));
    const props = {};
    for (let p = 1; p <= 30; p++) {
      const v = ZRamReader.readProp(mem, snap.roomId, p);
      if (v >= 1 && v <= count) props[p] = v;
    }
    const status = ((document.querySelector(".GridWindow") || {}).innerText || "").trim();
    return { roomId: snap.roomId, props, status, exits: ZRamReader.lookAheadExits(mem, snap.roomId) };
  });

  // Find props on before that equal after.roomId
  const forwardProps = Object.keys(beforeProps).filter(p => beforeProps[p] === after.roomId);
  const backProps = Object.keys(after.props).filter(p => after.props[p] === before);

  // Try more travels to build prop->direction evidence
  const evidence = [];
  async function tryMove(cmd) {
    const b = await page.evaluate(() => {
      const mem = ZRamProvider.getMem();
      const id = ZRamReader.snapshot(mem).roomId;
      const count = ZRamReader.objectCount(mem, ZRamReader.header(mem));
      const props = {};
      for (let p = 1; p <= 30; p++) {
        const v = ZRamReader.readProp(mem, id, p);
        if (v >= 1 && v <= count) props[p] = v;
      }
      return { id, props, status: ((document.querySelector(".GridWindow") || {}).innerText || "").trim() };
    });
    await inject(page, cmd);
    const a = await page.evaluate(() => {
      const mem = ZRamProvider.getMem();
      const id = ZRamReader.snapshot(mem).roomId;
      const count = ZRamReader.objectCount(mem, ZRamReader.header(mem));
      const props = {};
      for (let p = 1; p <= 30; p++) {
        const v = ZRamReader.readProp(mem, id, p);
        if (v >= 1 && v <= count) props[p] = v;
      }
      return { id, props, status: ((document.querySelector(".GridWindow") || {}).innerText || "").trim() };
    });
    if (b.id !== a.id) {
      const fwd = Object.keys(b.props).filter(p => b.props[p] === a.id).map(Number);
      const back = Object.keys(a.props).filter(p => a.props[p] === b.id).map(Number);
      evidence.push({ cmd, from: b.id, to: a.id, fromStatus: b.status, toStatus: a.status, fwd, back, fromProps: b.props, toProps: a.props });
    }
    return a.id !== b.id;
  }
  for (const cmd of ["west","east","north","south","east","west","north","south","northeast","northwest","southeast","southwest","up","down"]) {
    await tryMove(cmd);
  }

  const out = {
    status: info.status,
    obj214: info.obj214,
    obj13: { id: info.obj13.id, name: info.obj13.name, attrs: info.obj13.attrs, words: info.obj13.words, links: info.obj13.links },
    room: { id: info.room.id, name: info.room.name, props: info.room.props, words: info.room.words },
    profile: info.profile,
    firstEast: { before, beforeProps, after, forwardProps, backProps },
    evidence
  };
  fs.writeFileSync("harness/_llr3_prop_calib.json", JSON.stringify(out, null, 2));
  console.log("OBJ214", JSON.stringify(info.obj214, null, 2).slice(0, 2000));
  console.log("EVIDENCE", JSON.stringify(evidence, null, 2));
  console.log("FIRST_EAST", JSON.stringify({ before, after: after.roomId, forwardProps, backProps, afterStatus: after.status }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
