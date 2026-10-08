// End-to-end: install a NEW story through the real Module Manager picker,
// launch it from the module list, and check the detection systems on it.
//   node harness/module-install-e2e.js path/to/story.z5 [--width=360]
// A story whose world is not Z-machine objects (e.g. the Adventure 550
// A-code port: 4 objects, all Inform metaclasses) has nothing for RAM
// detection to read -- that is honest absence (D24), not an install fault.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const file = path.resolve(process.argv[2]);
const width = Number((process.argv.find(a => a.startsWith('--width=')) || '--width=1280').slice(8));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width, height: 850 } });   // fresh storage: nothing pre-installed
  const p = await ctx.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  const out = []; const ok = (c, m) => out.push((c ? 'PASS: ' : 'FAIL: ') + m);

  // 1. Install via the selection screen's Modules button and the real file picker.
  await p.goto(pathToFileURL(path.resolve('index.html')).href); await p.waitForTimeout(2500);
  const before = await p.evaluate(() => ModuleLibrary.all().length);
  await p.click('#modules, #import');
  await p.waitForSelector('#pl-module-files', { state: 'attached', timeout: 10000 });
  await p.setInputFiles('#pl-module-files', file);
  await p.waitForFunction(() => /added|already present|rejected/.test((document.getElementById('pl-module-progress') || {}).textContent || ''), null, { timeout: 30000 });
  const progress = await p.evaluate(() => document.getElementById('pl-module-progress').textContent + ' | ' + document.getElementById('pl-module-results').textContent);
  ok(/1 added/.test(progress), 'installer reports the module added: ' + progress);
  const entry = await p.evaluate(() => { const all = ModuleLibrary.all(); return { n: all.length, last: all.filter(g => /^local\//.test(g.Path)).map(g => ({ Title: g.Title, Path: g.Path, Author: g.Author })) }; });
  ok(entry.n === before + 1 && entry.last.length === 1, 'module list grew by one local entry: ' + JSON.stringify(entry.last));
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  await p.waitForTimeout(800);
  const listed = await p.evaluate((pth) => !!Array.from(document.querySelectorAll('a[href]')).find(a => decodeURIComponent(a.getAttribute('href')).includes(pth)), entry.last[0] && entry.last[0].Path);
  ok(listed, 'the new module appears on the selection screen');

  // 2. Launch it from the list (same link a player taps).
  const href = await p.evaluate((pth) => { const a = Array.from(document.querySelectorAll('a[href]')).find(x => decodeURIComponent(x.getAttribute('href')).includes(pth)); return a && a.getAttribute('href'); }, entry.last[0].Path);
  await p.goto(new URL(href, p.url()).href); await p.waitForTimeout(8000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  for (let k = 0; k < 6 && !(await p.locator('.Input.LineInput').count()); k++) { await p.keyboard.press('Space'); await p.waitForTimeout(900); }
  const send = async (c) => { const li = p.locator('.Input.LineInput'); if (await li.count()) { await li.fill(c); await li.press('Enter'); } await p.waitForTimeout(1800); };
  // Answer the story's own opening question (Adventure asks about instructions).
  if (await p.evaluate(() => /would you like instructions\?\s*>?\s*$/i.test((document.querySelector('.BufferWindow') || {}).innerText.trim()))) await send('no');
  console.log('SCREEN:', await p.evaluate(() => (document.querySelector('.BufferWindow') || {}).innerText.slice(-200).replace(/\s+/g, ' ')));
  await send('look');
  const s1 = await p.evaluate(() => { const pl = WorldModel.lastPayload || {};
    return { engine: pl.engineMode, room: pl.roomName, roomId: pl.roomId, exits: (pl.exits || []).map(e => e.label), objects: (pl.discoveredObjects || []).map(o => o.name).slice(0, 12),
      marks: Array.from(document.querySelectorAll('#windowport .BufferWindow .pl-act:not(.is-stale)')).map(e => e.textContent.trim()).slice(0, 12),
      identity: (ModuleLibrary.currentExecutableIdentity() || {}).sourcePath }; });
  ok(s1.engine === 'structural' && s1.roomId != null && s1.room, 'RAM detection resolves the room: ' + JSON.stringify({ engine: s1.engine, room: s1.room, id: s1.roomId, src: s1.identity }));
  ok(s1.exits.length > 0, 'exits detected: ' + JSON.stringify(s1.exits));
  ok(s1.marks.length > 0, 'objects underlined in the text: ' + JSON.stringify(s1.marks));
  // Move and check the map learns rooms.
  const dir = (s1.exits.find(e => /^(north|south|east|west|in|out|up|down|n|s|e|w)$/i.test(e)) || s1.exits[0] || 'north');
  await send(dir); await send('look');
  const s2 = await p.evaluate(() => ({ room: (WorldModel.lastPayload || {}).roomName, rooms: (ParchLockMap.Rooms || []).map(r => r.Name) }));
  ok(s2.rooms.length >= 2, 'map records rooms after moving ' + dir + ': ' + JSON.stringify(s2.rooms));
  // An object's radial actions (back where the objects are).
  if (!(await p.evaluate(() => Actionable.payloadPool().length))) { await send('south'); await send('look'); }
  const acts = await p.evaluate(() => { const o = Actionable.payloadPool()[0]; return o ? { name: o.name, cmds: Actionable.resolveObjectCommands(o.id, 'room', { allowAmbiguousReference: true }).map(c => c.command) } : null; });
  ok(acts && acts.cmds.length > 0, 'object radial has actions: ' + JSON.stringify(acts));
  // Status: Equipment open asks the story for its score, headlessly.
  const lines0 = await p.evaluate(() => document.querySelectorAll('#windowport .BufferWindow .BufferLine').length);
  await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(900);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); }); await p.waitForTimeout(8000);
  const st = await p.evaluate((lines0) => { const m = StatTracker.model(); const v = k => m.stats[k] ? m.stats[k].value + (m.stats[k].max != null ? '/' + m.stats[k].max : '') : null;
    const added = Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine')).slice(lines0);
    const shown = added.filter(l => { const r = l.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(l).clip === 'auto' && l.textContent.trim() && !/^>\s*$/.test(l.textContent.trim()); }).map(l => l.textContent.trim().slice(0, 80));
    return { score: v('score'), turns: v('turns'), rank: m.rank || null, shown }; }, lines0);
  ok(st.score != null, 'score detected after opening Equipment: ' + JSON.stringify(st));
  ok(st.shown.length === 0, 'status check stayed headless (nothing shown)');
  out.forEach(l => console.log(l));
  const fail = out.filter(l => l.startsWith('FAIL')).length;
  console.log(`${out.length - fail} PASS / ${fail} FAIL (width ${width})`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
