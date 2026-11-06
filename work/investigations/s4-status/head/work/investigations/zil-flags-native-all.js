// Shard driver (grok2). One title per child process with a hard cap. Child output goes to a FILE, not a pipe:
// a capped child's Chromium grandchildren kept the pipe open and spawnSync never returned (empty-log bug).
const { spawnSync, execSync } = require('child_process'); const fs = require('fs'), path = require('path'); const SRC = require('./2026-10-11-zil-source-flags.json');
const script = process.env.SCRIPT || 'zil-flags-native.js'; const cap = +(process.env.CAP || 240000);
const skip = new Set((process.env.SKIP || '').split(',').filter(Boolean)); const [si, sn] = (process.env.SHARD || '0/1').split('/').map(Number);
for (const [gi, g] of Object.keys(SRC).entries()) { if (skip.has(g) || gi % sn !== si) continue;
  const lf = path.join(__dirname, '../../tmp', 'child-' + si + '-' + sn + '-' + path.basename(script) + '.log'); const fd = fs.openSync(lf, 'w');
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], { env: { ...process.env, ONLY: g }, stdio: ['ignore', fd, fd], timeout: cap, killSignal: 'SIGKILL' }); fs.closeSync(fd);
  if (r.pid) { try { execSync('taskkill /T /F /PID ' + r.pid, { stdio: 'ignore' }); } catch (e) {} }
  const line = fs.readFileSync(lf, 'utf8').split('\n').find(l => l.startsWith(g)); console.log(line ? line.trim() : g + ' TIMEOUT/FAIL ' + (r.error ? r.error.code : r.status)); }
console.log('EXIT');
