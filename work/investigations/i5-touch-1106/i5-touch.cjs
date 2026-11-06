// I5 browser touch verify (2026-11-06) against a HEAD git-archive tree (env I5HEAD). Read-only.
// Method: work/investigations/zil-titles/browser-touch-1031/touch-verify.cjs; seeding from regression-gate.cjs.
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url'); const T = process.env.I5HEAD;
const { chromium } = require(T + '/node_modules/playwright'); const OUT = __dirname, results = [];
async function boot(b, game) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(T + '/play.html').href + '?story=games/' + game); await p.waitForTimeout(2500);
  const settle = async (key) => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press(key || 'Space'); key = null; await p.waitForTimeout(150); } return false; };
  const cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1200); await settle(); };
  if (!/bookvol/.test(game)) await settle();
  const cdp = await ctx.newCDPSession(p); return { p, ctx, cdp, settle, cmd };
}
const text = S => S.p.evaluate(() => (document.getElementById('windowport') || document.body).innerText);
const shot = (S, f) => S.p.screenshot({ path: path.join(OUT, f) }).then(() => f);
const rec = (check, pass, detail) => { results.push({ check, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', check, JSON.stringify(detail)); };
async function tapEl(S, h) { await h.scrollIntoViewIfNeeded(); const bx = await h.boundingBox(); await S.p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); }
async function openMap(S) { const open = await S.p.evaluate(() => document.body.classList.contains('map-open')); if (!open) { const t = await S.p.$('#pl-map-tab'); if (t && await t.isVisible()) { await tapEl(S, t); await S.p.waitForTimeout(900); } } return S.p.evaluate(() => document.body.classList.contains('map-open')); }
async function tapChip(S, dir) { const h = await S.p.$('#exits .exit.shown.dir-' + dir + ' .dir-name'); if (!h || !(await h.isVisible())) return false; await tapEl(S, h); return true; }
const rooms = S => S.p.evaluate(() => (ParchLockMap.Rooms || []).map(r => r.Name));
const here = S => S.p.evaluate(() => document.querySelector('#map .room.dir-here')?.innerText.trim());
(async () => {
  const b = await chromium.launch();
  // 1 Princeton door hint
  { const S = await boot(b, 'saveprinceton.z8.js'); await S.cmd('no');
    const chip = await S.p.evaluate(() => document.querySelector('#exits .exit.dir-sw')?.innerText.replace(/\s+/g, ' ').trim()); const f1 = await shot(S, '1a-princeton-sw-hint.png');
    const before = (await text(S)).length; const ok = await tapChip(S, 'sw'); await S.p.waitForTimeout(2000); await S.settle(); const t = (await text(S)).slice(before); const f2 = await shot(S, '1b-princeton-after-tap.png');
    rec('1 Door hint Princeton', /→\s*Entryway\?/.test(chip || '') && ok && /Entryway/.test(t), { chip, tapped: ok, after: t.slice(0, 300), here: await here(S), shots: [f1, f2] }); await S.ctx.close(); }
  // 2 Hitchhik seated move
  { const S = await boot(b, 'Hitchhik.z5.js'); await S.cmd('turn on light'); const f1 = await shot(S, '2a-hitchhik-in-bed.png');
    const before = (await text(S)).length; const shown = await S.p.evaluate(() => [...document.querySelectorAll('#exits .exit.shown')].map(e => e.className)); let used = null; for (const d of ['s', 'w', 'e', 'out', 'n']) { if (await tapChip(S, d)) { used = 'chip:' + d; break; } }
    if (!used) { const dl = await S.p.$('.pl-act[data-kind=direction]:not(.is-stale)'); if (dl) { await tapEl(S, dl); used = 'direction-link:' + (await dl.textContent()); } }
    if (!used) { await S.p.keyboard.press('Control+Shift+ArrowDown'); used = 'ctrl+shift+down (no shown chip/direction link)'; }
    await S.p.waitForTimeout(5000); await S.settle(); await S.p.waitForTimeout(2500); await S.settle(); const t = (await text(S)).slice(Math.max(0, before - 80)); const f2 = await shot(S, '2b-hitchhik-after-tap.png');
    const gi = t.search(/get out of bed/i); const rest = gi >= 0 ? t.slice(gi + 5) : ''; const mv = new RegExp('>\\s*(s|w|e|n|south|west|east|out)\\b', 'i');
    rec('2 Seated move Hitchhik', gi >= 0 && mv.test(rest), { shownChips: shown, chip: used, transcript: t.slice(0, 900), shots: [f1, f2] }); await S.ctx.close(); }
  // 3 Inventory probe
  for (const [g, bad, n] of [['anchor.z8.js', /The pockets of your trenchcoat are empty/i, '3a'], ['MakeItGood.zblorb.js', /In addition to your trenchcoat, you are wearing/i, '3b']]) {
    const S = await boot(b, g); const before = await text(S); const tabVis0 = await S.p.evaluate(() => { const t = document.getElementById('pl-equip-tab'); return t ? getComputedStyle(t).display + '/' + getComputedStyle(t).visibility : 'none'; });
    const tb = await S.p.$('#pl-equip-tab');
    let how = 'api'; for (let i = 0; i < 10 && tb && !(await tb.isVisible()); i++) await S.p.waitForTimeout(500); if (tb && await tb.isVisible()) { await tapEl(S, tb); how = 'tap:' + (await tb.evaluate(e => e.id || e.className || e.textContent.trim().slice(0, 20))); }
    await S.p.waitForTimeout(1000); if (!(await S.p.evaluate(() => EquipmentUI.IsOpen()))) { await S.p.evaluate(() => { try { StatTracker.markInventoryWarningSeen(); } catch (e) {} if (!EquipmentUI.IsOpen()) EquipmentUI.Toggle(); }); how += '+api'; }
    await S.p.waitForTimeout(2500); const open = await S.p.evaluate(() => EquipmentUI.IsOpen()); const f = await shot(S, n + '-' + g.split('.')[0] + '-equipment.png');
    const names = await S.p.evaluate(() => [...document.querySelectorAll('.equip-row:not(.equip-self)')].map(e => e.textContent.trim().replace(/\s+/g, ' ')));
    await S.p.evaluate(() => { if (EquipmentUI.IsOpen()) EquipmentUI.Toggle(); }); await S.p.waitForTimeout(600);
    const lines = await S.p.evaluate(src => { const re = new RegExp(src, 'i'); return [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')].filter(l => re.test(l.textContent)).map(l => { const cs = getComputedStyle(l), r = l.getBoundingClientRect(); return { t: l.textContent.trim().slice(0, 70), cls: l.className, ariaHidden: l.getAttribute('aria-hidden'), display: cs.display, visibility: cs.visibility, h: Math.round(r.height), shown: !(l.classList.contains('pl-stat-probe') || l.getAttribute('aria-hidden') === 'true') && cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 }; }); }, bad.source);
    const echoed = await S.p.evaluate(() => [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')].filter(l => /^>\s*(i|inv|inventory|score)\s*$/i.test(l.textContent.trim())).map(l => { const cs = getComputedStyle(l); return l.textContent.trim() + ' shown=' + (!(l.classList.contains('pl-stat-probe') || l.getAttribute('aria-hidden') === 'true') && cs.display !== 'none' && cs.visibility !== 'hidden' && l.getBoundingClientRect().height > 0); }));
    const fS = await shot(S, n + '-' + g.split('.')[0] + '-story-after.png'); const all = await text(S);
    rec(n + ' Inventory probe ' + g, open && lines.length > 0 && !lines.some(l => l.shown), { badLines: lines, probeEchoes: echoed, storyAfterShot: fS, tabVis0, opened: how, open, before: before.slice(-250), storyHasBad: bad.test(all), newStory: all.slice(before.length - 20).slice(0, 700), rows: names, shots: [f] }); await S.ctx.close(); }
  // 4 Sherlock status
  { const S = await boot(b, 'Sherlock.z5.js'); const strip = await S.p.evaluate(() => document.getElementById('pl-stats-rows')?.innerText.replace(/\s+/g, ' '));
    const geo = () => S.p.evaluate(() => { const g = document.querySelector('.GridWindow.pl-oneline-status'); const bw = [...document.querySelectorAll('.BufferWindow')].map(e => Math.round(e.getBoundingClientRect().top)); const r = g && g.getBoundingClientRect(); return { grid: !!g, gridVis: g ? getComputedStyle(g).display !== 'none' && getComputedStyle(g).visibility !== 'hidden' && r.height > 0 : false, bufTop: bw, hideCls: document.getElementById('windowport')?.classList.contains('pl-hide-status') }; });
    const g0 = await geo(); const f0 = await shot(S, '4a-sherlock-status-default.png');
    const setOpt = async v => {
      const ob = false; await S.p.evaluate(() => WorkspaceUI.ShowOptions()); await S.p.waitForTimeout(800);
      const sum = await S.p.evaluateHandle(() => { const c = document.getElementById('pl-hide-status-line'); const d = c && c.closest('details'); return d && !d.open ? d.querySelector('summary') : null; }).then(h => h.asElement()); if (sum) { await tapEl(S, sum); await S.p.waitForTimeout(500); }
      const cb = await S.p.$('#pl-hide-status-line'); let how = 'none';
      if (cb && await cb.isVisible()) { if ((await cb.isChecked()) !== v) { await tapEl(S, cb); how = 'tap'; } else how = 'already'; }
      else if (cb) { await S.p.evaluate(v => { const c = document.getElementById('pl-hide-status-line'); c.checked = v; $(c).trigger('change'); }, v); how = 'api'; }
      await S.p.waitForTimeout(800); const lbl = await S.p.evaluate(() => document.getElementById('pl-hide-status-line')?.parentElement?.innerText.trim());
      return { optionsBtn: !!ob, how, label: lbl, checked: await S.p.evaluate(() => document.getElementById('pl-hide-status-line')?.checked) };
    };
    const closeOpt = async () => { await S.p.keyboard.press('Escape'); await S.p.evaluate(() => { const c = [...document.querySelectorAll('button')].find(e => e.offsetParent && /^(close|done|×|✕)$/i.test(e.textContent.trim())); if (c) c.click(); }); await S.p.waitForTimeout(800); };
    const o1 = await setOpt(true); const f1 = await shot(S, '4b-sherlock-options-on.png'); await closeOpt();
    const g1 = await geo(); const f2 = await shot(S, '4c-sherlock-status-hidden.png'); const o2 = await setOpt(false); await closeOpt(); const g2 = await geo(); const f3 = await shot(S, '4d-sherlock-status-back.png');
    rec('4 Status Sherlock', /Time/i.test(strip || '') && /\d+:\d\d/.test(strip || '') && g0.gridVis && !g1.gridVis && g1.hideCls && g2.gridVis && !g2.hideCls && (g1.bufTop[0] < g0.bufTop[0]), { strip, g0, o1, g1, o2, g2, shots: [f0, f1, f2, f3] }); await S.ctx.close(); }
  // 5 bookvol
  { const S = await boot(b, 'bookvol.z5.js'); await S.settle('b'); await S.p.waitForTimeout(1500); await S.settle(); const seen = [];
    const snap = async () => { seen.push({ here: await here(S), rooms: await rooms(S) }); }; await snap(); const f1 = await shot(S, '5a-bookvol-start.png');
    for (const c of ['look', 'n', 's', 'e', 'w', 'u', 'd']) { await S.cmd(c); await snap(); } const f2 = await shot(S, '5b-bookvol-walk.png');
    const names = [...new Set(seen.flatMap(s => [s.here, ...s.rooms]).filter(Boolean))]; const bad = names.filter(n => /^\s*(\||down)\s*$/i.test(n));
    rec('5 Room names bookvol', names.length > 0 && bad.length === 0 && names.some(n => /^(Home|Hallway)$/i.test(n)), { names, bad, heres: seen.map(s => s.here), tail: (await text(S)).slice(-500), shots: [f1, f2] }); await S.ctx.close(); }
  // 6 guess
  { const S = await boot(b, 'guess.z5.js'); await S.cmd('new'); const r = await rooms(S); const f = await shot(S, '6-guess-map.png');
    const vis = await S.p.evaluate(() => [...document.querySelectorAll('#map .room')].filter(e => e.offsetParent).map(e => e.innerText.trim()).filter(Boolean));
    rec('6 Rooms guess', r.includes('Verb Guessing Booth'), { rooms: r, mapLabels: vis, shots: [f] }); await S.ctx.close(); }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1)); await b.close();
})();
