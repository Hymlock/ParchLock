// M6 (IMPL-r1): a tapped compass move while seated in a non-vehicle carrier
// sends the game's own get-out form first, then the move. Native play.html,
// seeded like work/investigations/regression-gate.cjs.
// Usage: node harness/m6-seated-move.js
const path = require('path');
const { chromium } = require(path.join(process.cwd(), 'node_modules/playwright'));
const { pathToFileURL } = require('url');

let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails++; };

async function open(b, g) {
    const p = await b.newPage();
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g);
    await p.waitForTimeout(2000);
    await settle(p);
    await p.evaluate(() => {
        window.__m6 = [];
        TurnRecorder.subscribeAcceptedSubmit('m6-harness', e => window.__m6.push(String(e.command)));
    });
    return p;
}
async function settle(p) {
    for (let i = 0; i < 25; i++) {
        await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} });
        if (await p.locator('.Input.LineInput:visible').count()) return;
        const c = p.locator('.Input.CharInput');
        if (await c.count()) await c.first().focus();
        await p.keyboard.press('Space');
        await p.waitForTimeout(700);
    }
}
const typed = async (p, c) => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await settle(p); };
const state = p => p.evaluate(() => {
    const mem = ZRamProvider.getMem(), pl = ZRamReader.resolvePlayer(mem), l = ZRamReader.objectLinks(mem, pl.id);
    return { parent: l.parent, parentName: ZRamReader.shortName(mem, l.parent), room: ZRamReader.enclosingRoom(mem, pl.id), form: Actionable.seatedExitForm() };
});
// Tap: the map's exit chip when present, else the same SubmitTapMove the chip and radial call.
async function tap(p, dir) {
    await p.evaluate(() => { window.__m6 = []; });
    const short = { north: 'n', south: 's', east: 'e', west: 'w', up: 'u', down: 'd' }[dir] || dir;
    const chip = p.locator('#exits .exit.dir-' + short + ' .dir-name');
    let via = 'SubmitTapMove';
    if (await chip.count()) { await chip.first().dispatchEvent('click'); via = 'exit chip'; }
    else await p.evaluate(d => Actionable.SubmitTapMove(Actionable.commandForExitLabel(d)), dir);
    await p.waitForTimeout(4000); await settle(p);
    return { via, sent: await p.evaluate(() => window.__m6.slice()) };
}

(async () => {
    const b = await chromium.launch();
    // 1. HHG: starts in bed.
    let p = await open(b, 'Hitchhik.z5.js');
    await typed(p, 'turn on light');
    let s = await state(p);
    console.log('HHG start', JSON.stringify(s));
    check(s.parentName === 'bed' && s.parent !== s.room, 'HHG player starts in the bed inside the room');
    check(s.form && s.form.command === 'get out of bed', 'HHG seated form is "get out of bed"');
    let t = await tap(p, 'south');
    console.log('HHG seated tap', JSON.stringify(t));
    check(t.via === 'exit chip', 'seated tap went through the real map exit chip');
    check(t.sent.length === 2 && t.sent[0] === 'get out of bed' && /^s(outh)?$/.test(t.sent[1]), 'seated tap sends get out of bed, then south');
    const txt1 = (await p.evaluate(() => [...document.querySelectorAll('.BufferWindow')].map(e => e.innerText).join(' '))).replace(/\s+/g, ' ').slice(-300);
    console.log('HHG text:', txt1);
    let s2 = await state(p);
    check(s2.parent === s2.room && !/out of the bed first/i.test(txt1), 'HHG accepted get out of bed and attempted the move (no "get out of the bed first")');
    // HHG's hangover makes the doorway a miss until the walkthrough's gown/analgesic steps; standing taps send only the direction until it moves you.
    for (const c of ['get gown', 'wear gown', 'open pocket', 'take analgesic', 'take all']) await typed(p, c);
    let moved = false, onlyDir = true;
    for (let i = 0; i < 5 && !moved; i++) {
        t = await tap(p, 'south');
        console.log('HHG standing tap', JSON.stringify(t));
        if (!(t.sent.length === 1 && /^s(outh)?$/.test(t.sent[0]))) onlyDir = false;
        moved = (await state(p)).room !== s.room;
    }
    check(onlyDir, 'standing taps send only the direction');
    check(moved, 'HHG game moved the player out of the bedroom');
    // typed commands are never rewritten
    await p.close();
    p = await open(b, 'Hitchhik.z5.js');
    await typed(p, 'turn on light');
    await p.evaluate(() => { window.__m6 = []; });
    await typed(p, 'south');
    const ty = await p.evaluate(() => window.__m6.slice());
    check(ty.length === 1 && ty[0] === 'south', 'typed south while in bed is sent unchanged: ' + JSON.stringify(ty));
    await p.close();
    // 2. Control: Zork I West of House, standing directly in the room.
    p = await open(b, 'Zork1-TheGreatUndergroundEmpire.z3.js');
    s = await state(p);
    check(s.form === null && s.parent === s.room, 'Zork I standing: no seated form');
    t = await tap(p, 'north');
    console.log('Zork I tap', JSON.stringify(t));
    check(t.sent.length === 1 && /^n(orth)?$/.test(t.sent[0]), 'Zork I standing tap sends only the direction');
    // 3. Constructed refusal: the get-out leaves the parent unchanged; the move is still sent,
    //    and the refused parent gets no prefix on the next tap.
    const stub = () => p.evaluate(() => {
        const mem = ZRamProvider.getMem(), pl = ZRamReader.resolvePlayer(mem), par = ZRamReader.objectLinks(mem, pl.id).parent;
        window.__m6orig = window.__m6orig || Actionable.seatedExitForm;
        Actionable._tapRefusedParent = null;
        Actionable.seatedExitForm = () => ({ command: 'wait', parent: par, room: -1 }); // parent stays par: a refusal
    });
    await stub();
    t = await tap(p, 'east');
    console.log('refusal tap', JSON.stringify(t));
    check(t.sent.length === 2 && t.sent[0] === 'wait' && /^e(ast)?$/.test(t.sent[1]), 'refused get-out still sends the move');
    // From the new room (east moved the player) a blocked direction keeps the parent unchanged.
    await stub();
    t = await tap(p, 'up');
    check(t.sent.length === 2 && t.sent[0] === 'wait', 'refusal recorded for this parent');
    t = await tap(p, 'up');
    console.log('refused parent second tap', JSON.stringify(t));
    check(t.sent.length === 1 && /^u(p)?$/.test(t.sent[0]), 'refused parent: second tap sends the move with no prefix');
    // 4. Double tap during the wait: one get-out, one (latest) move.
    await stub();
    await p.evaluate(() => { window.__m6 = []; Actionable.SubmitTapMove('east'); Actionable.SubmitTapMove('west'); });
    await p.waitForTimeout(4000); await settle(p);
    let dbl = await p.evaluate(() => window.__m6.slice());
    console.log('double tap', JSON.stringify(dbl));
    check(dbl.length === 2 && dbl[0] === 'wait' && dbl[1] === 'west', 'double tap sends the get-out once and only the latest move');
    // 5. Typing during the wait cancels the pending move.
    await stub();
    await p.evaluate(() => { window.__m6 = []; Actionable.SubmitTapMove('east'); });
    await p.waitForTimeout(700);
    await p.evaluate(() => { Input.Clear(); Input.Inject('look', true); });
    await p.waitForTimeout(4000); await settle(p);
    let ty2 = await p.evaluate(() => window.__m6.slice());
    console.log('typed during wait', JSON.stringify(ty2));
    check(ty2.length === 2 && ty2[0] === 'wait' && ty2[1] === 'look', 'typing during the wait cancels the pending move');
    await p.evaluate(() => { Actionable.seatedExitForm = window.__m6orig; });
    // 6. Route started while seated: the get-out, then the first route step, and the route goes on.
    //    Uses a mapped two-step round trip from the current room.
    // Learn edges by walking back and forth once.
    await typed(p, 'west'); await typed(p, 'east');
    await stub();
    const route = await p.evaluate(() => {
        const cur = ParchLockMap.GetCurrentRoom(), rooms = ParchLockMap.Rooms || (ParchLockMap.GetRooms && ParchLockMap.GetRooms()) || {};
        const find = id => ParchLockMap.Rooms.find(r => r.Id === id);
        for (const [d, t] of Object.entries(cur.Exits || {})) {
            const r = t != null && find(t); if (!r) continue;
            for (const [d2, t2] of Object.entries(r.Exits || {})) if (t2 === cur.Id) return [d, d2];
        }
        const one = Object.entries(cur.Exits || {}).find(([d, t]) => t != null && find(t));
        return one ? [one[0]] : null;
    });
    console.log('route plan', JSON.stringify(route));
    await p.evaluate(r => { window.__m6 = []; Navigator.EnqueueRoute(r); }, Array.isArray(route) ? route : []);
    await p.waitForTimeout(9000); await settle(p);
    const rt = await p.evaluate(() => ({ sent: window.__m6.slice(), running: Navigator.Running, interrupted: Navigator.Interrupted, reason: Navigator.InterruptReason }));
    await p.evaluate(() => { Actionable.seatedExitForm = window.__m6orig; });
    console.log('seated route', JSON.stringify(rt));
    check(Array.isArray(route) && rt.sent[0] === 'wait' && rt.sent.length === route.length + 1 && !rt.interrupted && !rt.running, 'seated route sends the get-out, then every route step (' + JSON.stringify(route) + '), uninterrupted');
    await p.close();
    await b.close();
    console.log(fails ? fails + ' FAIL' : 'ALL PASS');
    process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
