// grok (non-blind, measurement only): start each title to a REAL game prompt before measuring the map.
// node measure.cjs <story> [script "a|b|c"] -> JSON trace per step: input, tail text, status line, rooms(HasRealId), CurrentRoomId
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(3500);
  const trace = [];
  const snap = async (input) => trace.push(Object.assign({ input }, await p.evaluate(() => {
    const buf = Array.from(document.querySelectorAll('.BufferWindow')).map(e => e.innerText).join('\n');
    const grid = Array.from(document.querySelectorAll('.GridWindow')).map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(' / ');
    const rooms = (typeof ParchLockMap !== 'undefined' ? (ParchLockMap.Rooms || []) : []).filter(r => r && r.HasRealId).map(r => r.ObjectId + ':' + r.Name);
    let probe = null, parent = null; try { const pl = ZRamProvider.collect(); probe = pl.probe; const m = ZRamProvider.getMem(); const ot = (m[0x0A] << 8 | m[0x0B]) + 126; const pid = probe.playerId; if (pid) { const e = ot + (pid - 1) * 14; parent = m[e + 6] << 8 | m[e + 7]; } } catch (e) { probe = 'err:' + e.message; }
    let gl = {}; try { const m = ZRamProvider.getMem(); const h = ZRamReader.header(m); const n = ZRamReader.objectCount(m); for (let s = 0; s < 240; s++) { const v = ZRamReader.u16(m, h.globals + 2 * s); if (v >= 2 && v <= n) { const nm = String(ZRamReader.shortName(m, v) || ''); if (/^(you|yourself|myself|me|self|\(self object\)|player|your ?self)$/i.test(nm.trim()) || s === 18 || s === 53) { const L = ZRamReader.objectLinks(m, v); gl['V' + (s + 16)] = v + ':' + nm + ' <' + (L ? L.parent + ':' + ZRamReader.shortName(m, L.parent) : '?') + '>'; } } } let pl2 = probe && probe.playerId; if (pl2) { const L = ZRamReader.objectLinks(m, pl2); gl.appPid = pl2 + ':' + ZRamReader.shortName(m, pl2) + ' <' + (L ? L.parent : '?') + '>'; } } catch (e) { gl = 'err:' + e.message; } return { gl, probe, tail: buf.slice(-260).replace(/\s+/g, ' '), status: grid.slice(0, 120), line: !!document.querySelector('.Input.LineInput'), char: !!document.querySelector('.Input.CharInput'), rooms, cur: typeof ParchLockMap !== 'undefined' ? ParchLockMap.CurrentRoomId : null };
  })));
  const charKey = async () => { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(300); return true; } return false; };
  const send = async (cmd) => { for (let i = 0; i < 25 && !await p.locator('.Input.LineInput').count(); i++) { if (!await charKey()) await p.waitForTimeout(200); }
    if (!await p.locator('.Input.LineInput').count()) { await snap('!noline:' + cmd); return; }
    await p.locator('.Input.LineInput').fill(cmd); await p.keyboard.press('Enter'); await p.waitForTimeout(900); await snap(cmd); };
  await snap('(start)');
  for (const c of (process.argv[3] || 'look').split('|')) { if (c === '#key') { await charKey(); await snap('#key'); } else await send(c); }
  console.log(JSON.stringify({ story: process.argv[2], trace }, null, 1)); await b.close(); })();


