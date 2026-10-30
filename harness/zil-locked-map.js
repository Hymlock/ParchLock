// Locked R2 phase 1 (claude+codex consensus #5137/#5138): a ZIL DEXIT carries the live locked bit of its OWN door
// object, bounded by the true object frontier, only when the exact-digest fact maps `locked`; the map treats lock
// state as a replaceable observation and draws a glyph for positive state only. Original Lurking Horror bytes,
// constructed state only; native evidence is separate (codex lurking-padlock-native.json, resume/lh-dexit-door-static.json).
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
const { story } = require(process.cwd() + '/work/investigations/zil-attr-analyzer.js');
const original = Uint8Array.from(story('TheLurkingHorror.z3.js'));
const digest = crypto.createHash('sha256').update(original).digest('hex');
const TOMB = 9, TUNNEL = 227, HATCH = 119, PADLOCK = 135, TOP = 195, ROOF = 163, BIT = 19;
let passed = 0;
function check(ok, label) { assert(ok, label); passed++; console.log('PASS ' + label); }

function boot(options = {}) {
    const bytes = new Uint8Array(original), mem = new DataView(bytes.buffer);
    const ctx = { console, window: {}, localStorage: { getItem: () => null, setItem: () => {} },
        ModuleLibrary: { currentExecutableDigest: () => digest, currentExecutableIdentity: () => ({ digest, header: Array.from(options.badHeader ? original.slice(0, 28).map((x, i) => i === 2 ? x ^ 1 : x) : original.slice(0, 28)) }) }, WorldModel: { lastPayload: { roomId: TOMB } },
        ZRamProvider: { getMem: () => options.foreign ? new DataView(new ArrayBuffer(100)) : new DataView(bytes.buffer) } };
    vm.createContext(ctx);
    for (const f of ['js/ModuleStatFactsClaude.js', 'js/ZRamReader.js', 'js/ExitCalibrator.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
    const R = ctx.ZRamReader, h = R.header(mem), fact = ctx.ModuleStatFactsClaude[digest];
    assert(fact && fact.attributeMap && fact.attributeMap.locked === BIT, 'LH row maps locked 19');
    if (options.noFact) delete fact.attributeMap.locked;
    // The DEXIT under test is found from the compiled bytes: [dest, door, msg, msg, 0].
    const dexit = (room, dest, door) => R.listProps(mem, room).find(p => p.sz === 5 && bytes[p.dataAddr] === dest && bytes[p.dataAddr + 1] === door);
    const down = dexit(TOMB, TUNNEL, HATCH), west = dexit(TOP, 222, ROOF);
    assert(down && west, 'LH Tomb->Steam Tunnel (hatch 119) and Top Floor (roof 163) DEXITs exist');
    const mapping = [{ prop: down.num, label: 'down', aliases: ['d'] }, { prop: west.num, label: 'west', aliases: ['w'] }];
    ctx.GrammarProvider = { decodeD198: () => ({ classification: options.family || 'confirmed-zil-family', evidence: 'validated', family: 'infocom-pre-v6-fixed' }),
        d214DirectionProperties: () => mapping, d214RoomTarget: () => true };
    ctx.ExitCalibrator.hydrate = () => ({ dirs: {} }); ctx.ExitCalibrator.isBlocked = () => false;
    if (options.noOpen) delete fact.attributeMap.open;
    const setBitN = (n, id, on) => { const a = R.objectBase(h, id) + (n >> 3), m = 128 >> (n & 7); bytes[a] = on ? bytes[a] | m : bytes[a] & ~m; };
    const setBit = (id, on) => setBitN(BIT, id, on);
    const setOpen = (id, on) => setBitN(fact.attributeMap.open, id, on);
    const exits = room => ctx.ExitCalibrator._d214ZilExitsFor(mem, room);
    return { bytes, mem, ctx, R, h, down, setBit, setOpen, exits, fact };
}
const lockOf = (list, label) => { const e = list.find(x => x.label === label); assert(e, 'exit ' + label); return e; };

// --- feed: live door state, identity, bounds, trust ---
let b = boot();
let d = lockOf(b.exits(TOMB), 'down');
check(d.doorObjectId === HATCH && d.isLocked === true, '1 Tomb down DEXIT carries hatch 119 and its live locked=true (initial raw 19)');
b.setBit(HATCH, false);
check(lockOf(b.exits(TOMB), 'down').isLocked === false, '2 hatch unlocked -> live false (boolean, not dropped)');
b.setBit(PADLOCK, true);
check(lockOf(b.exits(TOMB), 'down').isLocked === false, '3 detached padlock 135 relocked does not lock the hatch exit (door identity, codex #5141)');
check(lockOf(b.exits(TOP), 'west').doorObjectId === ROOF && lockOf(b.exits(TOP), 'west').isLocked === true, '4 Top Floor west carries roof door 163 locked');
b = boot({ noFact: true });
check(!('isLocked' in lockOf(b.exits(TOMB), 'down')), '5 no mapped locked fact -> unknown (field absent)');
b = boot({ foreign: true });
check(!('isLocked' in lockOf(b.exits(TOMB), 'down')), '6 foreign live memory -> unknown');
b = boot({ family: 'confirmed-inform' });
check(!('isLocked' in (b.exits(TOMB).find(x => x.label === 'down') || {})), '7 unconfirmed ZIL family -> unknown');
b = boot();
b = boot({ badHeader: true });
check(!('isLocked' in lockOf(b.exits(TOMB), 'down')), '8a mismatched stable header (ownership fails) -> unknown, no digest fallback');
b = boot();
check(b.ctx.ExitCalibrator._d214DoorLocked(b.mem, 253) === null && b.ctx.ExitCalibrator._d214DoorLocked(b.mem, 1) === null,
    '8 door outside the true object frontier (or 1) -> unknown');

// codex #5150: once a direction is LEARNED, exitsFor's calibrated record wins the label; the same DEXIT's door
// identity and live lock must be reconciled onto it (route/confidence unchanged), never the room's attrs.
b = boot();
b.ctx.ExitCalibrator.hydrate = () => ({ dirs: { down: { prop: b.down.num, mode: 'u8', sizes: [5], confirmed: true } } });
b.ctx.ExitCalibrator.destFor = () => TUNNEL;
b.ctx.ZRamReader.isPlausibleExitTarget = () => true;
b.ctx.ExitCalibrator.D198ExitValve._testOverride = 'on';
let learned = b.ctx.ExitCalibrator.exitsFor(b.mem, TOMB).filter(x => x.label === 'down');
check(learned.length === 1 && learned[0].source === 'exit-calibrator' && learned[0].confidence === 0.85 && learned[0].doorObjectId === HATCH && learned[0].isLocked === true,
    '8b learned direction keeps its calibrated record but carries hatch 119 and its live lock');
b.setBit(HATCH, false);
learned = b.ctx.ExitCalibrator.exitsFor(b.mem, TOMB).filter(x => x.label === 'down');
check(learned[0].isLocked === false, '8c learned direction follows the live hatch (unlocked -> false)');

// --- P10 R2 route contract: pause = live locked AND closed; glyph stays raw locked ---
b = boot();
check(Number.isInteger(b.fact.attributeMap.open), 'P10 LH row maps open');
b.setOpen(HATCH, false); d = lockOf(b.exits(TOMB), 'down');
check(d.isLocked === true && d.routeBlocked === true, 'P10a hatch locked+closed -> routeBlocked (Lurking Horror hatch still pauses)');
b.setOpen(HATCH, true); d = lockOf(b.exits(TOMB), 'down');
check(d.isLocked === true && d.routeBlocked === false, 'P10b hatch locked+open -> glyph still locked, no route block');
b.setOpen(HATCH, false); b.setBit(HATCH, false); d = lockOf(b.exits(TOMB), 'down');
check(d.isLocked === false && d.routeBlocked === false, 'P10c unlocked+closed -> no route block');
b = boot({ noOpen: true }); d = lockOf(b.exits(TOMB), 'down');
check(d.isLocked === true && d.routeBlocked === false && b.ctx.ExitCalibrator._d214DoorOpen(b.mem, HATCH) === null, 'P10d unknown open (no mapping) -> no route block, glyph locked');
b = boot({ foreign: true });
check(b.ctx.ExitCalibrator._d214DoorOpen(b.mem, HATCH) === null, 'P10e open read on foreign memory -> unknown');
// learned reconcile: same DEXIT carries routeBlocked; stale door id gives none.
b = boot(); b.setOpen(HATCH, false);
b.ctx.ExitCalibrator.hydrate = () => ({ dirs: { down: { prop: b.down.num, mode: 'u8', sizes: [5], confirmed: true } } });
b.ctx.ExitCalibrator.destFor = () => TUNNEL;
b.ctx.ZRamReader.isPlausibleExitTarget = () => true;
b.ctx.ExitCalibrator.D198ExitValve._testOverride = 'on';
learned = b.ctx.ExitCalibrator.exitsFor(b.mem, TOMB).filter(x => x.label === 'down');
check(learned[0].routeBlocked === true, 'P10f learned direction carries routeBlocked from its own DEXIT');
b.setOpen(HATCH, true);
learned = b.ctx.ExitCalibrator.exitsFor(b.mem, TOMB).filter(x => x.label === 'down');
check(learned[0].routeBlocked === false && learned[0].isLocked === true, 'P10g learned + opened hatch -> no route block');
b.ctx.ExitCalibrator.destFor = () => TUNNEL + 1;
learned = b.ctx.ExitCalibrator.exitsFor(b.mem, TOMB).filter(x => x.label === 'down');
check(learned.every(x => !('routeBlocked' in x) || x.doorObjectId === HATCH && String(x.targetRoomId) === String(TUNNEL)), 'P10h stale alias (door not current in reconcile) -> no routeBlocked');

// --- map: replaceable observation, legacy flag cleared, identity change ---
const sandbox = { console, setTimeout, window: {} };
vm.createContext(sandbox);
for (const f of ['AttributeSchema', 'ZRamReader', 'MapIdentity', 'MapTopology']) vm.runInContext(fs.readFileSync('js/' + f + '.js', 'utf8'), sandbox);
const MT = sandbox.MapTopology;
sandbox.ParchLockMap = { Rooms: [], CurrentRoom: '', GetRoom(name) { return this.Rooms.find(r => r.Name === name) || null; } };
const apply = (isLocked, routeBlocked) => {
    MT.prevRoomId = 8; MT.prevRoomName = ''; MT.lastCommand = '';
    const ex = { label: 'down', targetRoomId: TUNNEL, targetRoomName: 'Steam Tunnel', isDoor: true, doorObjectId: HATCH, hintOnly: true, hinted: true };
    if (isLocked !== undefined) ex.isLocked = isLocked;
    if (routeBlocked !== undefined) ex.routeBlocked = routeBlocked;
    MT.applyPayloadExits({ roomId: TOMB, roomName: 'Tomb', exits: [ex] });
    return (sandbox.ParchLockMap.GetRoom('Tomb') || {}).ExitMeta || {};
};
let m = apply(true);
check(m.down && m.down.isLocked === true && m.down.doorObjectId === HATCH, '9 map records locked=true with the door identity');
m = apply(false);
check(m.down && !m.down.isLocked && !m.down.locked, '10 a fresh false clears the lock');
apply(true); m.down && (m.down.locked = true); m = apply(undefined);
check(m.down && !m.down.isLocked && !m.down.locked, '11 unknown clears an old true and the legacy locked flag');

// codex #5155: identity loss. A locked hatch exit seen again with NO door identity and unknown lock must clear.
apply(true); { const mm = sandbox.ParchLockMap.GetRoom('Tomb').ExitMeta; mm.down.locked = true; }
MT.prevRoomId = 8; MT.applyPayloadExits({ roomId: TOMB, roomName: 'Tomb', exits: [{ label: 'down', targetRoomId: TUNNEL, targetRoomName: 'Steam Tunnel', isDoor: true, hintOnly: true, hinted: true }] });
m = sandbox.ParchLockMap.GetRoom('Tomb').ExitMeta;
check(m.down && !m.down.isLocked && !m.down.locked && m.down.doorObjectId == null, '11c lost door identity + unknown clears both aliases and the stale door id (link)');
sandbox.ParchLockMap.Rooms.push({ Id: 97, Name: 'Crypt', Exits: {}, Notes: [], ExitMeta: { down: { isLocked: true, locked: true, doorObjectId: HATCH } } });
sandbox.MapIdentity.applyExits('Crypt', [{ label: 'down' }]);
const crypt = sandbox.ParchLockMap.GetRoom('Crypt').ExitMeta.down;
check(!crypt.isLocked && !crypt.locked, '11d MapIdentity: prior ZIL door identity + fresh unknown clears both aliases');

// MapIdentity must clear BOTH aliases on a fresh non-true observation (codex #5146).
sandbox.ParchLockMap.Rooms.push({ Id: 99, Name: 'Vault', Exits: {}, Notes: [], ExitMeta: { down: { isLocked: true, locked: true, hinted: true } } });
sandbox.MapIdentity.applyExits('Vault', [{ label: 'down', isLocked: false, doorObjectId: HATCH }]);
const vault = sandbox.ParchLockMap.GetRoom('Vault').ExitMeta.down;
check(!vault.isLocked && !vault.locked && vault.hinted, '11a MapIdentity clears isLocked and locked on a fresh false, keeping other meta');
sandbox.MapIdentity.applyExits('Vault', [{ label: 'down', isLocked: true, doorObjectId: HATCH }]);
check(sandbox.ParchLockMap.GetRoom('Vault').ExitMeta.down.locked === true && sandbox.ParchLockMap.GetRoom('Vault').ExitMeta.down.hinted, '11b MapIdentity merges a true lock without wiping exit meta');

// --- world map: glyph only for positive state; repaint signature changes ---
const wm = { console, window: {}, document: { getElementById: () => null } };
vm.createContext(wm);
vm.runInContext(fs.readFileSync('js/WorldMap.js', 'utf8'), wm);
const W = wm.WorldMap;
check(W.isLockedMeta({ isLocked: true, doorObjectId: 119 }) && W.isLockedMeta({ locked: true, doorObjectId: 119 }) && !W.isLockedMeta({ doorObjectId: 119 }) && !W.isLockedMeta({ isLocked: false, doorObjectId: 119 }),
    '12 lock glyph only for a positive observation of a ZIL door');
check(!W.isLockedMeta({ isLocked: true }) && !W.isLockedMeta({ locked: true }), '12a Inform exit (no doorObjectId): no glyph, unchanged');
// Inform exits keep the original MapIdentity/link behaviour (audit r30 objection 1).
sandbox.ParchLockMap.Rooms.push({ Id: 98, Name: 'Hall', Exits: {}, Notes: [] });
sandbox.MapIdentity.applyExits('Hall', [{ label: 'north', isLocked: true }]);
const hall = sandbox.ParchLockMap.GetRoom('Hall').ExitMeta.north;
sandbox.MapIdentity.applyExits('Hall', [{ label: 'north', isLocked: false }]);
check(hall.locked === true && sandbox.ParchLockMap.GetRoom('Hall').ExitMeta.north.locked === true, '12b Inform exit: MapIdentity keeps its original lock handling (no new clearing)');
// P10 R2 navigator: ZIL door exit pauses on routeBlocked only; Inform keeps isLocked||locked.
const nav = { console, window: {}, setTimeout, clearTimeout, setInterval, clearInterval, Message: { Show() {} }, $: () => ({ length: 0 }) };
vm.createContext(nav);
vm.runInContext(fs.readFileSync('js/Navigator.js', 'utf8'), nav);
const paused = meta => { nav.ParchLockMap = { GetCurrentRoom: () => ({ Id: 1, Exits: { down: 2 }, ExitMeta: { down: meta } }) };
    nav.Navigator.startSpeechHold = () => {}; nav.Navigator.stopSpeechHold = () => {};
    nav.Navigator.StepQueue = ['down']; nav.Navigator.Running = true; nav.Navigator.Awaiting = null; nav.Navigator.Interrupted = false; nav.Navigator.InterruptReason = '';
    nav.Navigator.Pump(); return /appears locked/.test(nav.Navigator.InterruptReason); };
m = apply(true, true);
check(m.down.routeBlocked === true && paused(m.down), 'P10i map locked+closed hatch -> route pauses');
m = apply(true, false);
check(m.down.isLocked === true && !m.down.routeBlocked && !paused(m.down), 'P10j map locked+open -> glyph locked, route does not pause');
apply(true, true); m = apply(true, undefined);
check(m.down.isLocked === true && !('routeBlocked' in m.down) && !paused(m.down), 'P10k unknown route block clears an old true (link), no pause');
check(!paused({ isLocked: true, locked: true, doorObjectId: HATCH }), 'P10l legacy locked-alone ZIL door meta no longer pauses');
check(paused({ isLocked: true }) && paused({ locked: true }) && !paused({}), 'P10m Inform exit keeps isLocked||locked pause');
sandbox.MapIdentity.applyExits('Vault', [{ label: 'down', isLocked: true, routeBlocked: true, doorObjectId: HATCH }]);
const v1 = sandbox.ParchLockMap.GetRoom('Vault').ExitMeta.down.routeBlocked === true;
sandbox.MapIdentity.applyExits('Vault', [{ label: 'down', isLocked: true, doorObjectId: HATCH }]);
check(v1 && !('routeBlocked' in sandbox.ParchLockMap.GetRoom('Vault').ExitMeta.down), 'P10n MapIdentity sets and clears routeBlocked for ZIL door exits');
const g = locked => ({ rooms: [], edges: [{ from: 'a', to: 'b', locked }] });
check(W.paintSignature(g(true), null) !== W.paintSignature(g(false), null), '13 lock state is part of the paint signature (same-room repaint)');
console.log(passed + ' locked-map checks passed; native evidence is separate.');
