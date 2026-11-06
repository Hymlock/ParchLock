// Claude batch D204 live verification: real catalog module, real automatic
// Equipment fulfillment (first open + reopen), no injected readings.
// Usage: node harness/status-claude-batch-live.js FILE.js [--mobile] [--debug]
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');
for (const f of ['js/ModuleStatFacts.js', 'js/ModuleStatFactsClaude.js'])
 new (require('vm').Script)(fs.readFileSync(path.resolve(f), 'utf8'), { filename: f });

// Expected current readings come from the module's own live replies/grid.
// `absent` lists stats that must NOT appear (invented or rejected readings).
const SPECS = {
 'LLR3.z8.js': { stats: { experience: { max: 50 }, level: {}, strength: {} }, absent: ['health', 'score'], never: ['diagnose'] },
 'RoTA.zblorb.js': { stats: { experience: { max: 50 }, level: {}, strength: {} }, absent: ['health', 'score'], never: ['diagnose'] },
 'loose.z5.js': { intro: ['@advance-space'], stats: { score: { max: 50 }, turns: { grid: true } }, rank: /spider who invited itself to dinner with Miss Muffet/ },
 'LostPig.z8.js': { stats: { score: { value: 0, max: 7 } } },
 'mindelec.z5.js': { intro: ['@advance-space'], stats: { score: { max: 40 }, health: { value: 'normal' } } },
 'omniquest.z5.js': { stats: { score: { max: 50 }, health: {}, turns: { grid: true } }, rank: /^brain-dead adventurer$/ },
 'Photograph.zblorb.js': { stats: { jack: { value: 1 }, life: { value: 0 } }, absent: ['score'] },
 'rameses.zblorb.js': { intro: ['@advance-space', 'look'], stats: { turns: {} }, never: ['score'] },
 'ribbons.z5.js': { stats: { progress: { value: 1 } }, rank: /^Accidental Patron$/ },
 'Savoir-Faire.zblorb.js': { stats: { score: { max: 125 }, hunger: {}, turns: { grid: true } }, rank: /^fumbling peasant$/ },
 'sgate.z5.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'spirit.z5.js': { stats: { score: { max: 250 }, turns: { grid: true } }, rank: /^Non-believer$/, absent: ['health'], never: ['diagnose'] },
 'suvehnux.z5.js': { intro: ['@advance-space'], stats: { turns: {}, progress: { value: 0 } } },
 'sycamora.z5.js': { intro: ['@advance-space'], stats: { score: { max: 3 }, health: {}, turns: { grid: true } }, rank: /^Roxette$/ },
 'thegreat.z5.js': { stats: { turns: {}, progress: {} }, absent: ['score'] },
 'Vacation.z5.js': { stats: { score: { max: 100 }, health: {} }, rank: /^first time player$/ },
 'vision.z5.js': { intro: ['@advance-space'], stats: { turns: { grid: true } } },
 'windhal1.z8.js': { intro: ['no'], width: 1920, stats: { score: { value: 0, max: 200 }, health: {}, hunger: {}, sleep: {}, time: { pattern: /^\d{1,2}:\d{2}\s*[ap]m$/i, optionalBelow: 1920 } }, rank: /^an Apprentice$/ },
 'wireless.z5.js': { stats: { score: { max: 0 } } },
 // Prior-checked rows (review): current fields asserted against live replies.
 'yagwad.z5.js': { intro: ['@advance-space', 'yes', 'yes'], stats: { score: { value: 10 }, turns: { grid: true } }, never: ['score'] },
 'I-0.z5.js': { stats: { score: {}, health: {}, turns: { grid: true } } },
 'library.z5.js': { intro: ['@advance-space'], stats: { score: {}, turns: { grid: true } }, never: ['score'] },
 'Mask.z5.js': { stats: { score: { max: 14 }, turns: { grid: true } } },
 'SpAdventure.z5.js': { stats: { score: { max: 350 } }, rank: /^Adventurer$/ },
 'Heroine.z8.js': { intro: ['@advance-space'], stats: { score: { max: 400 }, date: { value: 'Eight years before 2001' } }, rank: /^schoolgirl$/ },
 'Enemies.z8.js': { stats: { score: { max: 100 }, turns: { grid: true } }, rank: /top accountants/ },
 'heist.z8.js': { intro: ['@advance-space'], stats: { score: { max: 200 }, turns: { grid: true } }, rank: /^innocent young woman$/ },
 'sporkery1.z5.js': { stats: { score: { max: 180 } }, rank: /^Unworthy of sporkish divinity$/ },
 'Balances.z5.js': { stats: { score: { max: 51 }, health: { value: 'fine' }, memory: { value: 'unimpaired' } }, rank: /^lost dreamer$/ },
 'Jigsaw.z8.js': { intro: ['@advance-space'], stats: { score: { max: 100 }, time: {} }, rank: /^wet blanket$/ },
 'GreatXavio.z5.js': { stats: { score: { max: 101 } } },
 'b2demo.z5.js': { intro: ['@advance-space'], stats: { score: {}, health: { value: 'healthy' }, turns: { grid: true } } },
 'saveprinceton.z8.js': { intro: ['no'], stats: { score: { max: 200 } }, rank: /^Harvard reject$/ },
 'lambs2.z5.js': { intro: ['y', 'n'], stats: { score: {} } },
 'LDoDoom.z5.js': { intro: ['no'], stats: {}, absent: ['score'], noScore: true },
 'guess.z5.js': { intro: ['new', 'boy', 'sam'], stats: { health: { value: 'fine' } }, never: ['score'] },
 'claw.z5.js': { intro: ['@advance-space'], stats: { health: { value: 'still alive' }, turns: {} }, absent: ['score'] },
 'bunny.z5.js': { intro: ['@advance-space'], stats: { score: { max: 60 } }, rank: /^Novice Adventurer$/ },
 'parallel.z5.js': { stats: { score: { max: 150 } } },
 'ShadowOfMemories.zblorb.js': { stats: { score: { max: 0 } } },
 'ShadowSoldiers.zblorb.js': { stats: { score: { max: 0 } } },
 'TCOTY.zblorb.js': { stats: { score: { max: 0 } } },
 'deephome.z5.js': { stats: { score: { max: 300 }, health: { value: 'fine' }, turns: { grid: true } }, rank: /^Sorry Excuse for a Reclaimer$/ },
 'Ralph.z5.js': { intro: ['@advance-space'], stats: { score: { max: 30 }, health: {} }, rank: /Ralph, at your service/ },
 'sherbet.z5.js': { intro: ['@advance-space'], stats: { score: { max: 30 }, turns: { grid: true } }, rank: /Embassy Stablehand/ },
 'tatctae.z8.js': { intro: ['@advance-space'], stats: { score: { max: 200 }, turns: { grid: true } }, rank: /^crazy scientist with no brain whatsoever$/ },
 'inhumane.z5.js': { stats: { score: { max: 300 } }, rank: /^Novice Adventurer$/ },
 'TheLurkingHorror.z3.js': { stats: { score: { max: 100 }, health: {}, sleep: {} }, rank: /^Freshman$/ },
 'Zork1-TheGreatUndergroundEmpire.z3.js': { stats: { score: { max: 350 }, health: {} }, rank: /^Beginner$/ },
 'risorg.z8.js': { stats: { score: { max: 50 }, health: {} }, rank: /failed the admission criteria/ },
 'limp.z5.js': { intro: ['@advance-space'], stats: { score: { max: 1 }, turns: { grid: true } } },
 'zenon.z5.js': { stats: { score: { max: 20 }, turns: { grid: true } } },
 'orevore.z8.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'orion.z5.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'Primrose.zblorb.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'Somewhere.z5.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'terror_tabby.z5.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'tirehoax.zblorb.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'Wallpaper.zblorb.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'WiR1.zblorb.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'WiR2.zblorb.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'schooldays.z5.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'selection.z5.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'jet.z8.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'vampire.z8.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'identity.z5.js': { intro: ['@advance-space'], stats: { complete: { value: 0 }, turns: {}, 'time spent': { pattern: /^spacecraft: \d+ turns \(100%\)$/ } }, absent: ['score'] },
 'lambs.z5.js': { intro: ['@advance-space'], stats: { score: { max: 100 }, turns: { grid: true } } },
 'largemac.z5.js': { intro: ['@advance-space'], stats: { quota: { value: 0, max: 50 } }, absent: ['score'] },
 'LASH.z8.js': { intro: ['no', '@advance-space'], stats: { value: { value: 0 }, date: {}, location: { value: 'DISCONNECTED' }, time: {} } },
 'troll.z5.js': { intro: ['@advance-space'], stats: { health: {}, adventurers: { value: 0 }, turns: { grid: true } }, absent: ['score'] },
 'Suspended.z3.js': { intro: ['@advance-space'], stats: { casualties: { value: 3000 }, population: { value: 30172000 }, cycles: {} }, absent: ['score'] },
 'TheWitness.z3.js': { stats: { time: {} }, absent: ['score', 'health'] },
 'anchor.z8.js': { intro: ['@advance-space'], stats: { score: { max: 100 }, day: {}, progress: { value: 'at the threshold of a foreboding mystery' } } },
 'farm.z5.js': { intro: ['y'], stats: { score: { max: 85 } }, rank: /^naughty beginner$/ },
 // ---- Glulx audit (intros per Codex runner) ----
 'ScrollThief.gblorb.js': { intro: ['@key:s'], stats: { score: { value: 0, max: 100 }, act: { value: 1 }, problems: { value: 1 }, time: {}, turns: {} }, rank: /^Inept Burglar$/, never: ['diagnose'] },
 'BlueLacuna.gblorb.js': { intro: ['@key:n', 'man', 'woman', 'art'], stats: { time: { value: 'Night' }, chapter: { value: 1, max: 10 }, regions: { value: 1, max: 22 }, 'first choice': { value: 'art' } } },
 'CosmoServe.gblorb.js': { intro: ['no', '@space'], stats: { 'chance of success': { value: 0 }, time: {} } },
 'RoversDayOut.gblorb.js': { intro: ['@advance-space'], stats: { memory: { pattern: /^[0-9]+[.][0-9]+PB$/ } }, never: ['score', 'diagnose'] },
 'AndromedaApocalypse.gblorb.js': { stats: { achievements: { pattern: /Hell of a Storm.*Gettare Rinors/ } }, absent: ['score'] },
 'CragneManor.gblorb.js': { intro: ['@space', 'yes', 'yes', '@space'], stats: { turns: {} }, absent: ['score'], noScore: true, never: ['diagnose'] },
 'RobinAndOrchid.gblorb.js': { intro: ['@space'], stats: {}, absent: ['score'], noScore: true, never: ['diagnose'] },
 'Alabaster.gblorb.js': { intro: ['yes', '@space', '@advance-space'], stats: {}, absent: ['score'], noScore: true, never: ['diagnose'] },
 'PataNoir.gblorb.js': { stats: { turns: {} }, absent: ['score'], noScore: true, never: ['diagnose'] },
 'Grooverland.gblorb.js': { stats: {}, absent: ['score'], noScore: true, never: ['diagnose'] },
 'chico.z5.js': { intro: ['@space', '@key:1'], stats: {}, absent: ['score'], noScore: true },
 'solitary.z5.js': { intro: [' ', 'look'], stats: { score: { max: 10 }, turns: { grid: true } } },
 'lost.z5.js': { intro: ['@advance-space'], stats: {}, absent: ['score'], noScore: true },
 'amish.z5.js': { noTurnBetween: true, stats: { score: {}, turns: {} }, never: ['inventory', 'score', 'diagnose'] },
 'PUTPBAA.z5.js': { stats: { score: {}, turns: { grid: true } }, never: ['score'] },
 'spacest2.z5.js': { stats: { score: { max: 23 }, day: { value: 1 }, time: { gridLabel: 'Time' }, health: {}, hunger: {}, sleep: {} }, rank: /^Grease Monkey$/ }
};
const file = process.argv[2];
const spec = SPECS[file];
assert(spec, 'no Claude-batch spec for ' + file);
const mobile = process.argv.includes('--mobile');
const debug = process.argv.includes('--debug');

function executableIdentity(filename) {
 const script = fs.readFileSync(path.resolve('games', filename), 'utf8');
 const match = script.match(/processBase64Zcode\s*\(\s*['"]([^'"]+)['"]\s*\)/);
 let bytes = Buffer.from(match[1], 'base64');
 if (bytes.toString('ascii', 0, 4) === 'FORM') {
  for (let offset = 12; offset + 8 <= bytes.length;) {
   const size = bytes.readUInt32BE(offset + 4), end = offset + 8 + size;
   if (['GLUL', 'ZCOD'].includes(bytes.toString('ascii', offset, offset + 4))) { bytes = bytes.subarray(offset + 8, end); break; }
   offset = end + (size % 2);
  }
 }
 return crypto.createHash('sha256').update(bytes).digest('hex');
}

(async () => {
 const browser = await chromium.launch({ headless: true });
 let checks = 0; const failures = []; const evidence = [];
 const check = (ok, label) => { checks++; if (!ok) failures.push(label); };
 try {
  const widthArg = process.argv.find(a => a.startsWith('--width='));
  const width = mobile ? 360 : widthArg ? +widthArg.slice(8) : (spec.width || 1280);
  const page = await browser.newPage({ viewport: { width, height: 850 }, isMobile: mobile, hasTouch: mobile });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + file);
  await page.waitForTimeout(6000);
  await page.evaluate(() => { if (Message.IsOpen) Message.Hide(); window.__subs = []; const o = Actionable.Submit; Actionable.Submit = function (c, s) { window.__subs.push({ command: c, source: s }); return o.apply(this, arguments); }; });
  for (const step of spec.intro || []) {
   if (step === '@advance-space') {
    let n = 0; while (await page.locator('.Input.CharInput').count() === 1 && n < 40) { await page.keyboard.press('Space'); n++; await page.waitForTimeout(150); }
   } else if (step === '@space' || step.startsWith('@key:')) {
    check(await page.locator('.Input.CharInput').count() === 1, 'char prompt before ' + step);
    await page.keyboard.press(step === '@space' ? 'Space' : step.slice(5)); await page.waitForTimeout(1300);
   } else {
    const input = page.locator('.Input.LineInput'); await input.fill(step); await input.press('Enter'); await page.waitForTimeout(1300);
   }
  }
  check(await page.locator('.Input.LineInput').count() === 1, 'line prompt after intro');
  const state = () => page.evaluate(() => ({
   grid: StatTracker.statusText(), stats: StatTracker.visibleStats(), rank: StatTracker.model().rank,
   scoreUnavailable: !!StatTracker.model().scoreUnavailable, fulfillment: StatTracker.model().fulfillment,
   subs: window.__subs.slice(), rows: document.querySelector('#pl-stats-rows')?.innerText || '',
   // Every line produced during fulfillment must be owned (hidden) output.
   visibleProbe: Array.from(document.querySelectorAll('.BufferLine')).slice(window.__mark || 0)
    .filter(l => l.textContent.trim() && !/^>?\s*$/.test(l.textContent.trim()) && !l.closest('.pl-stat-probe, .pl-carry-probe') && !l.querySelector('.pl-stat-probe, .pl-carry-probe'))
    .map(l => l.textContent.trim().slice(0, 120))
  }));
  for (const [i, open] of ['@equipment', '@reopen'].entries()) {
   if (i && !spec.noTurnBetween) { // a real turn between openings
    await page.evaluate(() => EquipmentUI.Hide());
    const input = page.locator('.Input.LineInput'); await input.fill('look'); await input.press('Enter'); await page.waitForTimeout(1300);
   }
   await page.evaluate(r => { window.__mark = document.querySelectorAll('.BufferLine').length; if (r) EquipmentUI.Hide(); EquipmentUI.Show(); }, !!i); await page.waitForTimeout(1200);
   if (await page.evaluate(() => Message.IsOpen)) await page.locator('#message #close').click();
   try { await page.waitForFunction(() => !StatTracker._probeActive && !StatTracker._probeQueue.length && !StatTracker._hideCarryProbe && !StatTracker._carryProbeTimer && StatTracker.model().fulfillment !== 'checking', null, { timeout: 15000 }); } catch (e) { }
   await page.waitForTimeout(500);
   const s = await state(); evidence.push({ open, ...s });
   const tag = open + ' ' + width;
   check(s.fulfillment === 'complete', 'fulfillment complete ' + tag + ' (got ' + s.fulfillment + ')');
   check(await page.locator('.Input.LineInput').isVisible(), 'usable prompt ' + tag);
   check(s.visibleProbe.length === 0, 'probe echoes hidden ' + tag + ' ' + JSON.stringify(s.visibleProbe));
   for (const never of spec.never || []) check(!s.subs.some(x => x.command === never), 'never asks ' + never + ' ' + tag);
   for (const [key, want] of Object.entries(spec.stats)) {
    const r = s.stats.find(x => x.key === key);
    // A field clipped off a narrow status grid may be absent, never wrong.
    if (!r && want.optionalBelow && width < want.optionalBelow) continue;
    check(r && r.confirmed, key + ' confirmed ' + tag);
    if (!r) continue;
    if (want.pattern) check(want.pattern.test(String(r.value)), key + ' shape ' + JSON.stringify(r.value) + ' ' + tag);
    if (want.value !== undefined) check(r.value === want.value, key + ' value ' + JSON.stringify(r.value) + ' ' + tag);
    if (want.max !== undefined) check(r.max === want.max, key + ' max ' + r.max + ' ' + tag);
    if (want.grid) { // current authored grid Moves, whichever layout is drawn
     const m = /Moves:\s*(\d+)/i.exec(s.grid) || /(?:^| {3,})-?\d+\/(\d+)\s*$/.exec(s.grid);
     if (m) check(r.value === +m[1], key + ' tracks current grid ' + m[1] + ' got ' + r.value + ' ' + tag);
    }
    if (want.gridLabel) { // second authored field of a labelled or compact pair
     const m = new RegExp(want.gridLabel + ':\\s*(\\d+)', 'i').exec(s.grid) || /(?:^| {3,})-?\d+\/(\d+)\s*$/.exec(s.grid);
     if (m) check(r.value === +m[1], key + ' tracks current grid ' + m[1] + ' got ' + r.value + ' ' + tag);
    }
   }
   for (const key of spec.absent || []) check(!s.stats.some(x => x.key === key), key + ' absent ' + tag);
   if (spec.rank) check(spec.rank.test(s.rank || '') && s.rows.includes(s.rank), 'rank ' + JSON.stringify(s.rank) + ' ' + tag);
   if (spec.noScore) check(s.scoreUnavailable && s.subs.filter(x => x.command === 'score').length === 1, 'explicit no-score asked once ' + tag);
  }
  check(errors.length === 0, 'no browser errors ' + JSON.stringify(errors));
  const summary = evidence.map(e => ({ open: e.open, grid: e.grid.replace(/\s+/g, ' ').trim(), fulfillment: e.fulfillment, rank: e.rank, scoreUnavailable: e.scoreUnavailable, subs: e.subs.map(x => x.command), stats: e.stats.map(x => ({ key: x.key, value: x.value === undefined ? x.band : x.value, max: x.max, source: x.source })) }));
  console.log(JSON.stringify({ file, executableSha256: executableIdentity(file), width, checks, failures, evidence: debug ? evidence : summary }));
  if (failures.length) process.exitCode = 1;
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
