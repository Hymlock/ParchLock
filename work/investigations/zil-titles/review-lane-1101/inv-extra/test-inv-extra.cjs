// REVIEW-REQUEST-004 test. node test-inv-extra.cjs  (cwd = repo root). Exits 1 on failure.
const { execFileSync } = require('child_process'); const path = require('path');
const probe = path.join(__dirname, 'probe.cjs');
const run = (story, script) => JSON.parse(execFileSync('node', [probe, story, script], { encoding: 'utf8', maxBuffer: 1 << 26 })).trace;
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const names = (s) => (s.inv || []).map(x => x.replace(/^\d+:/, ''));
const pre = run('bluechairs.z5.js', 'look');
console.log('NOTE Blue Chairs before the first native i: shirt ' + (names(pre[0]).includes('shirt') ? 'still listed (known gap: the game sets concealed on the worn shirt inside its own i routine)' : 'not listed'));
const bc = run('bluechairs.z5.js', 'i|x shirt');
ok(bc[0].factHidden === 3, 'Blue Chairs fact inventoryHiddenAttribute 3');
ok(!names(bc[0]).includes('shirt'), 'Blue Chairs: concealed worn shirt not in app inventory');
for (const n of ['wallet', 'keys', 'pager']) ok(names(bc[0]).includes(n), 'Blue Chairs: ' + n + ' still listed');
ok(/You are carrying your wallet, your keys and a pager/.test(bc[0].tail), 'Blue Chairs: native i text unchanged');
ok(/127\.0\.0\.1/.test(bc[1].tail), 'Blue Chairs: shirt still reachable by parser (x shirt)');
const tk = run('Tokyo2.z5.js', '#key|#key|i|x popcorn');
ok(tk[0].factHidden === 17 && tk[0].pid === 81, 'Tokyo2 fact inventoryHiddenAttribute 17, player 81');
ok(!names(tk[0]).includes('soup'), 'Tokyo2: scenery soup not in app inventory');
ok(names(tk[0]).includes('popcorn'), 'Tokyo2: really-held popcorn still listed');
ok(/soggy mess/.test(tk[1].tail), 'Tokyo2: popcorn reachable by parser');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); process.exit(fail ? 1 : 0);

