// grok1 solo re-verification of the #5242 fail-closed/NA rows from the story bytes (z3 object table).
// node work/investigations/grok1/ledger/verify-a-batch.cjs > work/investigations/grok1/ledger/verify-a-batch.txt
const path = require('path'); const D = path.join(__dirname, '../..');
const S = require(path.join(D, '2026-10-11-zil-source-flags.json')); const { story } = require(path.join(D, 'zil-attr-analyzer.js'));
function objs(g) { const b = Buffer.from(story(g)); const w = a => b.readUInt16BE(a); if (b[0] > 3) throw new Error('v' + b[0]);
  const base = w(0x0a) + 62, first = w(base + 7), n = (first - base) / 9, out = [];
  for (let i = 1; i <= n; i++) { const e = base + (i - 1) * 9, at = b.readUInt32BE(e), bits = new Set(); for (let k = 0; k < 32; k++) if (at & (1 << (31 - k))) bits.add(k); out.push({ id: i, parent: b[e + 4], bits }); } return out; }
const bit = (g, f) => ((S[g].flags || {})[f] || {}).bit;
const T = n => Object.keys(S).find(t => t.startsWith(n));
function census(g, f) { const o = objs(g), b = bit(g, f), tk = bit(g, 'TAKEBIT'); const car = o.filter(x => x.bits.has(b));
  const pc = {}; for (const x of o) pc[x.parent] = (pc[x.parent] || 0) + 1; const rooms = +Object.entries(pc).sort((a, c) => c[1] - a[1])[0][0]; // ROOMS = parent with most children
  return { title: g, flag: f, bit: b, carriers: car.length, takeable: car.filter(x => x.bits.has(tk)).length, inRoomsObj: car.filter(x => x.parent === rooms).length, ids: car.slice(0, 12).map(x => x.id) }; }
const rows = [];
for (const t of ['Zork2', 'Enchanter', 'Infidel', 'LeatherGoddesses', 'TheLurkingHorror', 'Seastalker', 'Sorcerer', 'Suspect', 'Wishbringer']) rows.push(census(T(t), 'NDESCBIT'));
for (const t of ['PlunderedHearts', 'Deadline', 'Infidel', 'Planetfall', 'Wishbringer', 'Stationfall']) rows.push(census(T(t), 'ONBIT'));
for (const t of ['PlunderedHearts', 'Enchanter']) rows.push(census(T(t), 'LIGHTBIT'));
rows.push(census(T('Moonmist'), 'DOORBIT'));
for (const t of ['Deadline', 'Seastalker', 'Spellbreaker', 'Enchanter', 'Zork1', 'Zork2', 'Sorcerer']) { const f = S[T(t)].flags; rows.push({ title: T(t), flag: 'WORNBIT/WEARBIT(src)', WORNBIT: !!f.WORNBIT, WEARBIT: !!f.WEARBIT }); }
for (const r of rows) console.log(JSON.stringify(r));
