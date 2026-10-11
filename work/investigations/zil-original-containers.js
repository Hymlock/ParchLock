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
      for (const c of r.setup || []) rec.steps.push({ setup: c, ...(await cmd(c)), room: await room() });
      const step = async c => { let x = await cmd(c); for (let k = 0; k < 8 && /frozen solid|move a muscle|can't do anything else/.test(x.text); k++) { rec.steps.push({ setup: c + ' (blocked by authored wizard spell)', ...x, room: await room() }); x = await cmd('wait'); if (!/frozen|muscle/.test(x.text)) x = await cmd(c); } return x; };
      if (r.carousel) { const C = r.carousel; if (r.setupExpectedRoom && (await room()) !== r.setupExpectedRoom) throw Error('setup ended in ' + await room());
        let got = false; for (let i = 0; i < C.maxAttempts && !got; i++) { for (const c of C.attempt) rec.steps.push({ setup: c, ...(await cmd(c)), room: await room() });
          const now = await room(); if (now === C.untilRoom) { got = true; break; } const back = C.returnCommandsByActualRoom[now]; if (!back) throw Error('carousel: unplanned room ' + now);
          for (const c of back) rec.steps.push({ setup: c, ...(await cmd(c)), room: await room() }); if ((await room()) !== r.setupExpectedRoom) throw Error('carousel return failed: ' + await room()); }
        if (!got) throw Error('carousel: Cool Room not reached');
        // Adaptive dragon lure (2dungeon/2actions DRAGON-FCN): from the actual room, attack then step toward Ice Room
        // (Dragon Room -S-> Stone Bridge -S-> Cool Room -W-> Ice Room); branch only on native room identity, stop on melt.
        const toIce = { 'Cool Room': 'north', 'Stone Bridge': 'north' }; const lure = { 'Dragon Room': 'south', 'Stone Bridge': 'south', 'Cool Room': 'west' };
        let melted = false, met = false;
        for (let i = 0; i < 30 && !melted; i++) { const now = await room(); if (/^You have died|\*\*\*/.test('')) break;
          if (!met && toIce[now]) { const x = await step(toIce[now]); rec.steps.push({ setup: toIce[now], ...x, room: await room() }); if ((await room()) === 'Dragon Room') met = true; continue; }
          if (now === 'Dragon Room') met = true;
          const x1 = await step('attack dragon with sword'); rec.steps.push({ setup: 'attack dragon with sword', ...x1, room: await room() });
          const r2 = await room(); const mv = lure[r2]; if (!mv) { if (/melt|glacier/.test(x1.text)) { melted = true; break; } throw Error('lure: unplanned room ' + r2); }
          const x2 = await step(mv); rec.steps.push({ setup: mv, ...x2, room: await room() }); if (/melt|glacier/.test(x1.text + x2.text)) melted = true; }
        if (!melted) throw Error('checkpoint missed: ' + rec.steps.slice(-4).map(x => x.text).join(' ').slice(-200));
        for (const c of r.afterIceMelts || []) rec.steps.push({ setup: c, ...(await step(c)), room: await room() }); }
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
