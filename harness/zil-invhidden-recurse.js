// D1 inventoryHiddenRecurses (claude+codex R2, work/investigations/zil-titles/invhidden-recurse-proposal-r1.md).
// Constructed object trees on original story bytes; walkVisibleDescendants of the working tree is compared with
// HEAD's ZRamReader.js where the contract is "byte-identical". Run from the repo root: node harness/zil-invhidden-recurse.js
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), assert = require('assert'), cp = require('child_process');
const { story } = require(process.cwd() + '/work/investigations/zil-attr-analyzer.js');
const HEAD_ZR = cp.execSync('git show 9e461e6~1:js/ZRamReader.js', { maxBuffer: 1 << 26 }).toString();
let passed = 0;
function check(ok, label) { assert(ok, label); passed++; console.log('PASS ' + label); }

// Zork I bits (2026-10-11-zil-source-flags.json, all exact): NDESCBIT 14, CONTBIT 19, OPENBIT 11, TRANSBIT 12,
// ACTORBIT 30, INVISIBLE 7. Objects: brown sack 224, leaflet 161, black book 211, garlic 189, lunch 225, lantern 164.
const Z1 = 'Zork1-TheGreatUndergroundEmpire.z3.js';
const ROOT = 180, SACK = 224, LEAFLET = 161, BOOK = 211, GARLIC = 189, LUNCH = 225, LANTERN = 164;

function boot(game, opts = {}) {
    const original = Uint8Array.from(story(game)), bytes = new Uint8Array(original), mem = new DataView(bytes.buffer);
    const digest = crypto.createHash('sha256').update(original).digest('hex');
    const ctx = { console, window: {}, localStorage: { getItem: () => null, setItem: () => {} },
        ModuleLibrary: { currentExecutableDigest: () => digest, currentExecutableIdentity: () => ({ digest, header: Array.from(original.slice(0, 28)) }) },
        GrammarProvider: { decodeD198: () => ({ classification: opts.family || 'confirmed-zil-family', evidence: 'validated', family: 'infocom-pre-v6-fixed' }) } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync('js/ModuleStatFactsClaude.js', 'utf8'), ctx);
    vm.runInContext(fs.readFileSync('js/AttributeSchema.js', 'utf8'), ctx);
    vm.runInContext(opts.head ? HEAD_ZR : fs.readFileSync('js/ZRamReader.js', 'utf8'), ctx);
    const fact = ctx.ModuleStatFactsClaude[digest] || (ctx.ModuleStatFactsClaude[digest] = {});
    if (opts.fact) opts.fact(fact);
    const R = ctx.ZRamReader, h = R.header(mem);
    const base = id => R.objectBase(h, id);
    // v3 entry: attrs 0-3, parent 4, sibling 5, child 6.
    const unlink = id => {
        const p = bytes[base(id) + 4]; if (!p) return;
        if (bytes[base(p) + 6] === id) bytes[base(p) + 6] = bytes[base(id) + 5];
        else { let c = bytes[base(p) + 6]; while (c && bytes[base(c) + 5] !== id) c = bytes[base(c) + 5]; if (c) bytes[base(c) + 5] = bytes[base(id) + 5]; }
        bytes[base(id) + 4] = 0; bytes[base(id) + 5] = 0;
    };
    const move = (id, p) => { unlink(id); bytes[base(id) + 4] = p; bytes[base(id) + 5] = bytes[base(p) + 6]; bytes[base(p) + 6] = id; };
    const bit = (id, b, on) => { const a = base(id) + (b >> 3), m = 128 >> (b & 7); bytes[a] = on ? bytes[a] | m : bytes[a] & ~m; };
    const empty = id => { while (bytes[base(id) + 6]) unlink(bytes[base(id) + 6]); };
    const walk = (root, depth) => R.walkVisibleDescendants(mem, root, depth).map(o => o.id + '@' + o.parentId);
    return { bytes, mem, R, fact, move, bit, empty, walk, digest };
}

// Zork I tree: ROOT > sack(container, open) > leaflet; ROOT > book.
function zork(opts = {}, setup) {
    const b = boot(Z1, { ...opts, fact: f => { if (!opts.noFact) { f.inventoryHiddenAttribute = 14; f.inventoryHiddenRecurses = true; } if (opts.fact) opts.fact(f); } });
    for (const id of [ROOT, SACK, LEAFLET, BOOK, GARLIC, LUNCH, LANTERN]) b.empty(id);
    for (const id of [SACK, LEAFLET, BOOK, GARLIC, LUNCH, LANTERN]) { b.bit(id, 14, false); b.bit(id, 7, false); b.bit(id, 30, false); }
    b.move(BOOK, ROOT); b.move(SACK, ROOT); b.move(LEAFLET, SACK);
    b.bit(SACK, 19, true); b.bit(SACK, 11, true); b.bit(SACK, 12, false);
    if (setup) setup(b);
    return b;
}
const has = (list, id) => list.some(s => s.startsWith(id + '@'));

// 1 hidden parent with a visible child: child listed (parentId = the hidden parent), parent not.
let w = zork({}, b => b.bit(SACK, 14, true)).walk(ROOT, 2);
check(!has(w, SACK) && w.includes(LEAFLET + '@' + SACK) && has(w, BOOK), '1 hidden open sack: leaflet listed under 224, sack not, book listed');
// control: same tree on HEAD = subtree skip.
w = zork({ head: true }, b => b.bit(SACK, 14, true)).walk(ROOT, 2);
check(!has(w, SACK) && !has(w, LEAFLET) && has(w, BOOK), '1b HEAD reader: hidden sack and its leaflet both skipped');

// 2 hidden + closed opaque parent: normal container rule, child not listed.
w = zork({}, b => { b.bit(SACK, 14, true); b.bit(SACK, 11, false); }).walk(ROOT, 2);
check(!has(w, SACK) && !has(w, LEAFLET), '2 hidden closed opaque sack: leaflet not listed');
w = zork({}, b => { b.bit(SACK, 14, true); b.bit(SACK, 11, false); b.bit(SACK, 12, true); }).walk(ROOT, 2);
check(!has(w, SACK) && has(w, LEAFLET), '2b hidden closed but TRANSBIT sack: leaflet listed (normal transparent rule)');

// 3 hidden animate: the per-child path applies unchanged (named animate is walked like any named child via canSeeInside).
const animRef = zork({}, b => { b.bit(SACK, 30, true); }).walk(ROOT, 2);
w = zork({}, b => { b.bit(SACK, 14, true); b.bit(SACK, 30, true); }).walk(ROOT, 2);
check(!has(w, SACK) && JSON.stringify(w.filter(s => !s.startsWith(SACK + '@'))) === JSON.stringify(animRef.filter(s => !s.startsWith(SACK + '@'))),
    '3 hidden animate sack: same descendants as the unhidden animate walk, only its own label withheld');

// 4 depth budget exhausted: hidden sack at the last level does not tunnel.
w = zork({}, b => b.bit(SACK, 14, true)).walk(ROOT, 0);
check(!has(w, SACK) && !has(w, LEAFLET) && has(w, BOOK), '4 depth 0: hidden sack withheld and leaflet not reached (budget)');
w = zork({}, b => { b.bit(SACK, 14, true); b.move(GARLIC, LEAFLET); b.bit(LEAFLET, 19, true); b.bit(LEAFLET, 11, true); }).walk(ROOT, 1);
check(has(w, LEAFLET) && !has(w, GARLIC), '4b depth 1: leaflet listed, garlic one level deeper is not');

// 5 worn + INVISIBLE: INVISIBLE skip wins over everything; PreservesWorn still first for NDESC.
const wornFact = f => { f.wornAttribute = 5; f.inventoryHiddenPreservesWorn = true; f.inventoryInvisibleAttribute = 7; };
w = zork({ fact: wornFact }, b => { b.bit(SACK, 14, true); b.bit(SACK, 5, true); b.bit(SACK, 7, true); }).walk(ROOT, 2);
check(!has(w, SACK) && !has(w, LEAFLET), '5 worn + INVISIBLE + NDESC sack: whole subtree omitted');
w = zork({ fact: wornFact }, b => { b.bit(SACK, 14, true); b.bit(SACK, 5, true); }).walk(ROOT, 2);
check(has(w, SACK) && has(w, LEAFLET), '5b worn + NDESC (PreservesWorn): sack itself listed, leaflet listed');

// 6 no recurses fact: byte-identical to HEAD (hidden bit present and absent).
for (const [tag, f] of [['hidden 14 only', x => { delete x.inventoryHiddenRecurses; }], ['no hidden fact', x => { delete x.inventoryHiddenRecurses; delete x.inventoryHiddenAttribute; }],
    ['recurses "true" string (malformed)', x => { x.inventoryHiddenRecurses = 'true'; }]]) {
    const cur = zork({ fact: f }, b => b.bit(SACK, 14, true)).R.walkVisibleDescendants;
    const a = JSON.stringify(zork({ fact: f }, b => b.bit(SACK, 14, true)).walk(ROOT, 2)), hd = JSON.stringify(zork({ fact: f, head: true }, b => b.bit(SACK, 14, true)).walk(ROOT, 2));
    check(cur && a === hd, '6 ' + tag + ': identical to HEAD ' + a);
}
// 6b family guard: recurses literal true but family not validated ZIL -> HEAD behaviour.
check(JSON.stringify(zork({ family: 'confirmed-inform' }, b => b.bit(SACK, 14, true)).walk(ROOT, 2))
    === JSON.stringify(zork({ family: 'confirmed-inform', head: true }, b => b.bit(SACK, 14, true)).walk(ROOT, 2)), '6b unvalidated family: identical to HEAD');

// 7 Inform title: facts and a hidden bit injected, Inform family -> identical to HEAD; real full walk of the player too.
{
    const g = 'Advent.z5.js', mk = head => {
        const b = boot(g, { head, family: 'confirmed-inform', fact: f => { f.inventoryHiddenAttribute = 20; f.inventoryHiddenRecurses = true; } });
        return b;
    };
    const a = mk(false), hd = mk(true), roots = [];
    const n = Math.min(255, a.R.objectCount(a.mem, a.R.header(a.mem)));
    for (let id = 1; id <= n; id++) if (a.R.children(a.mem, id).length) roots.push(id);
    const sa = JSON.stringify(roots.map(r => a.walk(r, 2))), sh = JSON.stringify(roots.map(r => hd.walk(r, 2)));
    check(roots.length > 5 && sa === sh, '7 Inform Advent: every parent object walk identical to HEAD (' + roots.length + ' roots)');
}

// 8 FLAT Moonmist: real row (hidden 19, no recurses) keeps the subtree skip, identical to HEAD.
{
    const mk = head => {
        const b = boot('Moonmist.z3.js', { head });
        assert(b.fact.inventoryHiddenAttribute === 19 && !('inventoryHiddenRecurses' in b.fact), 'Moonmist row: hidden 19, no recurses');
        // cane 18?-style construction: any two objects; parent hidden + open container (CONTBIT 27, OPENBIT 14).
        const P = 59, C = 247, ROOTM = 9;
        for (const id of [ROOTM, P, C]) b.empty(id);
        b.move(P, ROOTM); b.move(C, P); b.bit(P, 27, true); b.bit(P, 14, true); b.bit(P, 19, true); b.bit(C, 19, false);
        return { w: b.walk(ROOTM, 2), P, C };
    };
    const a = mk(false), hd = mk(true);
    check(!has(a.w, a.P) && !has(a.w, a.C) && JSON.stringify(a.w) === JSON.stringify(hd.w), '8 Moonmist FLAT: hidden parent and child both omitted, identical to HEAD');
}
console.log('zil-invhidden-recurse: ' + passed + ' checks passed');
