// M9 guard (grok 2026-11-05, review-lane-1101 stand-in under user override): a room the game
// describes from afar must never be marked visited on the map. Native evidence (sealed, not replayed):
// Starcross LOOK IN airlock sets TOUCHBIT 29 on Red Hall 20 / Blue Dock 94 while the player stays in
// 175/106; Zork II LOOK IN WINDOW / BLUE SPHERE sets TOUCHBIT 2 on 103 / 142 while the player stays put
// (work/mapping-research/items-codex/resume-20261020/oct30-recovery/*-remote-sealed-*.md). The payload
// room stays at the origin, so the product is safe while WorldVisited has exactly one writer:
// ParchLockMap.SetCurrentRoom. This census fails if anyone adds a second writer or feeds the game's
// own touched/visited attribute into map code.
//   node harness/m9-visited-physical-only.js
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const files = fs.readdirSync('js').filter(f => f.endsWith('.js'));
const writers = [], readers = [];
for (const f of files) {
    const lines = fs.readFileSync(path.join('js', f), 'utf8').split(/\r?\n/);
    lines.forEach((l, i) => {
        if (/WorldVisited\s*(=(?!=)|\+\+|--)|\[\s*['"]WorldVisited['"]\s*\]\s*=(?!=)|defineProperty\([^)]*WorldVisited/.test(l)) writers.push({ f, i, l });
        else if (/WorldVisited/.test(l)) readers.push({ f, i, l });
    });
}
check(writers.length === 1 && writers[0].f === 'Map.js', 'exactly one WorldVisited writer, in Map.js (found ' + writers.map(w => w.f + ':' + (w.i + 1)).join(', ') + ')');
if (writers.length === 1) {
    const src = fs.readFileSync('js/Map.js', 'utf8').split(/\r?\n/);
    let fn = null;
    for (let i = writers[0].i; i >= 0; i--) { const m = /^\s*(\w+)\s*[:=]\s*(?:function\b|\(?[\w\s,]*\)?\s*=>)|function\s+(\w+)\s*\(/.exec(src[i]); if (m) { fn = m[1] || m[2]; break; } }
    check(fn === 'SetCurrentRoom', 'the writer sits in SetCurrentRoom (found ' + fn + ')');
    check(/=\s*true\s*;?\s*$/.test(writers[0].l.trim()), 'the writer only ever sets true (physical history is never cleared by a game flag)');
}
check(readers.every(r => r.f === 'WorldMap.js' || r.f === 'Map.js'), 'WorldVisited is read only by map code (' + readers.map(r => r.f + ':' + (r.i + 1)).join(', ') + ')');
for (const f of ['Map.js', 'WorldMap.js', 'MapTopology.js'].filter(f => fs.existsSync('js/' + f))) {
    const s = fs.readFileSync('js/' + f, 'utf8');
    check(!/TOUCHBIT|attrs\.visited|attrs\[\s*['"]visited['"]\s*\]|visitedBit|touchedBit/i.test(s), f + ': no game touched/visited attribute feeds the map');
}
const wm = fs.readFileSync('js/WorldMap.js', 'utf8');
check(/return\s*!!\(room\s*&&\s*\(room\.WorldVisited\s*\|\|\s*room\s*===\s*current\)\)/.test(wm), 'WorldMap.isVisited = WorldVisited || current room (no attribute term)');
console.log(pass + ' PASS / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);