// D218 / M04: Inform 7 compiler bookkeeping properties (ikN_link, ikN_count,
// kd_count) are never look-ahead exits. Warbler's prop31 (ik1_link) was a
// phantom exit. I6 controls must be unchanged; isolated checks cover no
// table, unknown names, a proven-direction collision and an alias conflict.
//   node harness/d218-i7-metadata.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const open = async (b, g) => {
    const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
    p.settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
    p.send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1000); await p.settle(); };
    await p.settle(); return p;
};
const exitsHere = p => p.evaluate(() => { const m = ZRamProvider.getMem(); const pid = ZRamReader.findPlayerId(m); const room = pid ? ZRamReader.objectLinks(m, pid).parent : 0;
    return { room, exits: room ? (ZRamReader.lookAheadExits(m, room) || []).map(e => [e.label, e.prop, e.targetRoom]) : [] }; });
(async () => {
    const b = await chromium.launch();
    // Warbler: native route and no phantom ik1_link (prop31) exit.
    let p = await open(b, 'TheWarblersNest.zblorb.js');
    const meta = await p.evaluate(() => { const m = ZRamProvider.getMem(); return [31, 25, 24, 10, 11, 12, 13].map(n => [n, ZRamReader.i7MetadataProp(m, n)]); });
    check(JSON.stringify(meta) === JSON.stringify([[31, true], [25, true], [24, true], [10, false], [11, false], [12, false], [13, false]]), 'Warbler: only ik1_link/ik1_count/kd_count are metadata (' + JSON.stringify(meta) + ')');
    const r0 = await exitsHere(p);
    check(r0.room === 51 && !r0.exits.some(e => e[1] === 31), 'Warbler room 51: no prop31 phantom exit (' + JSON.stringify(r0.exits) + ')');
    await p.send('south'); const r1 = await exitsHere(p);
    check(r1.room === 53 && !r1.exits.some(e => e[1] === 31), 'Warbler SOUTH -> 53, no prop31 exit (' + JSON.stringify(r1.exits) + ')');
    await p.send('north'); const r2 = await exitsHere(p);
    check(r2.room === 51, 'Warbler NORTH -> 51');
    const map = await p.evaluate(() => (ParchLockMap.Rooms || []).map(r => r.ObjectId).filter(Boolean).map(String));
    check(map.includes('51') && map.includes('53'), 'Warbler map holds rooms 51 and 53 (' + map.join(',') + ')');
    // Isolated contract checks on the live helper with stubbed name tables.
    const iso = await p.evaluate(() => { const real = ZRamReader.informPropertyNames, m = ZRamProvider.getMem(), out = {};
        const withNames = (names, fn) => { ZRamReader.informPropertyNames = () => names ? { names } : null; try { return fn(); } finally { ZRamReader.informPropertyNames = real; } };
        out.noTable = withNames(null, () => ZRamReader.i7MetadataProp(m, 31));
        out.noI7Marker = withNames({ ik2_link: 31 }, () => ZRamReader.i7MetadataProp(m, 31));
        out.unknownName = withNames({ ik1_count: 25, ik1_link: 31, mystery: 40 }, () => ZRamReader.i7MetadataProp(m, 40));
        out.aliasConflict = withNames({ ik1_count: 25, ik1_link: 31, n_to: 31 }, () => ZRamReader.i7MetadataProp(m, 31));
        out.plain = withNames({ ik1_count: 25, ik1_link: 31 }, () => ZRamReader.i7MetadataProp(m, 31));
        return out; });
    check(iso.noTable === false, 'no property table -> not metadata');
    check(iso.noI7Marker === false, 'table without ik1_count+ik1_link markers -> not metadata');
    check(iso.unknownName === false, 'unknown compiled name -> not metadata');
    check(iso.aliasConflict === false, 'ik1_link sharing a number with another name -> not metadata (kept as today)');
    check(iso.plain === true, 'ik1_link alone with I7 markers -> metadata');
    // Proven direction domain wins over a metadata name.
    const coll = await p.evaluate(() => { const m = ZRamProvider.getMem(), realMeta = ZRamReader.i7MetadataProp, realProf = ZRamReader.labelCompassProfile;
        ZRamReader.i7MetadataProp = (mm, n) => n === 31; ZRamReader.labelCompassProfile = () => ({ profile: { 31: 'north' }, lane: 'test' });
        const cand = []; try { const room = 51; const v = ZRamReader.readProp(m, room, 31); (ZRamReader.lookAheadExits(m, room) || []).forEach(e => cand.push(e.prop)); return { v, has31: cand.includes(31) }; }
        finally { ZRamReader.i7MetadataProp = realMeta; ZRamReader.labelCompassProfile = realProf; } });
    check(coll.v === 53 && coll.has31, 'a proven direction slot is never suppressed by a metadata name (' + JSON.stringify(coll) + ')');
    await p.close();
    // I6 controls: look-ahead identical shape, metadata helper inert.
    for (const [g, expect] of [['Advent.z5.js', ['north', 'south', 'east', 'west', 'up', 'down', 'in']], ['curses.z5.js', ['north', 'south', 'east']]]) {
        p = await open(b, g); const r = await exitsHere(p);
        const inert = await p.evaluate(() => { const m = ZRamProvider.getMem(); for (let n = 1; n <= 63; n++) if (ZRamReader.i7MetadataProp(m, n)) return false; return true; });
        check(inert, g + ': no property is I7 metadata (I6 build)');
        check(expect.every(l => r.exits.some(e => e[0] === l)), g + ': look-ahead labels unchanged (' + JSON.stringify(r.exits.map(e => e[0])) + ')');
        await p.close();
    }
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
