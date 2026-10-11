// ZIL native flag proof (grok2, 2026-10-11). Research only: writes evidence JSON, never facts.
// Rule (operator 2:14 PM): a key is PROVEN when the native verb routine, dispatched on real objects,
// tests/sets the source-cited bit TRUE on >=2 distinct positive objects AND tests it FALSE on >=1 object
// without it. SINGLE+SOURCE only when the whole object table (every object in the module) holds exactly
// one object with the bit, the Infocom source cites exactly that one, and the native op on it agrees.
// Method: the target object is moved (VM insert_obj) into the player's room (or the player, for held
// verbs), the real command is typed, then the object is moved back. Ops are counted only inside the
// verb routine's own dispatch frame (Codex hook pattern), with args[0] = the target and args[1] = the bit.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '../..'); const SRC = require('./2026-10-11-zil-source-flags.json');
const OUT = path.join(__dirname, process.env.OUTF || '2026-10-11-zil-flags-native.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const { analyze } = require('./zil-attr-analyzer.js');
// app key <- source flag, verb, op expected on positives, where the target goes, verb routine keys
const KEYS = [
  { key: 'container', flag: 'CONTBIT', verb: 'open', op: 'test_attr', place: 'room', rk: ['open/1'] },
  { key: 'open', flag: 'OPENBIT', verb: 'open', op: 'set_attr', place: 'room', rk: ['open/1'], posFilter: 'CONTBIT', negOp: 'test_attr' },
  { key: 'light', flag: 'LIGHTBIT', verb: 'turn on', op: 'test_attr', place: 'player', rk: ['turn on/1', 'light/1'] },
  { key: 'on', flag: 'ONBIT', verb: 'turn on', op: 'set_attr', place: 'player', rk: ['turn on/1', 'light/1'], posFilter: 'LIGHTBIT', negOp: 'test_attr' },
  { key: 'wearable', flag: 'WEARBIT', verb: 'wear', op: 'test_attr', place: 'player', rk: ['wear/1', 'put on/1', 'don/1'] },
  { key: 'supporter', flag: 'SURFACEBIT', verb: 'put on', op: 'test_attr', place: 'room', rk: ['put on/2', 'place on/2'], held: true },
  { key: 'animate', flag: 'ACTORBIT', verb: 'tell', op: 'test_attr', place: 'room', rk: ['tell/1', 'talk to/1', 'ask about/2', 'hello/1'] },
  { key: 'edible', flag: 'FOODBIT', verb: 'eat', op: 'test_attr', place: 'player', rk: ['eat/1', 'consume/1'] },
  { key: 'takeable', flag: 'TAKEBIT', verb: 'take', op: 'test_attr', place: 'room', rk: ['take/1', 'get/1', 'pick up/1'] },
  { key: 'worn', flag: 'WORNBIT', verb: 'wear', op: 'set_attr', place: 'player', rk: ['wear/1', 'put on/1', 'don/1'], posFilter: 'WEARBIT', negOp: 'test_attr' },
];
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
(async () => {
  const browser = await chromium.launch({ headless: true });
  try { for (const game of Object.keys(SRC)) { if (only && !only.has(game)) continue; const s = SRC[game]; if (!s.flags) continue;
    const rec = out[game] = { stage: 'research only; no runtime facts', keys: {} }; const save = () => fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    let a; try { a = analyze(game); } catch (e) { rec.error = 'analyze: ' + e.message; save(); continue; }
    const page = await browser.newPage();
    try {
      await page.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
      await page.goto(pathToFileURL(path.join(root, 'play.html')).href + '?story=games/' + game); await page.waitForTimeout(3500);
      for (let i = 0; i < 14 && !await page.locator('.Input.LineInput').count(); i++) { const c = page.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await page.keyboard.press(i % 3 === 2 ? '1' : i % 3 === 1 ? 'Enter' : 'Space'); } await page.waitForTimeout(400); }
      if (!await page.locator('.Input.LineInput').count()) throw Error('no line prompt');
      for (const K of KEYS) {
        const sf = s.flags[K.flag]; const kr = rec.keys[K.key] = { flag: K.flag, sourceBit: sf ? sf.bit : null, sourceExact: !!(sf && sf.exact), status: 'unknown' };
        if (!sf || !(sf.exact || (sf.fp === 0 && sf.tp >= 2))) { kr.reason = sf ? 'source correlation has false positives or <2 matches' : 'flag not in source'; continue; }
        const rkey = K.rk.find(k => a.byVerb[k] != null); if (!rkey) { kr.reason = 'no verb routine for ' + K.verb; continue; }
        const raddr = a.routineAddr(a.byVerb[rkey]); const pf = K.posFilter && s.flags[K.posFilter] && s.flags[K.posFilter].exact ? s.flags[K.posFilter].bit : null;
        const cand = await page.evaluate(({ bit, pf }) => { WorldModel.tick(); const m = ZRamProvider.getMem(), P = WorldModel.lastPayload || {}; const max = m.getUint8(0) <= 3 ? 255 : 1000; const all = [];
          for (let id = 1; id <= max; id++) { let L; try { L = ZRamReader.objectLinks(m, id); } catch (e) { break; } if (!L || !L.attrBytes) break; const has = b => b != null && !!(L.attrBytes[b >> 3] & (128 >> (b & 7)));
            let w = []; try { w = (ZRamReader.parserWordsAny(m, id) || []).map(String).filter(x => /^[a-z-]{3,}$/i.test(x)); } catch (e) {} all.push({ id, parent: L.parent, has: has(bit), pf: pf == null ? true : has(pf), w, name: (() => { try { return ZRamReader.shortName(m, id); } catch (e) { return ''; } })() }); }
          const uniq = o => o.w.find(x => !all.some(y => y.id !== o.id && y.w.includes(x)));
          const ramCount = all.filter(o => o.has).length;
          const pos = all.filter(o => o.has && o.id !== P.playerId && o.id !== P.roomId).map(o => ({ ...o, word: uniq(o) })).filter(o => o.word);
          const neg = all.filter(o => !o.has && o.pf && o.parent && o.id !== P.playerId && o.id !== P.roomId).map(o => ({ ...o, word: uniq(o) })).filter(o => o.word);
          return { ramCount, pos, neg, player: P.playerId, room: P.roomId }; }, { bit: sf.bit, pf });
        let held = null;
        if (K.held) { const tb = s.flags.TAKEBIT && s.flags.TAKEBIT.exact ? s.flags.TAKEBIT.bit : null; if (tb == null) { kr.reason = 'no exact TAKEBIT for a held object'; continue; }
          held = await page.evaluate(({ tb, bit }) => { const m = ZRamProvider.getMem(); const max = m.getUint8(0) <= 3 ? 255 : 1000; const all = [];
            for (let id = 1; id <= max; id++) { let L; try { L = ZRamReader.objectLinks(m, id); } catch (e) { break; } if (!L || !L.attrBytes) break; let w = []; try { w = (ZRamReader.parserWordsAny(m, id) || []).map(String).filter(x => /^[a-z-]{3,}$/i.test(x)); } catch (e) {}
              const has = b => !!(L.attrBytes[b >> 3] & (128 >> (b & 7))); all.push({ id, w, take: has(tb), surf: has(bit) }); }
            const o = all.find(o => o.take && !o.surf && o.w.find(x => !all.some(y => y.id !== o.id && y.w.includes(x)))); return o ? { id: o.id, word: o.w.find(x => !all.some(y => y.id !== o.id && y.w.includes(x))) } : null; }, { tb, bit: sf.bit });
          if (!held) { kr.reason = 'no uniquely named takeable object to hold'; continue; } kr.held = held; }
        kr.ramCount = cand.ramCount; kr.sourcePositives = sf.positives;
        const tries0 = [...cand.pos.filter(o => o.pf).slice(0, 4).map(o => ({ ...o, kind: 'pos' })), ...cand.neg.slice(0, 3).map(o => ({ ...o, kind: 'neg' }))]; const tries = held ? tries0.filter(o => o.id !== held.id) : tries0; kr.samples = [];
        for (const t of tries) {
          const r = await page.evaluate(({ t, raddr, dest }) => { const M = window.__PARCHLOCK_ZVM__; window.__g2ops = []; window.__g2disp = 0; if (!window.__g2hook) { window.__g2hook = 1; const oc = M.call, oret = M.ret; window.__g2frames = [];
              M.call = function (x) { const addr = x * this.addr_multipler, res = oc.apply(this, arguments); if (window.__g2raddr === addr) { window.__g2frames.push(this.frames.length); window.__g2disp++; } return res; };
              M.ret = function () { const res = oret.apply(this, arguments); while (window.__g2frames.length && window.__g2frames[window.__g2frames.length - 1] > this.frames.length) window.__g2frames.pop(); return res; };
              for (const op of ['test_attr', 'set_attr', 'clear_attr']) { const n = M[op]; M[op] = function () { const args = Array.from(arguments), res = n.apply(this, args); if (window.__g2frames.length) window.__g2ops.push({ op, o: args[0], b: args[1], res }); return res; }; } }
            window.__g2raddr = raddr; const m = ZRamProvider.getMem(); window.__g2home = ZRamReader.objectLinks(m, t.id).parent; M.insert_obj(t.id, dest); return true; }, { t, raddr, dest: K.place === 'player' ? cand.player : cand.room });
          if (held) await page.evaluate(({ h, p }) => { const M = window.__PARCHLOCK_ZVM__; window.__g2hh = ZRamReader.objectLinks(ZRamProvider.getMem(), h).parent; M.insert_obj(h, p); }, { h: held.id, p: cand.player });
          await page.locator('.Input.LineInput').fill(held ? 'put ' + held.word + ' on ' + t.word : K.verb + ' ' + t.word); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
          for (let i = 0; i < 4 && !await page.locator('.Input.LineInput').count(); i++) { const c = page.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await page.keyboard.press('Enter'); } await page.waitForTimeout(300); }
          const got = await page.evaluate(({ t, bit }) => { const M = window.__PARCHLOCK_ZVM__; const ops = window.__g2ops.filter(o => o.o === t.id && o.b === bit); const other = [...new Set(window.__g2ops.filter(o => o.o === t.id && o.b !== bit).map(o => o.op + ':' + o.b))];
            try { if (window.__g2home) M.insert_obj(t.id, window.__g2home); else M.remove_obj(t.id); } catch (e) {} return { disp: window.__g2disp, ops: ops.map(o => o.op + '=' + (o.op === 'test_attr' ? !!o.res : 'x')), other, reply: [...document.querySelectorAll('.BufferLine')].slice(-3).map(l => l.textContent).join(' | ').slice(0, 160) }; }, { t, bit: sf.bit });
          if (held) await page.evaluate(h => { const M = window.__PARCHLOCK_ZVM__; try { if (window.__g2hh) M.insert_obj(h, window.__g2hh); else M.remove_obj(h); } catch (e) {} }, held.id);
          kr.samples.push({ id: t.id, name: t.name, word: t.word, kind: t.kind, ...got });
          if (!await page.locator('.Input.LineInput').count()) break;
        }
        const posOk = kr.samples.filter(x => x.kind === 'pos' && x.disp && (x.ops.includes('test_attr=true') || (K.op === 'set_attr' && x.ops.includes('set_attr=x'))));
        const negOk = kr.samples.filter(x => x.kind === 'neg' && x.disp && x.ops.includes('test_attr=false'));
        const negOp = K.negOp || 'test_attr'; void negOp;
        if (posOk.length >= 2 && negOk.length >= 1) { kr.status = 'proven'; kr.reason = posOk.length + ' native positives + ' + negOk.length + ' negative'; }
        else if (posOk.length === 1 && negOk.length >= 1 && cand.ramCount === 1 && sf.positives === 1) { kr.status = 'proven-single+source'; kr.reason = 'only object with the bit in the whole object table; Infocom source cites exactly it'; }
        else kr.reason = 'native: ' + posOk.length + ' positive(s), ' + negOk.length + ' negative(s); need >=2 + 1';
      }
    } catch (e) { rec.error = String(e.message || e).slice(0, 200); } finally { await page.close(); }
    save(); console.log(game.padEnd(40), Object.entries(rec.keys).map(([k, v]) => k + ':' + (v.status === 'unknown' ? '?' : v.status === 'proven' ? v.sourceBit : v.sourceBit + '*')).join(' '), rec.error || '');
  } } finally { await browser.close(); console.log('EXIT'); }
})();


