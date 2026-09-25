const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");
const assert = require("assert");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage();
  const story = "games/" + fs.readdirSync("games").find((f) => /lost.?pig/i.test(f));
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { if (window.Message) Message.Hide(); });
  for (let i = 0; i < 14 && !(await page.locator(".Input.LineInput").count()); i++) {
    await page.keyboard.press("Space"); await page.waitForTimeout(220);
  }
  await page.locator(".Input.LineInput").waitFor({ state: "visible" });
  const snap = async () => page.evaluate(() => {
    ZvmCapture.tick();
    const p = ZRamProvider.collect();
    return { room: p.roomName, id: p.roomId, scope: p.probe.scopeCount, via: (() => {
      const mem = ZRamProvider.getMem();
      const pl = ZRamReader.objectLinks(mem, p.probe.playerId);
      return pl && pl.parent === p.roomId;
    })(), inv: (p.inventory||[]).map(o=>o.name) };
  });
  await page.evaluate(() => { Input.Clear(); Input.Inject("look", true); });
  await page.waitForTimeout(900);
  const a = await snap();
  await page.evaluate(() => { Input.Clear(); Input.Inject("east", true); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { Input.Clear(); Input.Inject("look", true); });
  await page.waitForTimeout(900);
  const b = await snap();
  console.log(JSON.stringify({ a, b }, null, 2));
  assert.ok(a.room && a.scope > 0 && a.via, "start room from parent(player)");
  // room may or may not change on east; if changed must still be via parent
  if (b.id !== a.id) assert.ok(b.via && b.scope >= 0, "new room still parent cascade");
  assert.ok(b.via, "still decoding via parent after move");
  console.log("PASS as-you-go move cascade");
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
