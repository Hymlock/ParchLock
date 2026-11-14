// Map-versus-engine exit audit (plan section 11 item 10): in each of the 20 Showcase adventures, walk up to STEPS rooms
// by the engine's own exits and compare, at every top-level prompt, the engine's "Obvious exits" (the host's world
// snapshot) with the exits ParchLock's map holds for the current room (Exits plus ExitMeta), and the map's current room
// with the engine's room. Prints every mismatch. Usage: node map-audit.cjs <repo> <package.eamon> <out-dir>
// The package's digest must be trusted by the repo's js/EamonPackage.js. A fresh browser profile is used.
const http = require('http'), fs = require('fs'), path = require('path');
const [repoArg, pkg, out] = process.argv.slice(2); const repo = path.resolve(repoArg);
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
const STEPS = +(process.env.STEPS || 8), ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = path.join(repo, p);
  if (!f.startsWith(repo) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const log = []; const note = (s) => { log.push(s); console.log(s); };
const save = () => fs.writeFileSync(path.join(out, 'map-audit.txt'), log.join('\n'));
const PORT = +(process.env.PORT || 8954), base = 'http://127.0.0.1:' + PORT;
const CANON = { north: 'n', south: 's', east: 'e', west: 'w', up: 'u', down: 'd', northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw' };
const canon = (d) => { d = String(d || '').toLowerCase().replace(/[^a-z]/g, ''); return CANON[d] || d; };
(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const ctx = await chromium.launchPersistentContext(path.join(out, 'profile'), { headless: true, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialLibrarySeen', '1'); localStorage.setItem('PL_TutorialSeen', '1'); } catch (e) {} });
  const page = ctx.pages()[0] || await ctx.newPage(); page.on('dialog', d => d.accept().catch(() => {}));
  if (process.env.CONSOLE) { const grab = (m) => { const t = m.text(); if (new RegExp(process.env.CONSOLE).test(t)) note('CONSOLE ' + t.slice(0, 1500)); }; page.on('console', grab); page.on('worker', w => w.on('console', grab)); }
  await page.goto(base + '/index.html'); await page.waitForFunction(() => typeof ModuleLibrary !== 'undefined');
  await page.evaluate(() => ModuleLibrary.openManager());
  await page.locator('#pl-module-files').setInputFiles(pkg);
  await page.waitForFunction(() => /added|already present/.test((document.querySelector('#pl-module-results') || {}).innerText || ''), null, { timeout: 180000 });
  const story = await page.evaluate(() => ModuleLibrary.all().filter(g => g.Format === 'eamon')[0].Path);
  await page.goto(base + '/play.html?story=' + story);
  const tail = () => page.evaluate(() => { const t = (document.querySelector('#windowport .BufferWindow') || { innerText: '' }).innerText.replace(/ /g, ' ').replace(/\s+$/, ''); return t.slice(t.lastIndexOf('\n') + 1); });
  const screen = () => page.evaluate(() => (document.querySelector('#windowport .BufferWindow') || { innerText: '' }).innerText.replace(/ /g, ' '));
  const send = async (s) => { await page.waitForSelector('.Input.LineInput, .Input.CharInput', { timeout: 15000 }).catch(() => {}); const line = page.locator('.Input.LineInput'); if (await line.count()) { await line.click(); await page.keyboard.type(s); await page.keyboard.press('Enter'); } else { await page.locator('.Input.CharInput').click().catch(() => {}); await page.keyboard.press(s.length === 1 ? s : 'Space'); } };
  const closeDialogs = async () => { for (let i = 0; i < 3; i++) { if (!(await page.evaluate(() => typeof Message !== 'undefined' && Message.IsOpen))) return; await page.keyboard.press('Escape'); await page.waitForTimeout(300); } };
  // CONTROLS=1: at every key prompt, the underlined keys and the radial's prompt-key entries must equal the prompt's
  // own keys (owner rule, plan section 2a). Each distinct prompt line is checked once per adventure.
  const CONTROLS = !!process.env.CONTROLS; let ctrlWhere = 'Hall', ctrlSeen = {}, ctrlBad = 0, ctrlChecked = 0;
  const ctrlNote = (msg) => { ctrlBad++; note('CTRL-MISMATCH ' + ctrlWhere + ' | ' + msg); };
  const promptState = () => page.evaluate(() => {
    const keys = (typeof EamonProvider !== 'undefined' ? EamonProvider.promptChoicesFromText(EamonProvider.latestPromptText()) : []).map(c => String(c.key).toUpperCase());
    const under = [...document.querySelectorAll('span.pl-act[data-kind="prompt-key"]:not(.is-stale)')].filter(e => e.offsetParent).map(e => e.textContent.trim().toUpperCase());
    const radial = (((WorldModel.lastPayload || {}).exits) || []).filter(e => e.promptKey).map(e => String(e.command).toUpperCase());
    const keySet = new Set(keys);
    // (b) Grok #3532: another live underline wired to one of the keys (a phrase that sends "D") is not allowed.
    const wired = [...document.querySelectorAll('span.pl-act:not(.is-stale)')].filter(e => e.offsetParent && e.dataset.kind !== 'prompt-key'
      && keySet.has(String(e.dataset.command || '').trim().toUpperCase()) && e.textContent.trim().toUpperCase() !== String(e.dataset.command).trim().toUpperCase()).map(e => e.textContent.trim() + '>' + e.dataset.command);
    // (a) Grok #3532: at a Hall menu (a room), each menu key is an exit on the radial, the compass and the map.
    const exitCmds = (((WorldModel.lastPayload || {}).exits) || []).map(e => String(e.command || e.label).toUpperCase());
    const slices = (typeof DirectionalRadial !== 'undefined' && DirectionalRadial.GetSlices ? DirectionalRadial.GetSlices() : []).map(x => String(x.command || x.Command || x.label || '').toUpperCase());
    const cur = ParchLockMap.GetCurrentRoom ? ParchLockMap.GetCurrentRoom() : null;
    const mapCmds = cur ? Object.keys(Object.assign({}, cur.Exits || {}, cur.ExitMeta || {})).map(k => { const m = (cur.ExitMeta || {})[k]; return String((m && m.command) || k).toUpperCase(); }) : [];
    return { keys: [...keySet].sort(), under: [...new Set(under)].sort(), radial: [...new Set(radial)].sort(), top: !!window.__PARCHLOCK_EAMON__.state.atTopLevel,
      wired, exitCmds, slices, mapCmds, mapRoom: cur ? cur.Name : null,
      dbgExits: (((WorldModel.lastPayload || {}).exits) || []).map(e => e.label + '>' + e.command + (e.keyExit ? 'K' : '') + (e.isNonCardinal ? 'N' : '')), dbgProv: (typeof EamonProvider !== 'undefined' ? (EamonProvider.collect().exits || []) : []).map(e => e.label + '>' + e.command + (e.keyExit ? 'K' : '')), dbgMap: cur ? [Object.keys(cur.Exits || {}), JSON.stringify(cur.ExitMeta || {}).slice(0, 600)] : null };
  });
  const checkPrompt = async (t) => {
    if (!CONTROLS || /^>\s*$/.test(t)) return;
    const k = ctrlWhere + '|' + t.trim().slice(-60); if (ctrlSeen[k]) return; ctrlSeen[k] = 1;
    let st = await promptState();
    if (!st.keys.length) return;
    const same = (x) => JSON.stringify(st.keys) === JSON.stringify(x);
    if (!same(st.under) || (!st.top && !same(st.radial))) { await page.waitForTimeout(1200); st = await promptState(); }
    ctrlChecked++;
    if (!same(st.under)) ctrlNote('prompt ' + JSON.stringify(t.trim().slice(-60)) + ': keys ' + JSON.stringify(st.keys) + ' underlined ' + JSON.stringify(st.under));
    // At a Hall safe point the keys are the room's own exits (section 2), not prompt-key radial entries.
    if (!st.top && !same(st.radial)) ctrlNote('prompt ' + JSON.stringify(t.trim().slice(-60)) + ': keys ' + JSON.stringify(st.keys) + ' radial ' + JSON.stringify(st.radial));
    if (st.wired.length) ctrlNote('prompt ' + JSON.stringify(t.trim().slice(-60)) + ': phrases wired to a key ' + JSON.stringify(st.wired.slice(0, 6)));
    if (st.top) {
      const miss = (list) => st.keys.filter(k => list.indexOf(k) < 0);
      const r = miss(st.exitCmds), c = miss(st.slices), m = miss(st.mapCmds);
      if (process.env.DEBUG) note('  dbg exits ' + JSON.stringify(st.dbgExits) + ' provider ' + JSON.stringify(st.dbgProv) + ' map ' + JSON.stringify(st.dbgMap));
      note('  hall menu ' + JSON.stringify(t.trim().slice(-30)) + ' in ' + JSON.stringify(st.mapRoom) + ': keys ' + JSON.stringify(st.keys) + ' radial-exits ' + JSON.stringify(st.exitCmds) + ' compass ' + JSON.stringify(st.slices) + ' map ' + JSON.stringify(st.mapCmds));
      if (r.length || c.length || m.length) ctrlNote('hall menu ' + JSON.stringify(t.trim().slice(-30)) + ' in ' + JSON.stringify(st.mapRoom) + ': missing from radial ' + JSON.stringify(r) + ', compass ' + JSON.stringify(c) + ', map ' + JSON.stringify(m));
    }
  };
  // Answers every Hall and intro question until the wanted prompt; returns its tail, or null.
  const toPrompt = async (want, extra) => {
    for (let i = 0; i < 70; i++) {
      await page.waitForTimeout(700); await closeDialogs(); const t = await tail();
      if (want.test(t)) return t;
      await checkPrompt(t);
      if (extra && await extra(t)) continue;
      if (/Press any key/i.test(t)) await send(' ');
      else if (/D for desk/.test(t)) await send('D');
      else if (/type it in now/.test(t)) await send('MapHero');
      else if (/Y for yes or N for no/.test(t)) await send('Y');
      else if (/0=Male/.test(t)) await send('0');
      else if (/commit suicide/.test(t)) await send('N');
      else if (/R to read/.test(t)) await send('T');
      else if (/introduction story|read the introduction/i.test(t)) await send('N');
      else if (/\(G\/A\/N\)/.test(t)) await send('N');
    }
    return null;
  };
  if (!await toPrompt(/\[X\]:$/)) throw new Error('no Main Hall: ' + await tail());
  // The character's ParchLock id (PLCHARS) is minted when the adventure list is first shown: open it once.
  await send('1'); await toPrompt(/Enter the selection|X to exit:?$/);
  if (!await toPrompt(/\[X\]:$/, async (t) => { if (/X to exit:?$/.test(t)) { await send('X'); return true; } return false; })) throw new Error('no Main Hall after the list: ' + JSON.stringify((await screen()).slice(-500)));
  await page.waitForTimeout(1500);
  // Some adventures turn away a character without a weapon (The Beginner's Cave's Knight Marshal): buy a sword first,
  // the way hall-create-character.json does.
  { const used = {}; await send('2');
    const shop = async (t) => {
      const pick = (k, seq) => { used[k] = (used[k] || 0) + 1; return seq[Math.min(used[k], seq.length) - 1]; };
      if (/B=Buy weapon/.test(t)) { await send(pick('b', ['B', 'X'])); return true; }
      if (/5=Sword/.test(t)) { await send(pick('s', ['5', 'X'])); return true; }
      if (/G=Good quality/.test(t)) { await send('G'); return true; }
      if (/1=Leather/.test(t)) { await send('X'); return true; }
      if (/X to exit:?$|\(Y\/N\)/.test(t)) { await send(/\(Y\/N\)/.test(t) ? 'Y' : 'X'); return true; }
      return false;
    };
    if (!await toPrompt(/\[X\]:$/, shop)) throw new Error('no Main Hall after the shop: ' + JSON.stringify((await screen()).slice(-400)));
    note('weapon: ' + JSON.stringify(await page.evaluate(() => (document.querySelector('#windowport .BufferWindow').innerText.match(/[^\n]*(sword|weapon)[^\n]*/gi) || []).slice(-3))));
  }
  const freshHall = await page.evaluate(() => window.__PARCHLOCK_EAMON__.exportCampaign());
  const seed = fs.readFileSync(path.join(repo, 'modules/eamon-showcase/probes/contracts/seed-all-open.js'), 'utf8');
  note('seed: ' + JSON.stringify(await page.evaluate(seed)));
  await page.waitForTimeout(4000);
  if (!await toPrompt(/\[X\]:$/)) throw new Error('no Main Hall after the seed');
  const hall = await page.evaluate(() => window.__PARCHLOCK_EAMON__.exportCampaign());
  // The adventure list is paged ("Press any key to continue or X to exit") and ends at "Enter the selection".
  const SHOWCASE = ["The Beginner's Cave","The Wayfarers Inn","Beginner's Forest","Beginner's Cave II","Alternate Beginner's Cave","The Training Ground","The Deep Canyon","The Pyramid of Anharos","Land of the Mountain King","The Tower of Eamon","DharmaQuest","Wrenhold's Secret Vigil","Firestorm","Escape from Mt. Moon","The Sub-Aquan Laboratory","Orb of My Life","The Temple of Ngurct","Stronghold of Kahr-Dur","A Runcible Cargo","The Vile Grimoire of Jaldi'al"];
  const sel = {};
  const toSelection = async () => {
    for (let pg = 0; pg < 10; pg++) {
      const t = await toPrompt(/Enter the selection|Press any key to continue or X to exit/);
      if (!t) return false;
      for (const l of (await screen()).split(/\n/)) { const m = /^ +(\d+)\. (.+?)\s*$/.exec(l); if (m && SHOWCASE.indexOf(m[2]) >= 0) sel[m[2]] = m[1]; }
      if (/Enter the selection/.test(t)) return true;
      await send(' ');
    }
    return false;
  };
  await send('1');
  if (!await toSelection()) throw new Error('no adventure selection prompt: ' + JSON.stringify((await screen()).slice(-400)));
  note('adventure list (' + Object.keys(sel).length + '): ' + JSON.stringify(sel));
  const names = Object.keys(sel).filter(n => !ONLY || ONLY.test(n));
  let first = true, mismatches = 0, checked = 0;
  const BEGINNER = /^(The Beginner's Cave|Alternate Beginner's Cave)$/;   // refused once outgrown (the seeded clears)
  for (const name of names) {
    if (!first || BEGINNER.test(name)) {
      await page.evaluate(async (c) => { const vm = window.__PARCHLOCK_EAMON__, now = await vm.exportCampaign(); c = Object.assign({}, c, { revision: (now.revision || 0) + 1 }); return vm.importCampaign(c); }, BEGINNER.test(name) ? freshHall : hall); await page.waitForTimeout(500); await page.reload();
      if (!await toPrompt(/\[X\]:$/)) { note(name + ': no Main Hall after reset'); continue; }
      if (process.env.DEBUG) note('  reset ' + (BEGINNER.test(name) ? 'fresh' : 'seeded') + ': clears file ' + await page.evaluate(async () => { const c = await window.__PARCHLOCK_EAMON__.exportCampaign(); const f = c.files.find(x => /PLCLEARS/.test(x.path)); return f ? (f.deleted ? 'deleted' : atob(f.data).slice(0, 80)) : 'none'; }) + '; fresh export had ' + freshHall.files.filter(x => /PLCLEARS/.test(x.path)).length);
      await send('1'); if (!await toSelection()) { note(name + ': no adventure list'); continue; }
    }
    first = false;
    ctrlWhere = name;
    await send(sel[name]);
    let mature = false;
    const at = await toPrompt(/^>\s*$/, async (t) => false);
    if (!at) { note(name + ': never reached the command line (sent ' + sel[name] + '); screen ' + JSON.stringify((await screen()).slice(-2600, -900))); continue; }
    if (/Wayfarers/.test(name)) { await send('set maturecontent true'); await toPrompt(/^>\s*$/); mature = true; }
    // PRE="cmd|cmd|..." runs first (each sent as soon as any input is waiting), then the map is printed (diagnostics).
    if (process.env.PRE) {
      const mapNow = () => page.evaluate(() => ({ cur: ParchLockMap.CurrentRoom, rooms: (ParchLockMap.Rooms || []).filter(r => r && r.Name).map(r => r.Name + ' {' + Object.keys(r.Exits || {}).map(k => k + '>' + (((ParchLockMap.Rooms || []).find(x => x.Id === r.Exits[k]) || {}).Name || r.Exits[k])).join(', ') + '}') }));
      note('  map before PRE: ' + JSON.stringify(await mapNow()));
      const inspect = async () => {
        const st = await page.evaluate(() => ({ slices: (typeof DirectionalRadial !== 'undefined' && DirectionalRadial.GetSlices ? DirectionalRadial.GetSlices() : []).map(x => (x.label || x.Label || x.dir) + '>' + (x.command || x.Command || '')), radial: (ParchLockQol.GetRadialCommands() || []).filter(c => c.source === 'ram-exit').map(c => c.Label + '>' + c.Command + (c.PromptKey ? '*' : '')) }));
        note('  INSPECT compass slices ' + JSON.stringify(st.slices) + ' radial exits ' + JSON.stringify(st.radial));
        const before = await tail();
        const r = await page.evaluate(() => ({ down: Actionable.Submit('down'), east: Actionable.Submit('east'), n: Actionable.Submit('n') }));
        await page.waitForTimeout(1500); note('  compass-path Submit at the prompt: ' + JSON.stringify(r) + ' prompt unchanged=' + ((await tail()) === before));
        await page.evaluate(() => { const el = document.querySelector('.Input.CharInput, .Input.LineInput') || document.body; const b = el.getBoundingClientRect(); ParchLockQol.OpenRadial(b.left + 20, b.top + 10, ParchLockQol.GetRadialCommands(), { source: 'input' }); });
        await page.waitForTimeout(800);
        await page.locator('#radial-menu button.radial-command[title="N"]').first().click();
        await page.waitForTimeout(2000); note('  real click on radial N -> ' + JSON.stringify((await tail()).slice(-40)) + ' room ' + JSON.stringify(await page.evaluate(() => window.__PARCHLOCK_EAMON__.state.world && window.__PARCHLOCK_EAMON__.state.world.room.name)));
      };
      for (const c of process.env.PRE.split('|')) { if (c === '@inspect') { await inspect(); continue; } await send(c); await page.waitForTimeout(2500); note('  sent ' + JSON.stringify(c) + ' -> ' + JSON.stringify((await tail()).slice(-60))); }
      await toPrompt(/^>\s*$/); await page.waitForTimeout(2000);
      note('  map after PRE: ' + JSON.stringify(await mapNow()) + ' engine room ' + JSON.stringify(await page.evaluate(() => { const w = window.__PARCHLOCK_EAMON__.state.world; return w && [w.room.name, (w.exits || []).map(e => e.label)]; })));
    }
    // STATUSCHECK=1 (plan section 11 item 11): the status card's engine values against the game's own STATUS, typed for
    // real at the first room. Where the game has no STATUS, the card must show no more than health.
    if (process.env.STATUSCHECK) {
      await page.waitForTimeout(1200);
      const st = await page.evaluate(() => (window.__PARCHLOCK_EAMON__.state.world || {}).status || null);
      await send('status'); await page.waitForTimeout(2500);
      for (let k = 0; k < 4; k++) { const t = await tail(); if (/Press any key/i.test(t)) { await send(' '); await page.waitForTimeout(800); } else break; }
      const scr = await screen();
      const out = scr.slice(scr.toLowerCase().lastIndexOf('> status'));
      const diffs = [];
      const num = (re) => { const m = re.exec(out); return m ? Number(m[1]) : null; };
      if (!st) diffs.push('no status in the snapshot');
      else if (st.profile === 'health-percent') {
        const p = num(/You are at (\d+) percent health/i);
        if (p !== st.healthPct) diffs.push('health% card ' + st.healthPct + ' game ' + p);
      } else if (st.profile === 'health-only') {
        if (/Weapon Abilities|Intellect:/i.test(out)) diffs.push('game printed STATUS but card is health-only');
        note('  ' + name + ': STATUS not available to the player; card shows health only. Game said: ' + JSON.stringify(out.slice(0, 120)));
      } else {
        const want = { intellect: num(/Intellect:\s*(\d+)/), charisma: num(/Charisma:\s*(\d+)/), gold: num(/Gold:\s*(-?\d+)/), bank: num(/In bank:\s*(-?\d+)/),
          hardiness: num(/Hardiness:\s*(\d+)/), agility: num(/Agility\s*:\s*(\d+)/) };
        const dmg = /Damage Taken:\s*(\d+)\/(\d+)/.exec(out);
        if (dmg) { want.damageTaken = +dmg[1]; want.maxHealth = +dmg[2]; }
        const w = /Weight carried:\s*(\d+)\/(\d+)/.exec(out); if (w) { want.weight = +w[1]; want.weightMax = +w[2]; }
        Object.keys(want).forEach(k => { if (want[k] != null && st[k] !== want[k]) diffs.push(k + ' card ' + st[k] + ' game ' + want[k]); });
        (st.weapons || []).forEach(x => { const g = num(new RegExp(x.name + '\\s*:\\s*(-?\\d+)%')); if (g != null && g !== x.pct) diffs.push(x.name + ' card ' + x.pct + ' game ' + g); });
        if (!(st.weapons || []).length && /Weapon Abilities/.test(out)) diffs.push('game shows weapon skills, card does not');
        if ((st.weapons || []).length && !/Weapon Abilities/.test(out)) diffs.push('card shows weapon skills, game does not');
        if ((st.spells || []).length && !/Spell Abilities/.test(out)) diffs.push('card shows spells, game does not');
      }
      note('  STATUS ' + name + ' profile ' + (st && st.profile) + ': ' + (diffs.length ? 'MISMATCH ' + JSON.stringify(diffs) : 'matches'));
      if (diffs.length) { ctrlBad++; mismatches++; }
      await toPrompt(/^>\s*$/);
    }
    const taken = {}; let rooms = 0, bad = 0;
    for (let step = 0; step <= STEPS; step++) {
      await page.waitForTimeout(1500);
      const s = await page.evaluate(() => {
        const w = window.__PARCHLOCK_EAMON__.state.world; if (!w || !w.room) return null;
        const cur = ParchLockMap.GetCurrentRoom ? ParchLockMap.GetCurrentRoom() : null;
        const mapDirs = cur ? Object.keys(Object.assign({}, cur.Exits || {}, cur.ExitMeta || {})).filter(k => (cur.Exits && cur.Exits[k] != null) || (cur.ExitMeta && cur.ExitMeta[k])) : null;
        return { dbg: { n: (ParchLockMap.Rooms || []).length, rooms: (ParchLockMap.Rooms || []).slice(0, 4).map(r => [r.Id, r.Name, Object.keys(r.Exits || {}), Object.keys(r.ExitMeta || {})]), cur: ParchLockMap.CurrentRoom, payloadRoom: WorldModel.lastPayload && WorldModel.lastPayload.roomId, payloadExits: ((WorldModel.lastPayload || {}).exits || []).map(e => e.label) }, id: w.room.id, room: w.room.name, lit: w.room.lit, engine: (w.exits || []).map(e => ({ label: e.label, command: e.command })), mapId: cur ? cur.ObjectId : null, mapRoom: cur ? cur.Name : null, mapDirs };
      });
      if (!s) { note(name + ': no world snapshot at step ' + step + '; state ' + JSON.stringify(await page.evaluate(() => { const st = window.__PARCHLOCK_EAMON__.state; return { phase: st.phase, top: st.atTopLevel, world: st.world, gen: st.worldGeneration }; })) + '; screen ' + JSON.stringify((await screen()).slice(-700))); break; }
      rooms++; checked++;
      const eng = s.engine.map(e => canon(e.label)).sort(), mp = (s.mapDirs || []).map(canon).sort();
      const sameRoom = !!s.mapRoom && String(s.mapRoom).toLowerCase() === String(s.room).toLowerCase();
      if (!sameRoom || JSON.stringify(eng) !== JSON.stringify(mp)) {
        bad++; mismatches++;
        note('MISMATCH ' + name + ' | ' + s.room + ' (' + s.id + ', lit ' + s.lit + ') | engine ' + JSON.stringify(eng) + ' | map ' + JSON.stringify(mp) + (sameRoom ? '' : ' | map room ' + JSON.stringify(s.mapRoom) + ' (' + s.mapId + ')') + (process.env.DEBUG ? ' | ' + JSON.stringify(s.dbg) : ''));
      }
      if (CONTROLS) {
        const c = await page.evaluate(() => {
          const w = window.__PARCHLOCK_EAMON__.state.world;
          const ids = new Set([].concat(w.objects || [], w.inventory || []).map(o => String(o.id)));
          const lines = [...document.querySelectorAll('#windowport .BufferLine')];
          const live = [...document.querySelectorAll('span.pl-act:not(.is-stale)')].filter(e => e.offsetParent);
          return {
            slices: (typeof DirectionalRadial !== 'undefined' && DirectionalRadial.GetSlices ? DirectionalRadial.GetSlices() : []).map(x => String(x.label || x.Label || x.dir || '')),
            dirs: live.filter(e => e.dataset.kind === 'direction').map(e => e.textContent.trim()),
            orphans: live.filter(e => (e.dataset.kind === 'object' || e.dataset.kind === 'inventory') && e.dataset.objectId && !ids.has(String(e.dataset.objectId))).map(e => e.textContent.trim() + '#' + e.dataset.objectId),
            objects: live.filter(e => e.dataset.kind === 'object' && e.dataset.objectId).map(e => e.textContent.trim())
          };
        });
        ctrlChecked++;
        const sl = [...new Set(c.slices.map(canon))].sort();
        if (JSON.stringify(sl) !== JSON.stringify(eng)) ctrlNote(s.room + ': compass ' + JSON.stringify(sl) + ' engine ' + JSON.stringify(eng));
        const badDirs = [...new Set(c.dirs.map(canon))].filter(d => eng.indexOf(d) < 0);
        if (badDirs.length) ctrlNote(s.room + ': underlined directions not exits ' + JSON.stringify(badDirs));
        if (c.orphans.length) ctrlNote(s.room + ': object underlines with no engine object ' + JSON.stringify(c.orphans.slice(0, 6)));
        // One real right-click per adventure, on the last object underline: the radial must offer actions for it.
        if (step === 0 && c.objects.length) {
          const el = page.locator('span.pl-act[data-kind="object"]:not(.is-stale)').last();
          const box = await el.boundingBox().catch(() => null);
          if (box) {
            await el.click({ button: 'right' });   // desktop: a real right-click opens an underline's radial (the phone's long press is touch)
            await page.waitForTimeout(700);
            const items = await page.evaluate(() => [...document.querySelectorAll('#radial-menu button.radial-command')].filter(e => e.offsetParent).map(e => e.title));
            note('  radial on ' + JSON.stringify(c.objects[c.objects.length - 1]) + ': ' + JSON.stringify(items.slice(0, 10)));
            if (!items.length) ctrlNote(s.room + ': right-click on ' + JSON.stringify(c.objects[c.objects.length - 1]) + ' opened no radial');
            await page.keyboard.press('Escape'); await page.waitForTimeout(400);
            if (!/^>\s*$/.test(await tail())) await toPrompt(/^>\s*$/);
          }
        }
      }
      if (step === STEPS) break;
      const next = s.engine.find(e => !taken[s.id + '|' + e.label]) || s.engine[step % Math.max(1, s.engine.length)];
      if (!next) break;
      taken[s.id + '|' + next.label] = true;
      await send(next.command);
      if (!await toPrompt(/^>\s*$/, async (t) => { if (/Leave this adventure/i.test(t)) { await send('N'); return true; } return false; })) { note(name + ': left the command line after "' + next.command + '": ' + JSON.stringify((await tail()).slice(-80))); break; }
    }
    note(name + ': ' + rooms + ' rooms checked, ' + bad + ' mismatches' + (mature ? ' (opted into mature content as the author requires)' : ''));
    save();
  }
  note('TOTAL: ' + checked + ' room checks, ' + mismatches + ' mismatches' + (CONTROLS ? '; controls: ' + ctrlChecked + ' checks, ' + ctrlBad + ' mismatches' : ''));
  save(); await ctx.close(); server.close();
})().catch(e => { note('ERROR ' + e.message.split('\n').slice(0, 6).join(' / ')); save(); server.close(); process.exit(1); });
