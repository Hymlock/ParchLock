const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

(async () => {
  const files = fs.readdirSync("games").filter((f) => /\.(z3|z5|z8|zblorb)\.js$/i.test(f));
  const picks = [];
  const want = [
    [/anchor/i, "anchorhead", ["look", "southeast", "look"]],
    [/lost.?pig/i, "lostpig", ["look"]],
    [/advent/i, "advent", ["look"]],
    [/wump2ka/i, "wump2ka", ["no", "look"]],
    [/yagwad/i, "yagwad", ["look"]],
    [/\.z3\.js$/i, "z3", ["look"]],
    [/\.zblorb\.js$/i, "zblorb", ["look"]]
  ];
  const used = new Set();
  for (const [re, name, cmds] of want) {
    const f = files.find((x) => re.test(x) && !used.has(x));
    if (!f) continue;
    used.add(f);
    picks.push({ story: "games/" + f, name, cmds });
  }
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const out = [];
  for (const entry of picks) {
    const page = await browser.newPage();
    const row = { name: entry.name, ok: false };
    try {
      await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + entry.story);
      await page.evaluate(() => { const start = document.querySelector('.parchlock-splash__start'); if (start) start.click(); });
      await page.waitForTimeout(1200);
      await page.evaluate(() => { if (window.Message) Message.Hide(); });
      for (let i = 0; i < 18 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space"); await page.waitForTimeout(250);
      }
      if (await page.locator(".Input.LineInput").count()) {
        for (const c of entry.cmds) {
          await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, c);
          await page.waitForTimeout(850);
          for (let i = 0; i < 12 && await page.locator('.Input.CharInput').count(); i++) {
            await page.keyboard.press('Space'); await page.waitForTimeout(250);
          }
        }
      }
      const info = await page.evaluate(() => {
        ZvmCapture.tick(); WorldModel.tick(); Actionable.Refresh();
        const p = WorldModel.lastPayload;
        const mem = ZRamProvider.getMem(), player = p && (p.playerId || (p.probe || {}).playerId);
        const children = mem && p && p.roomId ? ZRamReader.children(mem, p.roomId) : [];
        return {
          zvm: !!window.__PARCHLOCK_ZVM__,
          playerId: p && p.probe && p.probe.playerId,
          roomId: p && p.roomId,
          roomName: p && p.roomName,
          scope: ((p && p.discoveredObjects) || []).filter((o) => o && o.id).map((o) => o.name + ":" + o.id).slice(0, 10),
          scopeCount: p && p.probe && p.probe.scopeCount,
          // D184 direct containment-backed unnamed candidates are real scope;
          // do not substitute arbitrary prose or every raw object in RAM.
          unnamedScope: ((p && p.unnamedCandidates) || []).filter(o => o && o.id && String(o.parentId) === String(p.roomId)).map(o => o.id),
          // Randomized Accuse can legitimately start with no room objects.
          // Require real player containment and no non-player direct child,
          // rather than blessing an empty VM/payload as a pass.
          structurallyEmpty: !!(mem && p.roomId && player && ZRamReader.objectLinks(mem, player)
            && String(ZRamReader.objectLinks(mem, player).parent) === String(p.roomId)
            && children.every(id => String(id) === String(player))),
          idMarks: Array.from(document.querySelectorAll(".pl-act[data-object-id]")).length,
          status: ZRamProvider.resolveStatusRoom && ZRamProvider.resolveStatusRoom()
        };
      });
      row.info = info;
      // Holistic pass: ZVM up + (scope>0 OR specialized with no room yet but zvm)
      if (!info.zvm) throw new Error("no zvm");
      if ((info.scopeCount || 0) > 0 || (info.scope && info.scope.length > 0) || info.unnamedScope.length > 0) {
        row.ok = true; row.mode = "structural-scope";
      } else if (info.structurallyEmpty) {
        row.ok = true; row.mode = "structurally-empty-room";
      } else {
        // Still fail soft for now but report ? we want scope
        row.ok = false; row.mode = "no-scope"; row.err = "zvm live but scope 0";
      }
    } catch (e) {
      row.err = String(e.message || e); row.ok = false;
    }
    out.push(row);
    console.log(row.ok ? "PASS" : "FAIL", row.name, row.mode, row.info && row.info.roomName, "scope", row.info && row.info.scopeCount, row.err || "");
    await page.close();
  }
  await browser.close();
  fs.mkdirSync("tools/screenshots/matrix", { recursive: true });
  fs.writeFileSync("tools/screenshots/matrix/holistic-scope.json", JSON.stringify(out, null, 2));
  const failed = out.filter((r) => !r.ok);
  console.log(JSON.stringify({ passed: out.length - failed.length, total: out.length, failed: failed.map((f) => f.name) }));
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });
