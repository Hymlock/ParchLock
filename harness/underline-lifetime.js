// D214 focused native positives and isolated presentation negatives.
const fs = require('fs');
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
let passed = 0;
function check(value, label) { if (!value) throw new Error(label); passed++; console.log('PASS:', label); }
(async () => {
  const browser = await chromium.launch();
  try {
    async function boot(game) {
      const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
      await page.addInitScript(() => {
        sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
        for (const key of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(key, '1');
      });
      await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game);
      await page.waitForTimeout(2500);
      await page.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
      for (let i = 0; i < 12 && !(await page.locator('.Input.LineInput').count()); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(250); }
      await page.waitForSelector('.Input.LineInput');
      return page;
    }
    async function command(page, text) {
      await page.locator('.Input.LineInput').fill(text);
      await page.locator('.Input.LineInput').press('Enter');
      await page.waitForTimeout(900);
    }
    const hhg = await boot('Hitchhik.z5.js');
    const save = process.argv[2] || "C:/Users/hymlo/Downloads/The Hitchhiker's Guide to the Galaxy - Save - 1 - 2026-10-08 17-35-11-900.json";
    await hhg.evaluate(text => ParchLockQol.ImportPackageData(text), fs.readFileSync(save, 'utf8'));
    await hhg.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
    await command(hhg, 'restore');
    await hhg.waitForSelector('#dialog_select');
    await hhg.locator('#dialog_select').selectOption({ index: 0 });
    await hhg.locator('#dialog_accept').click();
    await hhg.waitForTimeout(800);
    await command(hhg, 'look');
    await command(hhg, 'get all');
    const before = await hhg.evaluate(() => Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).filter(m => /^(flathead screwdriver|toothbrush)$/i.test(m.textContent)).map(m => { m.dataset.d214Proof = '1'; return m.textContent; }));
    check(before.length === 2, 'native GET ALL marks both listed items');
    await command(hhg, 'examine carpet');
    check(await hhg.evaluate(() => document.querySelectorAll('[data-d214-proof="1"]:not(.is-stale)').length === 2), 'native intervening reply retains both marks');
    check(await hhg.evaluate(() => !Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).some(m => Actionable.isReferenceToken(m.textContent))), 'native standalone pronoun triggers absent');
    check(await hhg.evaluate(() => Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).some(m => m.textContent === 'washbasin')), 'native washbasin remains actionable');
    await command(hhg, 'look');
    const newest = await hhg.evaluate(() => {
      const lines = Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine'));
      const last = lines.map(l => !!l.querySelector('.Style_input')).lastIndexOf(true);
      return Array.from(document.querySelectorAll('[data-d214-proof="1"]:not(.is-stale)')).every(m => lines.indexOf(m.closest('.BufferLine')) > last);
    });
    check(newest, 'native later LOOK moves the same marks forward');
    await hhg.close();

    const treasure = await boot('TreasuresofaSlaversKingdom.z8.js');
    await command(treasure, 'south');
    check(await treasure.evaluate(() => Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).some(m => /robodroid/i.test(m.textContent))), 'native ground ROBODROID promoted');
    await command(treasure, 'in');
    const cockpit = await treasure.evaluate(() => Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(m => m.textContent.toLowerCase()));
    check(cockpit.includes('flashlight'), 'native ground FLASHLIGHT promoted');
    check(cockpit.some(t => t.includes('space-rag')), 'native ground SPACE-RAG promoted through punctuated encoding');

    const negative = await treasure.evaluate(() => {
      const results = [], payload = WorldModel.lastPayload, live = Actionable.LiveMarks;
      const host = document.createElement('div'); document.querySelector('#windowport .BufferWindow').appendChild(host);
      const line = text => { const l = document.createElement('div'); l.className = 'BufferLine'; l.textContent = text; host.appendChild(l); return l; };
      const mark = (l, phrase, ids) => { l.textContent = ''; const m = document.createElement('span'); m.className = 'pl-act'; m.textContent = phrase; m.dataset.noun = phrase; m.dataset.kind = 'object'; m.dataset.candidateIds = JSON.stringify(ids); if (ids.length === 1) m.dataset.objectId = String(ids[0]); l.appendChild(m); return m; };
      const obj = id => ({ id, name: 'sword', aliases: ['sword'] });
      function test(value, label) { results.push({ value, label }); }
      try {
        const old = line('sword'), m = mark(old, 'sword', [501]);
        const echo = line('sword'); echo.innerHTML = '<span class="Style_input">sword</span>';
        const hidden = line('sword'); hidden.className += ' pl-stat-probe';
        const partial = line('swordsmanship');
        WorldModel.lastPayload = { inventory: [], exits: [] }; Actionable.LiveMarks = [m];
        Actionable.retainMarks([obj(501)]);
        Actionable.relocateExactMarks([old, echo, hidden, partial], [m]);
        test(m.parentNode === old, 'input, hidden probe and partial word never steal a mark');
        const newer = line('sword');
        Actionable.relocateExactMarks([newer, old], [m]);
        test(m.parentNode === newer && !old.querySelector('.pl-act'), 'exact phrase moves forward even with reversed line order');
        Actionable.relocateExactMarks([old, newer], [m]);
        test(m.parentNode === newer, 'older occurrence cannot steal focus back');
        WorldModel.lastPayload = { inventory: [obj(501)], exits: [] }; Actionable.retainMarks([obj(501)]);
        test(m.dataset.kind === 'inventory', 'retained owner updates inventory kind');
        Actionable.retainMarks([obj(501), obj(502)]);
        test(!m.dataset.objectId && JSON.parse(m.dataset.candidateIds).length === 2 && m.dataset.kind === 'object', 'new sibling preserves ambiguity and mixed scope kind');
        Actionable.retainMarks([obj(502)]);
        test(!m.classList.contains('is-stale') && m.dataset.objectId === '502', 'surviving recorded sibling retains word');
        Actionable.retainMarks([]);
        test(m.classList.contains('is-stale') && !Actionable.LiveMarks.length, 'out-of-scope owners stale the mark');
        test(!Actionable.namePhrases('it').length && !Actionable.namePhrases('your gown').includes('your') && Actionable.namePhrases('your gown').includes('your gown'), 'reference tokens suppressed, full possessive phrase retained');
        test(Actionable.namePhrases('the Order').includes('the Order'), 'structural proper phrase retained');
        const banned = Actionable.promoteUnnamed({ playerId: 55, roomId: 146, unnamedCandidates: [{ id: 55, aliases: ['flashligh'] }, { id: 146, aliases: ['flashligh'] }] }, 'FLASHLIGHT');
        test(!banned.length, 'promotion preserves player and room exclusions');
      } finally { host.remove(); WorldModel.lastPayload = payload; Actionable.LiveMarks = live; }
      return results;
    });
    for (const result of negative) check(result.value, result.label);
    const lifecycle = await treasure.evaluate(() => {
      const marks = Actionable.LiveMarks.slice();
      const count = () => { const walker = document.createTreeWalker(document.getElementById('windowport'), NodeFilter.SHOW_TEXT); let n = 0; while (walker.nextNode()) n++; return n; };
      Actionable.Refresh(); const before = count();
      for (let i = 0; i < 6; i++) Actionable.Refresh();
      const stable = count() === before;
      UndoRestoreSync.generation++; Actionable.Refresh();
      return { stable, invalidated: marks.length > 0 && marks.every(m => !m.isConnected || m.classList.contains('is-stale')) };
    });
    check(lifecycle.stable, 'idle refreshes do not grow buffer text nodes');
    check(lifecycle.invalidated, 'generation reset invalidates pre-reset native marks');
    await treasure.close();
    console.log(`${passed} PASS / 0 FAIL`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
