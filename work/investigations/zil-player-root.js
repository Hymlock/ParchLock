// Player/inventory-root check (grok2, research). For each title: boot, take the first item the Jericho walkthrough takes
// successfully (replaying the walkthrough up to it), then compare the game's own parent of that item (RAM) with the app's
// payload player id and inventory list. Output 2026-10-11-zil-player-root.json.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '../..'); const W = require('./2026-10-11-jericho-walkthroughs.json');
const MAP = { zork1: 'Zork1-TheGreatUndergroundEmpire.z3.js', zork2: 'Zork2-TheWizardofFrobozz.z3.js', zork3: 'Zork3-TheDungeonMaster.z3.js', enchanter: 'Enchanter.z3.js', hhgg: 'Hitchhik.z5.js', ballyhoo: 'Ballyhoo.z3.js', cutthroat: 'Cutthroats.z3.js', infidel: 'Infidel.z3.js', hollywood: 'HollywoodHijinx.z3.js', plundered: 'PlunderedHearts.z3.js', lurking: 'TheLurkingHorror.z3.js', planetfall: 'Planetfall.z3.js', seastalker: 'Seastalker.z3.js', sorcerer: 'Sorcerer.z3.js', spellbrkr: 'Spellbreaker.z3.js', wishbringer: 'Wishbringer.z3.js' };
const OUT = path.join(__dirname, '2026-10-11-zil-player-root.json'); const out = {};
const settle = async p => { for (let i = 0; i < 14 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press(i % 3 === 2 ? '1' : i % 3 === 1 ? 'Enter' : 'Space'); } await p.waitForTimeout(300); } };
(async () => { const b = await chromium.launch({ headless: true });
  try { for (const k of (process.env.ONLY || Object.keys(MAP).join(',')).split(',')) { const game = MAP[k]; const rec = out[game] = {}; const p = await b.newPage();
    try { await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
      await p.goto(pathToFileURL(path.join(root, 'play.html')).href + '?story=games/' + game); await p.waitForTimeout(3500); await settle(p);
      let found = 0; const seq = W[k].filter(c => !/^WAIT/.test(c) || c === 'WAIT');
      for (let i = 0; i < Math.min(seq.length, 80) && found < 2; i++) { const c = seq[i]; const n0 = await p.evaluate(() => document.querySelectorAll('.BufferLine').length);
        await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(450); await settle(p);
        const m = c.toLowerCase().match(/^(?:take|get|pick up) (?:the )?([a-z]+)$/); if (!m) continue;
        const r = await p.evaluate(({ n0, w }) => { const t = [...document.querySelectorAll('.BufferLine')].slice(n0).map(l => l.textContent).join(' '); if (!/taken|okay|you (now )?(have|pick)/i.test(t)) return null; WorldModel.tick(); const P = WorldModel.lastPayload || {}; const mem = ZRamProvider.getMem();
          let item = null; for (let id = 1; id < 600; id++) { let n = ''; try { n = (ZRamReader.shortName(mem, id) || '').toLowerCase(); } catch (e) { break; } if (n.split(/\W+/).includes(w)) { const L = ZRamReader.objectLinks(mem, id); const pl = L.parent; const PL = ZRamReader.objectLinks(mem, pl); if (!item || PL) item = { id, n, parent: pl, parentName: ZRamReader.shortName(mem, pl) }; if (P.playerId != null && pl === P.playerId) { item.match = true; break; } } }
          const keys = Object.keys(P).filter(k => /player|inv/i.test(k)); return { text: t.slice(0, 60), item, appPlayer: P.playerId, keys, inv: (P.inventory || P.inv || []).map(x => x.name || x.label || x.id || x).slice(0, 8) }; }, { n0, w: m[1] });
        if (r) { (rec.takes = rec.takes || []).push({ c, ...r }); found++; } }
    } catch (e) { rec.err = String(e.message || e).slice(0, 160); } finally { await p.close(); }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); const t = (rec.takes || [])[0] || {}; console.log(game.padEnd(38), 'game parent', t.item && t.item.parent, t.item && t.item.parentName, 'app', t.appPlayer, 'inv', JSON.stringify(t.inv), rec.err || ''); }
  } finally { await b.close(); console.log('EXIT'); } })();
