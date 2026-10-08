// Scratch (claude): do ZIL dictionary entries for direction words carry their property number?
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  console.log(JSON.stringify(await p.evaluate(() => { const mem0 = ZRamProvider.getMem(); const d0 = ZRamReader.parseDictionary(mem0); const h0 = ZRamReader.header(mem0); const peek = { hKeys: Object.keys(h0), dKeys: Object.keys(d0), north: d0.words && d0.words.north, entryLength: d0.entryLength, start: d0.start, memType: Object.prototype.toString.call(mem0) };
    const u = a => mem0.getUint8 ? mem0.getUint8(a) : mem0[a]; const na = d0.words && d0.words.north; peek.northBytes = na != null ? Array.from({ length: 9 }, (_, k) => u(na + k)).join(',') : null; ['south','east','west','up','down','in','out','ne','sw'].forEach(w => { const a = d0.words[w]; peek[w] = a != null ? Array.from({ length: 7 }, (_, k) => u(a + k)).slice(4).join(',') : null; }); return peek;  const mem = ZRamProvider.getMem(), h = ZRamReader.header(mem), u8 = a => mem.getUint8 ? mem.getUint8(a) : mem[a];
    const dict = h.dictionary; const nSep = u8(dict); const entryLen = u8(dict + 1 + nSep); const count = (u8(dict + 2 + nSep) << 8 | u8(dict + 3 + nSep)); const start = dict + 4 + nSep;
    const keyLen = h.version <= 3 ? 4 : 6; const d = ZRamReader.parseDictionary(mem); const byAddr = {}; Object.keys(d.words || {}).forEach(w => { byAddr[d.words[w]] = w; });
    const want = ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'ne', 'in', 'out', 'n', 's'];
    const out = [];
    for (let i = 0; i < count; i++) { const a = start + i * entryLen; const w = byAddr[a]; if (!w || want.indexOf(w) < 0) continue;
      const data = []; for (let k = keyLen; k < entryLen; k++) data.push(u8(a + k)); out.push(w + ':' + data.join(',')); }
    // Room West of House: its property numbers and lengths.
    const room = WorldModel.lastPayload && WorldModel.lastPayload.roomId; let props = [];
    try { props = ZRamReader.listProps(mem, room).map(pr => pr.num + '/' + pr.len); } catch (e) { props = String(e); }
    return { version: h.version, entryLen, words: out, room, props }; })));
  await b.close(); })();
