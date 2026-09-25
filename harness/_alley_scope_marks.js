const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const assert = require("node:assert/strict");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js");
  await page.waitForTimeout(1500);
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 14 && !(await page.locator(".Input.LineInput").count()); i++) {
    await page.keyboard.press("Space"); await page.waitForTimeout(300);
  }
  await page.locator(".Input.LineInput").waitFor({ state: "visible" });
  const go = async (t) => { await page.evaluate((x)=>{Input.Clear();Input.Inject(x,true);},t); await page.waitForTimeout(850); };
  await go("look"); await go("southeast"); await go("look");
  // Force map room then tick
  const info = await page.evaluate(() => {
    ParchLockMap.CurrentRoom = "Alley";
    ZvmCapture.tick();
    WorldModel.tick();
    // Force discoveredObjects exclusively id-backed from z-ram collect
    var z = ZRamProvider.collect();
    WorldModel.lastPayload.discoveredObjects = z.discoveredObjects;
    WorldModel.lastPayload.probe = z.probe;
    WorldModel.lastPayload.roomId = z.roomId;
    WorldModel.lastPayload.roomName = z.roomName;
    Actionable.Refresh();
    var objs = (WorldModel.lastPayload.discoveredObjects || []).map(o => ({ id: o.id, name: o.name, attrs: o.attrs }));
    var marks = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map(el => ({
      noun: el.dataset.noun, id: el.dataset.objectId, kind: el.dataset.kind
    }));
    var cmds = {};
    objs.forEach(o => {
      if (/can|fence|window|wall|umbrella/i.test(o.name||"")) {
        cmds[o.name] = ActionSynth.commandsForObject(o, "room").map(c => c.command);
      }
    });
    return { objs, marks, cmds, probe: WorldModel.lastPayload.probe, nouns: Actionable.DeterministicNouns() };
  });
  fs.mkdirSync("tools/screenshots/alley", { recursive: true });
  fs.writeFileSync("tools/screenshots/alley/ram-scope.json", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "tools/screenshots/alley/ram-scope.png", fullPage: true });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
