// ZIL inventory columns, original scene (claude, 2026-10-15). Replays each walkthrough (seeded; prompts/WAITUNTIL
// honoured) and at checkpoints issues `i`, then compares the game's own list with the app:
//   descriptors: each native item line has an app SHOWN name (EquipmentUI path) that equals it (articles/state
//                suffixes stripped) or is contained in it; shorter-but-contained names are flagged 'shortened'.
//   nested:      native lines that are indented/contained ("The X contains:") vs app parent chain.
//   underline:   each native item line has a .pl-act mark in the `i` reply.
//   extra:       app items the native list never names (shown but not carried/listed).
// Research only.   ONLY=zork1,infidel CHECKS=30,60,90,120 node work/investigations/zil-inv-check.cjs
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const W = require('./2026-10-11-jericho-walkthroughs.json');
const MAP = { zork1: 'Zork1-TheGreatUndergroundEmpire.z3.js', zork2: 'Zork2-TheWizardofFrobozz.z3.js', zork3: 'Zork3-TheDungeonMaster.z3.js', enchanter: 'Enchanter.z3.js', hhgg: 'Hitchhik.z5.js', ballyhoo: 'Ballyhoo.z3.js', cutthroat: 'Cutthroats.z3.js', infidel: 'Infidel.z3.js', hollywood: 'HollywoodHijinx.z3.js', plundered: 'PlunderedHearts.z3.js', lurking: 'TheLurkingHorror.z3.js', planetfall: 'Planetfall.z3.js', seastalker: 'Seastalker.z3.js', sorcerer: 'Sorcerer.z3.js', spellbrkr: 'Spellbreaker.z3.js', wishbringer: 'Wishbringer.z3.js' };
const PREFIX = { seastalker: ['Codex', 'Audit', 'yes'] };
const OUT = path.join(__dirname, process.env.OUTF || '2026-10-15-zil-inv-check.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const clean = s => String(s || '').toLowerCase().replace(/\s*\((?:[^()]*)\)\s*/g, ' ').replace(/^(a|an|the|some|your|two|three|four|five|six|seven|eight|nine|ten) /, '').replace(/[.,:;!]+$/, '').replace(/\s+/g, ' ').trim();
(async () => { const b = await chromium.launch();
  for (const k of (process.env.ONLY || Object.keys(MAP).join(',')).split(',')) { const g = MAP[k]; const p = await b.newPage(); const rec = out[g] = { ts: new Date().toISOString(), checks: [] };
    try {
      await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
      // Frotz/Jericho z_random parity (same as zil-walk.js JSEED) so walkthroughs stay in sync.
      const JS = { zork1: 12, hhgg: 4, cutthroat: 10 }[k] || 0;
      await p.addInitScript((J) => { let A = J >>> 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, '__PARCHLOCK_ZVM__', { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } }); }, JS);
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3500);
      const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.evaluate(() => { try { Message.Hide(); } catch (e) {} }); await p.waitForTimeout(200); } };
      const cmd = async c => { const n0 = await p.evaluate(() => document.querySelectorAll('.BufferLine').length); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(550); await settle(); return n0; };
      await settle(); for (const c of PREFIX[k] || []) await cmd(c);
      const CHECKS = (process.env.CHECKS || '30,60,90,120').split(',').map(Number); const seq = W[k];
      for (let i = 0; i < Math.min(seq.length, Math.max(...CHECKS)); i++) {
        const c = seq[i];
        if (/^WAITUNTIL:/.test(c)) { const re = new RegExp(c.slice(10), 'i'); for (let w = 0; w < 40; w++) { const n0 = await cmd('wait'); const t = await p.evaluate(n0 => [...document.querySelectorAll('.BufferLine')].slice(n0).map(l => l.textContent).join(' '), n0); if (re.test(t)) break; } }
        else await cmd(c);
        if (!CHECKS.includes(i + 1)) continue;
        const n0 = await cmd('i');
        rec.checks.push(await p.evaluate(({ n0, step }) => {
          // Lines after the LAST echoed command (scrollback caps freeze the BufferLine count, so n0 is unreliable).
          const all0 = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')]; let last = -1; for (let q = all0.length - 1; q >= 0; q--) { if (all0[q].querySelector('.Style_input')) { last = q; break; } }
          const lines = all0.slice(last + 1); const text = lines.map(l => l.textContent).join('\n');
          const items = []; lines.forEach(l => { const raw = l.textContent; const t = raw.replace(/\s+$/, ''); if (!t.trim() || /^>|carrying|holding|you have|empty.handed|what next|contains:|is wearing|you are wearing/i.test(t.trim()) && !/^\s+/.test(raw)) return; if (/^\s*>/.test(t)) return; const indent = (raw.match(/^\s*/) || [''])[0].length; items.push({ text: t.trim(), indent, marked: !!l.querySelector('.pl-act') }); });
          // One-sentence inventories ("You are carrying a X, a Y and a Z."): split the list into items.
          if (!items.length) { const m1 = text.replace(/\s+/g, ' ').match(/(?:carrying|holding|you have)[:,]?\s+(.+?)(?:\.|>|$)/i); if (m1 && !/nothing|empty.handed/i.test(m1[1])) m1[1].split(/,\s*(?:and\s+)?|\s+and\s+/).map(s => s.trim()).filter(Boolean).forEach(s => items.push({ text: s, indent: 0, marked: [...lines].some(l => [...l.querySelectorAll('.pl-act')].some(e => s.toLowerCase().includes(e.textContent.toLowerCase()))) })); }
          WorldModel.tick(); let shown = []; try { const all = EquipmentUI.model().items, S = Actionable.Scope, dt = S.lastLookText + '\n' + S.lastInventoryText + '\n' + (S.lastReplyText || ''); shown = all.map(o => { let s = Actionable.displayNameFor(o, all, dt); if (typeof LearnedWords !== 'undefined') s = LearnedWords.label('name', o.id, s); return { id: o.id, name: String(s || ''), parent: o.parentId }; }); } catch (e) { shown = 'ERR ' + e.message; }
          return { step, text: text.slice(0, 600), items, shown }; }, { n0, step: i + 1 }));
      }
      // Classify.
      const cls = { descriptorExact: 0, descriptorShortened: [], missing: [], extra: [], unmarked: [] };
      for (const ch of rec.checks) { if (!Array.isArray(ch.shown)) continue;
        const shownC = ch.shown.map(s => ({ ...s, c: clean(s.name) })); const nativeC = ch.items.map(it => ({ ...it, c: clean(it.text) })).filter(it => it.c && it.c.split(' ').length <= 8);
        for (const it of nativeC) { const ex = shownC.find(s => s.c === it.c); if (ex) cls.descriptorExact++; else { const part = shownC.find(s => s.c && it.c.includes(s.c)); if (part) cls.descriptorShortened.push(ch.step + ':' + it.c + ' <- ' + part.c); else cls.missing.push(ch.step + ':' + it.c); }
          if (!it.marked) cls.unmarked.push(ch.step + ':' + it.c); }
        for (const s of shownC) if (s.c && !nativeC.some(it => it.c === s.c || it.c.includes(s.c) || s.c.includes(it.c))) cls.extra.push(ch.step + ':' + s.c); }
      rec.cls = cls;
    } catch (e) { rec.err = String(e.message || e).slice(0, 200); } finally { await p.close(); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }
    const c = rec.cls || {}; console.log(g.padEnd(36), rec.err || '', 'exact', c.descriptorExact, 'short', JSON.stringify(c.descriptorShortened || []).slice(0, 160), 'missing', JSON.stringify(c.missing || []).slice(0, 160), 'extra', JSON.stringify(c.extra || []).slice(0, 160), 'unmarked', (c.unmarked || []).length); }
  await b.close(); })();
