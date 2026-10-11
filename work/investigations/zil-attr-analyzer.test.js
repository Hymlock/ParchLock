// Synthetic decoder tests for Codex #3300/#3301 findings. node work/investigations/zil-attr-analyzer.test.js
const { decodeAt, disasm } = require('./zil-attr-analyzer.js'); let pass = 0, fail = 0;
const t = (n, c, d) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + JSON.stringify(d))); };
const mem = a => { const m = new Uint8Array(64); a.forEach(([at, bytes]) => bytes.forEach((b, i) => m[at + i] = b)); return m; };
let r = decodeAt(mem([[10, [0x80, 0, 0, 0xbf, 0xfb]]]), 3, 10); t('negative branch jz large0 -5 -> target 8', r.target === 8 && r.next === 15, r);
r = decodeAt(mem([[10, [0xa0, 0, 0xc0]]]), 3, 10); t('branch offset 0 = rfalse, no target', r.target === null, r);
r = decodeAt(mem([[10, [0xa0, 0, 0xc1]]]), 3, 10); t('branch offset 1 = rtrue, no target', r.target === null, r);
r = decodeAt(mem([[10, [0x9c, 4]]]), 3, 10); t('small-constant jump +4 -> target 14', r.target === 14 && r.term, r);
r = decodeAt(mem([[10, [0x8c, 0xff, 0xfc]]]), 3, 10); t('large-constant jump -4 from next 13 -> target 7', r.target === 7, r);
r = decodeAt(mem([[10, [0xac, 5]]]), 3, 10); t('variable jump fails closed', !!r.bad, r);
r = decodeAt(mem([[10, [0xb7]]]), 3, 10); t('restart terminates', r.term === true, r);
r = decodeAt(new Uint8Array([0x80, 0]), 3, 0); t('truncated operand fails closed', !!r.bad, r);
r = decodeAt(mem([[10, [0xbe, 0x09, 0xff, 0x00]]]), 5, 10); t('v5 EXT save_undo: store byte, length 4', r.next === 14 && !r.bad, r);
r = decodeAt(mem([[10, [0xbe, 0x02, 0x5f, 1, 2, 0x00]]]), 5, 10); t('v5 EXT log_shift two small ops + store, length 6', r.next === 16, r);
r = decodeAt(mem([[10, [0xbe, 0x1d, 0xff]]]), 5, 10); t('unknown EXT op fails closed', !!r.bad, r);
r = decodeAt(new Uint8Array(4), 3, 9); t('pc beyond end fails closed', !!r.bad, r);
// backward branch reaches code before the branch: routine at 20: 0 locals; [22] set_attr; jz back to 22-region must keep loop body reachable
let m = mem([[20, [0x00, 0x4b, 0x10, 0x05, 0xa0, 0x10, 0x3f, 0xfb, 0xb0]]]); // set_attr g0 5 ; jz g0 ?(-5)->21 (body start) ; rtrue
let out = []; disasm(m, 3, 20, 0, new Set(), out); t('backward branch inside routine not flagged, set_attr found', out.some(x => x.op === 'set' && x.attr === 5) && !out.malformed, out);
m = mem([[20, [0x00, 0xa0, 0x10, 0x3f, 0x80]]]); out = []; disasm(m, 3, 20, 0, new Set(), out); t('branch before routine start marked malformed', !!out.malformed, out);
console.log(`${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);

