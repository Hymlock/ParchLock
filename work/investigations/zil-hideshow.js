// #3389 hide/show: a source container that is CLOSED at boot and holds ORIGINAL children (no attribute forcing,
// no child insertion; only the container is moved into the player's room = controlled placement, level X).
// Native LOOK/LOOK IN must not list the child and the app must not underline it; native OPEN must reveal it and the
// app must underline it; native CLOSE then LOOK must hide it again with no live underline for it.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '../..'); const SRC = require('./2026-10-11-zil-source-flags.json');
const OUT = path.join(__dirname, process.env.OUTF || '2026-10-11-zil-hideshow.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const bitOf = (s, F) => { const f = s.flags && s.flags[F]; return f && (f.exact || (f.fp === 0 && f.tp >= 2)) ? f.bit : null; };
const settle = async page => { for (let i = 0; i < 14 && !await page.locator('.Input.LineInput').count(); i++) { const c = page.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await page.keyboard.press(i % 3 === 2 ? '1' : i % 3 === 1 ? 'Enter' : 'Space'); } await page.waitForTimeout(400); } };
const cmd = async (page, c) => { const before = await page.evaluate(() => document.querySelectorAll('.BufferLine').length); await page.locator('.Input.LineInput').fill(c); await page.keyboard.press('Enter'); await page.waitForTimeout(900); await settle(page);
  return page.evaluate(b => { const lines = [...document.querySelectorAll('.BufferLine')]; const after = lines.slice(b); return { text: after.map(l => l.textContent).join('\n').toLowerCase(), marks: [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(m => lines.indexOf(m.closest('.BufferLine')) >= b).map(m => m.textContent.toLowerCase()) }; }, before); };
(async () => { const browser = await chromium.launch({ headless: true });
  try { for (const game of Object.keys(SRC)) { if (only && !only.has(game)) continue; const s = SRC[game]; const CB = bitOf(s, 'CONTBIT'), OB = bitOf(s, 'OPENBIT'), AB = bitOf(s, 'ACTORBIT');
    const rec = out[game] = { stage: 'research only', trials: [] }; if (CB == null || OB == null) { rec.status = 'unknown'; rec.reason = 'no exact CONTBIT/OPENBIT'; continue; }
    for (let k = 0; k < 4; k++) { const page = await browser.newPage();
      try { await page.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
        await page.goto(pathToFileURL(path.join(root, 'play.html')).href + '?story=games/' + game); await page.waitForTimeout(3500); await settle(page);
        const c = await page.evaluate(({ CB, OB, AB, k }) => { WorldModel.tick(); const m = ZRamProvider.getMem(), P = WorldModel.lastPayload || {}; const max = m.getUint8(0) <= 3 ? 255 : 1000; const all = [];
          for (let id = 1; id <= max; id++) { let L; try { L = ZRamReader.objectLinks(m, id); } catch (e) { break; } if (!L || !L.attrBytes) break; const has = b => b != null && !!(L.attrBytes[b >> 3] & (128 >> (b & 7)));
            let w = []; try { w = (ZRamReader.parserWordsAny(m, id) || []).map(String).filter(x => /^[a-z-]{3,}$/i.test(x)); } catch (e) {} all.push({ id, parent: L.parent, child: L.child, c: has(CB), o: has(OB), a: has(AB), w, name: (() => { try { return ZRamReader.shortName(m, id); } catch (e) { return ''; } })() }); }
          const uniq = o => o.w.find(x => !all.some(y => y.id !== o.id && y.w.includes(x)));
          const cands = all.filter(o => o.c && !o.o && !o.a && o.child && o.parent && o.id !== P.playerId && o.id !== P.roomId && uniq(o)).map(o => { const kid = all.find(x => x.id === o.child); return { id: o.id, name: o.name, word: uniq(o), kid: kid && kid.name, kidHead: kid && String(kid.name).toLowerCase().split(/\s+/).pop() }; }).filter(o => o.kidHead && o.kidHead.length >= 3);
          const t = cands[k]; if (!t) return { n: cands.length }; window.__PARCHLOCK_ZVM__.insert_obj(t.id, P.roomId); return { n: cands.length, t }; }, { CB, OB, AB, k });
        if (!c.t) break; const t = c.t;
        const l1 = await cmd(page, 'look in ' + t.word), o1 = await cmd(page, 'open ' + t.word), l2 = await cmd(page, 'look in ' + t.word), c1 = await cmd(page, 'close ' + t.word), l3 = await cmd(page, 'look in ' + t.word);
        const has = (r) => r.text.includes(t.kidHead), mk = (r) => r.marks.some(m => m.includes(t.kidHead));
        const opened = /open|reveal|inside|contain/.test(o1.text) && !/can't|cannot|locked|won't|isn't/.test(o1.text);
        const ok = opened && !has(l1) && !mk(l1) && (has(o1) || has(l2)) && (mk(o1) || mk(l2)) && !has(l3) && !mk(l3);
        rec.trials.push({ ...t, ok, opened, hidden1: !has(l1) && !mk(l1), shown: has(o1) || has(l2), marked: mk(o1) || mk(l2), hidden2: !has(l3) && !mk(l3), replies: [l1, o1, l2, c1, l3].map(r => r.text.replace(/\s+/g, ' ').slice(0, 120)), marks: [o1.marks, l2.marks] });
      } catch (e) { rec.trials.push({ err: String(e.message || e).slice(0, 160) }); } finally { await page.close(); } }
    const okN = rec.trials.filter(x => x.ok).length; rec.status = okN >= 2 ? 'proven' : 'unknown'; rec.reason = okN + ' native hide/open-show/close-hide trials with app underline tracking (container placed, children original; level X)';
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(game.padEnd(40), rec.status, rec.reason); }
  } finally { await browser.close(); console.log('EXIT'); } })();
