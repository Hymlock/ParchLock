// D207 Step 6b: FULL headless-status matrix (operator: every row, no slimming).
//
//   node harness/status-probe-matrix.js --owner=claude [--only=FILE.js] [--concurrency=3] [--resume]
//
// For every manifest row (work/status-audit/z/headless-command-manifest.json)
// of the given owner, at widths 1280 and 360, plays the row's recorded route
// into play, then fires each trigger in turn -- Equipment open, Refresh,
// reopen, Identify stats -- and asserts, per trigger:
//   - no visible line added by the trigger except the prompt or a line the
//     runtime released as a turn event (data-pl-probe-event);
//   - no visible echo of a status command;
//   - nothing spoken except text of released turn events.
// A typed LOOK afterwards must be visible and spoken (positive control).
// Results: work/status-audit/z/<owner>-headless-matrix.json (written per run).
// Exit code is non-zero if any run fails.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const OWNER = arg('owner', 'claude');
const ONLY = arg('only', null);
const CONC = Number(arg('concurrency', '3'));
const RESUME = process.argv.includes('--resume');
const MANIFEST = path.resolve('work/status-audit/z/headless-command-manifest.json');
const OUT = path.resolve(arg('out', 'work/status-audit/z/' + OWNER + '-headless-matrix.json'));
const TRIGGERS = ['open', 'refresh', 'reopen', 'identify'];
const WIDTHS = arg('width', null) ? [Number(arg('width'))] : [1280, 360];

// Openers observed live (Claude, 2026-10-05) for rows whose manifest route
// does not reach a line prompt. Harness-local; the manifest stays Codex-owned.
const ROUTE_OVERRIDES = {
  'adverbum.z5.js': ['@until-line:Space:6'],              // two pages of intro
  'bookvol.z5.js': ['@key:b', '@until-line:Space:6'],     // menu: B = begin a new session
  'BeingSteve.zblorb.js': ['@until-line:Space:80'],       // each key types the next scripted letter
  'largemac.z5.js': ['@until-line:Space:150'],            // slow typewriter text, one keypress per step
};

const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function settle(p, ms) {
  const t0 = Date.now();
  await p.waitForTimeout(600);
  while (Date.now() - t0 < ms) {
    const busy = await p.evaluate(() => {
      try {
        if (window.Message && Message.IsOpen) { const ok = document.querySelector('#message button, .message button'); if (ok) ok.click(); else Message.Hide(); return true; }
        return !!(StatTracker._probeActive || StatTracker._hideCarryProbe || StatTracker._carryProbeTimer || StatTracker._probeQueue.length || StatTracker._statProbeOwned);
      } catch (e) { return false; }
    });
    if (!busy) break;
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(1200);   // read-aloud debounce + release
}

async function measure(p, mark) {
  return p.evaluate((mark) => {
    const lines = Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine')).slice(mark.lines);
    const visible = (l) => { const r = l.getBoundingClientRect(); const cs = getComputedStyle(l); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.clip === 'auto'; };
    const rows = lines.map(l => {
      const text = (l.textContent || '').replace(/ /g, ' ').trim();
      const visibleText = (window.ReadAloud && ReadAloud.speakableText ? ReadAloud.speakableText(l) : text).replace(/ /g, ' ').trim();
      return {
        text: text.slice(0, 160),
        shown: visible(l) && visibleText.length > 0,
        event: !!(l.getAttribute('data-pl-probe-event') || (l.closest && l.closest('[data-pl-probe-event]'))),
        prompt: /^>?\s*$/.test(visibleText) || !!l.querySelector('.Input, .LineInput, .CharInput'),
        echo: !!(l.querySelector('.Style_input') && visible(l) && !(l.querySelector('.Style_input').closest('.pl-stat-probe, .pl-carry-probe'))),
      };
    });
    const spoken = (window.__readAloudLog || []).slice(mark.speech).map(e => e.text);
    return { rows, spoken, submits: (window.__subs || []).slice(mark.subs) };
  }, mark);
}

async function markNow(p) {
  return p.evaluate(() => ({ lines: document.querySelectorAll('#windowport .BufferWindow .BufferLine').length, speech: (window.__readAloudLog || []).length, subs: (window.__subs || []).length }));
}

async function fire(p, trig) {
  await p.evaluate((trig) => {
    if (trig === 'open') EquipmentUI.Show();
    else if (trig === 'refresh') { const b = document.getElementById('equipment-refresh'); if (b) b.click(); else StatTracker.requestStatusFulfillment(true); }
    else if (trig === 'reopen') { EquipmentUI.Hide(); }
    else if (trig === 'identify') StatTracker.Identify();
  }, trig);
  if (trig === 'reopen') { await p.waitForTimeout(700); await p.evaluate(() => EquipmentUI.Show()); }
}

function judge(m) {
  const eventText = norm(m.rows.filter(r => r.event).map(r => r.text).join(' '));
  const leaks = m.rows.filter(r => r.shown && !r.event && !r.prompt).map(r => r.text);
  const echoes = m.rows.filter(r => r.echo).map(r => r.text);
  // A spoken leak is speech of HIDDEN span text (not visible narration that a
  // slow story happened to finish reading after the trigger began).
  const hiddenText = m.rows.filter(r => !r.shown && !r.event).map(r => norm(r.text)).filter(t => t.length > 3);
  const spokenLeaks = m.spoken.filter(s => { const n = norm(s); return n && hiddenText.some(h => n.indexOf(h.slice(0, 40)) >= 0 || h.indexOf(n.slice(0, 40)) >= 0); });
  const spokenText = norm(m.spoken.join(' '));
  const unspokenEvents = m.rows.filter(r => r.event).map(r => r.text).filter(t => { const n = norm(t); return n && spokenText.indexOf(n.slice(0, 40)) < 0; });
  return { leaks, echoes, spokenLeaks, unspokenEvents, events: m.rows.filter(r => r.event).map(r => r.text), submits: m.submits };
}

async function runOne(browser, row, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 850 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(90000);   // some stories (Lurking Horror) block the event loop for long stretches
  await p.addInitScript(() => {
    sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
    for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1');
    window.__PL_TEST_SPEECH = true;
    try { const ss = window.speechSynthesis; ss.speak = function () {}; ss.cancel = function () {}; ss.resume = function () {}; } catch (e) {}
    window.__subs = [];
    const hook = setInterval(() => { if (window.Actionable && Actionable.Submit && !Actionable.__mx) { const o = Actionable.Submit; Actionable.Submit = function (c, s) { window.__subs.push(String(c) + ' [' + s + ']'); return o.apply(this, arguments); }; Actionable.__mx = 1; clearInterval(hook); } }, 50);
  });
  const res = { file: row.file, width, triggers: {}, look: null, status: 'pass', notes: [] };
  try {
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + row.file);
    await p.waitForTimeout(row.format === 'glulx' ? 9000 : 6000);
    await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
    const route = ROUTE_OVERRIDES[row.file] || (row.playRoute && row.playRoute.commands) || [];
    if (ROUTE_OVERRIDES[row.file]) res.notes.push('route override: ' + JSON.stringify(route));
    for (const c of route) {
      const until = /^@until-line:([^:]+):(\d+)$/.exec(c);
      if (until) {
        for (let k = 0; k < Number(until[2]) && !(await p.locator('.Input.LineInput').count()); k++) { await p.keyboard.press(until[1]); await p.waitForTimeout(400); }
        continue;
      }
      if (c === '@space') { await p.keyboard.press('Space'); await p.waitForTimeout(1200); continue; }
      if (c === '@advance-space') {
        for (let k = 0; k < 12 && !(await p.locator('.Input.LineInput').count()); k++) { await p.keyboard.press('Space'); await p.waitForTimeout(900); }
        continue;
      }
      if (c.startsWith('@key:')) { await p.keyboard.press(c.slice(5) || 'Enter'); await p.waitForTimeout(1200); continue; }
      if (c.charAt(0) === '@') { res.notes.push('route token skipped: ' + c); continue; }   // batch-harness actions (@equipment, @reopen)
      const li = p.locator('.Input.LineInput');
      if (await li.count()) { await li.fill(c); await li.press('Enter'); } else { await p.keyboard.press('Space'); }
      await p.waitForTimeout(1500);
    }
    await settle(p, 8000);   // let the opener's own output finish (and be read) before measuring
    for (const trig of TRIGGERS) {
      if (!(await p.locator('.Input.LineInput').count())) { res.triggers[trig] = { blocked: 'no line prompt' }; res.notes.push(trig + ' blocked: no line prompt'); continue; }
      const mark = await markNow(p);
      await fire(p, trig);
      await settle(p, 14000);
      const j = judge(await measure(p, mark));
      res.triggers[trig] = j;
      if (j.leaks.length || j.echoes.length || j.spokenLeaks.length || j.unspokenEvents.length) res.status = 'fail';
    }
    // Positive control: a typed LOOK is shown and spoken.
    await p.evaluate(() => { try { EquipmentUI.Hide(); } catch (e) {} });
    await p.waitForTimeout(500);
    const li = p.locator('.Input.LineInput');
    if (await li.count()) {
      const mark = await markNow(p);
      await li.fill('look'); await li.press('Enter'); await p.waitForTimeout(2500);
      // Slow stories delay the read-aloud flush; wait for speech, bounded.
      for (let k = 0; k < 15 && !(await p.evaluate((n) => (window.__readAloudLog || []).length > n, mark.speech)); k++) await p.waitForTimeout(500);
      const m = await measure(p, mark);
      const shown = m.rows.filter(r => r.shown && !r.prompt).length;
      res.look = { shown, spoken: m.spoken.length };
      if (!shown || !m.spoken.length) { res.status = 'fail'; res.notes.push('LOOK control not shown/spoken'); }
    } else { res.look = { blocked: true }; res.notes.push('LOOK control blocked: no line prompt'); }
    const anySubmit = TRIGGERS.some(t => res.triggers[t] && res.triggers[t].submits && res.triggers[t].submits.some(s => /stat-probe/.test(s)));
    if (!anySubmit && res.status === 'pass') res.status = 'no-probe';
  } catch (e) { res.status = 'error'; res.notes.push(String(e && e.message || e).slice(0, 200)); }
  await ctx.close();
  return res;
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  let rows = manifest.rows.filter(r => r.owner === OWNER);
  if (ONLY) rows = rows.filter(r => r.file === ONLY);
  const out = RESUME && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { owner: OWNER, manifest: path.relative('.', MANIFEST), startedAt: new Date().toISOString(), runs: [] };
  // Bind evidence to the exact runtime under test (Codex #1475).
  const crypto = require('crypto');
  const hashes = {};
  ['js/StatTracker.js', 'js/ReadAloud.js', 'js/Actionable.js', 'js/ModuleStatFacts.js', 'js/ModuleStatFactsClaude.js'].forEach(f => {
    try { hashes[f] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch (e) {}
  });
  if (out.runtimeHashes && JSON.stringify(out.runtimeHashes) !== JSON.stringify(hashes)) {
    console.error('Runtime changed since this result file began; refusing to mix revisions. Remove ' + OUT + ' to restart.');
    process.exit(2);
  }
  out.runtimeHashes = hashes;
  // Resume skips only settled widths: a pass, or a genuine no-probe (nothing
  // sent, nothing blocked). Fail, error and startup-blocked widths are retried;
  // the earlier receipt moves to history rather than being lost (Codex #1483).
  const settled = (r) => r.status === 'pass' || (r.status === 'no-probe' && !r.notes.some(n => /blocked/.test(n)));
  out.history = out.history || [];
  const done = new Set(out.runs.filter(settled).map(r => r.file + '@' + r.width));
  const hashNow = () => { const h = {}; Object.keys(hashes).forEach(f => { try { h[f] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch (e) {} }); return JSON.stringify(h); };
  const hashStart = JSON.stringify(hashes);
  const jobs = [];
  rows.forEach(r => WIDTHS.forEach(w => { if (!done.has(r.file + '@' + w)) jobs.push([r, w]); }));
  const browser = await chromium.launch();
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const [row, width] = jobs[next++];
      if (hashNow() !== hashStart) { console.error('Runtime changed mid-run; stopping without recording.'); process.exit(2); }
      const res = await runOne(browser, row, width);
      if (hashNow() !== hashStart) { console.error('Runtime changed during ' + row.file + '@' + width + '; result discarded.'); process.exit(2); }
      res.at = new Date().toISOString();
      out.runs = out.runs.filter(r => { if (r.file === row.file && r.width === width) { out.history.push(r); return false; } return true; });
      out.runs.push(res); out.updatedAt = res.at;
      fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
      console.log(`${res.status.toUpperCase()} ${row.file} @${width}` + (res.notes.length ? ' :: ' + res.notes.join('; ') : ''));
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONC) }, worker));
  await browser.close();
  const tally = {}; out.runs.forEach(r => { tally[r.status] = (tally[r.status] || 0) + 1; });
  console.log('TOTAL', JSON.stringify(tally), '->', path.relative('.', OUT));
  process.exit(out.runs.some(r => r.status === 'fail' || r.status === 'error') ? 1 : 0);
})();
