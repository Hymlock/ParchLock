// Plays the Eamon module inside the real ParchLock play screen (play.html), in headless Chromium.
// The engine build and data stay outside the repository and are overlaid at lib/eamon/ by this server.
// Env: PARCHLOCK_SOURCE_ROOT, PARCHLOCK_HOST_WORK, PARCHLOCK_HOST_SCRIPT ({rules:[[regex, answer]...], max}),
//      optional PARCHLOCK_HOST_PROFILE + PARCHLOCK_HOST_PORT, PARCHLOCK_APP_SHOT (png path), PARCHLOCK_APP_MOBILE=1.
const http = require('http'), fs = require('fs'), path = require('path');
const repo = path.resolve(process.env.PARCHLOCK_SOURCE_ROOT);
const {chromium} = require(path.join(repo, 'node_modules/playwright'));
const work = path.resolve(process.env.PARCHLOCK_HOST_WORK);
const overlays = [['/lib/eamon/_framework/', path.join(work, 'eamon-host/bin/Release/net8.0/publish/wwwroot/_framework')], ['/lib/eamon/eamon-data/', path.join(work, 'data')]];
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.ico': 'image/x-icon'};
const script = JSON.parse(fs.readFileSync(process.env.PARCHLOCK_HOST_SCRIPT, 'utf8').replace(/^﻿/, ''));
(async () => {
  const logs = [];
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let root = repo, rel = pathname === '/' ? '/index.html' : pathname;
    for (const [prefix, dir] of overlays) if (pathname.startsWith(prefix)) { root = dir; rel = '/' + pathname.slice(prefix.length); }
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      if (path.basename(file) === 'manifest.json' && bytes[0] === 0xEF) bytes = bytes.subarray(3);
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
    });
  });
  await new Promise(r => server.listen(Number(process.env.PARCHLOCK_HOST_PORT) || 0, '127.0.0.1', r));
  let browser; const receipt = {scope: 'Eamon inside the ParchLock play screen, local headless Chromium.', steps: []};
  try {
    const profile = process.env.PARCHLOCK_HOST_PROFILE;
    const view = process.env.PARCHLOCK_APP_MOBILE ? {viewport: {width: 412, height: 915}, isMobile: true, hasTouch: true} : {viewport: {width: 1280, height: 800}};
    // PARCHLOCK_HOST_CDP + PARCHLOCK_HOST_URL: drive the play screen of an app already running on a device.
    const cdp = process.env.PARCHLOCK_HOST_CDP, appUrl = process.env.PARCHLOCK_HOST_URL;
    browser = cdp ? await chromium.connectOverCDP(cdp) : profile ? await chromium.launchPersistentContext(profile, {headless: true, ...view}) : await chromium.launch({headless: true});
    const context = cdp ? browser.contexts()[0] : profile ? browser : await browser.newContext(view);
    await context.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); } catch (e) {} });
    const page = cdp ? context.pages()[0] : await context.newPage();
    if (cdp) receipt.scope = 'Eamon inside the ParchLock play screen, on device: ' + (await page.evaluate(() => navigator.userAgent));
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push({type: m.type(), text: m.text().slice(0, 300)}); });
    page.on('pageerror', e => logs.push({type: 'pageerror', text: String(e).slice(0, 400)}));
    const began = Date.now();
    const story = process.env.PARCHLOCK_APP_STORY || 'eamon/showcase.eamon';
    await page.goto(appUrl ? appUrl + '?story=' + story : 'http://127.0.0.1:' + server.address().port + '/play.html?story=' + story);
    // The story window's own input element is the contract every ParchLock game uses.
    const ready = () => page.waitForFunction(() => {
      const vm = window.__PARCHLOCK_EAMON__;
      return (vm && vm.state.events.length) || document.querySelector('#errorpane:not([style*="none"]) #errorcontent') || document.querySelector('#windowport input.Input');
    }, null, {timeout: Number(process.env.PARCHLOCK_APP_WAIT) || 120000}).catch(() => { receipt.readyTimeout = true; });
    const text = () => page.evaluate(() => { const w = document.querySelector('#windowport .BufferWindow'); return w ? w.innerText : ''; });
    // Every story opens with ParchLock's first-visit Help window; close it as a player would.
    await page.locator('#message #close').click({timeout: 8000}).catch(() => {});
    await ready();
    receipt.firstPromptMs = Date.now() - began;
    const rules = script.rules.map(([pattern, answer]) => ({pattern: new RegExp(pattern), answer}));
    for (let n = 0; n < (script.max || 200); n++) {
      const state = await page.evaluate(() => ({input: (() => { const i = document.querySelector('#windowport input.Input'); return i ? (i.className.includes('LineInput') ? 'line' : 'char') : null; })(), error: (document.querySelector('#errorcontent') || {}).innerText || '', ended: !!(window.__PARCHLOCK_EAMON__ && window.__PARCHLOCK_EAMON__.state.events.length)}));
      if (state.ended || !state.input) { receipt.stopped = state; break; }
      const screen = (await text()).replace(/ /g, ' ').replace(/\s+$/, '');
      const tail = screen.slice(screen.lastIndexOf('\n') + 1);
      const rule = rules.find(r => (r.pattern.test(tail) || r.pattern.test(tail + " ")) && (!Array.isArray(r.answer) || r.answer.length));
      if (!rule) { receipt.steps.push({prompt: tail, failed: 'no rule for this prompt'}); break; }
      const send = Array.isArray(rule.answer) ? rule.answer.shift() : rule.answer;
      receipt.steps.push({prompt: tail.slice(-120), kind: state.input, send});
      const input = page.locator('#windowport input.Input');
      const before = await page.evaluate(() => window.__PARCHLOCK_EAMON__.state.turns.length);
      // On the mobile shell ParchLock owns input focus and re-issues keys to the story window with
      // jQuery key events (js/Input.js, js/CharKeys.js); the probe sends through that same path.
      if (cdp) await page.evaluate(([kind, value]) => {
        if (kind === 'char') jQuery('.Input.CharInput').trigger(jQuery.Event('keypress', {which: value.codePointAt(0)}));
        else { jQuery('.Input.LineInput').val(value); jQuery('.Input.LineInput').trigger(jQuery.Event('keypress', {which: 13})); }
      }, [state.input, send]);
      else if (state.input === 'char') await input.press(send === ' ' ? 'Space' : send);
      else { await input.fill(send); await input.press('Enter'); }
      await page.waitForFunction(n => { const vm = window.__PARCHLOCK_EAMON__; return vm.state.turns.length > n || vm.state.events.length; }, before, {timeout: 120000});
      await ready();
    }
    const final = await page.evaluate(() => { const s = window.__PARCHLOCK_EAMON__ ? window.__PARCHLOCK_EAMON__.state : null; return s && {phase: s.phase, restored: s.restored, commits: s.commits, commitError: s.commitError, turns: s.turns, events: s.events}; });
    if (receipt.readyTimeout) receipt.dom = await page.evaluate(() => ({inputs: [...document.querySelectorAll('input,textarea')].map(i => i.id + '|' + i.className + '|' + (i.offsetParent ? 'shown' : 'hidden')), windows: [...document.querySelectorAll('#windowport > *')].map(w => w.id + '|' + w.className), pending: !!window.__PARCHLOCK_EAMON__}));
    receipt.vm = final; receipt.logs = logs.slice(0, 40);
    receipt.screenTail = (await text()).slice(-3000);
    receipt.failed = receipt.steps.some(s => s.failed) || !final || !!final.commitError;
    if (process.env.PARCHLOCK_APP_SHOT) await page.screenshot({path: process.env.PARCHLOCK_APP_SHOT});
    fs.writeFileSync(path.join(work, process.env.PARCHLOCK_HOST_RECEIPT || 'app-probe-receipt.json'), JSON.stringify(receipt, null, 2));
    console.log(receipt.screenTail.slice(-(Number(process.env.PARCHLOCK_HOST_TAIL) || 1500)));
    console.log('\n--- first prompt ms', receipt.firstPromptMs, 'steps', receipt.steps.length, 'vm', JSON.stringify(final), 'stopped', JSON.stringify(receipt.stopped || null), 'last', JSON.stringify(receipt.steps[receipt.steps.length - 1] || null), '\nlogs', JSON.stringify(logs.slice(0, 12)));
    if (receipt.failed) process.exitCode = 1;
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
