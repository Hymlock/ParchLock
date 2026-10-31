// D16 P16 inventoryHiddenScopeRetained (claude R1+R2, codex ACCEPT #5641,
// work/investigations/zil-titles/D16-compare-proposal-r1.md). Constructed trees on Zork I story bytes (bits:
// NDESCBIT 14, CONTBIT 19, OPENBIT 11, TRANSBIT 12, INVISIBLE 7). Walk output compared with HEAD's ZRamReader.js
// where the contract is "byte-identical"; label consumers (EquipmentUI) and holder inference (WorldModel) are
// exercised on the produced rows. Run from the repo root: node harness/zil-inventory-scope-retained.js
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), assert = require('assert'), cp = require('child_process');
const { story } = require(process.cwd() + '/work/investigations/zil-attr-analyzer.js');
const HEAD_ZR = cp.execSync('git show ' + (process.env.P16_BASE || '37327b0~1') + ':js/ZRamReader.js', { maxBuffer: 1 << 26 }).toString();
let passed = 0;
function check(ok, label) { assert(ok, label); passed++; console.log('PASS ' + label); }

const Z1 = 'Zork1-TheGreatUndergroundEmpire.z3.js';
const ROOT = 180, SACK = 224, LEAFLET = 161, BOOK = 211, GARLIC = 189, LUNCH = 225;

function boot(opts = {}) {
    const original = Uint8Array.from(story(Z1)), bytes = new Uint8Array(original), mem = new DataView(bytes.buffer);
    const digest = crypto.createHash('sha256').update(original).digest('hex');
    const ctx = { console, window: {}, localStorage: { getItem: () => null, setItem: () => {} },
        ModuleLibrary: { currentExecutableDigest: () => digest, currentExecutableIdentity: () => ({ digest, header: Array.from(original.slice(0, 28)) }) },
        GrammarProvider: { decodeD198: () => ({ classification: opts.family || 'confirmed-zil-family', evidence: 'validated', family: 'infocom-pre-v6-fixed' }) } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync('js/ModuleStatFactsClaude.js', 'utf8'), ctx);
    vm.runInContext(fs.readFileSync('js/AttributeSchema.js', 'utf8'), ctx);
    vm.runInContext(opts.head ? HEAD_ZR : fs.readFileSync('js/ZRamReader.js', 'utf8'), ctx);
    const fact = ctx.ModuleStatFactsClaude[digest] || (ctx.ModuleStatFactsClaude[digest] = {});
    fact.inventoryHiddenAttribute = 14; fact.inventoryHiddenRecurses = true;
    if (!opts.noFact) fact.inventoryHiddenScopeRetained = true;
    if (opts.fact) opts.fact(fact);
    const R = ctx.ZRamReader, h = R.header(mem), base = id => R.objectBase(h, id);
    const unlink = id => {
        const p = bytes[base(id) + 4]; if (!p) return;
        if (bytes[base(p) + 6] === id) bytes[base(p) + 6] = bytes[base(id) + 5];
        else { let c = bytes[base(p) + 6]; while (c && bytes[base(c) + 5] !== id) c = bytes[base(c) + 5]; if (c) bytes[base(c) + 5] = bytes[base(id) + 5]; }
        bytes[base(id) + 4] = 0; bytes[base(id) + 5] = 0;
    };
    const move = (id, p) => { unlink(id); bytes[base(id) + 4] = p; bytes[base(id) + 5] = bytes[base(p) + 6]; bytes[base(p) + 6] = id; };
    const bit = (id, b, on) => { const a = base(id) + (b >> 3), m = 128 >> (b & 7); bytes[a] = on ? bytes[a] | m : bytes[a] & ~m; };
    const empty = id => { while (bytes[base(id) + 6]) unlink(bytes[base(id) + 6]); };
    for (const id of [ROOT, SACK, LEAFLET, BOOK, GARLIC, LUNCH]) empty(id);
    for (const id of [SACK, LEAFLET, BOOK, GARLIC, LUNCH]) for (const b of [14, 7, 30, 19, 11, 12]) bit(id, b, false);
    const b = { R, mem, move, bit };
    if (opts.setup) opts.setup(b);
    b.rows = R.walkVisibleDescendants(mem, ROOT, 2, 0.9);
    return b;
}
const row = (rows, id) => rows.find(o => o.id === id);
const sig = rows => JSON.stringify(rows.map(o => [o.id, o.parentId, o.name, !!o.labelSuppressed]));

// EquipmentUI + WorldModel loaded against stubs (same technique as harness/equipment-ui.js).
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelectorAll: () => [], body: { classList: { contains: () => false, add() {}, remove() {} } } };
global.window = {}; global.ParchLock = { GameFilename: 'enchanter.z3' };
global.AttributeSchema = { isTrulyWorn: a => !!(a && a.worn) };
global.Actionable = { Submit() {} };
global.WorldModel = { lastPayload: null };
eval(fs.readFileSync('js/EquipmentUI.js', 'utf8'));
const E = global.EquipmentUI || EquipmentUI;
const wmSrc = fs.readFileSync('js/WorldModel.js', 'utf8');
const WM = vm.runInNewContext(wmSrc + '\n;WorldModel', { console, window: {}, document: global.document, localStorage: global.localStorage });
const model = (inv, demo) => { global.WorldModel.lastPayload = { playerId: ROOT, inventory: inv }; E._demo = !!demo; return E.model(); };

// 1 closed opaque parent: NDESC child absent from the payload entirely.
let b = boot({ setup: b => { b.move(SACK, ROOT); b.move(GARLIC, SACK); b.bit(SACK, 19, true); b.bit(GARLIC, 14, true); } });
check(!row(b.rows, GARLIC) && row(b.rows, SACK), '1 closed opaque sack: NDESC garlic not emitted (no scope)');

// 2 transparent closed parent: present, labelSuppressed, real parentId.
b = boot({ setup: b => { b.move(SACK, ROOT); b.move(GARLIC, SACK); b.bit(SACK, 19, true); b.bit(SACK, 12, true); b.bit(GARLIC, 14, true); } });
let g = row(b.rows, GARLIC);
check(g && g.labelSuppressed === true && g.parentId === SACK && g.aliases.length > 0, '2 transparent closed sack: garlic emitted labelSuppressed under 224');

// 3 D148 bitless held named parent (no container bit, has children): present, suppressed, not drawn/counted.
b = boot({ setup: b => { b.move(BOOK, ROOT); b.move(GARLIC, BOOK); b.bit(GARLIC, 14, true); } });
g = row(b.rows, GARLIC);
check(g && g.labelSuppressed && g.parentId === BOOK && row(b.rows, BOOK) && !row(b.rows, BOOK).labelSuppressed, '3 D148 bitless book: garlic emitted suppressed under the book');
let m = model(b.rows);
check(!m.byId[String(GARLIC)] && m.items.length === 1 && m.topLevel.length === 1 && m.topLevel[0].id === BOOK, '3b EquipmentUI model: book only (rows/tree/topLevel)');
check(E.categoryCounts(m).spells === 0 && (E.categoryCounts(m).carried + E.categoryCounts(m).containers) === 1, '3c categoryCounts ignores the suppressed row');
check(!E.childrenOf(m, row(b.rows, BOOK)).length, '3d book has no drawn children');

// 4 nested bag(open) > book(bitless) > NDESC spell: suppressed, real parent = book, heldContainerName walks to the book.
b = boot({ setup: b => { b.move(SACK, ROOT); b.bit(SACK, 19, true); b.bit(SACK, 11, true); b.move(BOOK, SACK); b.move(GARLIC, BOOK); b.bit(GARLIC, 14, true); } });
g = row(b.rows, GARLIC);
check(g && g.labelSuppressed && g.parentId === BOOK && row(b.rows, BOOK).parentId === SACK, '4 nested bag>book>spell: spell suppressed, parent chain real');
{
    const AS = vm.runInNewContext(fs.readFileSync('js/ActionSynth.js', 'utf8') + '\n;ActionSynth', { console, window: {} });
    const p = { playerId: ROOT, probe: { playerId: ROOT }, inventory: b.rows, discoveredObjects: [] };
    const held = AS.heldContainerName(g, p);
    check(typeof held === 'string' && held === row(b.rows, BOOK).name, '4b heldContainerName(spell) = nearest named holder "' + held + '"');
    const inv = (p.inventory || []).some(o => o.id === GARLIC);
    check(inv, '4c scope keeps the suppressed row (context "inventory" for commandsForPayloadObjectId)');
}
m = model(b.rows);
check(!m.byId[String(GARLIC)] && m.byParent[String(SACK)].map(o => o.id).join() === String(BOOK), '4d EquipmentUI tree: sack > book, spell not drawn');

// 5 NDESC parent with plain child: parent suppressed, child re-hung top-level in the label projection only.
b = boot({ setup: b => { b.move(SACK, ROOT); b.bit(SACK, 19, true); b.bit(SACK, 11, true); b.bit(SACK, 14, true); b.move(LEAFLET, SACK); b.move(LUNCH, ROOT); } });
check(row(b.rows, SACK).labelSuppressed && row(b.rows, LEAFLET).parentId === SACK && !row(b.rows, LEAFLET).labelSuppressed, '5 NDESC sack suppressed; leaflet keeps real parentId 224');
m = model(b.rows);
check(m.topLevel.map(o => o.id).sort().join() === [LEAFLET, LUNCH].sort().join() && !m.byId[String(SACK)], '5b label tree: leaflet top-level (no orphan), sack not drawn');
check(row(b.rows, LEAFLET).parentId === SACK, '5c payload row not mutated by the projection');
check(WM.correctPlayerId({ playerId: ROOT, inventory: b.rows }) === ROOT, '5d correctPlayerId unchanged (' + ROOT + ')');
check(WM.correctPlayerId({ playerId: ROOT, inventory: [{ id: 9, name: 'x', parentId: 777, labelSuppressed: true }, { id: 8, name: 'y', parentId: ROOT }] }) === ROOT,
    '5e suppressed row with an absent parent never votes for the holder');
check(WM.recoverInventory({ inventory: [], discoveredObjects: [{ id: 9, name: 'x', parentId: 777, attrs: { worn: true }, labelSuppressed: true }], probe: {} }).length === 0,
    '5f recoverInventory never seeds from a suppressed row');
{   // 5g-5k codex #5690: model rows keep physical custody; commands identical to payload rows.
    const AS = vm.runInNewContext(fs.readFileSync('js/ActionSynth.js', 'utf8') + String.fromCharCode(10) + ';ActionSynth', { console, window: {} });
    const p = { playerId: ROOT, probe: { playerId: ROOT }, inventory: b.rows, discoveredObjects: [] };
    global.WorldModel.lastPayload = p;
    const mr = m.byId[String(LEAFLET)], pr = row(b.rows, LEAFLET);
    check(mr && mr.parentId === SACK && mr.labelParentId === ROOT, '5g model row keeps physical parentId ' + SACK + ' (display-only labelParentId ' + (mr && mr.labelParentId) + ')');
    const hm = AS.heldContainerName(mr, p), hp = AS.heldContainerName(pr, p);
    check(typeof hp === 'string' && hm === hp && hp === row(b.rows, SACK).name, '5h heldContainerName(model row) = payload row = "' + hm + '"');
    const cm = JSON.stringify(AS.commandsForObject(mr, 'inventory', hm)), cp2 = JSON.stringify(AS.commandsForObject(pr, 'inventory', hp));
    check(cm === cp2 && cm.length > 2, '5i commands from model row === commands from payload row');
    for (const bad of ['false', '1', 1, 'true', {}]) {
        const inv = [{ id: 50, name: 'pouch', parentId: ROOT, attrs: {}, labelSuppressed: bad }, { id: 51, name: 'gem', parentId: 50, attrs: {} }];
        const mm = model(inv);
        check(mm.byId['50'] && mm.byId['51'].parentId === 50 && !('labelParentId' in mm.byId['51']) && E.labelRows(inv).length === 2,
            '5j malformed labelSuppressed ' + JSON.stringify(bad) + ' does not hide');
        check(WM.correctPlayerId({ playerId: ROOT, inventory: [{ id: 9, name: 'x', parentId: ROOT, labelSuppressed: bad }] }) === ROOT &&
            WM.recoverInventory({ inventory: [], discoveredObjects: [{ id: 9, name: 'x', parentId: ROOT, attrs: { worn: true }, labelSuppressed: bad }], probe: {} }).length === 1,
            '5k WorldModel treats ' + JSON.stringify(bad) + ' as not suppressed');
    }
    const asrc = fs.readFileSync('js/Actionable.js', 'utf8');
    check(/labelSuppressed !== true/.test(asrc) && !asrc.includes('!o.labelSuppressed') && asrc.includes('String(dispParent(o))'), '5l Actionable.RenderInventory: strict marker, display-only parent for nesting');
}

// 6 INVISIBLE NDESC child: excluded from scope.
b = boot({ fact: f => { f.inventoryInvisibleAttribute = 7; }, setup: b => { b.move(BOOK, ROOT); b.move(GARLIC, BOOK); b.bit(GARLIC, 14, true); b.bit(GARLIC, 7, true); } });
check(!row(b.rows, GARLIC) && row(b.rows, BOOK), '6 INVISIBLE garlic excluded');

// 7 no fact / malformed / unvalidated family: byte-identical to HEAD across all shapes above.
const shapes = {
    closed: b => { b.move(SACK, ROOT); b.move(GARLIC, SACK); b.bit(SACK, 19, true); b.bit(GARLIC, 14, true); },
    transparent: b => { b.move(SACK, ROOT); b.move(GARLIC, SACK); b.bit(SACK, 19, true); b.bit(SACK, 12, true); b.bit(GARLIC, 14, true); },
    bitless: b => { b.move(BOOK, ROOT); b.move(GARLIC, BOOK); b.bit(GARLIC, 14, true); },
    nested: b => { b.move(SACK, ROOT); b.bit(SACK, 19, true); b.bit(SACK, 11, true); b.move(BOOK, SACK); b.move(GARLIC, BOOK); b.bit(GARLIC, 14, true); },
    ndescParent: b => { b.move(SACK, ROOT); b.bit(SACK, 19, true); b.bit(SACK, 11, true); b.bit(SACK, 14, true); b.move(LEAFLET, SACK); b.move(LUNCH, ROOT); }
};
for (const [tag, opts] of [['no fact', { noFact: true }], ['"true" string', { noFact: true, fact: f => { f.inventoryHiddenScopeRetained = 'true'; } }],
    ['unvalidated family', { family: 'confirmed-inform' }], ['no recurses', { fact: f => { delete f.inventoryHiddenRecurses; } }]]) {
    for (const [name, setup] of Object.entries(shapes)) {
        const cur = boot({ ...opts, setup }).rows, hd = boot({ ...opts, setup, head: true }).rows;
        check(JSON.stringify(cur) === JSON.stringify(hd) && !cur.some(o => o.labelSuppressed), '7 ' + tag + ' / ' + name + ': identical to HEAD');
    }
}
// 7b with the fact, non-suppressed rows are identical to HEAD (only suppressed rows are added).
for (const [name, setup] of Object.entries(shapes)) {
    const cur = boot({ setup }).rows.filter(o => !o.labelSuppressed), hd = boot({ setup, head: true }).rows;
    check(JSON.stringify(cur) === JSON.stringify(hd), '7b fact / ' + name + ': non-suppressed rows identical to HEAD');
}

// 8 demo fallback: empty inventory shows demo; book-only (book + suppressed spell) does not; suppressed-only does.
b = boot({ setup: shapes.bitless });
check(model([], true).demo === true, '8 empty inventory: demo shown');
check(!model(b.rows, true).demo, '8b book + suppressed spell: no demo');
check(model(b.rows.filter(o => o.labelSuppressed), true).demo === true, '8c only suppressed rows: nothing drawable, demo shown');

// 9 real Enchanter row carries the three literal facts; Sorcerer does not carry scope retention.
{
    const ctx = { console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync('js/ModuleStatFactsClaude.js', 'utf8'), ctx);
    const digestOf = f => crypto.createHash('sha256').update(Uint8Array.from(story(f))).digest('hex');
    const en = ctx.ModuleStatFactsClaude[digestOf('Enchanter.z3.js')] || {};
    check(en.inventoryHiddenAttribute === 7 && en.inventoryHiddenRecurses === true && en.inventoryHiddenScopeRetained === true, '9 Enchanter row: hidden 7, recurses, scope retained');
    const all = Object.entries(ctx.ModuleStatFactsClaude).filter(([, v]) => v && v.inventoryHiddenScopeRetained === true).map(([k]) => k);
    check(all.length === 3 && ['Enchanter.z3.js', 'Sorcerer.z3.js', 'Spellbreaker.z3.js'].every(function (g) { return all.indexOf(digestOf(g)) >= 0; }), '9b scope retention is exactly Enchanter, Sorcerer, Spellbreaker (P16 + ext)');
}
console.log('zil-inventory-scope-retained: ' + passed + ' checks passed');
