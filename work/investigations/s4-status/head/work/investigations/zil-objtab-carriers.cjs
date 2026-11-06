// Bounded compiled-object-table carrier scan (claude, 2026-10-17). Reads the story file the app runs (zil-attr-analyzer
// story()), walks object entries from 1 up to the first property-table address (codex #3925 bound: valid object IDs
// only), and lists which objects carry a given attribute bit at BOOT. Static evidence only (operator ruling: counts as game
// data for static properties, with an in-app spot check per title type before a commit).
//   node work/investigations/zil-objtab-carriers.cjs <story.js> <bit>[,<bit>]
const { story } = require('./zil-attr-analyzer.js');
const scan = (g, bits) => {
  const m = Buffer.from(story(g)), v = m[0], ot = m.readUInt16BE(0x0a), sz = v <= 3 ? 9 : 14, b0 = ot + (v <= 3 ? 62 : 126), na = v <= 3 ? 32 : 48;
  let minProp = Infinity; const out = {}; bits.forEach(b => { out[b] = []; });
  for (let id = 1; id < (v <= 3 ? 256 : 65535); id++) {
    const e = b0 + (id - 1) * sz; if (e + sz > minProp || e + sz > m.length) break;
    const prop = m.readUInt16BE(e + sz - 2); if (prop > 0) minProp = Math.min(minProp, prop);
    let name = ''; try { const len = m[prop]; if (len) name = require('./zil-attr-analyzer.js').zstr ? '' : ''; } catch (e2) {}
    for (const b of bits) if (b < na && (m[e + (b >> 3)] & (0x80 >> (b & 7)))) out[b].push(id);
  }
  return out;
};
if (require.main === module) { const [g, bs] = process.argv.slice(2); console.log(JSON.stringify(scan(g, bs.split(',').map(Number)))); }
module.exports = { scan };
