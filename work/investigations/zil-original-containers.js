// Original-scene container gate (Codex #3389/#3431): fresh game, scripted native route, NO insert_obj / forced bits.
// Per probe boundary: command, native text, container OPEN bit in RAM, child named in text, child underlined (.pl-act).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '../..'); const R = require('./2026-10-11-zil-container-routes.json').routes; const SRC = require('./2026-10-11-zil-source-flags.json');
const OUT = path.join(__dirname, '2026-10-11-zil-original-containers.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const settle = async p => { for (let i = 0; i < 14 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press(i % 3 === 2 ? '1' : i % 3 === 1 ? 'Enter' : 'Space'); } await p.waitForTimeout(400); } };
(async () => { const b = await chromium.launch({ headless: true });
  try { for (const game of Object.keys(R)) { if (only && !only.has(game)) continue; const r = R[game]; const ob = SRC[game] && SRC[game].flags && SRC[game].flags.OPENBIT ? SRC[game].flags.OPENBIT.bit : null;
    const rec = out[game] = { container: r.container, openBit: ob, steps: [] }; const p = await b.newPage();
    try { await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
      await p.goto(pathToFileURL(path.join(root, 'play.html')).href + '?story=games/' + game); await p.waitForTimeout(3500); await settle(p);
      const room = () => p.evaluate(() => { WorldModel.tick(); const P = WorldModel.lastPayload || {}; return P.roomName || ''; });
      const cmd = async c => { const n0 = await p.evaluate(() => document.querySelectorAll('.BufferLine').length); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(900); await settle(p);
        return p.evaluate(({ n0, cont, ob }) => { const lines = [...document.querySelectorAll('.BufferLine')]; const m = ZRamProvider.getMem(); let id = null, bit = null;
          for (let i = 1; i < 1000; i++) { let L; try { L = ZRamReader.objectLinks(m, i); } catch (e) { break; } if (!L || !L.attrBytes) break; if (id == null && new RegExp('\\b' + cont + '\\b', 'i').test(ZRamReader.shortName(m, i) || '')) { id = i; bit = ob == null ? null : !!(L.attrBytes[ob >> 3] & (128 >> (ob & 7))); } }
          return { text: lines.slice(n0).map(l => l.textContent).join(' ').replace(/\s+/g, ' ').toLowerCase(), marks: [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(x => lines.indexOf(x.closest('.BufferLine')) >= n0).map(x => x.textContent.toLowerCase()), contId: id, openBit: bit }; }, { n0, cont: r.container, ob }); };
      if (r.carousel) throw Error('Zork II carousel route needs native dragon/glacier checkpoint; not run in this pass');
      for (const c of r.setup || []) rec.steps.push({ setup: c, ...(await cmd(c)), room: await room() });
      rec.room = await room(); if (r.expectedRoom && !/verify/.test(r.expectedRoom) && rec.room.toLowerCase() !== r.expectedRoom.toLowerCase()) throw Error('unexpected room ' + rec.room);
      const heads = r.originalChildren.map(x => x.toLowerCase().split(/\s+/).pop());
      for (const c of r.probe) { const s = await cmd(c); s.cmd = c; s.childText = heads.filter(h => s.text.includes(h)); s.childMarked = heads.filter(h => s.marks.some(m => m.includes(h))); rec.steps.push(s); }
      const P = rec.steps.filter(s => s.cmd); // look,open,look,close,look,open,look
      const closedHide = x => x.openBit === false && !x.childText.length && !x.childMarked.length, openShow = x => x.openBit === true && x.childText.length && x.childMarked.length === x.childText.length;
      const seq = P.filter(s => /^look in/.test(s.cmd));
      rec.ok = seq.length >= 4 && closedHide(seq[0]) && openShow(seq[1]) && closedHide(seq[2]) && openShow(seq[3]);
    } catch (e) { rec.err = String(e.message || e).slice(0, 200); } finally { await p.close(); }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(game.padEnd(36), rec.ok ? 'PASS' : 'FAIL', rec.err || '', rec.room || ''); }
  } finally { await b.close(); console.log('EXIT'); } })();
