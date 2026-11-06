// R4 PRSO/PRSI proof at verb dispatch (Codex #3306/#3311 method; read-only research).
// Passive wrap of the native ZVM call(): when the grammar's action routine for EXAMINE / PUT IN is
// entered, snapshot the inferred PRSO/PRSI globals. Proof = >=2 distinct targets match + a parser
// negative (nonsense noun) never dispatches. Nothing is written to the game.
//   [ONLY=a,b] node work/investigations/zil-dispatch-proof.js
const fs = require('fs'), path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const { analyze } = require('./zil-attr-analyzer.js');
const M = JSON.parse(fs.readFileSync(path.join(__dirname, '2026-10-11-zil-matrix.json'), 'utf8'));
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const pick = (r, keys) => { for (const k of keys) if (r.byVerb[k] != null) return { key: k, addr: r.routineAddr(r.byVerb[k]) }; return null; };
(async () => { const b = await chromium.launch(); const out = {};
  for (const g of M.order) { if (ONLY && !ONLY.includes(g)) continue; const row = M.rows[g];
    if (!/confirmed-zil-family\/validated/.test(row.classification)) { out[g] = { status: 'skipped: classification ' + row.classification }; console.log(g, out[g].status); continue; }
    const r = analyze(g); const EX = pick(r, ['examine/1', 'examin/1', 'x/1', 'look at/1', 'inspect/1']); const PUT = pick(r, ['put in/2', 'insert in/2', 'place in/2']);
    // ZIL PERFORM lets an object's own ACTION answer first, so several verb routines are watched.
    const VERBS = [['examine', ['examine/1', 'examin/1', 'x/1', 'look at/1']], ['read', ['read/1']], ['take', ['take/1', 'get/1']], ['open', ['open/1']], ['drop', ['drop/1']]].map(([verb, ks]) => { const q = pick(r, ks); return q && { verb, addr: q.addr }; }).filter(Boolean).filter((v, i, a) => a.findIndex(w => w.addr === v.addr) === i);
    // Codex #3351: a role must be a VM global (var16..var255); constants (Wishbringer const187), locals and null abstain.
    const gvar = s => { const m = /^var([0-9]+)$/.exec(String(s || '')); return m && +m[1] >= 16 && +m[1] <= 255 ? +m[1] : null; };
    if (row.prso && gvar(row.prso) == null) { out[g] = { status: 'unknown: PRSO role ' + row.prso + ' is not a global variable' }; console.log(g, out[g].status); continue; }
    if (row.prsi && gvar(row.prsi) == null) row.prsi = null;
    if (!EX || !row.prso) { out[g] = { status: 'no EXAMINE action or no inferred PRSO' }; console.log(g, out[g].status); continue; }
    const p = await b.newPage({ viewport: { width: 1000, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    try {
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3000);
      // Runner fix: answer char-input boot screens (Border Zone, LGOP menus) with Enter/Space and wait for the line input up to ~20s.
      const settle = async () => { for (let i = 0; i < 80; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press(['Space', 'Enter', '1'][i % 3]); /* Border Zone: chapter menu wants 1/2/3/R */ } await p.waitForTimeout(250); } return false; };
      if (!await settle()) throw new Error('no line input after boot');
      const vars = { prso: gvar(row.prso), prsi: row.prsi ? gvar(row.prsi) : null };
      await p.evaluate(([routines, vars]) => { const vm = window.__PARCHLOCK_ZVM__; const D = () => (typeof ZRamProvider !== 'undefined' ? ZRamProvider.getMem() : null);
        const gv = n => { const m = D(); const gt = m.getUint16(0x0C); return m.getUint16(gt + 2 * (n - 16)); };
        window.__hits = []; const orig = vm.call; vm.call = function (t, i, e, s) { try { const a = t * this.addr_multipler; const tag = routines[a]; if (tag) window.__hits.push({ tag, prso: gv(vars.prso), prsi: vars.prsi ? gv(vars.prsi) : null }); } catch (x) {} return orig.apply(this, arguments); }; },
        [Object.assign({}, ...VERBS.map(v => ({ [v.addr]: v.verb })), PUT ? { [PUT.addr]: 'putin' } : {}), vars]);
      const cmd = async c => { await p.evaluate(() => { window.__hits = []; }); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1300); await settle(); return p.evaluate(() => ({ hits: window.__hits.slice(), reply: [...document.querySelectorAll('.BufferLine')].slice(-4).map(l => l.textContent).join(' | ').slice(-140) })); };
      await cmd('look');
      const objs = await p.evaluate(() => { WorldModel.tick(); const P = WorldModel.lastPayload || {}; return (P.discoveredObjects || []).concat(P.inventory || []).filter(x => x && x.name && x.id && /^[a-z][a-z' -]+$/i.test(x.name) && !/^(it|you|yourself|me)$/i.test(x.name)).map(x => ({ id: x.id, name: x.name, aliases: (x.aliases || []).filter(w => w && w.length >= 3 && /^[a-z-]+$/i.test(w)).concat(x.name.toLowerCase().split(' ')) })).map((x, i, all) => ({ id: x.id, name: x.name, ws: x.aliases, word: x.aliases.find(w => !all.some(y => y.id !== x.id && y.aliases.includes(w))) || x.aliases[0] })); });
      // Runner fix (2026-10-11): ZIL payloads can expose no objects (Deadline/Infidel cold start);
      // fall back to the RAM tree (children of the current room and of the player) with each
      // object's own parser words, so dispatch is tried on real objects. Read-only.
      if (objs.length < 3) { const more = await p.evaluate(() => { const m = ZRamProvider.getMem(), P = WorldModel.lastPayload || {}; const out = [];
        for (const holder of [P.roomId, P.playerId]) { if (!holder) continue; let kids = []; try { kids = ZRamReader.children(m, holder) || []; } catch (e) {}
          for (const id of kids) { if (id === P.playerId) continue; let w = []; try { w = (ZRamReader.parserWordsAny(m, id) || []).map(String).filter(x => /^[a-z-]{3,}$/i.test(x)); } catch (e) {} let nm = ''; try { nm = ZRamReader.shortName(m, id) || ''; } catch (e) {} if (w.length) out.push({ id, name: nm, ws: w }); } }
        // Local-globals (Infidel tent: cot/trunk are not room children): any object whose own
        // parser words are printed in the room text. Identity is still checked at dispatch.
        if (out.length < 3) { const txt = [...document.querySelectorAll('.BufferLine')].slice(-12).map(l => l.textContent.toLowerCase()).join(' '); const max = (m.getUint8(0) <= 3 ? 255 : 600);
          for (let id = 1; id <= max; id++) { if (id === P.playerId || out.some(o => o.id === id)) continue; let w = []; try { w = (ZRamReader.parserWordsAny(m, id) || []).map(String).filter(x => /^[a-z-]{3,}$/i.test(x)); } catch (e) { continue; }
            const hit = w.filter(x => new RegExp('(^|[^a-z])' + x.toLowerCase() + '([^a-z]|$)').test(txt)); if (hit.length) { let nm = ''; try { nm = ZRamReader.shortName(m, id) || ''; } catch (e) {} out.push({ id, name: nm, ws: hit.concat(w.filter(x => !hit.includes(x))) }); } } }
        return out; });
        for (const x of more) { if (objs.some(o => o.id === x.id)) continue; const word = x.ws.find(w => !more.some(y => y.id !== x.id && y.ws.includes(w))) || x.ws[0]; objs.push({ id: x.id, name: x.name, ws: x.ws, word, src: 'ram-tree' }); } }
      const ex = [];
      for (const o of objs.slice(0, 10)) { for (const v of VERBS) { const res = await cmd(v.verb + ' ' + o.word); const h = res.hits.find(x => VERBS.some(w => w.verb === x.tag)); if (h) { const sharers = objs.filter(y => (y.ws || []).map(s => String(s).toLowerCase()).includes(String(o.word).toLowerCase())).map(y => y.id); const amb = sharers.length > 1; ex.push({ o, verb: v.verb, routine: h.tag, dispatched: true, prso: h.prso, match: !amb && h.prso === o.id, ambiguous: amb && sharers.includes(h.prso), sharers, reply: res.reply }); break; } } if (ex.filter(x => x.match).length >= 3) break; }
      const neg = await cmd('examine zqxwvb'); const negDispatched = neg.hits.length > 0;
      let put = null; if (PUT && row.prsi && objs.length >= 2) {
        const held = async () => p.evaluate(() => { WorldModel.tick(); return ((WorldModel.lastPayload || {}).inventory || []).map(o => o.id); });
        let h0 = await held(); let a = objs.find(o => h0.includes(o.id));
        if (!a) for (const o of objs.slice(0, 8)) { await cmd('take ' + o.word); const h1 = await held(); if (h1.includes(o.id)) { a = o; break; } }
        if (a) for (const c of objs.filter(o => o.id !== a.id).slice(0, 6)) { const res = await cmd('put ' + a.word + ' in ' + c.word); const h = res.hits.find(x => x.tag === 'putin'); put = { a: a.id, c: c.id, dispatched: !!h, prso: h && h.prso, prsi: h && h.prsi, reply: res.reply }; if (h) break; const h2 = await held(); if (!h2.includes(a.id)) { await cmd('take ' + a.word); } }
        else put = { dispatched: false, reply: 'could not take any visible object' }; }
      const distinct = new Set(ex.filter(x => x.match).map(x => x.o.id)).size, mism = ex.filter(x => x.dispatched && !x.match && !x.ambiguous); /* shared word (two cots): parser picks the in-scope one, not evidence either way */
      const prsoStatus = distinct >= 2 && !negDispatched && mism.length === 0 ? 'PRSO PROVEN at dispatch' : distinct >= 1 && mism.length === 0 ? 'single-target only' : mism.length ? 'MISMATCH at dispatch' : 'not dispatched';
      const prsiStatus = !put ? 'not tested' : !put.dispatched ? 'PUT IN not dispatched (' + put.reply.slice(-60) + ')' : put.prso === put.a && put.prsi === put.c ? 'PRSI PROVEN at dispatch' : 'PRSI MISMATCH';
      out[g] = { prso: { var: row.prso, status: prsoStatus, distinct, negDispatched, ex }, prsi: { var: row.prsi, status: prsiStatus, put }, errs };
    } catch (e) { out[g] = { status: 'error ' + e.message.slice(0, 120) }; }
    await p.close(); console.log(g, JSON.stringify(out[g].prso ? { prso: out[g].prso.status, d: out[g].prso.distinct, neg: out[g].prso.negDispatched, prsi: out[g].prsi.status.slice(0, 80) } : out[g]));
  }
  const prev = fs.existsSync(path.join(__dirname, '2026-10-11-zil-dispatch-proof.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, '2026-10-11-zil-dispatch-proof.json'), 'utf8')) : {};
  fs.writeFileSync(path.join(__dirname, '2026-10-11-zil-dispatch-proof.json'), JSON.stringify(Object.assign(prev, out), null, 1)); await b.close(); })();









