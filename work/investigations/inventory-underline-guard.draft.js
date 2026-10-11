// Inventory loop confirmation guard (2026-10-11, operator 12:43/12:44; design work/investigations/2026-10-11-inventory-confirm-doccheck.md).
// Every `i` listing line naming a RAM-carried object is underlined on the object's CURRENT name; Equipment ids = RAM inventory ids.
// Cases: wump2ka seed 4 (rename: formation -> stone spear, id 290; identical pellets 198/199), shared-alias negative control, Zork I leaflet.
//   node harness/inventory-underline-guard.js
const { chromium } = require(require('path').resolve('node_modules/playwright')); const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0; const check = (ok, m, d) => { ok ? pass++ : fail++; console.log((ok ? 'PASS: ' : 'FAIL: ') + m + (ok ? '' : ' ' + JSON.stringify(d).slice(0, 400))); };
async function open(b, story, seed) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 850 }, isMobile: true, hasTouch: true })).newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.addInitScript(seed => { let s = seed; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; }, seed);
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve(process.env.ROOT || '.', 'play.html')).href + '?story=games/' + story); await p.waitForTimeout(3000);
  const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
  await settle(); if (/restore a saved game/i.test(await p.evaluate(() => document.body.innerText))) { await p.locator('.Input.LineInput').fill('no'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200); await settle(); }
  p.cmd = async c => { await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); await settle(); };
  p.inv = () => p.evaluate(() => { WorldModel.tick(); const ls = [...document.querySelectorAll('.BufferLine')]; let k = ls.length - 1; while (k > 0 && !/^\s*>\s*i\s*$/.test(ls[k].textContent)) k--;
    const items = ls.slice(k + 1).filter(l => /^\s{1,}\S/.test(l.textContent) && !/You are carrying \d|worth about/.test(l.textContent)).filter(l => l.textContent.trim().length);
    return { lines: items.map(l => ({ t: l.textContent.trim(), m: [...l.querySelectorAll('.pl-act')].map(x => x.textContent) })), inv: (WorldModel.lastPayload.inventory || []).map(o => String(o.id)), eq: EquipmentUI.model().items.map(o => String(o.id)), confirm: Actionable.InventoryConfirm || null }; });
  return p;
}
async function wumpSpear(b, control) {
  const p = await open(b, 'wump2ka.z5.js', 4);
  await p.cmd('take pellets'); await p.cmd('take pellets');
  // Targeted route (2026-10-11): BFS to the room that holds object 290 (the formation/spear) by RAM parent chain; the old blind 5-step BFS depended on exit order.
  // Adaptive walk (2026-10-11): re-plan by BFS to the room holding object 290 after every step and ban any edge whose
  // real result disagrees with the lookahead (known Wumpus 'exit 3' lookahead mismatch, ITEMS-QUEUE).
  const banned = [];
  for (let step = 0; step < 40; step++) { const plan = await p.evaluate(banned => { const mem = ZRamProvider.getMem(); const anc = new Set(); let o = 290; for (let k = 0; k < 8 && o; k++) { o = (ZRamReader.objectLinks(mem, o) || {}).parent; if (o) anc.add(o); } const start = WorldModel.lastPayload.roomId; if (anc.has(start)) return { done: true }; const q = [{ id: start, first: null }], seen = new Set(); while (q.length) { const a = q.shift(); if (seen.has(a.id)) continue; seen.add(a.id); if (anc.has(a.id)) return a.first; (ZRamReader.lookAheadExits(mem, a.id) || []).forEach(e => { if (!e.targetRoomId || seen.has(e.targetRoomId) || banned.includes(a.id + '/' + e.label)) return; q.push({ id: e.targetRoomId, first: a.first || { from: start, label: e.label, to: e.targetRoomId } }); }); } return null; }, banned);
    if (!plan || plan.done) break; await p.cmd(await p.evaluate(l => Actionable.resolveExitCommand(l), plan.label)); const now = await p.evaluate(() => WorldModel.lastPayload.roomId); if (now !== plan.to) banned.push(plan.from + '/' + plan.label); }

  await p.cmd('take all');
  if (control) await p.evaluate(() => Actionable.LiveMarks.filter(m => m.textContent === 'formation').forEach(m => { m.dataset.candidateIds = '[290,345]'; m.removeAttribute('data-object-id'); }));
  await p.cmd('i'); const r = await p.inv(); r.formationLive = await p.evaluate(() => Actionable.LiveMarks.filter(m => m.textContent === 'formation').length); await p.context().close(); return r;
}
(async () => { const b = await chromium.launch();
  try {
    const r = await wumpSpear(b, false);
    console.log('wump i', JSON.stringify(r.lines), 'confirm', JSON.stringify(r.confirm));
    check(r.inv.includes('290'), 'fixture: seed 4 carries the stone spear (290)', r.inv);
    const spear = r.lines.find(l => /stone spear/.test(l.t)); check(!!spear && spear.m.some(x => /spear/.test(x)), 'rename: "a stone spear" underlined on its current name', spear);
    const pel = r.lines.find(l => /food pellets/.test(l.t)); check(!!pel && pel.m.length > 0, 'identical pellets: group line underlined', pel);
    check(r.eq.length === r.inv.length && r.inv.every(i => r.eq.includes(i)), 'Equipment ids = RAM inventory ids (wump2ka)', r);
    check(!!r.confirm && r.confirm.confirmed.includes('290') && r.confirm.notShown.length === 0, 'InventoryConfirm: 290 confirmed uniquely; nothing carried left unshown (pellets may be grouped)', r.confirm);
    const c = await wumpSpear(b, true);
    const cs = c.lines.find(l => /stone spear/.test(l.t));
    check(c.formationLive === 1 && !!cs && cs.m.length === 0, 'shared-alias control: the retained mark shared with object 345 survives (B keeps its trigger) and the spear is not force-marked', { formationLive: c.formationLive, cs, confirm: c.confirm });
  } catch (e) { check(false, 'wump2ka run', e.message); }
  try {
    const p = await open(b, 'Zork1-TheGreatUndergroundEmpire.z3.js', 12345);
    for (const c of ['open mailbox', 'take leaflet']) await p.cmd(c); await p.cmd('i'); const r = await p.inv();
    console.log('zork i', JSON.stringify(r.lines));
    check(r.lines.some(l => /leaflet/.test(l.t) && l.m.length), 'Zork I: leaflet underlined in `i`', r.lines);
    check(r.eq.length === r.inv.length && r.inv.every(i => r.eq.includes(i)), 'Equipment ids = RAM inventory ids (Zork I)', r);
    check(p.errs.length === 0, 'no page errors (Zork I)', p.errs); await p.context().close();
  } catch (e) { check(false, 'Zork I run', e.message); }
  console.log(pass + ' PASS / ' + fail + ' FAIL'); await b.close(); process.exit(fail ? 1 : 0); })();

