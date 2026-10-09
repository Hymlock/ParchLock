// Scratch (claude): read "take" syntax lines' FIND attribute (static grammar) and test it on known objects.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(4500);
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  console.log(JSON.stringify(await p.evaluate((ids) => { const mem = ZRamProvider.getMem(), h = ZRamReader.header(mem), len = mem.byteLength, u8 = a => mem.getUint8(a), u16 = a => ZRamReader.u16(mem, a);
    const dict = GrammarProvider._d198RawDictionary(mem, h, len), base = h.staticMem, first = u16(base), n = (first - base) / 2;
    const ptr = i => u16(base + i * 2), lines0 = u8(ptr(0)), family = ((ptr(1) - ptr(0)) / lines0 <= 7) ? 'variable' : 'fixed';
    const take = dict.byWord['take'], off = (take.flags & 3) === 1 ? 1 : 2, vi = 255 - take.data[off];
    const start = ptr(vi), count = u8(start), out = []; let pos = start + 1;
    for (let k = 0; k < count; k++) { if (family === 'fixed') { out.push(Array.from({ length: 8 }, (_, j) => u8(pos + j)).join(',')); pos += 8; }
      else { const fb = u8(pos), ob = (fb >> 6) & 3, sz = [2, 4, 7, 0][ob]; out.push(Array.from({ length: sz }, (_, j) => u8(pos + j)).join(',')); pos += sz; } }
    const attr = (id, bit) => { const l = ZRamReader.objectLinks(mem, id); return !!(l && l.attrBytes && (l.attrBytes[bit >> 3] & (128 >> (bit & 7)))); };
    const objs = ids.split(',').map(Number);
    const findBit = family === 'fixed' ? Number(out[0].split(',')[3]) : null;
    return { version: h.version, family, verbIndex: vi, takeLines: out, findBit, onObjects: findBit != null ? objs.map(id => id + ':' + (ZRamReader.shortName(mem, id) || '?') + '=' + attr(id, findBit)) : null,
      allBits: objs.map(id => id + ':' + Array.from({ length: h.version <= 3 ? 32 : 48 }, (_, bit) => attr(id, bit) ? bit : null).filter(x => x != null).join('/')) };
  }, process.argv[3]), null, 0));
  await b.close(); })();
