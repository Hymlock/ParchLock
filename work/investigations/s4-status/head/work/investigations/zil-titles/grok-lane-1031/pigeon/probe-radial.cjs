// grok copy of claude probe.cjs (cache-claude-wear) + RADIAL=ids env: ActionSynth.commandsForPayloadObjectId after each extra cmd. Read-only.
// Claude wear-subdomain probe. node probe.cjs <game.js> <routeKey> <routeN> <namePattern> <wornBit> <out.json> <extraCmdsJSON>
// Replays jericho/zil route[0:N] with JSEED-style deterministic random (seed 0, same as g1-batch default), then runs extra
// commands, recording per command: transcript delta, target object id(s) matched by shortName, parent chain, worn bit.
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../../../..');
const { chromium } = require(REPO + '/node_modules/playwright');
const { pathToFileURL } = require('url');
const [G, RK, RN, PAT, WB, OUT, EXTRA] = process.argv.slice(2);
const W = Object.assign({}, require(REPO + '/work/investigations/2026-10-11-jericho-walkthroughs.json'), require(REPO + '/work/investigations/2026-10-15-zil-routes.json'));
const route = (W[RK] || []).slice(0, +RN), extra = JSON.parse(EXTRA || '[]');
(async () => {
  const b = await chromium.launch({ headless: true }); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript((J) => { let A = J >>> 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, '__PARCHLOCK_ZVM__', { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } }); sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); }, 0);
  await p.goto(pathToFileURL(REPO + '/play.html').href + '?story=games/' + G); await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } return false; };
  const txt = () => p.evaluate(() => document.body.innerText);
  const cmd = async (c) => { await settle(); const a = await txt(); await p.evaluate((c) => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(900); const ok = await settle(); const z = await txt(); const L = z.toLowerCase(), ix = L.lastIndexOf('>' + c.toLowerCase()); return { reply: ix >= 0 ? z.slice(ix) : z.slice(-800), lineInput: ok }; };
  const state = (pat, wb) => p.evaluate(([pat, wb]) => { const m = ZRamProvider.getMem(); const here = m.getUint16(m.getUint16(0x0c)); const re = new RegExp(pat, 'i'); const out = []; for (let id = 1; id < 400; id++) { let n; try { n = ZRamReader.shortName(m, id); } catch (e) { break; } if (!n || !re.test(n)) continue; const lk = ZRamReader.objectLinks(m, id); if (!lk) continue; const chain = []; let q = lk.parent; for (let k = 0; q && k < 5; k++) { chain.push(q + ':' + ZRamReader.shortName(m, q)); q = ZRamReader.objectLinks(m, q).parent; } out.push({ id, name: n, chain, worn: !!(lk.attrBytes && lk.attrBytes[wb >> 3] & (128 >> (wb & 7))) }); } return { here: here + ':' + ZRamReader.shortName(m, here), objs: out }; }, [pat, +wb]);
  await settle(); const log = [];
  let si = 0; for (const c of route) { const r = await cmd(c); if (process.env.TRACE && /RESTART, RESTORE/.test(r.reply)) { console.log('DEATH at', si, c, r.reply.slice(0, 600)); break; } si++; }
  log.push({ step: 'after-route', state: await state(PAT, WB) });
  // SEEDED TIER (disclosed): SEEDMOVE="obj:refObj" moves obj into the parent of refObj (the player) via the VM's own insert_obj.
  if (process.env.SEEDMOVE) { const [o, r] = process.env.SEEDMOVE.split(':').map(Number); const res = await p.evaluate(([o, r]) => { const v = window.__PARCHLOCK_ZVM__; const pl = ZRamReader.objectLinks(ZRamProvider.getMem(), r).parent; if (typeof v.insert_obj !== 'function') return { err: 'no insert_obj', keys: Object.keys(Object.getPrototypeOf(v)).filter(k => /obj/i.test(k)) }; v.insert_obj(o, pl); return { moved: o, into: pl }; }, [o, r]); log.push({ step: 'seedmove', res, state: await state(PAT, WB) }); }
  for (const c of extra) { const r = await cmd(c); await p.waitForTimeout(800); const radial = await p.evaluate((ids) => ids.map((id) => { try { return [id, ActionSynth.commandsForPayloadObjectId(id)]; } catch (e) { return [id, "ERR " + e.message]; } }), (process.env.RADIAL || "").split(",").filter(Boolean).map(Number)); log.push({ cmd: c, reply: r.reply.trim(), lineInput: r.lineInput, state: await state(PAT, WB), radial }); }
  fs.writeFileSync(OUT, JSON.stringify({ game: G, route: RK, n: +RN, seed: +(process.env.SEED || 0), wornBit: +WB, pattern: PAT, extra, log, ts: new Date().toISOString() }, null, 2));
  for (const e of log) console.log(e.cmd || e.step, e.res ? JSON.stringify(e.res) : '', '=>', (e.reply || '').replace(/\s+/g, ' ').slice(0, 300), '|', JSON.stringify(e.state.objs.map(o => [o.id, o.name, o.chain[0], o.worn])));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
