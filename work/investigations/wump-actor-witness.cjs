// Identity R1 research (Codex #3072): native player-role witness. Which globals hold 171 (CustomPlayer)
// or 20 (self object); does 171's parent follow the player's moves while G16/G41 track it? Read-only.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
const pkg = fs.readFileSync('work/investigations/operator-2026-10-10-wumpus-dark/save.json', 'utf8');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(2500);
const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
const send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(2200); await settle(); };
await settle(); await p.evaluate(t => ParchLockQol.ImportPackageData(t), pkg); await p.waitForTimeout(800); await p.evaluate(() => { try { Message.Hide(); } catch (e) {} });
await send('y'); await p.waitForSelector('#dialog_select'); await p.locator('#dialog_select').selectOption({ index: 0 }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(3500); await settle();
const st = tag => p.evaluate(tag => { const m = ZRamProvider.getMem(), base = m.getUint16(0x0c), G = i => m.getUint16(base + 2 * i);
  const holders = v => { const o = []; for (let i = 0; i < 240; i++) if (G(i) === v) o.push('G' + i); return o; };
  const par = i => { const q = ZRamReader.objectLinks(m, i).parent; return q + ':' + ZRamReader.shortName(m, q); };
  const st = (document.querySelector('.GridWindow') || {}).innerText || '';
  return tag + ' ' + JSON.stringify({ status: st.replace(/\s+/g, ' ').trim().slice(0, 60), p171: par(171), p20: par(20), g171: holders(171), g20: holders(20), G16: G(16), G41: G(41), G37: G(37), G38: G(38), G70: G(70), payloadRoom: (WorldModel.lastPayload || {}).roomId,
    first: (DarkScope.latestReplyLines() || []).find(l => /room #/i.test(l)) }); }, tag);
console.log(await st('start'));
for (const c of ['x3', 'x3', 'x1', 'x1', 'x2']) { await send(c); console.log(await st('after ' + c)); }
await b.close(); })();
