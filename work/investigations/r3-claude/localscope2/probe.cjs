// Usage: node probe.cjs <Story> <prop> <holder> <litBit> <out.json> <steps...>
// step: plain command, or "@" = dump room property/lit/discovered
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { pathToFileURL } = require('url');
const [STORY, PROP, HOLDER, LIT, OUT, ...STEPS] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
    for (const x of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(x,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + STORY);
  await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 30; i++) {
    await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} });
    if (await p.locator('.Input.LineInput').count()) return; await p.keyboard.press('Space'); await p.waitForTimeout(200); } };
  await settle();
  const log = [];
  for (const s of STEPS) {
    if (s === '@') {
      const d = await p.evaluate(([P, H, L]) => { try { WorldModel.tick(); } catch (e) {}
        const mem = ZRamProvider.getMem(); const pl = WorldModel.lastPayload || {}; const r = pl.roomId;
        const pr = ZRamReader.listProps(mem, r).find(x => x.num === P); const ids = [];
        if (pr) for (let i = 0; i < pr.sz; i++) ids.push(ZRamReader.u8(mem, pr.dataAddr + i));
        return { roomId: r, roomName: ZRamReader.shortName(mem, r), lit: !!ZRamReader.attr(ZRamReader.objectLinks(mem, r), L),
          prop: pr ? { num: P, sz: pr.sz, dataAddr: pr.dataAddr } : null,
          localGlobals: ids.map(id => ({ id, name: ZRamReader.shortName(mem, id), parent: ZRamReader.objectLinks(mem, id).parent, parentIsHolder: ZRamReader.objectLinks(mem, id).parent === H })),
          discoveredObjects: (pl.discoveredObjects || []).map(o => o.name || o.label || o) };
      }, [+PROP, +HOLDER, +LIT]);
      log.push({ dump: d }); console.log(JSON.stringify(d)); continue;
    }
    await p.evaluate(() => { document.querySelectorAll('.BufferLine').forEach(l => l.dataset.seen = '1'); });
    await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, s);
    await p.waitForTimeout(700); await settle();
    const reply = await p.evaluate(() => [...document.querySelectorAll('.BufferLine')].filter(l => !l.dataset.seen).map(l => l.textContent.trim()).filter(Boolean));
    const room = await p.evaluate(() => { try { WorldModel.tick(); } catch (e) {} return WorldModel.lastPayload && WorldModel.lastPayload.roomId; });
    log.push({ cmd: s, roomIdAfter: room, reply }); console.log(s, '=>', room, JSON.stringify(reply));
  }
  const buf = fs.readFileSync(path.resolve('games', STORY));
  fs.writeFileSync(OUT, JSON.stringify({ story: STORY, sha256: crypto.createHash('sha256').update(buf).digest('hex'), property: +PROP, holder: +HOLDER, litBit: +LIT, at: new Date().toISOString(), log }, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
