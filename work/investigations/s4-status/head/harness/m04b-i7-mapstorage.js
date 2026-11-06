// D223 / M04-B: digest-bound I7 Map_Storage exits (Codex #2781 consensus).
// One native route per title plus focused controls: zero cell removes the
// predicted edge, a changed cell moves it, a tampered counter invalidates the
// decoder and removes owned edges, a walked edge survives, an unowned entry is
// untouched, a non-fact title is unchanged.
//   node harness/m04b-i7-mapstorage.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const open = async (b, g) => {
    const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
    for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); }
    p.send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1500); };
    return p;
};
const labels = p => p.evaluate(() => (WorldModel.lastPayload.exits || []).filter(e => e.source === 'i7-mapstorage').map(e => e.label + '->' + e.targetRoomId).sort().join(','));
(async () => {
    const b = await chromium.launch();
    // Warbler: native route.
    let p = await open(b, 'TheWarblersNest.zblorb.js');
    check(await labels(p) === 'north->56,south->53', 'Warbler 51: Map_Storage hints north->56, south->53');
    await p.send('south');
    const here = await p.evaluate(() => WorldModel.lastPayload.roomId);
    check(here === 53, 'Warbler: walking south lands in 53 (predicted)');
    check(await labels(p) === 'north->51', 'Warbler 53: hint north->51');
    // Controls in room 53 (row 1): cell for north is base + 2*(1*13 + 0).
    const ctl = await p.evaluate(() => {
        const m = ZRamProvider.getMem(), ms = ZRamReader.executableLayoutFacts(m).mapStorage, addr = ms.base + 2 * (1 * ms.nd + 0), orig = m.getUint16(addr);
        const tick = () => { ZRamProvider.collectGeneration++; WorldModel.tick(); const r = ParchLockMap.Rooms.find(x => String(x.ObjectId) === '53'); return { payload: (WorldModel.lastPayload.exits || []).filter(e => e.source === 'i7-mapstorage').map(e => e.label + '->' + e.targetRoomId).join(','), mapN: r && r.Exits && r.Exits.n, metaN: r && r.ExitMeta && r.ExitMeta.n ? r.ExitMeta.n.source + (r.ExitMeta.n.travelledTo ? '/walked' : '') : null, confirmedN: (WorldModel.lastPayload.exits || []).some(e => e.label === 'north' && e.confirmed) }; };
        const out = {};
        m.setUint16(addr, 0); out.zero = tick();
        m.setUint16(addr, 56); out.changed = tick();
        m.setUint16(addr, orig);
        const k = (ZRamReader.listProps(m, 51) || []).find(q => q.num === 25); const k0 = m.getUint16(k.dataAddr);
        m.setUint16(k.dataAddr, 4); out.invalid = tick(); out.invalidValid = ZRamReader.i7MapStorageExits(m, 53).valid;
        m.setUint16(k.dataAddr, k0); out.restored = tick();
        return out; });
    check(ctl.zero.payload === '' && !ctl.zero.confirmedN, 'zero cell: predicted edge removed and not re-confirmed (' + JSON.stringify(ctl.zero) + ')');
    check(ctl.changed.payload === 'north->56', 'changed cell: prediction moves to the new destination (' + ctl.changed.payload + ')');
    check(ctl.invalidValid === false && ctl.invalid.payload === '', 'tampered room counter: decoder invalid, no predictions');
    check(ctl.restored.payload === 'north->51', 'restored state: prediction returns');
    // Walked edge survives a zero cell: walk north (51) then back south (53), then zero the 51 row south cell.
    await p.send('north');
    const walked = await p.evaluate(() => { const m = ZRamProvider.getMem(), ms = ZRamReader.executableLayoutFacts(m).mapStorage, addr = ms.base + 2 * (0 * ms.nd + 3), orig = m.getUint16(addr);
        const r51 = () => ParchLockMap.Rooms.find(x => String(x.ObjectId) === '51');
        const before = r51().ExitMeta.s && r51().ExitMeta.s.travelledTo;
        m.setUint16(addr, 0); ZRamProvider.collectGeneration++; WorldModel.tick();
        const after = { exit: r51().Exits.s, travelled: r51().ExitMeta.s && r51().ExitMeta.s.travelledTo };
        m.setUint16(addr, orig); return { before, after }; });
    check(!!walked.before && walked.after.exit != null && !!walked.after.travelled, 'walked edge (51 south, travelled) survives a zero cell (' + JSON.stringify(walked) + ')');
    // Unowned entry untouched.
    const unowned = await p.evaluate(() => { const r = ParchLockMap.Rooms.find(x => String(x.ObjectId) === '51'); r.Exits.u = r.Exits.s; r.ExitMeta.u = { source: 'state-delta', toId: 53 }; ZRamProvider.collectGeneration++; WorldModel.tick(); const keep = r.Exits.u != null && r.ExitMeta.u && r.ExitMeta.u.source === 'state-delta'; delete r.Exits.u; delete r.ExitMeta.u; return keep; });
    check(unowned, 'an entry owned by another source is untouched');
    // Codex #2800 contracts on the real functions.
    const contracts = await p.evaluate(() => {
        const out = {}; const r = ParchLockMap.Rooms.find(x => String(x.ObjectId) === '51');
        // (1) a bare Exits entry with no ExitMeta is never overwritten by an i7 hint.
        const saveE = Object.assign({}, r.Exits), saveM = Object.assign({}, r.ExitMeta);
        delete r.ExitMeta.n; r.Exits.n = 999;
        MapTopology.link(r.Name, 'north', null, { fromId: '51', toId: 56, source: 'i7-mapstorage', hintOnly: true });
        out.bareKept = r.Exits.n === 999 && !(r.ExitMeta.north && r.ExitMeta.north.source === 'i7-mapstorage');
        r.Exits = saveE; r.ExitMeta = saveM;
        // (1b) another source's metadata under the SHORT key blocks the lane.
        const sE = Object.assign({}, r.Exits), sM = Object.assign({}, r.ExitMeta);
        delete r.Exits.n; delete r.ExitMeta.north; r.ExitMeta.n = { source: 'ram-lookahead', toId: 77 };
        MapTopology.link(r.Name, 'north', null, { fromId: '51', toId: 56, source: 'i7-mapstorage', hintOnly: true });
        out.shortMetaKept = r.ExitMeta.n && r.ExitMeta.n.source === 'ram-lookahead' && !r.ExitMeta.north;
        r.Exits = sE; r.ExitMeta = sM;
        // (2) a stale/foreign lane state (wrong generation) never reconciles.
        const realState = ZRamReader._i7LaneState;
        ZRamReader._i7LaneState = { roomId: 51, active: true, valid: false, exits: [], gen: -1, memKey: null };
        const before = JSON.stringify(r.ExitMeta);
        MapTopology.reconcileI7MapStorage({ roomId: 51 });
        out.staleIgnored = JSON.stringify(r.ExitMeta) === before;
        ZRamReader._i7LaneState = realState;
        return out; });
    check(contracts.bareKept, 'contract: a bare Exits entry without i7 ownership is not overwritten');
    check(contracts.shortMetaKept, 'contract: short-key metadata from another source blocks the lane (no long-key write)');
    check(contracts.staleIgnored, 'contract: a lane state from another generation/memory does not reconcile');
    await p.close();
    // Facility native route.
    p = await open(b, 'Facility.z8.js');
    check(await labels(p) === 'north->48', 'Facility 45: hint north->48');
    await p.send('north');
    check((await p.evaluate(() => WorldModel.lastPayload.roomId)) === 48, 'Facility: walking north lands in 48');
    await p.close();
    // Non-fact title unchanged (no lane).
    p = await open(b, 'Advent.z5.js');
    const adv = await p.evaluate(() => ({ active: ZRamReader.i7MapStorageExits(ZRamProvider.getMem(), WorldModel.lastPayload.roomId).active, own: (WorldModel.lastPayload.exits || []).filter(e => e.source === 'i7-mapstorage').length }));
    check(adv.active === false && adv.own === 0, 'Advent (no fact): lane inactive, no Map_Storage exits');
    await p.close();
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
