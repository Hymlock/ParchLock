// Native explorer (original scene, no insert_obj/forced bits): walk real exits from the start (bounded DFS with native
// reverse moves), and in each newly reached room look for a source-CONTBIT object that is CLOSED with ORIGINAL children
// and in the current room. Run the hide/show probe on it natively. Also log already-open source-CONTBIT objects in reach
// (OPEN on them must test the OPENBIT TRUE = "already open" positive). Research only.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '../..'); const SRC = require('./2026-10-11-zil-source-flags.json'); const { analyze } = require('./zil-attr-analyzer.js');
const OUT = path.join(__dirname, process.env.OUTF || '2026-10-11-zil-native-explore.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null; const MAXMOVES = +(process.env.MOVES || 60);
const bitOf = (s, F) => { const f = s.flags && s.flags[F]; return f && (f.exact || (f.fp === 0 && f.tp >= 2)) ? f.bit : null; };
// Authored starting positions (native commands only): leave bed/car/bunk before walking.
const PRE = { 'PlunderedHearts.z3.js': ['stand up'], 'Cutthroats.z3.js': ['stand up', 'get up'], 'Moonmist.z3.js': ['get out'], 'Starcross.z3.js': ['stand up', 'get up'], 'Seastalker.z3.js': ['look'], 'Sorcerer.z3.js': ['frotz me', 'stand up'] };
const DIRS = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down', 'in', 'out'];
const REV = { north: 'south', south: 'north', east: 'west', west: 'east', northeast: 'southwest', southwest: 'northeast', northwest: 'southeast', southeast: 'northwest', up: 'down', down: 'up', in: 'out', out: 'in' };
const settle = async p => { for (let i = 0; i < 14 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press(i % 3 === 2 ? '1' : i % 3 === 1 ? 'Enter' : 'Space'); } await p.waitForTimeout(400); } };
(async () => { const b = await chromium.launch({ headless: true });
  try { for (const game of Object.keys(SRC)) { if (only && !only.has(game)) continue; const s = SRC[game]; const CB = bitOf(s, 'CONTBIT'), OB = bitOf(s, 'OPENBIT'), AB = bitOf(s, 'ACTORBIT');
    const rec = out[game] = { CB, OB, probes: [], alreadyOpen: [], moves: 0 }; if (CB == null || OB == null) { rec.err = 'no exact CONTBIT/OPENBIT'; fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(game, rec.err); continue; }
    let a; try { a = analyze(game); } catch (e) {} const ro = a && a.byVerb['open/1'] != null ? a.routineAddr(a.byVerb['open/1']) : null, rc = a && a.byVerb['close/1'] != null ? a.routineAddr(a.byVerb['close/1']) : null;
    const p = await b.newPage();
    try { await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
      await p.goto(pathToFileURL(path.join(root, 'play.html')).href + '?story=games/' + game); await p.waitForTimeout(3500); await settle(p);
      await p.evaluate(({ ro, rc }) => { const M = window.__PARCHLOCK_ZVM__; window.__ops = []; window.__fr = []; const oc = M.call, oret = M.ret;
        M.call = function (x) { const ad = x * this.addr_multipler, r = oc.apply(this, arguments); if (ad === ro || ad === rc) window.__fr.push(this.frames.length); return r; };
        M.ret = function () { const r = oret.apply(this, arguments); while (window.__fr.length && window.__fr[window.__fr.length - 1] > this.frames.length) window.__fr.pop(); return r; };
        for (const op of ['test_attr', 'set_attr', 'clear_attr']) { const n = M[op]; M[op] = function () { const g = Array.from(arguments), r = n.apply(this, g); if (window.__fr.length) window.__ops.push({ op, o: g[0], b: g[1], r: op === 'test_attr' ? !!r : null }); return r; }; } }, { ro, rc });
      const cmd = async c => { const n0 = await p.evaluate(() => { window.__ops = []; return document.querySelectorAll('.BufferLine').length; }); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(700); await settle(p);
        return p.evaluate(n0 => { const lines = [...document.querySelectorAll('.BufferLine')]; WorldModel.tick(); const P = WorldModel.lastPayload || {}; return { text: lines.slice(n0).map(l => l.textContent).join(' ').replace(/\s+/g, ' ').toLowerCase(), marks: [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(x => lines.indexOf(x.closest('.BufferLine')) >= n0).map(x => x.textContent.toLowerCase()), ops: window.__ops, room: P.roomId, roomName: P.roomName }; }, n0); };
      const scan = () => p.evaluate(({ CB, OB, AB }) => { const m = ZRamProvider.getMem(), P = WorldModel.lastPayload || {}; const g = m.getUint16(0x0c), here = m.getUint8(0) <= 3 ? m.getUint16(g) : P.roomId; const all = [];
        for (let id = 1; id < 1000; id++) { let L; try { L = ZRamReader.objectLinks(m, id); } catch (e) { break; } if (!L || !L.attrBytes) break; const has = x => !!(L.attrBytes[x >> 3] & (128 >> (x & 7))); let w = []; try { w = (ZRamReader.parserWordsAny(m, id) || []).map(String).filter(x => /^[a-z-]{3,}$/i.test(x)); } catch (e) {}
          all.push({ id, parent: L.parent, child: L.child, c: has(CB), o: has(OB), a: AB != null && has(AB), w, name: (() => { try { return ZRamReader.shortName(m, id) || ''; } catch (e) { return ''; } })() }); }
        const uniq = o => o.w.find(x => !all.some(y => y.id !== o.id && y.w.includes(x)));
        const inRoom = all.filter(o => o.parent === here && o.c && !o.a && uniq(o));
        return { here, closedWithKids: inRoom.filter(o => !o.o && o.child).map(o => ({ id: o.id, name: o.name, word: uniq(o), kids: all.filter(k => k.parent === o.id).map(k => k.name) })), open: inRoom.filter(o => o.o).map(o => ({ id: o.id, name: o.name, word: uniq(o) })) }; }, { CB, OB, AB });
      const seen = new Set(), tested = new Set(); const stack = [];
      const visit = async () => { const sc = await scan(); if (seen.has(sc.here)) return; seen.add(sc.here);
        for (const o of sc.open) { if (tested.has(o.id) || rec.alreadyOpen.length >= 6) continue; tested.add(o.id); const r = await cmd('open ' + o.word); const t = r.ops.filter(x => x.o === o.id && x.b === OB); rec.alreadyOpen.push({ room: sc.here, ...o, ops: t, ok: t.some(x => x.op === 'test_attr' && x.r === true) && !t.some(x => x.op !== 'test_attr'), reply: r.text.slice(0, 100) }); }
        for (const o of sc.closedWithKids) { if (tested.has(o.id) || rec.probes.length >= 4) continue; tested.add(o.id); const heads = o.kids.map(k => String(k).toLowerCase().split(/\s+/).pop()).filter(h => h.length >= 3); const steps = [];
          for (const c of ['look in ' + o.word, 'open ' + o.word, 'look in ' + o.word, 'close ' + o.word, 'look in ' + o.word]) { const r = await cmd(c); const t = r.ops.filter(x => x.o === o.id && x.b === OB); steps.push({ c, ops: t, cops: r.ops.filter(x => x.o === o.id && x.b === CB), text: r.text.slice(0, 140), childText: heads.filter(h => r.text.includes(h)), childMarked: heads.filter(h => r.marks.some(m => m.includes(h))) }); }
          const [l1, op, l2, cl, l3] = steps; const okBit = op.ops.some(x => x.op === 'test_attr' && x.r === false) && op.ops.some(x => x.op === 'set_attr') && cl.ops.some(x => x.op === 'clear_attr');
          rec.probes.push({ room: sc.here, ...o, steps, okBit, hideShow: !l1.childText.length && (op.childText.length || l2.childText.length) && !l3.childText.length, underline: (op.childMarked.length + l2.childMarked.length) > 0 }); }
        fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); };
      for (const c of PRE[game] || []) { const x = await cmd(c); (rec.pre = rec.pre || []).push(c + ' -> ' + x.text.slice(0, 80)); }
      await visit();
      for (const d of DIRS) stack.push(d);
      const path0 = [];
      // DFS: try each dir from current room; if room changes to an unseen room, visit and recurse; else if changed to seen, step back.
      const dfs = async (depth) => { if (rec.moves >= MAXMOVES || depth > 8) return; for (const d of DIRS) { if (rec.moves >= MAXMOVES) return; const before = await scan(); const r = await cmd(d); rec.moves++;
          if (/you have died|\*\*\*\*/.test(r.text)) { rec.died = d; return; }
          const after = await scan(); if (after.here === before.here) continue; if (rec.moves >= MAXMOVES) return; const isNew = !seen.has(after.here); if (isNew) { await visit(); await dfs(depth + 1); }
          const back = await cmd(REV[d]); rec.moves++; const bk = await scan(); if (bk.here !== before.here) { rec.lost = (rec.lost || 0) + 1; if (!seen.has(bk.here)) await visit(); } } };
      await dfs(0); rec.rooms = seen.size;
    } catch (e) { rec.err = String(e.message || e).slice(0, 160); } finally { await p.close(); }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    console.log(game.padEnd(36), 'rooms', rec.rooms, 'probes', rec.probes.map(x => x.name + (x.okBit ? '+bit' : '') + (x.hideShow ? '+hs' : '')).join(','), 'open+', rec.alreadyOpen.filter(x => x.ok).map(x => x.name).join(','), rec.err || rec.lost || ''); }
  } finally { await b.close(); console.log('EXIT'); } })();
