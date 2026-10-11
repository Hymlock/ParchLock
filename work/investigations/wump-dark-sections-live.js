// Operator-save dark + multi-section live check (read-only). Real fields: ZRamReader.measuredLocation (real_location section, dark) and the map room SectionGroup (MapTopology.stampSectionGroup).
const { chromium } = require(require('path').resolve('node_modules/playwright')); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const check = (ok, m, d) => { ok ? pass++ : fail++; console.log((ok ? 'PASS: ' : 'FAIL: ') + m + (ok ? '' : ' ' + JSON.stringify(d).slice(0, 500))); };
const pkg = fs.readFileSync('work/investigations/operator-2026-10-10-wumpus-dark/save.json', 'utf8');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(2500);
  const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
  await settle(); if (/restore a saved game/i.test(await p.evaluate(() => document.body.innerText))) { await p.locator('.Input.LineInput').fill('no'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); await settle(); }
  await p.evaluate(t => ParchLockQol.ImportPackageData(t), pkg); await p.waitForTimeout(1500); await settle();
  const cmd = async c => { await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1300); await settle(); };
  const st = () => p.evaluate(() => { WorldModel.tick(); const m = ZRamProvider.getMem(); const ml = ZRamReader.measuredLocation(m); const lp = WorldModel.lastPayload || {}; const room = ParchLockMap.Rooms.find(r => String(r.ObjectId) === String(ml && ml.roomId));
    return { ml, payloadRoom: lp.roomId, dark: DarkScope.dark, section: room ? room.SectionGroup : 'no-room', name: room && room.Name, reply: [...document.querySelectorAll('.BufferLine')].slice(-4).map(l => l.textContent).join(' | ').slice(-160) }; });
  const log = []; let s0 = await st(); log.push(['start', s0]);
  check(!!s0.ml, 'measuredLocation fact resolves on the operator save', s0);
  for (let i = 0; i < 6; i++) { const ex = await p.evaluate(() => { const m = ZRamProvider.getMem(); const id = ZRamReader.measuredLocation(m).roomId; const seen = window.__seen = window.__seen || {}; seen[id] = 1; const xs = ZRamReader.lookAheadExits(m, id).filter(e => e.targetRoomId); return (xs.find(e => !seen[e.targetRoomId]) || xs[0] || {}).label; }); if (!ex) break; const c = await p.evaluate(l => Actionable.resolveExitCommand(l), ex); await cmd(c); log.push([c, await st()]); }
  const r50 = await p.evaluate(() => { const m = ZRamProvider.getMem(); const q = [{ id: ZRamReader.measuredLocation(m).roomId, path: [] }], seen = new Set(); while (q.length) { const a = q.shift(); if (a.id === 50) return a.path; if (seen.has(a.id)) continue; seen.add(a.id); ZRamReader.lookAheadExits(m, a.id).forEach(e => { if (e.targetRoomId && !seen.has(e.targetRoomId)) q.push({ id: e.targetRoomId, path: a.path.concat(e.label) }); }); } return null; }); console.log('route to 50', JSON.stringify(r50));
  for (const l of r50 || []) { await cmd(await p.evaluate(l => Actionable.resolveExitCommand(l), l)); log.push(['to50', await st()]); }
  await cmd('switch on bar'); log.push(['pre switch on', await st()]); await cmd('switch off bar'); const d1 = await st(); log.push(['switch off bar', d1]);
  const ex = await p.evaluate(() => { const m = ZRamProvider.getMem(); return (ZRamReader.lookAheadExits(m, ZRamReader.measuredLocation(m).roomId).find(e => e.targetRoomId) || {}).label; });
  if (ex) { await cmd(await p.evaluate(l => Actionable.resolveExitCommand(l), ex)); log.push(['dark move', await st()]); }
  await cmd('switch on bar'); const d2 = await st(); log.push(['switch on bar', d2]);
  log.forEach(([c, s]) => console.log(c.padEnd(16), JSON.stringify({ real: s.ml && s.ml.roomId, mDark: s.ml && s.ml.dark, payload: s.payloadRoom, uiDark: s.dark, sec: s.section, name: s.name }), '|', s.reply.slice(-90)));
  const rows = log.map(x => x[1]);
  check(rows.every(s => !s.ml || String(s.payloadRoom) === String(s.ml.roomId)), 'payload room = measured real_location section on every step', rows.map(s => [s.payloadRoom, s.ml && s.ml.roomId]));
  check(rows.every(s => !s.ml || s.dark === s.ml.dark), 'UI darkness = measured darkness on every step', rows.map(s => [s.dark, s.ml && s.ml.dark]));
  check(rows.some(s => s.ml && s.ml.dark) && rows.some(s => s.ml && !s.ml.dark), 'dark and lit both observed (measured)', rows.map(s => s.ml && s.ml.dark));
  const secs = new Set(rows.filter(s => typeof s.section === 'number').map(s => s.section));
  check(secs.size >= 2, 'multiple map section groups crossed (' + [...secs].join(',') + ')', rows.map(s => s.section));
  check(rows.every(s => s.section !== 'no-room'), 'every visited measured section has a map room', rows.map(s => s.section));
  await cmd('i'); const inv = await p.evaluate(() => { const ls = [...document.querySelectorAll('.BufferLine')]; let k = ls.length - 1; while (k > 0 && !/You are carrying:/.test(ls[k].textContent)) k--; const items = ls.slice(k + 1).filter(l => /^\s{2}\S/.test(l.textContent)); return { inv: (WorldModel.lastPayload.inventory || []).map(o => o.id), eq: EquipmentUI.model().items.map(o => o.id), items: items.map(l => ({ t: l.textContent.trim(), m: !!l.querySelector('.pl-act') })) }; });
  console.log('inventory', JSON.stringify(inv));
  check(inv.eq.length === inv.inv.length && inv.inv.every(i => inv.eq.includes(i)), 'Equipment = RAM inventory after dark/sections', inv);
  check(inv.items.length > 0 && inv.items.every(x => x.m), 'every `i` listing line underlined', inv.items.filter(x => !x.m));
  check(errs.length === 0, 'no page errors', errs);
  console.log(pass + ' PASS / ' + fail + ' FAIL'); await b.close(); process.exit(fail ? 1 : 0); })().catch(e => { console.error(e); process.exit(2); });



