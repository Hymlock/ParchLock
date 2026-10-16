// All-games native inventory sweep (claude, 2026-10-16). For every bundled game: boot (prompts answered generically),
// `i`, `take all`, `i`. At both `i` checkpoints record the native reply rows and the app's shown inventory names
// (EquipmentUI path, LearnedWords label), then flag: native item rows with no app item whose name they contain
// ("missing"), and app items whose name never appears in the native reply ("extra"). Triage only: every flagged delta is
// classified by hand from the raw text before any fix (Codex #3508). Research only.
//   GAMES=a,b OUTF=file.json node work/investigations/all-inv-sweep.cjs
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const OUT = path.join(__dirname, process.env.OUTF || '2026-10-16-all-inv-sweep.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const games = process.env.GAMES ? process.env.GAMES.split(',') : fs.readdirSync('games').filter(f => /\.(z\d|zblorb|ulx|gblorb)\.js$/.test(f) && (process.env.GLULX || !/(ulx|gblorb)\.js$/.test(f)));
const norm = s => String(s || '').toLowerCase().replace(/\([^()]*\)/g, ' ').replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
(async () => { const b = await chromium.launch();
  for (const g of games) { if (out[g] && !process.env.REDO) continue; const p = await b.newPage(); const rec = out[g] = { checks: [] };
    try {
      await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3000);
      const settle = async () => { for (let i = 0; i < 15 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.evaluate(() => { try { Message.Hide(); } catch (e) {} }); await p.waitForTimeout(200); } };
      const cmd = async c => { await settle(); /* a still-open Message makes the typed-turn capture ignore the command (AttrCalibrator keypress guard), as a player would have closed it */ await p.evaluate(() => { try { if (typeof Message !== 'undefined' && Message.IsOpen) Message.Hide(); } catch (e) {} }); if (!await p.locator('.Input.LineInput').count()) throw new Error('no input'); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(700); await settle(); };
      await settle();
      for (const c of ['i', 'take all', 'i']) { await cmd(c); if (c !== 'i') continue;
        rec.checks.push(await p.evaluate(() => {
          const L = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')]; let last = -1; for (let q = L.length - 1; q >= 0; q--) if (L[q].querySelector('.Style_input')) { last = q; break; }
          const text = L.slice(last + 1).map(l => l.textContent).join('\n');
          WorldModel.tick(); let shown = []; try { const all = EquipmentUI.model().items, S = Actionable.Scope, dt = S.lastLookText + '\n' + S.lastInventoryText + '\n' + (S.lastReplyText || ''); shown = all.map(o => { let s = Actionable.displayNameFor(o, all, dt); if (typeof LearnedWords !== 'undefined') s = LearnedWords.label('name', o.id, s); return { id: o.id, name: String(s || ''), parent: o.parentId }; }); } catch (e) { shown = 'ERR ' + e.message; }
          return { text: text.slice(0, 1500), shown }; })); }
      for (const ch of rec.checks) { if (!Array.isArray(ch.shown)) continue; const T = norm(ch.text);
        ch.extra = ch.shown.filter(s => { const n = norm(s.name).replace(/^(your|the|a|an|some) /, ''); return n && !T.includes(n); }).map(s => s.id + ':' + s.name); }
    } catch (e) { rec.err = String(e.message || e).slice(0, 160); } finally { await p.close(); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }
    console.log(g.padEnd(36), rec.err || '', (rec.checks || []).map(c => 'extra ' + JSON.stringify(c.extra || []).slice(0, 160)).join(' | ')); }
  await b.close(); })();
