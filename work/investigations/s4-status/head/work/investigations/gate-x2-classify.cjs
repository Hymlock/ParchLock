// Directive #3780 two-run gate classifier (claude). A diff is REAL only when base1==base2, cand1==cand2 and base!=cand.
// Anything that flips within base or within cand is UNSTABLE and is listed with its values; nothing is waived.
//   node work/investigations/gate-x2-classify.cjs base1 base2 cand1 cand2
const fs = require('fs');
const load = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { const j = JSON.parse(l); return [j.game, j]; }));
const [b1, b2, c1, c2] = process.argv.slice(2).map(load);
const KEYS = ['rooms', 'exits', 'marks', 'inv1', 'inv2', 'error'], S = v => JSON.stringify(v === undefined ? null : v);
const real = [], unstable = [];
for (const g of Object.keys(b1).sort()) for (const k of KEYS) {
  const v = [b1, b2, c1, c2].map(r => S((r[g] || {})[k]));
  if (v.every(x => x === v[0])) continue;
  if (v[0] === v[1] && v[2] === v[3]) real.push({ g, k, base: v[0], cand: v[2] });
  else unstable.push({ g, k, b1: v[0], b2: v[1], c1: v[2], c2: v[3] });
}
console.log('REAL (stable in both runs, base != cand): ' + real.length);
real.forEach(d => console.log('  ' + d.g + ' ' + d.k + '\n    base: ' + d.base + '\n    cand: ' + d.cand));
console.log('UNSTABLE (flips within base or cand): ' + unstable.length);
unstable.forEach(d => console.log('  ' + d.g + ' ' + d.k + '\n    b1: ' + d.b1 + '\n    b2: ' + d.b2 + '\n    c1: ' + d.c1 + '\n    c2: ' + d.c2));
