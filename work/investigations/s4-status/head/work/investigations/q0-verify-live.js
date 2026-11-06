// Q0 verification (read-only), wump2ka on HEAD: carry items incl. pellets, cross multi-section rooms and darkness, SAVE, then check Equipment, `i` underlines, CARRIED/CAPACITY vs game text.
const { chromium } = require('playwright'), path = require('path'), { pathToFileURL } = require('url');
let pass = 0, fail = 0; const check = (ok, m, d) => { ok ? pass++ : fail++; console.log((ok ? 'PASS: ' : 'FAIL: ') + m + (ok ? '' : ' ' + JSON.stringify(d).slice(0, 400))); };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 850 }, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed => { let s = seed; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; }, +(process.env.SEED || 12345));
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(3500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 8 && !await p.locator('.Input.LineInput').count(); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  if (await p.locator('.Input.LineInput').count()) { await p.locator('.Input.LineInput').fill('no'); await p.keyboard.press('Enter'); await p.waitForTimeout(1000); }
  for (let i = 0; i < 15 && !await p.locator('.Input.LineInput').count(); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(200); }
  const cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1500); };
  await cmd('take pellets'); await cmd('take pellets');
  // route through several rooms (BFS to a room 5+ steps away), noting section changes
  const route = await p.evaluate(() => { const mem = ZRamProvider.getMem(); const q = [{ id: WorldModel.lastPayload.roomId, path: [] }], seen = new Set(); let best = null;
    while (q.length) { const a = q.shift(); if (seen.has(a.id)) continue; seen.add(a.id); if (a.path.length >= 5) { best = a.path; break; } ZRamReader.lookAheadExits(mem, a.id).forEach(e => { if (e.targetRoomId && !seen.has(e.targetRoomId)) q.push({ id: e.targetRoomId, path: a.path.concat({ label: e.label }) }); }); } return best; });
  check(!!route, 'route of 5+ rooms found', route);
  const rooms = new Set(), sections = new Set();
  for (const s of route || []) { const c = await p.evaluate(s => Actionable.resolveExitCommand(s.label), s); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1300); console.log('move', s.label, '->', c, await p.evaluate(() => WorldModel.lastPayload.roomId));
    const st = await p.evaluate(() => ({ room: WorldModel.lastPayload.roomId, sec: (WorldModel.lastPayload.sectionGroup || WorldModel.lastPayload.section || null) })); rooms.add(st.room); sections.add(JSON.stringify(st.sec)); }
  await cmd('take all');
  await cmd('switch off bar'); console.log('off reply', await p.evaluate(() => [...document.querySelectorAll('.BufferLine')].slice(-5).map(l => l.textContent).join(' | '))); await cmd('look'); const dark = await p.evaluate(() => DarkScope.dark); console.log('dark reply', await p.evaluate(() => [...document.querySelectorAll('.BufferLine')].slice(-6).map(l => l.textContent).join(' | '))); await cmd('north'); await cmd('south'); await cmd('switch on bar'); const lit = await p.evaluate(() => DarkScope.dark);
  check(dark === true && lit === false, 'darkness entered and left via Glow Bar', { dark, lit });
  check(rooms.size >= 4, 'moved through ' + rooms.size + ' rooms (' + sections.size + ' section keys)', [...rooms]);
  await cmd('save'); for (let i = 0; i < 6; i++) { await p.evaluate(() => { try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await cmd('i');
  const st = await p.evaluate(() => { WorldModel.tick(); const inv = (WorldModel.lastPayload.inventory || []).map(o => ({ id: o.id, name: o.name }));
    const eq = EquipmentUI.model().items.map(o => ({ id: o.id, name: o.name }));
    const lines = [...document.querySelectorAll('.BufferLine')]; let k = lines.length - 1; while (k > 0 && !/You are carrying:/i.test(lines[k].textContent)) k--;
    const invLines = lines.slice(k, k + 14); const marks = invLines.flatMap(l => [...l.querySelectorAll('.pl-act')].map(m => m.textContent));
    const text = lines.slice(-40).map(l => l.textContent).join('\n');
    const status = document.body.innerText.match(/CARRIED[^\n]*|CAPACITY[^\n]*/gi) || []; let stats = null; try { stats = StatTracker.model().stats; } catch (e) {}
    return { inv, eq, marks, invText: invLines.map(l => l.textContent).join(' | ').slice(0, 600), text, status, stats }; });
  console.log('inventory', JSON.stringify(st.inv)); console.log('equipment', JSON.stringify(st.eq)); console.log('i text', st.invText); console.log('marks', st.marks); console.log('spear dbg', JSON.stringify(await p.evaluate(() => { const o = (WorldModel.lastPayload.inventory || []).find(x => /spear/i.test(x.name || '') || x.id); const all = (WorldModel.lastPayload.inventory || []).map(x => ({ id: x.id, name: x.name, printed: x.printedName || x.displayName })); const lines = [...document.querySelectorAll('.BufferLine')].filter(l => /stone spear/.test(l.textContent)).map(l => l.innerHTML.slice(0, 200)); return { all, lines }; }))); console.log('status', st.status, st.stats);
  check(st.inv.length >= 3, 'carrying several items (' + st.inv.length + ')', st.inv);
  check(/food pellets/.test(st.invText) && st.inv.filter(o => o.id === 198 || o.id === 199).length === 2, 'pellets carried (ids 198,199; game lists two food pellets)', st.inv);
  check(st.eq.length === st.inv.length && st.inv.every(o => st.eq.some(e => e.id === o.id)), 'Equipment sheet lists every carried item', { inv: st.inv, eq: st.eq });
  const itemLines = st.invText.split(' | ').slice(1).filter(x => /^\s+\S/.test(x)); const unmarked = itemLines.filter(l => !st.marks.some(m => l.includes(m)));
  check(st.marks.length > 0 && unmarked.length === 0, '`i` output items underlined', { unmarked, marks: st.marks });
  await cmd('score'); const sc = await p.evaluate(() => [...document.querySelectorAll('.BufferLine')].slice(-12).map(l => l.textContent).join('\n'));
  const game = { carried: (sc.match(/carrying (\d+) lbs/i) || [])[1], capacity: (sc.match(/\((\d+)% of your current capacity/i) || [])[1], worth: (sc.match(/worth about .(\d+)/) || [])[1] };
  const ui = await p.evaluate(() => { const S = StatTracker.model().stats; return Object.keys(S).map(k => k + ' ' + JSON.stringify({ v: S[k].value, max: S[k].max, label: S[k].label })); });
  console.log('game score text:', sc.replace(/\n/g, ' | ').slice(0, 500)); console.log('ui:', JSON.stringify(ui));
  const S = await p.evaluate(() => StatTracker.model().stats); const uiNum = k => String(S[k] && S[k].value);
  check(game.carried != null && uiNum('weight') === game.carried, 'status CARRIED matches game (' + game.carried + ')', { game, ui });
  check(game.capacity != null && uiNum('capacity') === game.capacity, 'status CAPACITY % matches game (' + game.capacity + ')', { game, ui });
  check(game.worth != null && uiNum('value') === game.worth, 'status VALUE matches game ($' + game.worth + ')', { game, S });
  check(errs.length === 0, 'no page errors', errs);
  console.log(pass + ' PASS / ' + fail + ' FAIL'); await b.close(); process.exit(fail ? 1 : 0); })().catch(e => { console.error(e); process.exit(2); });




