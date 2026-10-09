// Scratch (claude, Z1 research): decode ZIL direction properties with the D198
// raw dictionary + the parser's own first-POS selector, then the current room's
// exits by version-specific exit-form lengths. Read-only.
//   node harness/_zil_z1_probe.js GAME.js ["cmd1,cmd2"]
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  const ready = async () => { for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); } };
  await ready();
  for (const c of (process.argv[3] || '').split(',').filter(Boolean)) { await ready(); const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); }
  console.log(JSON.stringify(await p.evaluate(() => {
    const mem = ZRamProvider.getMem(), h = ZRamReader.header(mem), len = mem.byteLength;
    const dict = GrammarProvider._d198RawDictionary(mem, h, len);
    const fam = GrammarProvider.decodeD198(mem).classification;
    // PS?DIRECTION = 0x10; first-POS selector low two bits, P1?DIRECTION = 3.
    const dirProp = {}, conflicts = [];
    dict.entries.forEach(e => { if (!(e.flags & 0x10)) return; const off = (e.flags & 3) === 3 ? 1 : 2; const v = e.data[off];
      if (v == null) return; if (dirProp[e.word] != null && dirProp[e.word] !== v) conflicts.push(e.word); dirProp[e.word] = v; });
    const byProp = {}; Object.keys(dirProp).forEach(w => { (byProp[dirProp[w]] = byProp[dirProp[w]] || []).push(w); });
    // Exit forms by length: v3 UEXIT1 NEXIT2 FEXIT3 CEXIT4 DEXIT5; v4+ UEXIT2 NEXIT3 FEXIT4 CEXIT5 DEXIT6.
    const v3 = h.version <= 3, kinds = v3 ? { 1: 'UEXIT', 2: 'NEXIT', 3: 'FEXIT', 4: 'CEXIT', 5: 'DEXIT' } : { 2: 'UEXIT', 3: 'NEXIT', 4: 'FEXIT', 5: 'CEXIT', 6: 'DEXIT' };
    const u8 = a => mem.getUint8(a), room = WorldModel.lastPayload.roomId;
    const exits = ZRamReader.listProps(mem, room).filter(x => byProp[x.num]).map(x => { const k = kinds[x.sz] || ('sz' + x.sz);
      const b = Array.from({ length: x.sz }, (_, i) => u8(x.dataAddr + i)); const dest = (k === 'UEXIT' || k === 'CEXIT' || k === 'DEXIT') ? (v3 ? b[0] : (b[0] << 8 | b[1])) : null;
      return byProp[x.num].join('/') + ':' + k + (dest != null ? '->' + dest + ' ' + (ZRamReader.shortName(mem, dest) || '') : '') + ' [' + b.join(',') + ']'; });
    return { version: h.version, family: fam, room: WorldModel.lastPayload.roomName, conflicts, directions: byProp, exits };
  })));
  await b.close(); })();
