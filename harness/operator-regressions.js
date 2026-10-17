// Operator regression guard (Build 72 report, 2026-10-10). REQUIRED before every commit.
// Covers: Zork I mailbox container + Open/Close, leaflet underline after opening,
// kitchen table contents underlined; Wumpus one compass label per exit (no X1 beside E1),
// second food pellet still underlined after taking the first (fresh seeded start).
// Old operator saves are not used: no backwards compatibility (operator 2026-10-10).
// Usage: node harness/operator-regressions.js   (ROOT=<tree> to test another checkout)
const path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const ROOT = process.env.ROOT || '.'; const FIX = path.join(__dirname, 'fixtures', 'operator');
let pass = 0, fail = 0; const check = (name, ok, info) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + JSON.stringify(info).slice(0, 400))); };
async function open(b, story, seeded) {
  const p = await b.newPage({ viewport: { width: 390, height: 850 } });
  if (seeded) await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve(ROOT, 'play.html')).href + '?story=games/' + story); await p.waitForTimeout(2500);
  p.settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); } };
  p.cmd = async t => { await p.locator('.Input.LineInput').fill(t); await p.locator('.Input.LineInput').press('Enter'); await p.waitForTimeout(1300); await p.settle(); };
  p.marks = () => p.evaluate(() => { WorldModel.tick(); const lines = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')]; const last = lines.map(l => !!l.querySelector('.Style_input')).lastIndexOf(true);
    return [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(m => lines.indexOf(m.closest('.BufferLine')) > last).map(m => m.textContent.toLowerCase()); });
  await p.settle(); return p;
}
(async () => { const b = await chromium.launch();
  if (!process.env.ONLY || process.env.ONLY==='zork') try { // ---- Zork I (fresh play) ----
    const p = await open(b, 'Zork1-TheGreatUndergroundEmpire.z3.js');
    await p.cmd('look');
    const mb = await p.evaluate(() => { WorldModel.tick(); const o = (Actionable.payloadPool() || []).find(x => /mailbox/i.test(x.name || '')); if (!o) return null; const a = o.attrs || o.attributes || {};
      let cmds = []; try { cmds = Actionable.resolveObjectCommands(o.id, 'object').map(c => c.command); } catch (e) {} return { container: a.container, cmds }; });
    check('zork1 mailbox is a container', !!(mb && mb.container), mb);
    check('zork1 mailbox offers open and close', !!(mb && mb.cmds.includes('open mailbox') && mb.cmds.includes('close mailbox')), mb);
    await p.cmd('open mailbox'); let m = await p.marks();
    check('zork1 leaflet underlined after opening mailbox', m.some(x => /leaflet/.test(x)), m);
    for (const c of ['north', 'east', 'open window', 'enter window']) await p.cmd(c);
    await p.cmd('look'); m = await p.marks();
    check('zork1 kitchen table contents underlined (sack, bottle)', m.some(x => /sack/.test(x)) && m.some(x => /bottle/.test(x)), m);
    await p.close();
  } catch (e) { check('zork1 run', false, e.message); }
  if (!process.env.ONLY || process.env.ONLY==='labels') try { // ---- Wumpus fresh seeded walk: one label per exit ----
    const p = await open(b, 'wump2ka.z5.js', true); await p.cmd('no'); const bad = [];
    for (const c of ['n', 'x1', 'x1', 'x2', 'x1']) { await p.cmd(c);
      const s = await p.evaluate(() => DirectionalRadial.GetSlices().filter(x => !x.custom).map(x => ({ label: x.label, command: String(x.command || '').toLowerCase() })));
      const byCmd = {}; s.forEach(x => { (byCmd[x.command] = byCmd[x.command] || []).push(x.label); });
      Object.keys(byCmd).forEach(k => { if (byCmd[k].length > 1) bad.push({ after: c, command: k, labels: byCmd[k] }); });
      if (s.some(x => /^X\d/.test(x.label))) bad.push({ after: c, xlabel: s.map(x => x.label) }); }
    check('wumpus one compass label per exit (E-label, no X-label duplicate)', bad.length === 0, bad);
    await p.close();
  } catch (e) { check('wumpus labels run', false, e.message); }
  if (!process.env.ONLY || process.env.ONLY==='pellet') try { // ---- Wumpus fresh seeded start room (two food pellets): second pellet keeps its underline ----
    const p = await open(b, 'wump2ka.z5.js', true); await p.cmd('no');
    await p.cmd('look'); const m0 = await p.marks(); await p.cmd('take pellet'); await p.cmd('look'); const m1 = await p.marks();
    check('wumpus pellets underlined before take', m0.some(x => /pellet/.test(x)), m0);
    check('wumpus remaining pellet underlined after taking one', m1.some(x => /pellet/.test(x)), m1);
    await p.close();
  } catch (e) { check('wumpus pellet run', false, e.message); }
  if (!process.env.ONLY || process.env.ONLY==='weather') try { // ---- weather id24 picnickers: mark must be players OR cook-out (operator #3782) ----
    const p = await open(b, 'weather.z5.js');
    await p.cmd('look');
    const info = await p.evaluate(() => {
      const marks = [...document.querySelectorAll('.pl-act:not(.is-stale)')].map(m => ({
        t: m.textContent.toLowerCase().trim(),
        id: m.getAttribute('data-object-id')
      }));
      const o24 = (Actionable.payloadPool() || []).find(o => String(o.id) === '24');
      return { marks, aliases: (o24 && o24.aliases) || [] };
    });
    const hit = info.marks.some(m => String(m.id) === '24' && /^(players|cook-out|cookout)$/.test(m.t));
    check('weather id24 marked as players or cook-out', hit, info);
    await p.close();
  } catch (e) { check('weather id24 run', false, e.message); }
  if (!process.env.ONLY || process.env.ONLY==='suvehnux') try { // ---- suvehnux cage (operator #3780): no double-covered id; bare "cage" never marked inside "brass cage" ----
    const p = await open(b, 'suvehnux.z5.js');
    await p.cmd('look');
    const info = await p.evaluate(() => {
      const ms = [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(m => m.dataset.kind !== 'direction');
      const cov = ms.flatMap(m => Actionable.markCoverIds(m)); const dup = cov.filter((id, i) => cov.indexOf(id) !== i);
      const inside = ms.filter(m => m.textContent.toLowerCase() === 'cage' && /brass\s*$/i.test((m.previousSibling && m.previousSibling.nodeValue) || ''));
      const brass = ms.filter(m => m.textContent.toLowerCase() === 'brass cage').map(m => Actionable.markCoverIds(m));
      return { dup, inside: inside.length, brass };
    });
    check('suvehnux no object has duplicate display coverage', info.dup.length === 0, info);
    check('suvehnux bare "cage" never marked inside "brass cage"', info.inside === 0, info);
    check('suvehnux brass cage mark covers 55', info.brass.some(c => c.includes('55')), info);
    await p.close();
  } catch (e) { check('suvehnux run', false, e.message); }
  if (!process.env.ONLY || process.env.ONLY==='jigsaw') try { // ---- Jigsaw (operator #3780): no mark whose text is a preposition/particle ----
    const p = await open(b, 'Jigsaw.z8.js');
    const bad = await p.evaluate(() => [...document.querySelectorAll('.pl-act:not(.is-stale)')].map(m => m.textContent.toLowerCase().trim()).filter(t => /^(in|out|on|off|into|onto|under|over|through|across)$/.test(t)));
    check('jigsaw no preposition/particle mark (intro)', bad.length === 0, bad);
    await p.close();
  } catch (e) { check('jigsaw run', false, e.message); }
  if (!process.env.ONLY || process.env.ONLY==='planetfall') try { // ---- Planetfall: cold inventory must not list off-tree brochure 217 (#3859/#3860) ----
    const p = await open(b, 'Planetfall.z3.js');
    await p.cmd('i');
    const info = await p.evaluate(() => {
      const inv = ((WorldModel.lastPayload || {}).inventory || []).map(o => o.id);
      const text = String((Actionable.Scope && Actionable.Scope.lastInventoryText) || '');
      return { inv, has217: inv.indexOf(217) >= 0, textHasBrochure: /brochure/i.test(text) };
    });
    check('planetfall cold inventory has no brochure 217', !info.has217 && !info.textHasBrochure, info);
    await p.close();
  } catch (e) { check('planetfall brochure run', false, e.message); }
  await b.close(); console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
