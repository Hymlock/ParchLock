const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);
async function boot(page, story) {
  await page.addInitScript(() => { localStorage.setItem("PL_MobileTutorialSeen","1"); localStorage.setItem("PL_TutorialSeen","1"); });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/" + story + "&t=" + Date.now(), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); try { Message.Hide(); } catch (e) {} });
  await page.waitForTimeout(2000);
  for (let i = 0; i < 30; i++) {
    if (await page.evaluate(() => !!document.querySelector(".Input.LineInput"))) break;
    await page.keyboard.press("Space").catch(() => {});
    await page.waitForTimeout(200);
  }
  if (await page.evaluate(() => /restore a saved game/i.test(document.body.innerText || ""))) {
    await page.evaluate(() => { Input.Clear(); Input.Inject("no", true); });
    await page.waitForTimeout(1500);
  }
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate(() => { try { ZvmCapture.tick(); const m=ZRamProvider.getMem(); return !!(m && ZRamReader.findLikelyLocation(m)); } catch(e){ return false; } });
    if (ok) break;
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => { try { Message.Hide(); WorldModel.tick(); } catch(e){} });
}
async function inject(page, cmd) {
  await page.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, cmd);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { try { ZvmCapture.tick(); WorldModel.tick(); } catch(e){} });
}
(async () => {
  const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const page = await browser.newPage();
  await boot(page, "anchor.z8.js");
  await inject(page, "look");
  const before = await page.evaluate(() => {
    const mem = ZRamProvider.getMem();
    const id = ZRamReader.snapshot(mem).roomId;
    const count = ZRamReader.objectCount(mem, ZRamReader.header(mem));
    const props = {};
    for (let p=1;p<=20;p++){ const v=ZRamReader.readProp(mem,id,p); if(v>=1&&v<=count) props[p]={v,name:ZRamReader.shortName(mem,v)||"", label:ZRamReader.directionLabelForProp(p)}; }
    return { id, props, exits: ZRamReader.lookAheadExits(mem,id), status: ((document.querySelector(".GridWindow")||{}).innerText||"").trim().slice(0,80) };
  });
  await inject(page, "east");
  const after = await page.evaluate(() => {
    const mem = ZRamProvider.getMem();
    const id = ZRamReader.snapshot(mem).roomId;
    return { id, name: ZRamReader.shortName(mem,id)||"", status: ((document.querySelector(".GridWindow")||{}).innerText||"").trim().slice(0,80) };
  });
  const fwd = Object.keys(before.props).filter(p => before.props[p].v === after.id);
  console.log(JSON.stringify({ before, after, forwardProps: fwd }, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
