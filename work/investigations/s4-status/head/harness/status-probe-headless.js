// D207 headless status probes.
//
//   node harness/status-probe-headless.js --unit
//       Deterministic ownership/speech boundary cases in a real DOM.
//   node harness/status-probe-headless.js GAME.js [cmds...] [--refresh|--reopen] [--width=N]
//       Live: open Equipment (accepting the one-time notice), let the status
//       probes run, then report every BufferWindow line added since the open
//       that is VISIBLE (real box, not clipped), everything read-aloud spoke,
//       ownership release, and a typed LOOK as the positive control.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');

async function unit() {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/TreasuresofaSlaversKingdom.z8.js'); await p.waitForTimeout(5000);
  const results = await p.evaluate(async () => {
    const out = []; const ok = (c, m) => out.push((c ? 'PASS: ' : 'FAIL: ') + m);
    const tick = () => new Promise(r => setTimeout(r, 0));
    const wp = document.getElementById('windowport');
    const win = document.createElement('div'); win.className = 'BufferWindow pl-unit'; wp.appendChild(win);
    const mk = (t) => { const l = document.createElement('div'); l.className = 'BufferLine'; l.textContent = t; win.appendChild(l); return l; };
    const owned = (n) => !!(n && n.closest && n.closest('.pl-stat-probe'));
    const S = StatTracker;
    const start = () => { S._probeActive = { verb: 'prowess' }; S.beginProbeOwnership(); };
    const stop = () => { S._probeActive = null; S.endProbeOwnership(); };

    // A: an underline re-wrap inside a line that existed before submission is
    // not probe output (this is what hid "Mossy Stone Idol" mid-turn).
    const preA = mk('There is a large, MOSSY STONE IDOL here.'); await tick(); start();
    preA.textContent = 'There is a large, '; const act = document.createElement('span'); act.className = 'pl-act'; act.textContent = 'MOSSY STONE IDOL'; preA.appendChild(act); preA.appendChild(document.createTextNode(' here.')); await tick();
    ok(!preA.classList.contains('pl-stat-probe') && !preA.querySelector('.pl-stat-probe'), 'A pre-submit line re-wrap is never owned');
    ok(ReadAloud.speakableText(preA).trim() === 'There is a large, MOSSY STONE IDOL here.', 'A pre-submit line stays fully speakable');
    stop();

    // R: the operator's battle example. Reply, then a real enemy attack, in
    // the same probe turn: the reply stays hidden, the attack is shown and spoken.
    start();
    const r1 = mk('You carry only a GLADIUS SWORD (currently un-used), and your trusty THESKIAN DUFFEL BAG.');
    const r2 = mk(' ');
    const r3 = mk('VON DARTH brings his MACHETE to bear! You have suffered 8 hits of damage!');
    const r4 = mk(' ');
    const r5 = mk('Your score is 2 of a possible 500, in 9 turns.');
    await tick();
    ok([r1, r2, r3, r4, r5].every(l => l.classList.contains('pl-stat-probe')), 'R whole span hidden while it is printed (no flash)');
    if (ReadAloud.spokenLengths) [r1, r2, r3, r4, r5].forEach(l => ReadAloud.spokenLengths.set(l, 0));
    stop();
    ok(r1.classList.contains('pl-stat-probe'), 'R status reply stays hidden after the turn');
    ok(!r3.classList.contains('pl-stat-probe') && !r3.getAttribute('aria-hidden'), 'R enemy attack revealed after the turn');
    ok(r5.classList.contains('pl-stat-probe'), 'R a later known reply line stays hidden');
    const said = ReadAloud.collectNewLines().join(' | ');
    ok(/MACHETE/.test(said) && !/GLADIUS/.test(said) && !/score is/.test(said), 'R read-aloud speaks the attack only: ' + JSON.stringify(said));

    // K (Codex #1452): a reply continued after "heading:" + blank stays hidden.
    start();
    const k1 = mk('Current statistics:'); const k2 = mk(' '); const k3 = mk('Your current magical stamina is 12 out of 20.');
    await tick(); stop();
    ok(k1.classList.contains('pl-stat-probe') && k3.classList.contains('pl-stat-probe'), 'K colon-introduced continuation stays hidden');

    // M: a META probe (I6 dictionary flag) cannot share its turn with an event:
    // every paragraph stays hidden.
    const realMeta = S.probeVerbIsMeta; S.probeVerbIsMeta = (v) => v === 'score';
    S._probeActive = { verb: 'score' }; S.beginProbeOwnership();
    const m1 = mk('You have scored 2.'); const m2 = mk(' '); const m3 = mk('An unrecognised second paragraph of the score reply.');
    await tick(); S.endProbeOwnership(); S._probeActive = null; S.probeVerbIsMeta = realMeta;
    ok(m1.classList.contains('pl-stat-probe') && m3.classList.contains('pl-stat-probe'), 'M META probe span stays wholly hidden');

    // N (Codex #1461): the META cache never crosses stories, even with an
    // unresolved identity key.
    {
      const realGet = ZRamProvider.getMem, realParse = ZRamReader.parseDictionary, realKey = ZRamReader.gameIdentityKey;
      const memA = new Uint8Array(8), memB = new Uint8Array(8);
      let cur = memA;
      ZRamProvider.getMem = () => cur; ZRamReader.gameIdentityKey = () => null;
      ZRamReader.parseDictionary = (m) => ({ informVerbFlags: true, entries: [{ word: 'score', flags: m === memA ? 0x03 : 0x01 }] });
      S._metaVerbCache = null;
      const a = S.probeVerbIsMeta('score'); cur = memB; const bm = S.probeVerbIsMeta('score');
      cur = memA; S.probeVerbIsMeta('score'); S.reset && S.reset(); const afterReset = S._metaVerbCache;
      ZRamProvider.getMem = realGet; ZRamReader.parseDictionary = realParse; ZRamReader.gameIdentityKey = realKey; S._metaVerbCache = null;
      ok(a === true && bm === false, 'N META verdict does not leak between distinct null-key stories');
      ok(afterReset === null, 'N story reset clears the META cache');
    }

    // O (Codex #1459/#1467): the real finishProbe seam. A META score probe
    // follows an earlier inventory carry span; finishProbe clears
    // _probeActive before ownership ends, yet release must still judge the
    // span by ITS command (score, META), not the stale carry verb.
    {
      const realMeta = S.probeVerbIsMeta; S.probeVerbIsMeta = (v) => v === 'score';
      S._carryVerb = 'inventory';
      S._probeActive = { verb: 'score', kind: 'score' }; S._probeQueue = []; S.beginProbeOwnership();
      const o1 = mk('You have scored 2.'); const o2 = mk(' '); const o3 = mk('An unknown second paragraph.');
      await tick(); S.finishProbe('complete'); S.probeVerbIsMeta = realMeta; S._carryVerb = null;
      ok(o3.classList.contains('pl-stat-probe'), 'O finishProbe releases by the span origin (META score stays hidden)');
      ok(S._spanOrigin === null, 'O span origin cleared after release');
    }

    // S (Codex sweep, Suspect @360): read-aloud flushes WHILE the span is
    // still hidden; the event released afterwards must still be spoken.
    start();
    const s1 = mk('You are healthy and sober.'); const s2 = mk(' ');
    const s3 = mk('Off near the fireplace, the fairy queen spills her drink.');
    await tick();
    if (ReadAloud.spokenLengths) [s1, s2, s3].forEach(l => ReadAloud.spokenLengths.delete(l));
    ReadAloud.collectNewLines();          // a flush during the hidden span
    stop();
    const heard = ReadAloud.collectNewLines().join(' | ');
    ok(/fairy queen spills/.test(heard) && !/healthy and sober/.test(heard), 'S event released after a hidden-span flush is still spoken: ' + JSON.stringify(heard));

    // P (rev3 leak): the probe's own prompt line existed before submission,
    // yet output written into it during the span is the probe's.
    {
      const pl = mk('>'); const pin = document.createElement('input'); pin.className = 'Input LineInput pl-unit-input'; pl.appendChild(pin);
      await tick();
      const realQ = document.querySelector.bind(document);
      const saved = S._probeInput;
      S._probeActive = { verb: 'diagnose' };
      S._statProbeOwned = false;
      // beginProbeOwnership picks the first live input; point it at ours.
      const others = Array.from(document.querySelectorAll('.Input.LineInput, .Input.CharInput')).filter(n => n !== pin);
      others.forEach(n => n.classList.add('pl-unit-parked')); others.forEach(n => n.classList.remove('Input'));
      S.beginProbeOwnership();
      others.forEach(n => { n.classList.add('Input'); n.classList.remove('pl-unit-parked'); });
      pin.remove();
      pl.appendChild(document.createTextNode('diagnose You feel fine.'));
      await tick();
      ok(pl.classList.contains('pl-stat-probe') || !!pl.querySelector('.pl-stat-probe'), 'P output written into the probe\'s own prompt line is owned');
      S._probeActive = null; S.endProbeOwnership(); S._probeInput = saved;
    }

    // W (Codex #1517, Spring @360): an inventory continuation heading after a
    // blank line, and the items under it, are reply -- not events.
    start();
    const w1 = mk('You are carrying a towel.'); const w2 = mk(' ');
    const w3 = mk('In addition, you are wearing:'); const w4 = mk('a pair of flipflops');
    const w5 = mk(' '); const w6 = mk('A seagull swoops past.');
    await tick(); stop();
    ok(w3.classList.contains('pl-stat-probe') && w4.classList.contains('pl-stat-probe'), 'W known colon heading and its items stay hidden');
    ok(!w6.classList.contains('pl-stat-probe'), 'W a later real event is still released');

    // B: a line created during the span is owned whole.
    start(); const newB = mk('Your current Hit Points are 9 (out of 16).'); await tick();
    ok(newB.classList.contains('pl-stat-probe'), 'B line created during span owned whole'); stop();

    // C: an in-place text change (normalize after re-wrap) on a pre-submit line
    // is not probe output.
    const preC = mk('The bear growls.'); await tick(); start();
    preC.firstChild.nodeValue = 'The bear growls loudly.'; await tick();
    ok(!preC.classList.contains('pl-stat-probe') && !preC.querySelector('.pl-stat-probe'), 'C pre-submit line untouched by in-place change');
    stop();

    // D: reused line with a historical echo and owned child keeps later narration speakable.
    const lineD = mk(''); const echo = document.createElement('span'); echo.className = 'Style_input'; echo.textContent = 'score'; lineD.appendChild(echo);
    const own = document.createElement('span'); own.className = 'pl-stat-probe'; own.textContent = ' You have scored 2.'; lineD.appendChild(own);
    lineD.appendChild(document.createTextNode(' A guard enters.'));
    ok(ReadAloud.speakableText(lineD).trim() === 'A guard enters.', 'D reused line speaks only unowned narration');
    if (ReadAloud.spokenLengths) ReadAloud.spokenLengths.delete(lineD);
    const spoken = ReadAloud.collectNewLines().join(' | ');
    ok(/A guard enters\./.test(spoken) && !/scored/.test(spoken) && !/score\b/.test(spoken.replace('A guard enters.', '')), 'D collectNewLines speaks narration, not echo or reply: ' + JSON.stringify(spoken));

    // E: nothing is owned after the span ends.
    const lineE = mk('Later narration.'); await tick();
    ok(!lineE.classList.contains('pl-stat-probe'), 'E no ownership after endProbeOwnership');

    // F: a live input inserted during the span is never claimed.
    start(); const lineF = mk(''); const inp = document.createElement('input'); inp.className = 'Input LineInput'; lineF.appendChild(inp); await tick();
    ok(!inp.classList.contains('pl-stat-probe') && !owned(inp), 'F live input never claimed'); stop();

    // G: ownership requires an active probe.
    S._probeActive = null; S._carrySpanOwned = false; S._statProbeOwned = true; const lineG = mk('Unsubmitted.'); await tick();
    ok(!lineG.classList.contains('pl-stat-probe'), 'G no claim without an active submitted probe'); S.endProbeOwnership();

    // H: carry span owns its lines and releases on the next prompt.
    S._carrySpanOwned = true; S.beginProbeOwnership(); const lineH = mk('You carry only a GLADIUS SWORD.'); await tick();
    ok(lineH.classList.contains('pl-stat-probe'), 'H carry probe line owned');
    const lineH2 = mk(''); const inp2 = document.createElement('input'); inp2.className = 'Input LineInput'; lineH2.appendChild(inp2); await tick();
    ok(!S._carrySpanOwned && !S._statProbeOwned, 'H carry span released at the next prompt');
    win.remove();
    return out;
  });
  results.forEach(r => console.log(r));
  const fail = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`${results.length - fail} PASS / ${fail} FAIL`);
  await b.close();
  process.exit(fail ? 1 : 0);
}

(async () => {
  if (process.argv.includes('--unit')) return unit();
  const game = process.argv[2]; const cmds = process.argv.slice(3);
  const width = Number((process.argv.find(a => a.startsWith('--width=')) || '--width=1280').slice(8));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width, height: 850 } });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1');
    window.__spoken = [];
    // Real speech path, observed: unmute automation and stub the engine.
    window.__PL_TEST_SPEECH = true;
    try { const ss = window.speechSynthesis; ss.speak = function () {}; ss.cancel = function () {}; ss.resume = function () {}; } catch (e) {} });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(6000);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (const c of cmds.filter(c => !c.startsWith('--'))) {
    if (c === '@space') { await p.keyboard.press('Space'); await p.waitForTimeout(1500); continue; }
    const i = p.locator('.Input.LineInput'); if (await i.count()) { await i.fill(c); await i.press('Enter'); } await p.waitForTimeout(1800);
  }
  const before = await p.evaluate(() => {
    // Hook narration so we can see what read-aloud would be handed.
    try { if (window.ReadAloud && !ReadAloud.__h) { for (const k of Object.keys(ReadAloud)) { if (typeof ReadAloud[k] === 'function' && /speak|enqueue|say/i.test(k)) { const o = ReadAloud[k]; ReadAloud[k] = function () { window.__spoken.push(k + ':' + String(arguments[0] && (arguments[0].textContent || arguments[0])).slice(0, 120)); return o.apply(this, arguments); }; } } ReadAloud.__h = 1; } } catch (e) {}
    window.__speechMark = (window.__readAloudLog || []).length;
    return document.querySelectorAll('.BufferWindow .BufferLine').length;
  });
  const submits = [];
  await p.exposeFunction('__sub', s => submits.push(s));
  await p.evaluate(() => { const o = Actionable.Submit; Actionable.Submit = function (c, s) { window.__sub(c + ' [' + s + ']'); return o.apply(this, arguments); }; });
  await p.evaluate(() => EquipmentUI.Show());
  await p.waitForTimeout(800);
  await p.evaluate(() => { if (Message.IsOpen) { const ok = document.querySelector('#message button, .message button'); if (ok) ok.click(); else Message.Hide(); } });
  await p.waitForTimeout(9000);
  if (process.argv.includes('--refresh') || process.argv.includes('--reopen')) {
    // Second trigger on the same session: Refresh button, or close + reopen.
    await p.evaluate(() => { const ins = document.querySelectorAll('.BufferWindow .BufferLine').length; window.__mark = ins; });
    if (process.argv.includes('--refresh')) await p.evaluate(() => { const b = document.getElementById('equipment-refresh'); if (b) b.click(); else window.__sub('NO REFRESH BUTTON'); });
    else { await p.evaluate(() => EquipmentUI.Hide()); await p.waitForTimeout(800); await p.evaluate(() => EquipmentUI.Show()); }
    await p.waitForTimeout(800);
    await p.evaluate(() => { if (Message.IsOpen) { const ok = document.querySelector('#message button, .message button'); if (ok) ok.click(); else Message.Hide(); } });
    await p.waitForTimeout(9000);
  }
  const r = await p.evaluate((before) => {
    const lines = Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(before);
    const vis = lines.filter(l => { const cs = getComputedStyle(l); const rc = l.getBoundingClientRect(); return rc.width > 2 && rc.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.clip === 'auto' && l.textContent.trim(); });
    const hiddenProwess = lines.filter(l => /Adjusting for your abilities/.test(l.textContent)).map(l => l.textContent.replace(/\s+/g, ' ').slice(-90));
    const seq = lines.map(l => (l.classList.contains('pl-stat-probe') ? 'S' : l.classList.contains('pl-carry-probe') ? 'C' : '-') + '|' + JSON.stringify(l.textContent.slice(0, 70)));
    return { seq, hiddenProwess, added: lines.length, visible: vis.map(l => (l.className.replace('BufferLine', '').trim() || '-') + ' :: ' + l.textContent.trim().slice(0, 110)), hiddenCount: lines.length - vis.length, spoken: (window.__readAloudLog || []).slice(window.__speechMark || 0).map(e => e.text.slice(0, 160)),
      spokenBeforeOpen: (window.__readAloudLog || []).slice(0, window.__speechMark || 0).map(e => e.text.slice(0, 60)), fulfillment: (StatTracker.model() || {}).fulfillment };
  }, before);
  await p.evaluate(() => { try { for (const k of ['Hide', 'Close']) if (EquipmentUI[k]) { EquipmentUI[k](); break; } } catch (e) {} });
  await p.waitForTimeout(600);
  await p.screenshot({ path: process.env.SHOT || 'shot.png' });
  // Positive control: ownership must be released, and a typed LOOK must be
  // visible and spoken.
  const own = await p.evaluate(() => ({ owned: StatTracker._statProbeOwned, carry: StatTracker._carrySpanOwned, active: !!StatTracker._probeActive, mark: (window.__readAloudLog || []).length, lines: document.querySelectorAll('.BufferWindow .BufferLine').length }));
  const li = p.locator('.Input.LineInput');
  let look = null;
  if (await li.count()) {
    await li.fill('look'); await li.press('Enter'); await p.waitForTimeout(2500);
    look = await p.evaluate((own) => {
      const ls = Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(own.lines);
      const vis = ls.filter(l => { const r = l.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(l).clip === 'auto' && l.textContent.trim().length > 3; }).length;
      return { visibleLines: vis, spoken: (window.__readAloudLog || []).slice(own.mark).map(e => e.text.slice(0, 50)) };
    }, own);
  }
  console.log('AFTER:', JSON.stringify(own), 'LOOK:', JSON.stringify(look));
  console.log('SUBMITS:', JSON.stringify(submits));
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
