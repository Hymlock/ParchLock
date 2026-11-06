// S1 stage 1 (PROPOSAL-r2, I6 only): the hidden status probe's reply is cut
// at the probe verb's own action routine (entry/return), not by paragraph.
//   node harness/probe-action-boundary.js
// Seeded like work/investigations/regression-gate.cjs. Scenarios:
//   A anchor, first Equipment open on turn 1: no "pockets" line leaks.
//   B anchor, two WAITs then Equipment: the train-whistle daemon prints after
//     InvSub returns and stays visible as a turn event; pockets stay hidden.
//   C anchor, constructed react_before: a line printed by the VM inside the
//     action dispatcher before InvSub is entered stays visible.
//   E anchor, constructed after phase (stock InvSub ends with AfterRoutines):
//     react_after output printed INSIDE the action routine stays visible.
//   D MakeItGood (I6 library whose dispatcher passes no argument): no cut is
//     armed, so today's paragraph rule is unchanged (fail-visible).
const path = require('path'); const { pathToFileURL } = require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

async function boot(b, game) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(2000);
    for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); }
    await p.waitForTimeout(500);
    // Record each released span's boundary and cut.
    await p.evaluate(() => {
        window.__cuts = [];
        const orig = StatTracker.releaseProbeEvents;
        StatTracker.releaseProbeEvents = function () {
            const pb = StatTracker._probeBoundary, verb = (StatTracker._spanOrigin || {}).verb;
            const r = orig.apply(this, arguments);
            window.__cuts.push({ verb, entry: pb && pb.entry, after: pb && pb.after, ret: pb && pb.ret, bad: pb && pb.bad, armed: !!pb, cut: StatTracker._lastProbeCut });
            return r;
        };
    });
    return p;
}
async function type(p, cmd) {
    await p.locator('.Input.LineInput').first().focus();
    await p.keyboard.type(cmd); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
}
async function openEquipment(p) {
    const before = await p.evaluate(() => document.querySelectorAll('#windowport .BufferWindow .BufferLine').length);
    await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(400);
    await p.evaluate(() => { const c = document.querySelector('#message #close'); if (c) c.click(); });
    await p.waitForTimeout(4000);
    await p.evaluate(() => { const c = document.querySelector('#message #close'); if (c) c.click(); });
    await p.waitForTimeout(500);
    return p.evaluate((before) => {
        const lines = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')].slice(before);
        const hidden = l => l.classList.contains('pl-stat-probe') || l.getAttribute('aria-hidden') === 'true';
        return { lines: lines.map(l => ({ t: l.textContent.replace(/ /g, ' ').trim(), shown: !hidden(l), ev: l.getAttribute('data-pl-probe-event') })).filter(x => x.t), cuts: window.__cuts };
    }, before);
}
const find = (r, re) => r.lines.find(l => re.test(l.t));
const invCut = r => r.cuts.find(c => /^(?:i|inv|inventory)$/i.test(c.verb || ''));

(async () => {
    const b = await chromium.launch();
    try {
        // A
        let p = await boot(b, 'anchor.z8.js');
        let r = await openEquipment(p);
        let pk = find(r, /pockets of your trenchcoat/i), c = invCut(r);
        ok(c && c.armed && !c.bad && c.entry === 0 && c.ret > 0 && Array.isArray(c.cut), 'A anchor: inventory span cut at InvSub entry/return ' + JSON.stringify(c));
        ok(pk && !pk.shown && !pk.ev, 'A anchor first open: pockets line stays hidden ' + JSON.stringify(pk));
        ok(!r.lines.some(l => l.shown && /You are wearing your wedding ring/.test(l.t)), 'A anchor first open: first paragraph stays hidden');
        await p.close();
        // B
        p = await boot(b, 'anchor.z8.js');
        await type(p, 'wait'); await type(p, 'wait');
        r = await openEquipment(p);
        pk = find(r, /pockets of your trenchcoat/i); c = invCut(r);
        const wh = find(r, /train whistle/i);
        ok(c && Array.isArray(c.cut) && c.cut.includes('event'), 'B anchor: cut has an event after return ' + JSON.stringify(c));
        ok(wh && wh.shown && wh.ev === '1', 'B anchor: daemon line after InvSub return is visible ' + JSON.stringify(wh));
        ok(pk && !pk.shown, 'B anchor: pockets line hidden');
        await p.close();
        // C: constructed react_before -- printed through the VM inside the
        // dispatcher call (first argument = the action number) before InvSub.
        p = await boot(b, 'anchor.z8.js');
        await p.evaluate(() => {
            const P = Object.getPrototypeOf(window.__PARCHLOCK_ZVM__), oc = P.call; let done = false;
            P.call = function (t, i, e, s) {
                const pb = ZvmCapture._pb;
                if (!done && pb && pb.entry < 0 && s && s[0] === pb.action) { done = true; this._print('A constructed rat watches you from the gutter.\n'); }
                return oc.apply(this, arguments);
            };
        });
        r = await openEquipment(p);
        const rat = find(r, /constructed rat/); pk = find(r, /pockets of your trenchcoat/i); c = invCut(r);
        ok(c && c.entry > 0 && Array.isArray(c.cut) && c.cut[0] === 'event', 'C anchor: pre-entry text recorded before InvSub ' + JSON.stringify(c));
        ok(rat && rat.shown && rat.ev === '1', 'C anchor: reaction printed before action entry is visible ' + JSON.stringify(rat));
        ok(pk && !pk.shown, 'C anchor: pockets line hidden');
        await p.close();
        // E: constructed after phase. Anchorhead's own InvSub has no
        // AfterRoutines call, so just before InvSub returns this emulates a
        // stock one: a direct callee (AfterRoutines) that calls
        // (player, react_after) and prints. That line must stay visible and
        // the reply before it must stay hidden.
        p = await boot(b, 'anchor.z8.js');
        await p.evaluate(() => {
            const P = Object.getPrototypeOf(window.__PARCHLOCK_ZVM__), or = P.ret; let done = false;
            P.ret = function () {
                const pb = ZvmCapture._pb;
                if (!done && pb && !pb.bad && pb.entry >= 0 && pb.ret < 0 && this.frames.length === pb.entryDepth + 1) {
                    done = true;
                    ZvmCapture._pbCall(pb, this, 0x7777, []);                       // AfterRoutines()
                    ZvmCapture._pbCall(pb, this, 0x7778, [20, pb.afterProps[1]]);   // obj.react_after()
                    this._print('The constructed parrot squawks after your inventory.\n');
                    pb.stack.pop(); pb.stack.pop();
                }
                return or.apply(this, arguments);
            };
        });
        r = await openEquipment(p);
        const parrot = find(r, /constructed parrot/); pk = find(r, /pockets of your trenchcoat/i); c = invCut(r);
        ok(c && c.after > c.entry && c.after < c.ret && Array.isArray(c.cut) && c.cut.includes('event'), 'E anchor: after phase recorded inside [entry, return] ' + JSON.stringify(c));
        ok(parrot && parrot.shown && parrot.ev === '1', 'E anchor: react_after output inside the action routine is visible ' + JSON.stringify(parrot));
        ok(pk && !pk.shown, 'E anchor: pockets line (before the after phase) hidden');
        await p.close();
        // D
        p = await boot(b, 'MakeItGood.zblorb.js');
        r = await openEquipment(p);
        c = invCut(r);
        const shoes = find(r, /wide-brimmed hat/);
        ok(c && c.cut === null && c.bad === 'routine-without-dispatcher', 'D MakeItGood: no cut, paragraph rule kept ' + JSON.stringify(c));
        ok(shoes && shoes.shown && shoes.ev === '1', 'D MakeItGood: behaviour unchanged (second paragraph released as before)');
        await p.close();
    } catch (e) { fail++; console.log('FAIL exception ' + e.message); }
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
