// Browser touch verify (2026-10-31). Read-only. node touch-verify.cjs
// Mobile Chromium 412x915 hasTouch/isMobile, CDP Input.dispatchTouchEvent long-press (~800ms).
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../../..');
const { chromium } = require(REPO + '/node_modules/playwright');
const { pathToFileURL } = require('url');
const OUTDIR = __dirname, results = [];
const W = require(REPO + '/work/investigations/2026-10-15-zil-routes.json');

async function boot(b, game, route) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(REPO + '/play.html').href + '?story=games/' + game); await p.waitForTimeout(2500);
  const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
  const cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1200); await settle(); };
  await settle();
  for (const c of route || []) await cmd(c);
  const cdp = await ctx.newCDPSession(p);
  return { p, ctx, cdp, settle, cmd };
}
async function longPress(S, handle) {
  await handle.scrollIntoViewIfNeeded();
  const bx = await handle.boundingBox(); const isName = await handle.evaluate(e => e.classList.contains('equip-name')); const x = isName ? bx.x + Math.min(30, bx.width / 4) : bx.x + bx.width / 2, y = bx.y + bx.height / 2;
  if (process.env.DBG) console.log('DBG box', JSON.stringify(bx), await S.p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + e.className + ' in-row=' + !!e.closest('.equip-row') : 'none'; }, [x, y]));
  await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await S.p.waitForTimeout(800);
  const during = await radial(S.p); if (process.env.DBG) console.log('DBG gen@open', await S.p.evaluate(() => ActionSynth.currentGeneration() + ' ' + JSON.stringify(ActionSynth.identityWearScopeFor(Actionable.payloadPool().find(o => +o.id === 176) || { id: 176, name: 'tattered suit' })) + ' ref=' + JSON.stringify(Actionable.referenceFor(Actionable.payloadPool().find(o => +o.id === 176) || {}))));
  await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await S.p.waitForTimeout(500);
  const after = await radial(S.p);
  if (process.env.DBG) console.log('DBG during', JSON.stringify(during), 'after', JSON.stringify(after), await S.p.evaluate(() => { const m = document.getElementById('radial-menu'); return m ? m.className + ' | ' + m.innerHTML.slice(0, 600) : 'none'; }));
  return after;
}
const radial = p => p.evaluate(() => { const m = document.getElementById('radial-menu'); if (!m || !m.classList.contains('show')) return null; return [...m.querySelectorAll('button,[role=button],.radial-item,li,a')].filter(e => e.offsetParent !== null && !e.querySelector('button')).map(e => e.textContent.trim()).filter(Boolean); });
async function tapOption(S, label) {
  const h = await S.p.evaluateHandle(l => [...document.querySelectorAll('#radial-menu button,#radial-menu [role=button],#radial-menu li,#radial-menu a')].find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === l), label.toLowerCase());
  const el = h.asElement(); if (!el) return false; if (process.env.DBG) await S.p.evaluate(() => { if (window.__hk) return; window.__hk = 1; window.__log = []; for (const k of ['Submit', 'runChosenCommand']) { const o = Actionable[k]; Actionable[k] = function (c) { const r = o.apply(this, arguments); window.__log.push(k + ':' + c + '=>' + r + ' vis=' + $('.Input.LineInput:visible').length + ' dlg=' + $('#dialog').length + ' msg=' + Message.IsOpen); return r; }; } document.addEventListener('click', e => window.__log.push('click:' + e.target.tagName + '.' + e.target.className + ':' + String(e.target.textContent).slice(0, 15)), true); const oi = Input.Inject; Input.Inject = function (c) { window.__log.push('inject:' + c); return oi.apply(this, arguments); }; const os = Message.Show; Message.Show = function (t) { window.__log.push('show:' + t + ' ' + String(new Error().stack).replace(/\s+/g, ' ').slice(0, 700)); return os.apply(this, arguments); }; }); if (process.env.DBG) console.log('DBG gen@tap', await S.p.evaluate(() => ActionSynth.currentGeneration() + ' ' + JSON.stringify(ActionSynth.identityWearScopeFor(Actionable.payloadPool().find(o => +o.id === 176) || { id: 176, name: 'tattered suit' })) + ' ref=' + JSON.stringify(Actionable.referenceFor(Actionable.payloadPool().find(o => +o.id === 176) || {})))); if (process.env.DBG) console.log('DBG pretap dialog', label, await S.p.evaluate(() => { const e = document.getElementById('dialog'); return (e ? e.innerText.slice(0, 30) : null) + ' open=' + Message.IsOpen + ' line=' + document.querySelectorAll('.Input.LineInput').length; }));
  const bx = await el.boundingBox(); if (process.env.DBG) console.log('DBG tapbox', label, JSON.stringify(bx), await S.p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + e.className + ':' + e.textContent.slice(0, 20) + ' title=' + e.title : 'none'; }, [bx.x + bx.width / 2, bx.y + bx.height / 2])); await S.p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await S.p.waitForTimeout(1500); if (process.env.DBG) console.log('DBG log', JSON.stringify(await S.p.evaluate(() => window.__log.splice(0)))); if (process.env.DBG) console.log('DBG posttap radial', JSON.stringify(await radial(S.p)), await S.p.evaluate(() => { const d = document.getElementById('dialog') || document.querySelector('.message, #message, .pl-message'); return 'msg=' + (typeof Message !== 'undefined' && Message.IsOpen) + ' ' + (d ? d.innerText.slice(0, 300) : '') + ' tail=' + document.getElementById('windowport').innerText.slice(-200); })); await S.settle(); return true;
}
async function openInv(S) { await S.p.evaluate(() => { try { StatTracker.markInventoryWarningSeen(); } catch (e) {} if (!EquipmentUI.IsOpen()) EquipmentUI.Toggle(); }); await S.p.waitForTimeout(800); await S.p.evaluate(() => { try { Message.Hide(); } catch (e) {} try { EquipmentUI.Render(); } catch (e) {} }); await S.p.waitForTimeout(300); }
async function closeInv(S) { await S.p.evaluate(() => { try { ParchLockQol.HideRadialMenu(); } catch (e) {} if (EquipmentUI.IsOpen()) EquipmentUI.Toggle(); }); await S.p.waitForTimeout(400); }
const invRow = (S, re) => S.p.evaluateHandle(r => [...document.querySelectorAll('.equip-row:not(.equip-self)')].find(e => new RegExp(r, 'i').test(e.textContent))?.querySelector('.equip-name'), re).then(h => h.asElement());
const invNames = S => S.p.evaluate(() => [...document.querySelectorAll('.equip-row:not(.equip-self)')].map(e => e.textContent.trim().replace(/\s+/g, ' ')));
const seed = (S, obj) => S.p.evaluate(o => { const v = window.__PARCHLOCK_ZVM__, m = ZRamProvider.getMem(); const pl = m.getUint16(0x0c) ? null : null; return { ok: typeof v.insert_obj === 'function' }; }, obj);
// Seed: move obj into the player (player = parent of nothing; find via WorldModel / Scope player id)
const seedInto = (S, obj, holder) => S.p.evaluate(([o, h]) => { const v = window.__PARCHLOCK_ZVM__; v.insert_obj(o, h); return ZRamReader.objectLinks(ZRamProvider.getMem(), o).parent; }, [obj, holder]);
const playerId = S => S.p.evaluate(() => { try { return (WorldModel.lastPayload || {}).playerId || Actionable.Scope.playerId || null; } catch (e) { return null; } });
const attr = (S, o, bit) => S.p.evaluate(([o, b]) => { const lk = ZRamReader.objectLinks(ZRamProvider.getMem(), o); return { parent: lk.parent, set: !!(lk.attrBytes[b >> 3] & (128 >> (b & 7))) }; }, [o, bit]);
const tail = (S, n) => S.p.evaluate(n => (document.getElementById('windowport') || document.body).innerText.slice(-n), n || 600);
const shot = (S, f) => S.p.screenshot({ path: path.join(OUTDIR, f) });
const rec = (check, pass, detail) => { results.push({ check, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', check, JSON.stringify(detail)); };

(async () => {
  const b = await chromium.launch();
  const findPlayer = async S => { await S.cmd('i'); return S.p.evaluate(() => { const P = WorldModel.lastPayload || {}; const v = (P.probe && P.probe.inventoryRootId > 0) ? P.probe.inventoryRootId : (P.playerId != null ? P.playerId : (P.probe || {}).playerId); return +v; }); };
  // 1. Sherlock start
  { const S = await boot(b, 'Sherlock.z5.js'); await openInv(S); const names = await invNames(S); await shot(S, '1a-sherlock-inventory.png');
    rec('1a Sherlock start inventory', names.length === 4 && names.every(n => /whistle|coat|hat|bag/i.test(n)) && !names.some(n => /pocket|lapel|pound|note/i.test(n)), { names });
    await closeInv(S);
    const marks = await S.p.$$('.pl-act:not(.is-stale)'); let coat = null; for (const h of marks) if (/^coat$/i.test((await h.textContent()).trim())) coat = h;
    const opts = coat ? await longPress(S, coat) : null; await shot(S, '1b-sherlock-coat-radial.png');
    rec('1b Sherlock intro "coat" radial', !!(opts && opts.length), { found: !!coat, opts });
    // 4. lamp 166 (seeded)
    await closeInv(S); const pl = await findPlayer(S); const lampParent0 = (await attr(S, 166, 0)).parent;
    const par = await seedInto(S, 166, pl); await S.cmd('look'); await S.cmd('i'); await openInv(S);
    let row = await invRow(S, 'lamp'); let o1 = row ? await longPress(S, row) : null; await shot(S, '4a-sherlock-lamp-radial.png');
    const hasOn = !!(o1 && o1.some(x => /^turn on/i.test(x)));
    let tapped = hasOn && await tapOption(S, o1.find(x => /^turn on/i.test(x))); const t1 = await tail(S, 400);
    await closeInv(S); await openInv(S); row = await invRow(S, 'lamp'); let o2 = row ? await longPress(S, row) : null; await shot(S, '4b-sherlock-lamp-after-on.png');
    const lf = await S.p.evaluate(() => { const o = Actionable.payloadPool().find(o => +o.id === 166); const m = ZRamProvider.getMem(); const fact = ZRamReader.executableLayoutFacts(m); return { fact: fact && fact.lightForms, forms: AttributeSchema.lightForms ? AttributeSchema.lightForms(m, 166, 'inventory') : null, scope: ActionSynth.lightFormScopeFor(o, null, 'inventory') }; }); rec('4 Sherlock lamp turn on -> turn off', hasOn && tapped && !!(o2 && o2.some(x => /^turn off/i.test(x))), { lightFormsAfterOn: lf, player: pl, lampOrigParent: lampParent0, seededParent: par, before: o1, reply: t1.slice(-200), after: o2 });
    await S.ctx.close(); }
  // 2. Lurking Horror hyrax 133 (seeded)
  { const S = await boot(b, 'TheLurkingHorror.z3.js'); const pl = await findPlayer(S);
    const orig = (await attr(S, 133, 0)).parent; const par = await seedInto(S, 133, pl); await S.cmd('look'); await S.cmd('i');
    const gl = await S.p.evaluate(() => ZRamReader.shortName(ZRamProvider.getMem(), 203) + ' parent ' + ZRamReader.objectLinks(ZRamProvider.getMem(), 203).parent);
    await openInv(S); let row = await invRow(S, 'hyrax|glove|mitten'); const names = await invNames(S);
    const o1 = row ? await longPress(S, row) : null; await shot(S, '2a-lh-hyrax-radial.png');
    const w = o1 && o1.find(x => /^wear/i.test(x)); const tapped = w && await tapOption(S, w); const t = await tail(S, 500);
    await closeInv(S); await openInv(S); row = await invRow(S, 'hyrax|glove|mitten'); const o2 = row ? await longPress(S, row) : null; await shot(S, '2b-lh-hyrax-after-wear.png');
    rec('2 LH hyrax Wear -> fits -> Remove/Drop', !!(w && tapped && /fits/i.test(t) && o2 && o2.some(x => /^(remove|drop|take off)/i.test(x))), { player: pl, origParent: orig, seededParent: par, gloves203: gl, invNames: names, before: o1, reply: t.slice(-250), after: o2 });
    await S.ctx.close(); }
  // 3. Starcross junk suit 176 (seeded)
  { const S = await boot(b, 'Starcross.z3.js', W.starcross.slice(0, 22)); const dlg = async t => console.log('DLG', t, await S.p.evaluate(() => { const e = document.getElementById('dialog'); return e ? e.innerText.slice(0, 30) : null; })); await dlg('after-route'); const pl = await findPlayer(S); await dlg('after-i');
    const orig = (await attr(S, 176, 0)).parent; console.log('SC names', await S.p.evaluate(() => { const m = ZRamProvider.getMem(); return [239, 176, 169, 73].map(i => i + ':' + ZRamReader.shortName(m, i) + '<' + ZRamReader.objectLinks(m, i).parent).join(' ') + ' probe=' + JSON.stringify(((WorldModel.lastPayload || {}).probe) || {}).slice(0, 300) + ' pid=' + (WorldModel.lastPayload || {}).playerId; })); const par = await seedInto(S, 176, pl); const ndesc = await S.p.evaluate(() => { const v = window.__PARCHLOCK_ZVM__; if (typeof v.clear_attr === 'function') { v.clear_attr(176, 23); return 'clear_attr'; } const m = ZRamProvider.getMem(); const lk = ZRamReader.objectLinks(m, 176); return 'no clear_attr ' + Object.keys(Object.getPrototypeOf(v)).filter(k => /attr/i.test(k)).join(','); }); console.log('SC ndesc', ndesc, JSON.stringify(await attr(S, 176, 23))); await S.cmd('look'); await S.cmd('i');
    await dlg('after-seed'); await openInv(S); await dlg('after-openinv'); const names = await invNames(S); let row = await invRow(S, 'tattered');
    const o1 = row ? await longPress(S, row) : null; await dlg('after-press'); await shot(S, '3a-starcross-suit-radial.png');
    const w = o1 && o1.find(x => /^wear/i.test(x)); const tapped = w && await tapOption(S, w); const t = await tail(S, 500);
    await closeInv(S); await openInv(S); row = await invRow(S, 'tattered'); const o2 = row ? await longPress(S, row) : null; await shot(S, '3b-starcross-suit-after-wear.png');
    const worn24 = (await attr(S, 176, 24)).set; rec('3 Starcross junk suit Wear -> worn', !!(w && tapped && worn24), { worn24, tapped, player: pl, origParent: orig, seededParent: par, invNames: names, before: o1, reply: t.slice(-250), after: o2 });
    await S.ctx.close(); }
  fs.writeFileSync(path.join(OUTDIR, 'results.json'), JSON.stringify(results, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
