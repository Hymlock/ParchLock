// M7 R2 (PROPOSAL-r2 + REVIEW-r2 ACCEPT, 3 conditions): door_to becomes an additive
// display hint (doorTo/doorToName) on a door exit. Static, on real story bytes.
// Native arrival proof is REVIEW-r2's table; this harness pins the reader rule and
// that MapTopology never turns the hint into an edge.
//   node harness/m7-door-to-hint.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const story = require(process.cwd() + '/work/investigations/zil-attr-analyzer.js').story;
let pass = 0;
function check(name, fn) { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { console.log('FAIL ' + name + ': ' + e.message); process.exitCode = 1; } }
function load(file) {
    const bytes = Uint8Array.from(story(file)), mem = new DataView(bytes.buffer);
    const c = vm.createContext({ console, window: {}, document: { readyState: 'loading', addEventListener() {} },
        ZRamProvider: { getMem: () => mem }, WorldModel: { lastPayload: null }, localStorage: { getItem: () => null, setItem() {} } });
    for (const f of ['AttributeSchema', 'ZRamReader', 'MapIdentity', 'MapTopology']) vm.runInContext(fs.readFileSync('js/' + f + '.js', 'utf8'), c, { filename: f });
    c.ParchLockMap = { Rooms: [], CurrentRoom: '', GetRoom(name) { return this.Rooms.find(r => r.Name === name) || null; } };
    const R = c.ZRamReader;
    const prop = (id, num) => R.listProps(mem, id).find(p => p.num === num);
    return { bytes, mem, c, R, prop, dt: R.informPropertyNames(mem).names.door_to };
}
const exitsTo = (T, room, door) => T.R.lookAheadExits(T.mem, room).filter(e => e.targetRoomId === door);

const B = load('bookvol.z5.js');
check('Book and Volume: Muse Room 62 -> stairway 61 gives doorTo 64 (Library)', () => {
    const ex = exitsTo(B, 62, 61);
    assert(ex.length, 'stairway exit present');
    for (const e of ex) { assert.strictEqual(e.doorTo, 64); assert.strictEqual(e.doorToName, ""); /* compiled (Library) name blanked */ assert.strictEqual(e.isDoor, true); assert.strictEqual(e.targetRoomId, 61); }
});
check('Book and Volume: Library 64 -> stairway 61 gives no doorTo (value is the current room)', () => {
    const ex = exitsTo(B, 64, 61);
    assert(ex.length, 'stairway exit present');
    for (const e of ex) assert(!('doorTo' in e));
});

const P = load('saveprinceton.z8.js');
check('Save Princeton: Common Room 399 -> door 400 gives doorTo 440', () => {
    const ex = exitsTo(P, 399, 400);
    assert(ex.length, 'door exit present');
    for (const e of ex) { assert.strictEqual(e.doorTo, 440); assert(e.doorToName); assert.strictEqual(e.targetRoomId, 400); }
});
check('Routine door_to (value above the frontier) gives no field', () => {
    const T = load('saveprinceton.z8.js'), p = T.prop(400, T.dt);
    assert(p && p.sz === 2);
    T.bytes[p.dataAddr] = 0x5b; T.bytes[p.dataAddr + 1] = 0x36; // 23350, a routine-sized value
    for (const e of exitsTo(T, 399, 400)) assert(!('doorTo' in e));
    assert.strictEqual(T.R.doorToHint(T.mem, 400, 399), null);
});
check('door_to without the door attribute gives no field', () => {
    const T = load('saveprinceton.z8.js'), a = T.R.attrsFromObject(T.mem, 400);
    assert(a.door);
    // find the door bit by flipping candidates until attrs.door is false
    const h = T.R.header(T.mem), base = T.R.objectBase(h, 400);
    let cleared = false;
    for (let b = 0; b < 48 && !cleared; b++) {
        const addr = base + (b >> 3), m = 0x80 >> (b & 7);
        if (!(T.bytes[addr] & m)) continue;
        T.bytes[addr] &= ~m;
        if (!T.R.attrsFromObject(T.mem, 400).door) cleared = true; else T.bytes[addr] |= m;
    }
    assert(cleared, 'door bit located');
    assert.strictEqual(T.R.doorToHint(T.mem, 400, 399), null);
});

const V = load('Vacation.z5.js');
check('Vacation Gone Awry: alias layout (door_to == n_to), no doorTo on any exit of any room', () => {
    const n = V.R.informPropertyNames(V.mem).names;
    assert.strictEqual(n.door_to, n.n_to === undefined ? 7 : n.n_to);
    const h = V.R.header(V.mem), first = V.R.objectBase(h, 1), fp = V.R.u16(V.mem, first + 12), frontier = (fp - first) / h.entrySize;
    let rooms = 0;
    for (let id = 1; id <= frontier; id++) {
        if (!V.R.isPlausibleMapRoom(V.mem, id)) continue;
        rooms++;
        for (const e of V.R.lookAheadExits(V.mem, id)) assert(!('doorTo' in e), 'room ' + id + ' ' + e.label);
        for (const e of (V.R.i7MapStorageExits(V.mem, id).exits || [])) assert(!('doorTo' in e), 'i7 room ' + id);
    }
    assert(rooms > 10, 'rooms scanned ' + rooms);
});
check('i7 lane gate: a room id passed as a "door" gets no hint (door attribute required)', () => {
    assert.strictEqual(V.R.doorToHint(V.mem, 64, 62), null);
    assert.strictEqual(B.R.doorToHint(B.mem, 62, 64), null);
});

check('MapTopology: doorTo never reaches Exits or toId; stale hint is deleted', () => {
    const T = load('saveprinceton.z8.js'), M = T.c.MapTopology;
    const exits = T.R.lookAheadExits(T.mem, 399);
    M.mayAdmitFirstCurrentRoom = () => true; // boot-room gate is not under test
    M.applyPayloadExits({ roomId: 399, roomName: 'Common Room', exits });
    const room = T.c.ParchLockMap.Rooms.find(r => String(r.ObjectId) === '399');
    assert(room, 'room created');
    const dirs = Object.keys(room.ExitMeta).filter(d => room.ExitMeta[d].doorTo != null);
    assert(dirs.length, 'hint carried into ExitMeta');
    for (const d of dirs) {
        assert.strictEqual(room.ExitMeta[d].doorTo, 440);
        assert.notStrictEqual(String(room.ExitMeta[d].toId), '440');
        assert(!(room.Exits && room.Exits[d] != null && T.c.ParchLockMap.Rooms.some(r => r.Id === room.Exits[d] && String(r.ObjectId) === '440')), 'no edge to 440');
    }
    assert(!T.c.ParchLockMap.Rooms.some(r => String(r.ObjectId) === '440'), 'Entryway not minted as a room');
    // Condition 1: a later observation without doorTo clears it.
    M.applyPayloadExits({ roomId: 399, roomName: room.Name, exits: exits.map(e => { const x = Object.assign({}, e); delete x.doorTo; delete x.doorToName; return x; }) });
    for (const d of dirs) { assert(!('doorTo' in room.ExitMeta[d])); assert(!('doorToName' in room.ExitMeta[d])); }
});
console.log(pass + ' PASS');
