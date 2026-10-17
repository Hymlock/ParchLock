// Merge newly PROVEN cells from candidate sweep runs into 2026-10-11-zil-sweep.json (claude, 2026-10-17).
// Only cells whose candidate status is 'proven' and whose current status is not are written; nothing is downgraded.
// Use only after the candidate criterion is reviewed and applied to zil-sweep.js by its owner.
//   node work/investigations/sweep-merge-proven.cjs run1.json [run2.json ...] [--keys descriptors,identical]
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), ki = args.indexOf('--keys');
const keys = ki >= 0 ? args.splice(ki, 2)[1].split(',') : null;
const F = path.join(__dirname, '2026-10-11-zil-sweep.json'), s = JSON.parse(fs.readFileSync(F, 'utf8'));
let n = 0;
for (const f of args) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const g in j) for (const k in j[g]) {
    if (k.startsWith('_') || (keys && !keys.includes(k))) continue;
    const v = j[g][k], cur = (s[g] || {})[k];
    if (v && v.status === 'proven' && !(cur && cur.status === 'proven')) { (s[g] = s[g] || {})[k] = v; n++; console.log('+', g, k, String(v.reason).slice(0, 90)); }
  }
}
fs.writeFileSync(F, JSON.stringify(s, null, 1)); console.log('merged', n);
