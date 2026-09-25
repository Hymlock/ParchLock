const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js");
  await page.waitForTimeout(1500);
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 14 && !(await page.locator(".Input.LineInput").count()); i++) {
    await page.keyboard.press("Space"); await page.waitForTimeout(300);
  }
  await page.locator(".Input.LineInput").waitFor({ state: "visible" });
  const go = async (t) => { await page.evaluate((x)=>{Input.Clear();Input.Inject(x,true);},t); await page.waitForTimeout(850); };
  await go("look"); await go("southeast"); await go("look");
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    ZvmCapture.tick();
    WorldModel.tick();
    Actionable.Refresh();
    const mem = ZRamProvider.getMem();
    const hits = ZRamReader.findRoomsByName(mem, "alley");
    const snap = ZRamReader.snapshot(mem);
    // Force provider path with map room
    ParchLockMap.CurrentRoom = "Alley";
    const payload = ZRamProvider.collect();
    const marks = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map(el => ({
      noun: el.dataset.noun, id: el.dataset.objectId
    }));
    return {
      hits: hits.slice(0,5),
      snap: { roomId: snap.roomId, roomName: snap.roomName, n: (snap.discoveredObjects||[]).length, sample: (snap.discoveredObjects||[]).slice(0,8).map(o=>o.name+":"+o.id) },
      payload: { roomId: payload.roomId, roomName: payload.roomName, scope: payload.probe && payload.probe.scopeCount, sample: (payload.discoveredObjects||[]).slice(0,8).map(o=>o.name+":"+o.id) },
      marks: marks.filter(m => /can|window|fence|garbage|transom/i.test(m.noun||"")).slice(0,20),
      allMarks: marks.length,
      wm: WorldModel.lastPayload && WorldModel.lastPayload.probe
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e=>{console.error(e); process.exitCode=1;});
