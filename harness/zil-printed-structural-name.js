// Permanent guard (claude, 2026-10-17; grok #3804/#3819/#3828): a printed multi-word structural name beats a
// truncation-built observed phrase on D198-confirmed ZIL (Zork I 236 "bottle contains" -> "glass bottle").
// Usage: node harness/zil-printed-structural-name.js   (ROOT=<tree> to test another checkout)
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
  if (!process.env.ONLY || process.env.ONLY==='bottle') try { // ---- Zork I kitchen (grok #3804/#3819): printed structural name beats a truncation-built phrase ----
    const p = await open(b, 'Zork1-TheGreatUndergroundEmpire.z3.js');
    for (const c of ['north', 'east', 'open window', 'enter window', 'open sack']) await p.cmd(c);
    const info = await p.evaluate(() => {
      const pool = Actionable.payloadPool(), name = id => (pool.find(o => o.id == id) || {}).name;
      const S = Actionable.structuralNamePrinted;
      return { bottle: name(236), sack: name(224),
        hyphen: S('glass bottle', [{ id: 1, name: 'glass bottle' }], ['a glass bottle-shaped vial']),
        twoOwners: S('wooden door', [{ id: 1, name: 'wooden door' }, { id: 2, name: 'wooden door' }], ['a wooden door']),
        printed: S('glass bottle', [{ id: 1, name: 'glass bottle' }], ['The glass bottle contains:']) };
    });
    check('zork1 236 named "glass bottle" (not "bottle contains")', info.bottle === 'glass bottle', info);
    check('zork1 sack label unchanged by the printed-name rule', info.sack === 'brown sack', info);
    check('printed-name rule: "-" is not a word boundary; two same-named owners abstain; verbatim print counts', !info.hyphen && !info.twoOwners && info.printed, info);
    await p.close();
  } catch (e) { check('zork1 bottle run', false, e.message); }
  await b.close(); console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
