// M11 click-to-rewind (work/investigations/m11-rewind/DESIGN.md R2/R3, REVIEW.md re-review).
// ZVM only. Advent (Inform z5, per-turn @save_undo): walk 3 rooms, one native UNDO to arm,
// then long-press (right-click) the first room's Known Rooms row -> Notes / Rewind to here ->
// confirm -> payload room and map highlight are the first room. Also: no Rewind on the current
// room or before arming (long-press opens Notes directly), and a Glulx game (Alabaster) never
// offers it. Seeded setup as in work/investigations/regression-gate.cjs.
//   node harness/m11-rewind.js        (ROOT=<tree> to test another checkout)
const path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const ROOT = process.env.ROOT || '.';
let pass = 0, fail = 0; const check = (name, ok, info) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + JSON.stringify(info).slice(0, 400))); };
async function open(b, story) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve(ROOT, 'play.html')).href + '?story=games/' + story); await p.waitForTimeout(2000);
    p.settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
    p.cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await p.settle(); };
    p.state = () => p.evaluate(() => { const vm = window.__PARCHLOCK_ZVM__; const cur = ParchLockMap.GetCurrentRoom(); return { zvm: !!(vm && Array.isArray(vm.undo)), undo: vm && vm.undo ? vm.undo.length : -1, armed: !!(vm && vm.__pmUndoSeen), roomId: (WorldModel.lastPayload || {}).roomId, cur: cur ? cur.Name : null, curId: cur ? String(cur.ObjectId) : null, here: (document.querySelector('#map .room.dir-here .name') || {}).textContent || '' }; });
    // Real delegated D112 gesture on the Known Rooms row (desktop right-click path).
    p.hold = name => p.evaluate(name => { ParchLockMap.RebuildRoomsList(); const row = [...document.querySelectorAll('#rooms-list #container > div')].find(d => $(d).data('room') && $(d).data('room').Name === name); if (!row) return 'no-row';
        row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); return { open: Message.IsOpen, title: document.querySelector('#message h2').textContent, notes: !!document.querySelector('#room-hold-notes'), rewind: !!document.querySelector('#room-hold-rewind'), editor: !!document.querySelector('#note-editor-text') }; }, name);
    p.hide = () => p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
    await p.settle(); return p;
}
async function walk3(p) {
    // First room, then two moves to rooms not yet visited.
    await p.cmd('look');
    const rooms = [(await p.state())];
    for (let k = 0; k < 2; k++) {
        const ex = await p.evaluate(() => ((WorldModel.lastPayload || {}).exits || []).map(e => ({ c: e.command || e.label, t: String(e.targetRoomId) })).filter(e => e.c));
        const seen = rooms.map(r => r.roomId != null ? String(r.roomId) : r.cur);
        let moved = false;
        for (const e of ex) {
            if (seen.includes(e.t)) continue;
            await p.cmd(e.c);
            const s = await p.state();
            if (!seen.includes(String(s.roomId))) { rooms.push(s); moved = true; break; }
        }
        if (!moved) break;
    }
    return rooms;
}
(async () => {
    const b = await chromium.launch();
    try { // ---- Advent (ZVM, Inform) ----
        const p = await open(b, 'Advent.z5.js');
        const rooms = await walk3(p);
        check('advent walked 3 distinct rooms', rooms.length === 3, rooms);
        check('depth-0 first visit bound to its own snapshot at the next save_undo', await p.evaluate(() => { const vm = window.__PARCHLOCK_ZVM__, e = ParchLockMap.RewindLog[0]; return !!e && e.undoDepthAtEntry === 0 && e.next === vm.undo[0]; }));
        const [A, B, C] = rooms;
        let s = await p.state();
        check('advent runs on ZVM with an undo stack', s.zvm && s.undo > 0, s);
        check('not offered before a native UNDO has been seen to succeed', !s.armed && (await p.evaluate(n => !ParchLockMap.RewindOffer(n), A.cur)), s);
        let h = await p.hold(A.cur);
        check('unarmed: long-press opens Notes directly (one step)', h.editor && !h.rewind && /Add note to/.test(h.title), h);
        await p.hide();
        // Arm: one native UNDO (back to B), then walk to C again.
        const before = (await p.state()).undo;
        await p.cmd('undo');
        s = await p.state();
        check('native UNDO succeeded and armed rewind', s.armed && s.undo === before - 1 && String(s.roomId) === String(B.roomId), { before, s, B });
        const back = await p.evaluate(() => ((WorldModel.lastPayload || {}).exits || []).map(e => ({ c: e.command || e.label, t: String(e.targetRoomId) })));
        const toC = back.find(e => e.t === String(C.roomId));
        if (toC) await p.cmd(toC.c);
        s = await p.state();
        check('back in the third room after arming', String(s.roomId) === String(C.roomId), { s, C, back });
        check('current room never offers Rewind', await p.evaluate(n => !ParchLockMap.RewindOffer(n), C.cur));
        h = await p.hold(C.cur);
        check('current room: long-press opens Notes directly', h.editor && !h.rewind, h);
        await p.hide();
        const offer = await p.evaluate(n => { const o = ParchLockMap.RewindOffer(n); const e = ParchLockMap.RewindLog.find(x => x.room.Name === n); return o && { steps: o.steps, depth: e && e.undoDepthAtEntry }; }, A.cur);
        const N = offer && offer.steps;
        check('first room offers Rewind with N = undo.length - undoDepthAtEntry, 1 <= N <= undo.length', !!offer && N === s.undo - offer.depth && N >= 2 && N <= s.undo, { offer, s });
        h = await p.hold(A.cur);
        check('armed visited room: long-press shows the Notes / Rewind to here menu', h.notes && h.rewind && !h.editor, h);
        await p.hide();
        // IB1: no line input -> abort before anything is discarded.
        const ab = await p.evaluate(n => { const vm = window.__PARCHLOCK_ZVM__, before = vm.undo.length, ul = vm.undo_len; const li = document.querySelector('.Input.LineInput'); li.style.display = 'none';
            const r = ParchLockMap.Rewind(n); li.style.display = ''; const out = { r, before, after: vm.undo.length, ul, ul2: vm.undo_len, last: ParchLockMap.LastRewind, busy: ParchLockMap.RewindBusy }; Message.Hide(); return out; }, A.cur);
        check('no line input: rewind aborts with nothing discarded', ab.r === false && ab.after === ab.before && ab.ul2 === ab.ul && ab.last && !ab.last.ok && /Nothing was discarded/.test(ab.last.message) && !ab.busy, ab);
        // (b) a half-typed line survives the menu + confirm.
        await p.evaluate(() => { $('.Input.LineInput').val('take lam'); });
        h = await p.hold(A.cur);
        await p.evaluate(() => $('#room-hold-rewind').click());
        const conf = await p.evaluate(() => ({ text: document.querySelector('#message > div').textContent, ok: !!document.querySelector('#rewind-confirm'), cancel: !!document.querySelector('#rewind-cancel') }));
        check('confirmation names the turn count and warns', conf.ok && conf.cancel && conf.text.includes('Rewind ' + N + ' turns to ' + A.cur + '? Progress since then is lost.'), conf);
        const pre = (await p.state()).undo;
        await p.evaluate(() => $('#rewind-confirm').click());
        // A command typed during the verification window must not turn a good rewind into a failure.
        await p.waitForTimeout(400);
        await p.evaluate(() => { const v = $('.Input.LineInput').val(); Input.Clear(); Input.Inject('look', true); window.__m11draft = v; });
        await p.waitForTimeout(2500); await p.settle();
        check('half-typed line restored after the rewind', await p.evaluate(() => window.__m11draft === 'take lam'));
        s = await p.state();
        const last = await p.evaluate(() => ParchLockMap.LastRewind || null);
        check('rewind: payload room equals the target', String(s.roomId) === String(A.roomId) && s.cur === A.cur, { s, A, last });
        check('rewind: undo.length dropped by N (plus the one typed LOOK)', s.undo === pre - N + 1, { pre, s });
        await p.evaluate(() => { ParchLockMap.Draw(); });
        s = await p.state();
        check('rewind: map highlight is on the target', s.here.trim() === A.cur, s);
        check('rewind reported success', !!(last && last.ok), last);
        check('visit log truncated at the depth reached', await p.evaluate(n => ParchLockMap.RewindLog.length === 1 && ParchLockMap.RewindLog[0].room.Name === n, A.cur));
        await p.close();
    } catch (e) { check('advent run', false, e.message); }
    try { // ---- Alabaster (Glulx): never offered ----
        const p = await open(b, 'Alabaster.gblorb.js');
        const rooms = await walk3(p);
        await p.cmd('undo');
        const s = await p.state();
        const offered = await p.evaluate(names => names.some(n => !!ParchLockMap.RewindOffer(n)), rooms.map(r => r.cur).filter(Boolean));
        check('alabaster (Glulx) has no ZVM and never offers Rewind', !s.zvm && !offered, { s, rooms: rooms.map(r => r.cur) });
        if (rooms[0] && rooms[0].cur) {
            const h = await p.hold(rooms[0].cur);
            check('alabaster: long-press opens Notes directly', h.editor && !h.rewind, h);
        }
        await p.close();
    } catch (e) { check('alabaster run', false, e.message); }
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
