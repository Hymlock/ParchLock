const { spawnSync } = require('child_process'); const SRC = require('./2026-10-11-zil-source-flags.json');
const skip = new Set((process.env.SKIP || '').split(',').filter(Boolean));
for (const g of Object.keys(SRC)) { if (skip.has(g)) continue; const r = spawnSync(process.execPath, [__dirname + '/zil-flags-native.js'], { env: { ...process.env, ONLY: g }, encoding: 'utf8', timeout: 240000 });
  const line = (r.stdout || '').split('\n').find(l => l.startsWith(g)); console.log(line || (g + ' TIMEOUT/FAIL ' + (r.error ? r.error.code : r.status))); }
console.log('EXIT');
