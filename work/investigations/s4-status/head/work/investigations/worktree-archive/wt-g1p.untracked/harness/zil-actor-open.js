// Guard (grok1 2026-10-17, A1 of claude #3855): ZIL actors carrying CONTBIT+OPENBIT (Zork II robot, H2G2 Prosser) must never
// be offered container Open/Close; real containers in the same scene keep them. Replays the Jericho walkthrough (JSEED parity,
// no relocation/forcing) to a step where the actor is in scope, then reads Actionable's own Open/Close commands.
//   ROOT=<tree> node harness/zil-actor-open.js
const path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const ROOT = process.env.ROOT || '.'; const W = require(path.resolve('work/investigations/2026-10-11-jericho-walkthroughs.json'));
let pass = 0, fail = 0; const check = (n, ok, info) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : ' :: ' + JSON.stringify(info).slice(0, 400))); };
// Enchanter's rainbow turtle (CONTBIT+OPENBIT+VILLAIN) is NOT covered yet: mapping VILLAIN 31 as animate would also mark every room the
// adventurer enters (purloined.zil:868 <FSET .RM ,VILLAIN>), and ZRamReader.isPlausibleMapRoom rejects animate objects (codex #3897).
// Add { story: 'Enchanter.z3.js', walk: 'enchanter', seed: 0, step: 111, actor: 'rainbow turtle', keep: 'jug' } once that is solved.
const CASES = [
  { story: 'Zork2-TheWizardofFrobozz.z3.js', walk: 'zork2', seed: 0, step: 96, actor: 'robot', keep: null },
  { story: 'Hitchhik.z5.js', walk: 'hhgg', seed: 4, step: 18, actor: 'Mr. Prosser', keep: 'your gown' } ];
(async () => { const b = await chromium.launch();
  for (const C of CASES) { const p = await b.newPage();
  await p.addInitScript((J) => { let A = J >>> 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, '__PARCHLOCK_ZVM__', { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } }); sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); }, C.seed);
  await p.goto(pathToFileURL(path.resolve(ROOT, 'play.html')).href + '?story=games/' + C.story); await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
  const cmd = async c => { await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(550); await settle(); };
  await settle(); for (let i = 0; i < C.step; i++) await cmd(W[C.walk][i]); await cmd('look');
  const oc = await p.evaluate(() => { WorldModel.tick(); const r = {}; for (const o of Actionable.payloadPool() || []) { let c = []; try { c = Actionable.resolveObjectCommands(o.id, 'object').map(x => x.command); } catch (e) {} r[o.name] = c.filter(x => /^(open|close) /.test(x)); } return r; });
  const tag = C.walk + ' @' + C.step + ': ';
  check(tag + C.actor + ' in scope', C.actor in oc, Object.keys(oc));
  check(tag + C.actor + ' (actor, CONTBIT+OPENBIT) offers no open/close', (oc[C.actor] || ['missing']).length === 0, oc[C.actor]);
  if (C.keep) check(tag + C.keep + ' (real container) still offers open and close', (oc[C.keep] || []).length === 2, oc[C.keep]);
  await p.close(); }
  await b.close(); console.log(`${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0); })();