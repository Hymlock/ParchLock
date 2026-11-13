// Real-input play of the Eamon Showcase (plan section 11 item 10): real mouse clicks on underlined prompt keys
// (Playwright locator.click = trusted pointer events at the element), real typing and Enter, one 21 s idle.
// Usage: node real-play.cjs <repo> <package.eamon> <out-dir>
const http = require('http'), fs = require('fs'), path = require('path');
const [repoArg, pkg, out] = process.argv.slice(2); const repo = path.resolve(repoArg);
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = path.join(repo, p);
  if (!f.startsWith(repo) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const log = [];
const note = (s) => { log.push(s); console.log(s); };
(async () => {
  await new Promise(r => server.listen(8950, '127.0.0.1', r));
  const ctx = await chromium.launchPersistentContext(path.join(out, 'profile'), { headless: true, viewport: { width: 1280, height: 900 } });
  // A player who has finished ParchLock's guided tour (as run-app-probe's PARCHLOCK_APP_NOTOUR).
  await ctx.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialLibrarySeen', '1'); localStorage.setItem('PL_TutorialSeen', '1'); } catch (e) {} });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('console', m => { if (m.type() === 'error') note('CONSOLE ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => note('REQFAIL ' + r.url().slice(0, 120)));
  page.on('response', r => { if (r.status() >= 400) note('HTTP ' + r.status() + ' ' + r.url().slice(0, 120)); });
  await page.goto('http://127.0.0.1:8950/index.html');
  await page.waitForFunction(() => typeof ModuleLibrary !== 'undefined');
  await page.evaluate(() => ModuleLibrary.openManager());
  await page.locator('#pl-module-files').setInputFiles(pkg);
  await page.waitForFunction(() => /added|already present/.test((document.querySelector('#pl-module-results') || {}).innerText || ''), null, { timeout: 180000 });
  const story = await page.evaluate(() => ModuleLibrary.all().filter(g => g.Format === 'eamon')[0].Path);
  await page.goto('http://127.0.0.1:8950/play.html?story=' + story);
  const tail = () => page.evaluate(() => { const t = (document.querySelector('#windowport .BufferWindow') || { innerText: '' }).innerText.replace(/ /g, ' ').replace(/\s+$/, ''); return t.slice(t.lastIndexOf('\n') + 1); });
  const state = () => page.evaluate(() => ({
    keys: [...document.querySelectorAll('span.pl-act[data-kind="prompt-key"]:not(.is-stale)')].filter(e => e.offsetParent).map(e => e.textContent),
    menuPhrases: [...document.querySelectorAll('span.pl-act:not(.is-stale)')].filter(e => e.offsetParent && e.dataset.kind !== 'prompt-key' && /^\s*[0-9A-Z][.)]\s/.test((e.closest('.BufferLine') || {}).textContent || '')).map(e => e.textContent),
    radialExits: ((window.WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.exits) || []).map(e => e.label),
    overlay: !!(document.getElementById('pl-special-commands') && document.getElementById('pl-special-commands').offsetParent)
  }));
  const clickKey = async (k) => { const el = page.locator('span.pl-act[data-kind="prompt-key"]:not(.is-stale)', { hasText: new RegExp('^' + k + '$') }).last(); await el.click(); };
  const closeDialogs = async () => { for (let i = 0; i < 3; i++) { const open = await page.evaluate(() => typeof Message !== 'undefined' && Message.IsOpen); if (!open) return; await page.keyboard.press('Escape'); await page.waitForTimeout(400); } };
  const plan = [
    [/D for desk/, async () => clickKey('D'), 'D (click)'],
    [/type it in now/, async () => { await page.locator('.Input.LineInput').click(); await page.keyboard.type('RealHero'); await page.keyboard.press('Enter'); }, 'name (typed)'],
    [/Y for yes or N for no/, async () => clickKey('Y'), 'Y (click)'],
    [/0=Male/, async () => clickKey('0'), '0 (click)'],
    [/commit suicide/, async () => clickKey('N'), 'N (click)'],
    [/R to read instructions/, async () => { note('  idle 21 s before answering'); await page.waitForTimeout(21000); await clickKey('T'); }, 'T (click after 21 s idle)'],
  ];
  let p = 0;
  const splash = async () => { const b = page.locator('#parchlock-splash button:visible').first(); if (await b.count()) { note('  splash: clicking ' + JSON.stringify(await b.innerText())); await b.click(); await page.waitForTimeout(800); }
    for (let k = 0; k < 4; k++) { const t = page.locator('#pl-tut-overlay button:visible', { hasText: /skip|close|done|not now|finish|end/i }).first(); if (!(await t.count())) break; note('  tutorial: clicking ' + JSON.stringify(await t.innerText())); await t.click(); await page.waitForTimeout(600); } };
  for (let step = 0; step < 60 && p <= plan.length; step++) {
    await page.waitForTimeout(1500); await splash(); await closeDialogs();
    const t = await tail();
    if (/Press any key/i.test(t)) { await page.keyboard.press('Space'); continue; }
    // Eamon asks some questions only on some rolls (the suicide offer): answer whichever planned prompt is up.
    for (let q = p; q < plan.length; q++) if (plan[q][0].test(t)) { if (q > p) note('  (skipped by the game: ' + plan.slice(p, q).map(x => x[2]).join(', ') + ')'); p = q; break; }
    if (p < plan.length && plan[p][0].test(t)) {
      const s = await state(); note('PROMPT ' + JSON.stringify(t.slice(-60)) + ' keys=' + JSON.stringify(s.keys) + ' overlay=' + s.overlay);
      try { await plan[p][1](); note('  answered ' + plan[p][2]); } catch (e) { note('  FAILED to answer ' + plan[p][2] + ': ' + e.message.split('\n').slice(0, 16).join(' / ')); await page.screenshot({ path: path.join(out, 'fail.png') }); break; }
      p++; continue;
    }
    if (/\[X\]:$/.test(t) && p === plan.length) {
      const s = await state(); note('MAIN HALL keys=' + JSON.stringify(s.keys) + ' menuLinePhrases=' + JSON.stringify(s.menuPhrases) + ' radialExits=' + JSON.stringify(s.radialExits) + ' overlay=' + s.overlay);
      await page.screenshot({ path: path.join(out, 'main-hall.png') });
      await clickKey('5'); await page.waitForTimeout(2000); note('  clicked 5: ' + JSON.stringify((await tail()).slice(-50)));
      await page.keyboard.press('Space'); await page.waitForTimeout(1500);
      const s2 = await state(); note('BACK IN HALL radialExits=' + JSON.stringify(s2.radialExits));
      // Village (key 6) and the Good Witch's shop menu, then back.
      const settle = async () => { for (let k = 0; k < 6; k++) { await page.waitForTimeout(900); await closeDialogs(); const tt = await tail(); if (/Press any key/i.test(tt)) { await page.keyboard.press('Space'); continue; } return tt; } return await tail(); };
      await clickKey('6'); let tv = await settle();
      let sv = await state(); note('VILLAGE prompt=' + JSON.stringify(tv.slice(-30)) + ' keys=' + JSON.stringify(sv.keys) + ' menuLinePhrases=' + JSON.stringify(sv.menuPhrases) + ' radial=' + JSON.stringify(sv.radialExits));
      await page.screenshot({ path: path.join(out, 'village.png') });
      await clickKey('2'); tv = await settle();
      sv = await state(); note('GOOD WITCH prompt=' + JSON.stringify(tv.slice(-60)) + ' keys=' + JSON.stringify(sv.keys) + ' menuLinePhrases=' + JSON.stringify(sv.menuPhrases) + ' radial=' + JSON.stringify(sv.radialExits));
      await page.screenshot({ path: path.join(out, 'good-witch.png') });
      // Leave the shop the way its own prompt allows (its listed exit key, else X), then back north to the Hall.
      const exitKey = sv.keys.indexOf('X') >= 0 ? 'X' : sv.keys[sv.keys.length - 1];
      await clickKey(exitKey); tv = await settle(); note('  left the shop with ' + exitKey + ': ' + JSON.stringify(tv.slice(-40)));
      sv = await state(); if (sv.keys.indexOf('X') >= 0) { await clickKey('X'); tv = await settle(); }
      sv = await state(); note('BACK prompt=' + JSON.stringify(tv.slice(-30)) + ' keys=' + JSON.stringify(sv.keys));
      // An adventure: Hall key 1, the selection typed (The Training Ground, 20), then the adventure's own command line.
      if (sv.keys.indexOf('1') >= 0) {
        await clickKey('1'); tv = await settle(); note('  hall 1: ' + JSON.stringify(tv.slice(-50)));
        if (/Enter the selection/.test(tv)) { await page.locator('.Input.LineInput').click(); await page.keyboard.type('20'); await page.keyboard.press('Enter'); }
        for (let k = 0; k < 12; k++) { tv = await settle(); if (/introduction story/.test(tv)) { await clickKey('N').catch(async () => { await page.keyboard.press('n'); }); continue; } if (tv.trim() === '>') break; }
        const sa = await state(); const nouns = await page.evaluate(() => [...document.querySelectorAll('span.pl-act:not(.is-stale)')].filter(e => e.offsetParent && e.dataset.kind !== 'prompt-key').map(e => e.textContent));
        note('ADVENTURE prompt=' + JSON.stringify(tv.slice(-20)) + ' promptKeys=' + JSON.stringify(sa.keys) + ' underlined=' + JSON.stringify(nouns.slice(-8)) + ' exits=' + JSON.stringify(sa.radialExits));
        await page.locator('.Input.LineInput').click(); await page.keyboard.type('look'); await page.keyboard.press('Enter'); tv = await settle();
        note('  typed look -> ' + JSON.stringify(tv.slice(-20)));
        const target = page.locator('span.pl-act:not(.is-stale):not([data-kind="prompt-key"]):not([data-kind="direction"])').last();
        if (await target.count()) { const word = await target.innerText(); await target.click(); await page.waitForTimeout(1200); const radial = await page.evaluate(() => [...document.querySelectorAll('#radial-menu.show .radial-item, #radial-menu .radial-label, #radial-menu.show [data-command]')].map(e => e.textContent.trim()).filter(Boolean).slice(0, 10)); note('  clicked underlined ' + JSON.stringify(word) + ' -> radial ' + JSON.stringify(radial)); await page.keyboard.press('Escape'); }
        await page.screenshot({ path: path.join(out, 'adventure.png') });
      }
      p++; break;
    }
  }
  if (p < plan.length) { note('STUCK before ' + plan[p][2] + ': tail ' + JSON.stringify((await tail()).slice(-120)) + ' input=' + JSON.stringify(await page.evaluate(() => ({ line: !!document.querySelector('.Input.LineInput'), char: !!document.querySelector('.Input.CharInput'), top: window.__PARCHLOCK_EAMON__ && window.__PARCHLOCK_EAMON__.state.atTopLevel, prompts: window.__PARCHLOCK_EAMON__ && window.__PARCHLOCK_EAMON__.state.prompts })))); await page.screenshot({ path: path.join(out, 'stuck.png') }); }
  fs.writeFileSync(path.join(out, 'real-play.txt'), log.join('\n'));
  await ctx.close(); server.close();
})().catch(e => { note('ERROR ' + e.message); server.close(); process.exit(1); });
