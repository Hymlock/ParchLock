// T10 (operator): quick repeat + Submit-hold command-history radial.
//
//   node harness/t10-history-radial.js [--width=360]
//
// Contract (docs/ai-plan.md "Active Plan: T10" + Codex #1476 amendments):
//   - tapping Submit on an EMPTY line repeats the last command the player
//     actually submitted; a non-empty line submits as before;
//   - holding Submit opens a dedicated history radial (newest first) and
//     never also submits; the input-line hold/right-click radial is unchanged;
//   - choosing a history item submits it exactly once and leaves the bar empty;
//   - history is only player submissions: probe-owned echoes are excluded by
//     ownership, never by verb (a typed "score" stays);
//   - labels truncate readably (word boundary, verb kept), Command is full;
//   - the tutorial's Send step teaches both gestures.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const width = Number((process.argv.find(a => a.startsWith('--width=')) || '--width=1280').slice(8));
const GAME = 'deephome.z5.js';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width, height: 850 }, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
    for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1');
    window.__subs = []; window.__radials = [];
    const hook = setInterval(() => {
      if (window.Actionable && Actionable.Submit && window.Input && Input.Inject && window.ParchLockQol && ParchLockQol.OpenRadial && !window.__t10) {
        const s = Actionable.Submit; Actionable.Submit = function (c, src) { window.__subs.push(String(c)); return s.apply(this, arguments); };
        const r = ParchLockQol.OpenRadial; ParchLockQol.OpenRadial = function (x, y, cmds, ctx) { window.__radials.push({ ctx: ctx || {}, items: (cmds || []).map(c => ({ Label: c.Label, Command: c.Command })) }); return r.apply(this, arguments); };
        window.__t10 = 1; clearInterval(hook);
      }
    }, 50);
  });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + GAME);
  await p.waitForTimeout(6000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  const out = []; const ok = (c, m) => out.push((c ? 'PASS: ' : 'FAIL: ') + m);
  const echoes = () => p.evaluate(() => Array.from(document.querySelectorAll('#windowport .Style_input')).map(e => e.textContent.trim()));
  const typed = async (c) => { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); };

  // 1. Labels.
  const labels = await p.evaluate(() => {
    const f = ParchLockQol.HistoryLabel; if (typeof f !== 'function') return null;
    return { short: f('look', 24), long: f('put the small brass key into the ornate wooden box', 24), word: f('supercalifragilisticexpialidocious', 12) };
  });
  ok(labels && labels.short === 'look', 'label: a short command is unchanged');
  ok(labels && /^put the small\b/.test(labels.long) && /…$/.test(labels.long) && labels.long.length <= 24 && !/\s…$/.test(labels.long), 'label: long command cut at a word boundary, verb kept: ' + (labels && labels.long));
  ok(labels && labels.word.length <= 12 && /…$/.test(labels.word), 'label: a single overlong word is hard-cut: ' + (labels && labels.word));

  // 2. Empty tap repeats the last PLAYER command; non-empty tap submits the bar.
  await typed('look');
  let before = (await echoes()).length; let subs0 = await p.evaluate(() => window.__subs.length);
  await p.locator('.Input.LineInput').fill('');
  await p.click('#pl-input-submit'); await p.waitForTimeout(1500);
  let e = await echoes(); let subs1 = await p.evaluate(() => window.__subs.length);
  ok(e.length === before + 1 && e[e.length - 1].toLowerCase() === 'look', 'empty tap repeats the last command: ' + JSON.stringify(e.slice(-2)));
  ok(subs1 - subs0 <= 1, 'empty tap submits at most once');
  await p.locator('.Input.LineInput').fill('inventory'); await p.click('#pl-input-submit'); await p.waitForTimeout(1500);
  e = await echoes(); ok(e[e.length - 1].toLowerCase() === 'inventory', 'non-empty tap submits the bar as before');

  // 3. History is player-only by ownership, not by verb.
  const hist = await p.evaluate(() => {
    const win = document.querySelector('#windowport .BufferWindow');
    const owned = document.createElement('div'); owned.className = 'BufferLine pl-stat-probe';
    const s1 = document.createElement('span'); s1.className = 'Style_input'; s1.textContent = 'prowess'; owned.appendChild(s1); win.appendChild(owned);
    const player = document.createElement('div'); player.className = 'BufferLine';
    const s2 = document.createElement('span'); s2.className = 'Style_input'; s2.textContent = 'score'; player.appendChild(s2); win.appendChild(player);
    const h = ParchLockQol.GetHistory();
    owned.remove(); player.remove();
    return h;
  });
  ok(hist.indexOf('prowess') < 0, 'history excludes a probe-owned echo');
  ok(hist.indexOf('score') >= 0, 'history keeps a player-typed "score" (by ownership, not verb): ' + JSON.stringify(hist.slice(0, 4)));

  // 3b. Operator report: commands sent from RADIALS (not typed) must be in the
  // history and repeatable; an automatic status probe must not be.
  await p.evaluate(() => Actionable.Submit('examine me'));             // as a radial/map tap sends it
  await p.waitForTimeout(1500);
  await p.evaluate(() => Input.Inject('wait', true, 'stat-probe'));   // an automatic probe-style send
  await p.waitForTimeout(1500);
  const h2 = await p.evaluate(() => ParchLockQol.GetHistory().slice(0, 4));
  ok(h2[0] && h2[0].toLowerCase() === 'examine me', 'a radial-sent command is first in the history: ' + JSON.stringify(h2));
  ok(await p.evaluate(() => !ParchLockQol._sent.some(c => c.toLowerCase() === 'wait')), 'a status-probe send is never recorded as sent');
  before = (await echoes()).length;
  await p.locator('.Input.LineInput').fill(''); await p.click('#pl-input-submit'); await p.waitForTimeout(1500);
  e = await echoes();
  ok(e[e.length - 1].toLowerCase() === 'examine me', 'empty Send repeats the radial-sent command');
  await typed('inventory');   // restore the expectation used below (newest = inventory)

  // 4. Hold Submit -> history radial, no submit on release; pick -> exactly one submit.
  const r0 = await p.evaluate(() => window.__radials.length); subs0 = await p.evaluate(() => window.__subs.length);
  const box = await p.locator('#pl-input-submit').boundingBox();
  await p.evaluate(({ x, y }) => {
    const el = document.getElementById('pl-input-submit');
    const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await p.waitForTimeout(900);
  await p.evaluate(({ x, y }) => {
    const el = document.getElementById('pl-input-submit');
    const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [t], bubbles: true, cancelable: true }));
    el.click();   // the browser's trailing synthetic click must not submit
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await p.waitForTimeout(800);
  const rad = await p.evaluate((r0) => window.__radials.slice(r0), r0);
  subs1 = await p.evaluate(() => window.__subs.length);
  const hr = rad.find(r => r.ctx && r.ctx.source === 'history');
  ok(!!hr, 'holding Submit opens the history radial');
  ok(hr && hr.items.length && hr.items[0].Command.toLowerCase() === 'inventory' && hr.items.some(i => i.Command.toLowerCase() === 'look'), 'history radial lists submitted commands newest first: ' + JSON.stringify(hr && hr.items.slice(0, 3)));
  ok(hr && !hr.items.some(i => /^(undo|save|restore|\/map)$/i.test(i.Command)), 'history radial is not the suggestions radial');
  ok(subs1 === subs0, 'hold + release (and trailing click) submits nothing');
  before = (await echoes()).length; subs0 = subs1;
  const picked = await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#radial-menu [data-command], #radial-menu .radial-item, #radial-menu button')).find(n => /look/i.test(n.textContent));
    if (!btn) return false; btn.click(); return true;
  });
  await p.waitForTimeout(1500);
  e = await echoes(); subs1 = await p.evaluate(() => window.__subs.length);
  ok(picked && e.length === before + 1 && e[e.length - 1].toLowerCase() === 'look', 'choosing a history item submits it');
  ok(subs1 - subs0 === 1, 'choosing an item submits exactly once');
  ok(await p.evaluate(() => (document.querySelector('.Input.LineInput') || {}).value === ''), 'the bar is left empty after choosing');

  // 5. Desktop: right-click Submit -> history; right-click the input line -> general radial unchanged.
  // (Phones have no right-click; the hold path above covers them.)
  if (width >= 600) {
  const r1 = await p.evaluate(() => window.__radials.length);
  await p.click('#pl-input-submit', { button: 'right' }); await p.waitForTimeout(400);
  await p.evaluate(() => { const m = document.getElementById('radial-menu'); if (m) m.click(); document.body.click(); });
  await p.click('.Input.LineInput', { button: 'right' }); await p.waitForTimeout(400);
  const rad2 = await p.evaluate((r1) => window.__radials.slice(r1), r1);
  ok(rad2[0] && rad2[0].ctx.source === 'history', 'right-click Submit opens the history radial');
  ok(rad2.some(r => r.ctx.source !== 'history' && r.items.some(i => /^undo$/i.test(i.Command))), 'the input-line radial still offers Undo');
  }

  // 8. Codex #1512 regressions.
  const r1512 = await p.evaluate(() => {
    // (a) Two visible line prompts: Send refuses (no inject at all).
    const first = document.querySelector('.Input.LineInput');
    const extra = first.cloneNode(); extra.value = ''; first.parentNode.appendChild(extra);
    first.value = '';
    let injected = 0; const real = Input.Inject; Input.Inject = function () { injected++; return true; };
    const realSubmit = Actionable.Submit; let submitted = 0; Actionable.Submit = function () { submitted++; return true; };
    Input.SubmitPrompt();
    Input.Inject = real; Actionable.Submit = realSubmit; extra.remove();
    // (b) 30 remembered commands are all reachable from the history radial.
    const saved = ParchLockQol._sent.slice();
    for (let i = 0; i < 30; i++) ParchLockQol.RecordSent('cmd ' + i);
    const items = ParchLockQol.GetHistoryRadialCommands().length;
    ParchLockQol._sent = saved;
    return { injected, submitted, items };
  });
  ok(r1512.injected === 0 && r1512.submitted === 0, 'two visible line prompts: Send refuses (fail closed): ' + JSON.stringify(r1512));
  ok(r1512.items >= 30, 'all 30 remembered commands are offered (radial pages them): ' + r1512.items);

  // 7. T11 (operator): choosing a radial command RUNS it.
  await p.evaluate(() => { try { ParchLockQol.HideRadialMenu(); } catch (e) {} if (window.Message && Message.IsOpen) Message.Hide(); });
  const t11 = await p.evaluate(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const r0 = window.__radials.length;
    // A verb stem from the general radial.
    ParchLockQol.OpenRadial(200, 300, [{ Command: 'examine ', Label: 'examine', Enter: false }], { source: 'input' });
    await wait(50);
    const stemBtn = document.querySelector('#radial-menu .radial-command'); if (stemBtn) stemBtn.click();
    await wait(100);
    const after = window.__radials.slice(r0);
    const target = after.find(r => r.ctx && r.ctx.source === 'target');
    const bar = (document.querySelector('.Input.LineInput') || {}).value;
    let echoed = null;
    if (target && target.items.length) {
      const before = document.querySelectorAll('#windowport .Style_input').length;
      const tb = document.querySelector('#radial-menu .radial-command'); if (tb) tb.click();
      await wait(1500);
      const ech = Array.from(document.querySelectorAll('#windowport .Style_input'));
      echoed = { added: ech.length - before, last: ech.length ? ech[ech.length - 1].textContent.trim() : null, want: target.items[0].Command };
    }
    // A complete command marked Enter:false runs without Send.
    ParchLockQol.OpenRadial(200, 300, [{ Command: '/history', Label: 'History', Enter: false }], { source: 'input' });
    await wait(50);
    const hb = document.querySelector('#radial-menu .radial-command'); if (hb) hb.click();
    await wait(400);
    const histShown = !!(window.Message && Message.IsOpen);
    const barAfter = (document.querySelector('.Input.LineInput') || {}).value;
    if (window.Message && Message.IsOpen) Message.Hide();
    return { target: !!target, targets: target ? target.items.length : 0, barAfterStem: bar, echoed, histShown, barAfter };
  });
  ok(t11.target && t11.targets > 0 && !t11.barAfterStem, 'T11: a verb stem opens a target radial instead of pasting: ' + JSON.stringify(t11));
  ok(t11.echoed && t11.echoed.added === 1 && t11.echoed.last.toLowerCase() === t11.echoed.want.toLowerCase(), 'T11: choosing a target submits the whole command once');
  ok(t11.histShown && !t11.barAfter, 'T11: a complete command (History) runs without pressing Send');

  // 6. Tutorial teaches both gestures.
  const tut = await p.evaluate(() => { try { return JSON.stringify(Tutorial.Steps || Tutorial.steps || ''); } catch (e) { return ''; } });
  const src = require('fs').readFileSync('js/Tutorial.js', 'utf8').replace(/"\s*\+\s*"/g, '');   // join split string literals
  ok(/empty[^"]{0,80}repeat|repeat[^"]{0,80}last command/i.test(src) && /hold[^"]{0,80}(recent|history)/i.test(src), 'tutorial Send step teaches tap-to-repeat and hold-for-history');

  out.forEach(l => console.log(l));
  const fail = out.filter(l => l.startsWith('FAIL')).length;
  console.log(`${out.length - fail} PASS / ${fail} FAIL (width ${width})`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
