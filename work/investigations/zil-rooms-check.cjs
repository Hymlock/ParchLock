// ZIL 'rooms' column, original scene (claude, 2026-10-15). Replays the walkthrough (seeded; same prompts/route
// handling as zil-root-check.cjs) for STEPS turns and compares, after every turn, the app's payload room name with
// the game's own status-line location (v3 left field) or the reply's heading. Research only.
//   ONLY=cutthroat,infidel STEPS=60 node work/investigations/zil-rooms-check.cjs
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const W = require('./2026-10-11-jericho-walkthroughs.json');
const MAP = { zork1: 'Zork1-TheGreatUndergroundEmpire.z3.js', zork2: 'Zork2-TheWizardofFrobozz.z3.js', zork3: 'Zork3-TheDungeonMaster.z3.js', enchanter: 'Enchanter.z3.js', hhgg: 'Hitchhik.z5.js', ballyhoo: 'Ballyhoo.z3.js', cutthroat: 'Cutthroats.z3.js', infidel: 'Infidel.z3.js', hollywood: 'HollywoodHijinx.z3.js', plundered: 'PlunderedHearts.z3.js', lurking: 'TheLurkingHorror.z3.js', planetfall: 'Planetfall.z3.js', seastalker: 'Seastalker.z3.js', sorcerer: 'Sorcerer.z3.js', spellbrkr: 'Spellbreaker.z3.js', wishbringer: 'Wishbringer.z3.js', starcross: 'Starcross.z3.js', deadline: 'Deadline.z3.js', witness: 'TheWitness.z3.js', moonmist: 'Moonmist.z3.js', lgop: 'LeatherGoddessesofPhobos.z3.js', stationfall: 'Stationfall.z3.js', suspended: 'Suspended.z3.js' };
const ROUTES = { deadline: ['n', 'open door', 'n', 'n', 'w', 'e', 'e', 'w', 's', 'u', 'n', 's', 'd'], witness: ['n', 'e', 'w', 's', 'n', 'n'], starcross: ['get up', 'look'], moonmist: ['n', 's', 'e', 'w'], lgop: ['n', 's', 'e', 'w', 'u', 'd'], stationfall: ['n', 's', 'e', 'w'], suspended: ['look'] };
const PREFIX = { seastalker: ['Codex', 'Audit', 'yes'] };
const OUT = path.join(__dirname, '2026-10-15-zil-rooms-check.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const norm = s => String(s || '').toLowerCase().replace(/^(the|a|an) /, '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
(async () => { const b = await chromium.launch();
  for (const k of (process.env.ONLY || Object.keys(MAP).join(',')).split(',')) { const g = MAP[k]; const p = await b.newPage(); const rec = out[g] = { ts: new Date().toISOString(), turns: 0, agree: 0, mismatches: [] };
    try {
      await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
      const JS = { zork1: 12, hhgg: 4, cutthroat: 10, spellbrkr: 1 }[k] || 0; /* Frotz z_random parity, as zil-inv-check */
      await p.addInitScript((J) => { let A = J >>> 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, "__PARCHLOCK_ZVM__", { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } }); }, JS);
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3500);
      const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.evaluate(() => { try { Message.Hide(); } catch (e) {} }); await p.waitForTimeout(200); } };
      const cmd = async c => { const n0 = await p.evaluate(() => document.querySelectorAll('.BufferLine').length); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(500); await settle(); return p.evaluate(n0 => [...document.querySelectorAll('.BufferLine')].slice(n0).map(l => l.textContent), n0); };
      await settle(); for (const c of PREFIX[k] || []) await cmd(c);
      if (!W[k]) { for (let q = 0; q < 6; q++) { const scr = (await p.evaluate(() => document.querySelector('#windowport').innerText.slice(-400))).toLowerCase(); if (/yes or no/.test(scr)) await cmd('yes'); else if (/type your (first |last )?name|what is your name/.test(scr)) await cmd('Codex'); else break; } }
      const seq = (W[k] || ROUTES[k] || []).slice(0, +(process.env.STEPS || 60));
      for (const c of seq) {
        if (/^WAITUNTIL:/.test(c)) { const re = new RegExp(c.slice(10), 'i'); for (let w = 0; w < 40; w++) { const out = await cmd('wait'); if (re.test(out.join(' '))) break; } continue; }
        await cmd(c);
        const r = await p.evaluate(() => { WorldModel.tick(); const P = WorldModel.lastPayload || {}; const st = document.querySelector('.GridWindow.reverse') || document.querySelector('.GridWindow'); const status = st ? st.innerText.split('\n')[0] : '';
          return { app: P.roomName, appId: P.roomId, status: status.replace(/\s{2,}.*$/, '').trim() }; });
        if (!r.status || /^(score|time)/i.test(r.status)) continue;
        rec.turns++; if (norm(r.app) === norm(r.status)) rec.agree++; else if (rec.mismatches.length < 8) rec.mismatches.push({ c, app: r.app, appId: r.appId, status: r.status });
      }
    } catch (e) { rec.err = String(e.message || e).slice(0, 200); } finally { await p.close(); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }
    console.log(g.padEnd(36), rec.agree + '/' + rec.turns, rec.err || '', JSON.stringify(rec.mismatches.slice(0, 3)).slice(0, 260)); }
  await b.close(); })();
