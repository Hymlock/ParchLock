const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path');
(async () => { const b = await chromium.launch();
for (const g of ['WiR1.zblorb.js', 'WiR2.zblorb.js', 'TheWarblersNest.zblorb.js', 'Facility.z8.js']) { const p = await b.newPage();
await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3000);
console.log('== ' + g + '\n' + await p.evaluate(() => { const m = ZRamProvider.getMem(), R = ZRamReader, h = R.header(m), scale = h.version === 8 ? 8 : h.version <= 3 ? 2 : 4;
  const t = R.informPropertyNames(m); if (!t || t.names.short_name == null) return 'no short_name';
  const sn = t.names.short_name, n = R.objectCount(m);
  const zs = a => { if (a < h.himem || a >= m.byteLength) return null; let w = 0, s = a; while (w < 60 && s + 2 <= m.byteLength) { w++; if (R.u8(m, s) & 128) { try { return R.decodeZsc(m, a, w); } catch (e) { return null; } } s += 2; } return null; };
  const rows = [];
  for (let id = 1; id <= n; id++) { if ((R.shortName(m, id) || '').trim()) continue; const x = (R.listProps(m, id) || []).find(q => q.num === sn && q.sz === 2); if (!x) continue;
    const v = R.u16(m, x.dataAddr); rows.push({ id, top: R.objectLinks(m, id).parent === 0, v, w0: v + 4 <= m.byteLength ? R.u16(m, v) : -1, w1: v + 4 <= m.byteLength ? R.u16(m, v + 2) : -1 }); }
  const counts = {}; rows.forEach(r => counts[r.w0] = (counts[r.w0] || 0) + 1);
  const H = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a])[0];
  const out = ['objects=' + rows.length + ' header candidate H=' + H + ' (' + counts[H] + '/' + rows.length + ')'];
  rows.forEach(r => { const block = r.w0 === H && counts[H] > 1 ? zs(r.w1 * scale) : null; const direct = zs(r.v * scale);
    out.push((r.top ? 'TOP ' : '    ') + r.id + ' v=' + r.v + ' block=' + JSON.stringify(block) + ' direct=' + JSON.stringify(direct && direct.slice(0, 40))); });
  return out.slice(0, 40).join('\n'); }));
await p.close(); }
await b.close(); })();
