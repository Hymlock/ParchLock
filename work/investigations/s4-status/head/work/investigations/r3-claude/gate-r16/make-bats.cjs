// Writes the 8 gate shard launchers for the r4 candidate (claude, 2026-10-23).
const fs = require('fs'), path = require('path');
const M = path.resolve(__dirname, '..', '..', '..', '..'), W = path.dirname(M), D = __dirname;
for (const side of ['base', 'cand']) for (let i = 0; i < 4; i++) {
  const root = side === 'base' ? path.join(W, 'wt-claude-r16-base') : path.join(W, 'wt-claude-r16-cand');
  fs.writeFileSync(path.join(D, `run-${side}-${i}.bat`), [
    '@echo off', `cd /d "${M}"`, `set ROOT=${root}`, `set OUT=${path.join(D, `${side}-${i}.jsonl`)}`,
    'set GLULX=1', `set SHARD=${i}/4`,
    `node work\\investigations\\regression-gate.cjs > "${path.join(D, `${side}-${i}.log`)}" 2>&1`].join('\r\n') + '\r\n');
}
