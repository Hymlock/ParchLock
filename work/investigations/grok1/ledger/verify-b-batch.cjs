// grok1 b-batch byte census (z3 object table) for remaining U cells: scenery/on/switchable/wornAttribute.
// node work/investigations/grok1/ledger/verify-b-batch.cjs > work/investigations/grok1/ledger/verify-b-batch.txt
const path = require('path'); const D = path.join(__dirname, '../..');
const S = require(path.join(D, '2026-10-11-zil-source-flags.json')); const { story } = require(path.join(D, 'zil-attr-analyzer.js'));
function objs(g) { const b = Buffer.from(story(g)); const w = a => b.readUInt16BE(a); const v = b[0], big = v > 3;
  const es = big ? 14 : 9, nb = big ? 48 : 32, base = w(0x0a) + (big ? 126 : 62), first = w(base + (big ? 12 : 7)), n = (first - base) / es, out = [];
  for (let i = 1; i <= n; i++) { const e = base + (i - 1) * es, bits = new Set(); for (let k = 0; k < nb; k++) if (b[e + (k >> 3)] & (0x80 >> (k & 7))) bits.add(k); out.push({ id: i, parent: big ? w(e + 6) : b[e + 4], bits, name: zname(b, w(e + (big ? 12 : 7)) + 1, b[w(e + (big ? 12 : 7))]) }); } return out; }
function zname(b, a, len) { const A = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ' \n0123456789.,!?_#\'"/\\-:()']; let s = '', sh = 0, zs = []; for (let i = 0; i < len; i++) { const x = b.readUInt16BE(a + 2 * i); zs.push((x >> 10) & 31, (x >> 5) & 31, x & 31); } for (let i = 0; i < zs.length; i++) { const c = zs[i]; if (c === 0) { s += ' '; continue; } if (c < 4) { i++; continue; } if (c === 4 || c === 5) { sh = c - 3; continue; } if (sh === 2 && c === 6) { i += 2; sh = 0; continue; } s += A[sh][c - 6] || '?'; sh = 0; } return s; }
const bit = (g, f) => ((S[g].flags || {})[f] || {}).bit;
const T = n => Object.keys(S).find(t => t.startsWith(n));
function census(g, f) { const o = objs(g), b = bit(g, f), tk = bit(g, 'TAKEBIT'); const car = o.filter(x => x.bits.has(b));
  // CAVEAT (Codex #5281): mostPopulousParent is a HEURISTIC, not room identity. In TheWitness it lands on the
  // parentless holder 249, so ONBIT reads 0 and LIGHTBIT 1 there. Allocation sentinels (parent 0, e.g. Witness 249,
  // Hitchhiker 58) are listed separately and excluded from takeable/room counts. Room claims in b-batch rows rest on
  // the cited parent (Witness 251, Starcross 110) via carriersUnderCitedParent, not on the heuristic.
  const pc = {}; for (const x of o) if (x.parent) pc[x.parent] = (pc[x.parent] || 0) + 1;
  const heur = +Object.entries(pc).sort((a, c) => c[1] - a[1])[0][0], cited = CITED[g.split('.')[0]];
  const real = car.filter(x => x.parent !== 0), sentinels = car.filter(x => x.parent === 0).map(x => x.id + (x.bits.has(tk) ? '*' : '') + ':' + x.name);
  const byParent = {}; for (const x of real) byParent[x.parent] = (byParent[x.parent] || 0) + 1;
  return { title: g, flag: f, bit: b, carriers: car.length, sentinelsExcluded: sentinels, takeableExclSentinels: real.filter(x => x.bits.has(tk)).length,
    mostPopulousParentHEURISTIC: heur, carriersUnderHeuristicParent: real.filter(x => x.parent === heur).length,
    citedRoomParent: cited == null ? null : cited, carriersUnderCitedParent: cited == null ? null : real.filter(x => x.parent === cited).length,
    carrierParentHistogram: byParent, ids: car.map(x => x.id + (x.bits.has(tk) ? '*' : '') + ':' + x.name + '<' + x.parent) }; }
// Room parents cited in the b-batch row text (Claude #5207 for Witness 251; grok1 Starcross 110). Verify against source before relying on them.
const CITED = { TheWitness: 251, Starcross: 110 };
const rows = [];
for (const t of ['Hitchhik', 'Suspended', 'TheWitness']) rows.push(census(T(t), 'NDESCBIT'));
for (const t of ['TheWitness', 'Starcross', 'Hitchhik']) rows.push(census(T(t), 'ONBIT'));
for (const t of ['TheWitness', 'Starcross', 'Hitchhik']) if (bit(T(t), 'LIGHTBIT') != null) rows.push(census(T(t), 'LIGHTBIT'));
for (const t of ['TheWitness']) { const f = S[T(t)].flags; rows.push({ title: T(t), flag: 'WORNBIT/WEARBIT(src)', WORNBIT: !!f.WORNBIT, WEARBIT: !!f.WEARBIT }); }
for (const r of rows) console.log(JSON.stringify(r));