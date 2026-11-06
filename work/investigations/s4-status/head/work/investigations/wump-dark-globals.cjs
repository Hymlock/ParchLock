// R4 research (Codex #3061): record native globals/objects across SWITCH OFF BAR -> SWITCH ON BAR
// from the operator's save. Read-only. Reports every global whose value changes and any global
// holding the room (49) or a darkness-named object, plus per-tick darkEvidence during the ON turn.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
const pkg = fs.readFileSync('work/investigations/operator-2026-10-10-wumpus-dark/save.json', 'utf8');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(2500);
const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
const send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(2200); await settle(); };
await settle(); await p.evaluate(t => ParchLockQol.ImportPackageData(t), pkg); await p.waitForTimeout(800); await p.evaluate(() => { try { Message.Hide(); } catch (e) {} });
await send('y'); await p.waitForSelector('#dialog_select'); await p.locator('#dialog_select').selectOption({ index: 0 }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(3500); await settle();
const g = () => p.evaluate(() => { const m = ZRamProvider.getMem(), base = m.getUint16(0x0c), out = []; for (let i = 0; i < 240; i++) out.push(m.getUint16(base + 2 * i)); return out; });
const nm = (ids) => p.evaluate(ids => { const m = ZRamProvider.getMem(); return ids.map(i => { try { return i + ':' + ZRamReader.shortName(m, i); } catch (e) { return i + ':?'; } }); }, ids);
const darkObj = await p.evaluate(() => { const m = ZRamProvider.getMem(), n = ZRamReader.objectCount(m, ZRamReader.header(m)), o = []; for (let i = 1; i <= n; i++) { const s = ZRamReader.shortName(m, i) || ''; if (/dark/i.test(s)) o.push(i + ':' + s + ' parent ' + ZRamReader.objectLinks(m, i).parent); } return o; });
console.log('DARK-NAMED OBJECTS', JSON.stringify(darkObj)); console.log('SRC', JSON.stringify(await p.evaluate(() => { const lp = WorldModel.lastPayload; return { roomId: lp.roomId, probe: lp.probe, sources: lp.sources, conf: lp.roomConfidence }; })).slice(0, 1200)); console.log('OBJ', JSON.stringify(await p.evaluate(() => { const m = ZRamProvider.getMem(); const d = i => { const l = ZRamReader.objectLinks(m, i); return i + ':' + ZRamReader.shortName(m, i) + ' parent ' + l.parent + ':' + ZRamReader.shortName(m, l.parent) + ' child ' + l.child + ' sib ' + l.sibling + ' kids ' + ZRamReader.children(m, i).map(k => k + ':' + ZRamReader.shortName(m, k)).join(','); }; const pid = ZRamReader.findPlayerId(m); return { r49: d(49), r50: d(50), r25: d(25), player: pid + ' ' + d(pid), status: (document.querySelector('.GridWindow') || {}).innerText }; })));
const g0 = await g(); await send('switch off bar'); const g1 = await g();
// Per-tick evidence capture during ON.
await p.evaluate(() => { window.__ev = []; const nf = DarkScope.noteFromPayload; DarkScope.noteFromPayload = function (pl) { nf.apply(this, arguments); window.__ev.push(pl.roomId + '|' + pl.roomName + '|' + pl.darkEvidence); }; });
await send('switch on bar'); const g2 = await g();
const ev = await p.evaluate(() => window.__ev);
const diff = (a, b2) => a.map((v, i) => v !== b2[i] ? 'G' + i + ':' + v + '->' + b2[i] : null).filter(Boolean);
console.log('OFF changes', JSON.stringify(diff(g0, g1)));
console.log('ON changes', JSON.stringify(diff(g1, g2)));
console.log('HOLD50 lit', JSON.stringify(g0.map((v, i) => v === 50 ? 'G' + i : null).filter(Boolean)), 'dark', JSON.stringify(g1.map((v, i) => v === 50 ? 'G' + i : null).filter(Boolean)), 'relit', JSON.stringify(g2.map((v, i) => v === 50 ? 'G' + i : null).filter(Boolean)));
const holders = (arr, ids) => arr.map((v, i) => ids.includes(v) ? 'G' + i + '=' + v : null).filter(Boolean);
const ids = [49, ...darkObj.map(s => +s.split(':')[0])];
console.log('HOLDERS lit-before', JSON.stringify(holders(g0, ids)), 'dark', JSON.stringify(holders(g1, ids)), 'lit-after', JSON.stringify(holders(g2, ids)));
const uniq = [...new Set(ev)]; console.log('ON-turn per-tick evidence (distinct, in order)', JSON.stringify(uniq));
await b.close(); })();
