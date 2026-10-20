// Knapsack guard (operator report 2026-10-18; F1+F2 consensus codex #4206 / grok2 #4207).
// HugeCave: the worn knapsack's Equipment-panel (inventory) actions include its container verbs, and an item
// inside it offers inspect FIRST so a short tap (first action) does not take it out.
// Usage: node harness/knapsack-actions.js   (ROOT=<tree> to test another checkout)
const path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const ROOT = process.env.ROOT || '.';
let pass = 0, fail = 0; const check = (name, ok, info) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + JSON.stringify(info).slice(0, 400))); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve(ROOT, 'play.html')).href + '?story=games/HugeCave.z8.js'); await p.waitForTimeout(3000);
  for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; await p.keyboard.press('Space'); await p.waitForTimeout(200); }
  const cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1800); };
  const cmds = (re, kind) => p.evaluate(([re, kind]) => { WorldModel.tick(); const o = (Actionable.payloadPool() || []).find(x => new RegExp(re, 'i').test(x.name || ''));
    return o ? Actionable.resolveObjectCommands(o.id, kind).map(c => c.command.trim().toLowerCase()) : null; }, [re, kind]);
  try {
    await cmd('no');
    let k = await cmds('knapsack', 'inventory');
    check('worn knapsack (panel) offers open + close', !!(k && k.includes('open knapsack') && k.includes('close knapsack')), k);
    check('worn knapsack (panel) still offers remove', !!(k && k.includes('remove knapsack')), k);
    await cmd('open knapsack');
    const m = await cmds('matches', 'inventory');
    check('matches inside knapsack: first action inspects, not take', !!(m && m.length && !/^take /.test(m[0])), m);
    check('matches inside knapsack: take is still offered', !!(m && m.some(c => /^take /.test(c))), m);
    await cmd('take matches');
    const m2 = await cmds('matches', 'inventory');
    check('held matches (not nested) offer drop, no take-out', !!(m2 && m2.some(c => /^drop /.test(c)) && !m2.some(c => /^take /.test(c))), m2);
  } catch (e) { check('knapsack run', false, e.message); }
  console.log(pass + ' PASS / ' + fail + ' FAIL'); await b.close(); process.exit(fail ? 1 : 0);
})();
