// Pair call/ret events; list routines bracketing given text spans; look for actions table.
const fs = require('fs'), path = require('path');
const game = process.argv[2], idx = +(process.argv[3] || 0), pats = process.argv.slice(4);
const d = JSON.parse(fs.readFileSync(path.join(__dirname, game + '.trace.json')));
const o = d.out[idx], st = [], fr = [];
for (const e of o.ev) { if (e.k === 'E') st.push(e); else { const s = st.pop(); if (s) fr.push({ a: s.a, d: s.d, in: s.o, out: e.o, args: s.args }); } }
const spans = pats.map(p => { const i = o.text.indexOf(p); return [i, i + p.length]; });
console.log('spans', JSON.stringify(spans), 'textlen', o.text.length);
const c = fr.filter(f => spans.every(([a, b]) => f.in <= a && b <= f.out)).sort((x, y) => (x.out - x.in) - (y.out - y.in));
for (const f of c.slice(0, 8)) console.log('pk 0x' + f.a.toString(16), 'depth', f.d, '[', f.in, f.out, ']', 'args', f.args);
const mem = fs.readFileSync(path.join(__dirname, game + '.mem.bin'));
for (const f of c.slice(0, 8)) { const hits = []; for (let i = 0; i + 1 < mem.length; i += 1) if (mem.readUInt16BE(i) === f.a) hits.push('0x' + i.toString(16)); console.log('0x' + f.a.toString(16), 'word hits', hits.slice(0, 10).join(' ')); }
