// Native inventory omission observer (claude, 2026-10-16; Codex #3520). Replays a walkthrough (JSEED parity, prompts,
// WAITUNTIL) to step N with no relocation or forced state, then hooks the VM's test_attr ONLY while the `i` command runs
// and records every (object, bit, result), plus each held descendant's parent and raw attribute bits and the native
// `i` text. App code is never consulted for the evidence. Research only.
//   node work/investigations/zil-inv-hidden-ops.cjs ballyhoo:90 hhgg:60 plundered:119
//   key:step:command records during that command instead of i (e.g. "zork2:96:ROBOT, EAST AND SOUTH").
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const W = require('./2026-10-11-jericho-walkthroughs.json');
const MAP = { zork2: 'Zork2-TheWizardofFrobozz.z3.js', zork3: 'Zork3-TheDungeonMaster.z3.js', infidel: 'Infidel.z3.js', cutthroat: 'Cutthroats.z3.js', planetfall: 'Planetfall.z3.js', lurking: 'TheLurkingHorror.z3.js', seastalker: 'Seastalker.z3.js', spellbrkr: 'Spellbreaker.z3.js', ballyhoo: 'Ballyhoo.z3.js', hhgg: 'Hitchhik.z5.js', plundered: 'PlunderedHearts.z3.js', zork1: 'Zork1-TheGreatUndergroundEmpire.z3.js', enchanter: 'Enchanter.z3.js', wishbringer: 'Wishbringer.z3.js', sorcerer: 'Sorcerer.z3.js' };
const OUT = path.join(__dirname, '2026-10-16-zil-inv-hidden-ops.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
(async () => { const b = await chromium.launch();
  for (const arg of process.argv.slice(2)) { const [k, N, CMD] = arg.split(':'); const g = MAP[k]; const rc = CMD || 'i'; const p = await b.newPage();
    const JS = { zork1: 12, hhgg: 4, cutthroat: 10, spellbrkr: 1 }[k] || 0;
    await p.addInitScript((J) => { let A = J >>> 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, '__PARCHLOCK_ZVM__', { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; const o = v.test_attr; v.test_attr = function () { const g = Array.from(arguments), r = o.apply(this, g); if (window.__rec) window.__ops.push([g[0], g[1], r ? 1 : 0]); return r; }; } } }); sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); }, JS);
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3500);
    const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
    const cmd = async c => { await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(550); await settle(); };
    await settle(); if (k === 'seastalker') for (const c of ['Codex', 'Audit', 'yes']) await cmd(c);
    for (let i = 0; i < +N; i++) { const c = W[k][i]; if (/^WAITUNTIL:/.test(c)) { const re = new RegExp(c.slice(10), 'i'); for (let w = 0; w < 40; w++) { await cmd('wait'); const t = await p.evaluate(() => document.querySelector('#windowport').innerText.slice(-500)); if (re.test(t)) break; } } else await cmd(c); }
    // Record only during the native `i` turn: start after submit, stop when input returns.
    await p.evaluate(() => { window.__ops = []; window.__rec = 1; }); await cmd(rc); await p.evaluate(() => { window.__rec = 0; });
    out[g + (CMD ? ' @' + CMD : '')] = await p.evaluate(({ step }) => { const m = ZRamProvider.getMem(); const ops = window.__ops; const ids = [...new Set(ops.map(o => o[0]))];
      const L = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')]; let last = -1; for (let q = L.length - 1; q >= 0; q--) if (L[q].querySelector('.Style_input')) { last = q; break; }
      const objs = ids.map(id => { const lk = ZRamReader.objectLinks(m, id); const bits = []; for (let bit = 0; bit < 48; bit++) if (lk.attrBytes && (lk.attrBytes[bit >> 3] & (128 >> (bit & 7)))) bits.push(bit); return { id, name: ZRamReader.shortName(m, id), parent: lk.parent, bits }; });
      return { step, ts: new Date().toISOString(), nativeI: L.slice(last + 1).map(l => l.textContent).join('\n'), ops, objs }; }, { step: +N });
    await p.close(); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(g, rc, 'ops', out[g + (CMD ? ' @' + CMD : '')].ops.length); }
  await b.close(); })();
