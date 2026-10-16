// playerRoot original-scene check (claude, 2026-10-15). Replays the Jericho walkthrough (seeded RNG) up to the
// first successful TAKE/GET, then: (a) every app inventory object's RAM parent equals the app player id, and
// (b) the game's own `i` reply names each of those objects (by short name or a parser word). Research only.
//   ONLY=zork2,cutthroat node work/investigations/zil-root-check.cjs
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const W = require('./2026-10-11-jericho-walkthroughs.json');
const MAP = { zork1: 'Zork1-TheGreatUndergroundEmpire.z3.js', zork2: 'Zork2-TheWizardofFrobozz.z3.js', zork3: 'Zork3-TheDungeonMaster.z3.js', enchanter: 'Enchanter.z3.js', hhgg: 'Hitchhik.z5.js', ballyhoo: 'Ballyhoo.z3.js', cutthroat: 'Cutthroats.z3.js', infidel: 'Infidel.z3.js', hollywood: 'HollywoodHijinx.z3.js', plundered: 'PlunderedHearts.z3.js', lurking: 'TheLurkingHorror.z3.js', planetfall: 'Planetfall.z3.js', seastalker: 'Seastalker.z3.js', sorcerer: 'Sorcerer.z3.js', spellbrkr: 'Spellbreaker.z3.js', wishbringer: 'Wishbringer.z3.js' };
const OUT = path.join(__dirname, '2026-10-15-zil-root-check.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
(async () => { const b = await chromium.launch();
  for (const k of (process.env.ONLY || Object.keys(MAP).join(',')).split(',')) { const g = MAP[k]; const p = await b.newPage(); const rec = out[g] = { ts: new Date().toISOString() };
    try {
      await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3500);
      const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.evaluate(() => { try { Message.Hide(); } catch (e) {} }); await p.waitForTimeout(200); } };
      const cmd = async c => { const n0 = await p.evaluate(() => document.querySelectorAll('.BufferLine').length); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(500); await settle(); return p.evaluate(n0 => [...document.querySelectorAll('.BufferLine')].slice(n0).map(l => l.textContent).join(' '), n0); };
      await settle(); const PREFIX = { seastalker: ['Codex', 'Audit', 'yes'] }; for (const c of PREFIX[k] || []) await cmd(c);
      const seq = W[k]; let step = -1;
      for (let i = 0; i < Math.min(seq.length, 200); i++) {
        // WAITUNTIL:<regex>: wait (at most 40 turns) until the game's reply matches.
        if (/^WAITUNTIL:/.test(seq[i])) { const re = new RegExp(seq[i].slice(10), 'i'); for (let w = 0; w < 40; w++) { if (re.test(await cmd('wait'))) break; } continue; }
        const t = await cmd(seq[i]); if (/^(take|get|pick up)\b/i.test(seq[i]) && /\btaken\b|you (now )?(have|pick)|you('re| are) now holding/i.test(t)) { step = i; rec.take = seq[i]; break; } }
      if (step < 0) { rec.err = 'no successful take in first 200 steps'; continue; }
      const iText = await cmd('i');
      Object.assign(rec, await p.evaluate(iText => { WorldModel.tick(); const P = WorldModel.lastPayload || {}, mem = ZRamProvider.getMem(), low = iText.toLowerCase(); const cut = s => s.slice(0, mem.getUint8(0) <= 3 ? 6 : 9);
        const words = low.split(/[^a-z'-]+/).filter(Boolean);
        const items = (P.inventory || []).map(o => { const L = ZRamReader.objectLinks(mem, o.id); const pw = (ZRamReader.parserWordsAny(mem, o.id) || []).map(x => String(x).toLowerCase()); const nm = String(ZRamReader.shortName(mem, o.id) || '').toLowerCase();
          const named = (nm && low.includes(nm)) || pw.some(x => x.length >= 3 && words.some(w => cut(w) === cut(x)));
          return { id: o.id, name: nm, parent: L.parent, named }; });
        return { player: P.playerId, items, iReply: iText.replace(/\s+/g, ' ').slice(0, 240) }; }, iText));
      // A held item's parent may be a held container: walk up to the player.
      rec.parentsOk = rec.items.length > 0 && await p.evaluate(({ items, player }) => { const mem = ZRamProvider.getMem(); return items.every(o => { let id = o.id; for (let d = 0; d < 6 && id; d++) { const pa = ZRamReader.objectLinks(mem, id).parent; if (pa === player) return true; id = pa; } return false; }); }, { items: rec.items, player: rec.player });
      rec.namedOk = rec.items.length > 0 && rec.items.every(o => o.named);
      rec.verdict = rec.parentsOk && rec.namedOk ? 'S' : 'FAIL';
    } catch (e) { rec.err = String(e.message || e).slice(0, 200); } finally { await p.close(); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }
    console.log(g.padEnd(38), rec.verdict || '-', 'player', rec.player, 'take', JSON.stringify(rec.take), 'items', JSON.stringify((rec.items || []).map(o => o.id + ':' + o.name + (o.named ? '' : '!unnamed'))), rec.err || ''); }
  await b.close(); })();
