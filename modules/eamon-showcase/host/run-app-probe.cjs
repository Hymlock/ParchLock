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
    // An imported package must supply the engine itself: no development overlay is served then.
    for (const [prefix, dir] of (process.env.PARCHLOCK_APP_IMPORT ? [] : overlays)) if (pathname.startsWith(prefix)) { root = dir; rel = '/' + pathname.slice(prefix.length); }
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    // PARCHLOCK_APP_OMIT=<path>: serve that script empty, to bisect a fault to one component.
    if (process.env.PARCHLOCK_APP_OMIT && pathname === '/' + process.env.PARCHLOCK_APP_OMIT) { res.setHeader('Content-Type', 'text/javascript'); res.end('/* omitted for this run */'); return; }
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
    browser = cdp ? await chromium.connectOverCDP(cdp) : profile ? await chromium.launchPersistentContext(profile, {headless: true, ...view}) : await chromium.launch({headless: true, channel: process.env.PARCHLOCK_APP_CHANNEL || undefined});
    if (process.env.PARCHLOCK_APP_CHANNEL) receipt.scope = 'Eamon inside the ParchLock play screen, installed browser: ' + process.env.PARCHLOCK_APP_CHANNEL + ' ' + browser.version();
    const context = cdp ? browser.contexts()[0] : profile ? browser : await browser.newContext(view);
    await context.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); if (!window.__keepTour) localStorage.setItem('PL_TutorialLibrarySeen', '1'); } catch (e) {} });
    if (process.env.PARCHLOCK_HOST_DELAY_ACK) await context.addInitScript(delay => {
      const transaction=IDBDatabase.prototype.transaction;
      const complete=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
      const probe=window.__ackProbe={started:0,acknowledged:0,violations:[]};
      let baseline=0;
      IDBDatabase.prototype.transaction=function(stores,mode,...rest){
        const tx=transaction.call(this,stores,mode,...rest);
        if(this.name==='parchlock-eamon'&&mode==='readwrite') {
          probe.started++;baseline=window.__PARCHLOCK_EAMON__?.state.prompts||0;
          Object.defineProperty(tx,'oncomplete',{configurable:true,get(){return complete.get.call(tx);},set(handler){
            complete.set.call(tx,event=>setTimeout(()=>{probe.acknowledged++;handler.call(tx,event);},delay));
          }});
        }
        return tx;
      };
      setInterval(()=>{
        const state=window.__PARCHLOCK_EAMON__?.state;
        if(state&&probe.started>probe.acknowledged&&(state.prompts>baseline||state.events.includes('done'))&&probe.violations.length<20)
          probe.violations.push({prompts:state.prompts,baseline,done:state.events.includes('done')});
      },10);
    },Number(process.env.PARCHLOCK_HOST_DELAY_ACK));
    if (process.env.PARCHLOCK_HOST_FAIL_RESULT) await context.addInitScript(() => {
      window.__probeTerminations=0;
      const terminate=Worker.prototype.terminate;
      Worker.prototype.terminate=function(){window.__probeTerminations++;return terminate.call(this);};
      window.Worker=new Proxy(Worker,{construct(Target,args){const worker=new Target(...args);if(String(args[0]).includes('host-worker.js'))window.__probeEngineWorker=worker;return worker;}});
    });
    if (process.env.PARCHLOCK_HOST_FAIL_COMMIT) await context.addInitScript(failAt => {
      const transaction = IDBDatabase.prototype.transaction;
      let writes = 0;
      IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
        if (this.name === 'parchlock-eamon' && mode === 'readwrite' && ++writes === failAt)
          throw new DOMException('Injected transaction-start storage failure', 'QuotaExceededError');
        return transaction.call(this, stores, mode, ...rest);
      };
      window.__probeTerminations = 0;
      const terminate = Worker.prototype.terminate;
      Worker.prototype.terminate = function () { window.__probeTerminations++; return terminate.call(this); };
    }, Number(process.env.PARCHLOCK_HOST_FAIL_COMMIT));
    const page = cdp ? context.pages()[0] : await context.newPage();
    if (cdp) receipt.scope = 'Eamon inside the ParchLock play screen, on device: ' + (await page.evaluate(() => navigator.userAgent));
    page.on('console', m => { if (process.env.PARCHLOCK_APP_ALLLOGS || m.type() === 'error' || m.type() === 'warning') logs.push({type: m.type(), text: m.text().slice(0, 300)}); });
    page.on('pageerror', e => logs.push({type: 'pageerror', text: String(e).slice(0, 400)}));
    const began = Date.now();
    let story = process.env.PARCHLOCK_APP_STORY || 'eamon/showcase.eamon';
    // PARCHLOCK_APP_IMPORT=<file.eamon>: install it the way a player does, through Modules -> Choose files,
    // then open the library entry it creates.
    if (process.env.PARCHLOCK_APP_IMPORT) {
      const origin = appUrl ? new URL(appUrl).origin : 'http://127.0.0.1:' + server.address().port;
      await page.goto(origin + '/index.html');
      await page.waitForFunction(() => typeof ModuleLibrary !== 'undefined' && typeof EamonPackage !== 'undefined');
      await page.evaluate(() => ModuleLibrary.openManager());
      const importStarted = Date.now();
      await page.locator('#pl-module-files').setInputFiles(process.env.PARCHLOCK_APP_IMPORT);
      await page.waitForFunction(() => /added|already present|rejected/.test((document.querySelector('#pl-module-results') || {}).innerText || ''), null, {timeout: 180000});
      receipt.importMs = Date.now() - importStarted;
      receipt.importResult = await page.evaluate(() => document.querySelector('#pl-module-results').innerText);
      const entry = await page.evaluate(() => ModuleLibrary.all().filter(g => g.Format === 'eamon').map(g => ({path: g.Path, title: g.Title, compat: g.Compat, size: g.Size}))[0] || null);
      receipt.libraryEntry = entry;
      console.log('IMPORT ' + JSON.stringify({ms: receipt.importMs, result: receipt.importResult, entry}));
      if (!entry) throw new Error('import produced no library entry: ' + receipt.importResult);
      story = entry.path;
    }
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
    if (process.env.PARCHLOCK_HOST_FAIL_RESULT) await page.evaluate(() => window.__probeEngineWorker.onmessage({data:{kind:'result',value:'error: injected engine result'}}));
    const rules = script.rules.map(([pattern, answer]) => ({pattern: new RegExp(pattern), answer}));
    for (let n = 0; n < (script.max || 200); n++) {
      const state = await page.evaluate(() => ({input: (() => { const i = document.querySelector('#windowport input.Input'); return i ? (i.className.includes('LineInput') ? 'line' : 'char') : null; })(), error: (document.querySelector('#errorcontent') || {}).innerText || '', ended: !!(window.__PARCHLOCK_EAMON__ && window.__PARCHLOCK_EAMON__.state.events.length)}));
      if (state.ended || !state.input) { receipt.stopped = state; break; }
      // ParchLock follows the game on a 200 ms loop; PARCHLOCK_APP_PACE (ms) plays at a human pace so it sees every turn.
      if (process.env.PARCHLOCK_APP_PACE) await page.waitForTimeout(Number(process.env.PARCHLOCK_APP_PACE));
      const screen = (await text()).replace(/ /g, ' ').replace(/\s+$/, '');
      const tail = screen.slice(screen.lastIndexOf('\n') + 1);
      const rule = rules.find(r => (r.pattern.test(tail) || r.pattern.test(tail + " ")) && (!Array.isArray(r.answer) || r.answer.length));
      if (!rule) { receipt.steps.push({prompt: tail, failed: 'no rule for this prompt'}); break; }
      const send = Array.isArray(rule.answer) ? rule.answer.shift() : rule.answer;
      receipt.steps.push({prompt: tail.slice(-120), kind: state.input, send});
      // ParchLock's guided tour opens once over the play screen and takes the keyboard; dismiss it as a player would.
      if (await page.locator('#pl-tut-overlay').isVisible().catch(() => false)) await page.locator('text=Skip tour').click({timeout: 2000}).catch(() => {});
      const input = page.locator('#windowport input.Input');
      const before = await page.evaluate(() => window.__PARCHLOCK_EAMON__.state.turns.length);
      // On the mobile shell ParchLock owns input focus and re-issues keys to the story window with
      // jQuery key events (js/Input.js, js/CharKeys.js); the probe sends through that same path.
      if (cdp || process.env.PARCHLOCK_APP_MOBILE) await page.evaluate(([kind, value]) => {
        if (kind === 'char') jQuery('.Input.CharInput').trigger(jQuery.Event('keypress', {which: value.codePointAt(0)}));
        else { jQuery('.Input.LineInput').val(value); jQuery('.Input.LineInput').trigger(jQuery.Event('keypress', {which: 13})); }
      }, [state.input, send]);
      else if (state.input === 'char') await input.press(send === ' ' ? 'Space' : send);
      // A typed command goes through ParchLock's own submit path (the one its buttons and radials use),
      // so autocomplete or focus handling cannot swallow the Enter key.
      else await page.evaluate(value => { Input.Clear(); Input.Inject(value, true); }, send);
      await page.waitForFunction(n => { const vm = window.__PARCHLOCK_EAMON__; return vm.state.turns.length > n || vm.state.events.length || vm.state.commitError; }, before, {timeout: Number(process.env.PARCHLOCK_APP_STEP_WAIT) || 120000}).catch(() => { receipt.stalledAfter = receipt.steps[receipt.steps.length - 1]; });
      if (receipt.stalledAfter) { receipt.stallState = await page.evaluate(() => ({inputs: [...document.querySelectorAll('#windowport input')].map(i => i.className + '|' + i.value + '|' + (i.disabled ? 'disabled' : 'on')), message: document.querySelector('#message') && getComputedStyle(document.querySelector('#message')).display, active: document.activeElement && (document.activeElement.id + '.' + document.activeElement.className), prompts: window.__PARCHLOCK_EAMON__.state.prompts})); console.log('STALL ' + JSON.stringify(receipt.stalledAfter) + ' ' + JSON.stringify(receipt.stallState)); break; }
      await ready();
    }
    await page.waitForFunction(() => { const vm=window.__PARCHLOCK_EAMON__; return !vm || vm.state.commitError || vm.state.pendingCommits === 0; },null,{timeout:10000});
    const final = await page.evaluate(() => { const s = window.__PARCHLOCK_EAMON__ ? window.__PARCHLOCK_EAMON__.state : null; return s && {phase: s.phase, restored: s.restored, commits: s.commits, pendingCommits: s.pendingCommits, commitError: s.commitError, turns: s.turns, events: s.events}; });
    if (receipt.readyTimeout) receipt.dom = await page.evaluate(() => ({inputs: [...document.querySelectorAll('input,textarea')].map(i => i.id + '|' + i.className + '|' + (i.offsetParent ? 'shown' : 'hidden')), windows: [...document.querySelectorAll('#windowport > *')].map(w => w.id + '|' + w.className), pending: !!window.__PARCHLOCK_EAMON__}));
    // PARCHLOCK_APP_EVAL: an expression evaluated in the page at the end, for inspecting ParchLock's own state.
    if (process.env.PARCHLOCK_APP_EVAL) { receipt.evaluated = await page.evaluate(process.env.PARCHLOCK_APP_EVAL).catch(e => 'eval failed: ' + e); console.log('EVAL ' + JSON.stringify(receipt.evaluated)); }
    receipt.vm = final; receipt.logs = logs.slice(0, 40);
    receipt.screenTail = (await text()).slice(-3000);
    receipt.failed = receipt.steps.some(s => s.failed) || !final || !!final.commitError;
    if (process.env.PARCHLOCK_HOST_DELAY_ACK) {
      receipt.acknowledgements=await page.evaluate(()=>window.__ackProbe);
      receipt.ackOrderPass=receipt.acknowledgements.started>0&&receipt.acknowledgements.started===receipt.acknowledgements.acknowledged&&receipt.acknowledgements.violations.length===0;
      receipt.failed=receipt.failed||!receipt.ackOrderPass;
    }
    if (process.env.PARCHLOCK_HOST_FAIL_COMMIT) {
      receipt.failureState = await page.evaluate(() => ({terminatedWorkers:window.__probeTerminations || 0,error:(document.querySelector('#errorcontent') || {}).innerText || ''}));
      receipt.expectedFailurePass = !!final?.commitError && receipt.failureState.terminatedWorkers === 1 && /progress could not be saved/i.test(receipt.failureState.error);
    }
    if (process.env.PARCHLOCK_HOST_FAIL_RESULT) {
      receipt.failureState=await page.evaluate(()=>({terminatedWorkers:window.__probeTerminations,error:(document.querySelector('#errorcontent')||{}).innerText||''}));
      receipt.expectedResultFailurePass=receipt.failureState.terminatedWorkers===1&&receipt.failureState.error.includes('injected engine result');
    }
    await page.locator('text=Skip tour').click({timeout: 1500}).catch(() => {});
    if (process.env.PARCHLOCK_APP_SHOT) await page.screenshot({path: process.env.PARCHLOCK_APP_SHOT});
    fs.writeFileSync(path.join(work, process.env.PARCHLOCK_HOST_RECEIPT || 'app-probe-receipt.json'), JSON.stringify(receipt, null, 2));
    console.log(receipt.screenTail.slice(-(Number(process.env.PARCHLOCK_HOST_TAIL) || 1500)));
    console.log('\n--- first prompt ms', receipt.firstPromptMs, 'steps', receipt.steps.length, 'vm', JSON.stringify(final), 'stopped', JSON.stringify(receipt.stopped || null), 'last', JSON.stringify(receipt.steps[receipt.steps.length - 1] || null), '\nlogs', JSON.stringify(process.env.PARCHLOCK_APP_ALLLOGS ? logs.slice(-40) : logs.slice(0, 12)));
    if (process.env.PARCHLOCK_HOST_FAIL_RESULT ? !receipt.expectedResultFailurePass : process.env.PARCHLOCK_HOST_FAIL_COMMIT ? !receipt.expectedFailurePass : receipt.failed) process.exitCode = 1;
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
