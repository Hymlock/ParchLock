// Plays a scripted session against the real engine host in headless Chromium and writes a receipt.
// Env: PARCHLOCK_SOURCE_ROOT (repo, for playwright), PARCHLOCK_HOST_WORK (scratch build dir),
//      PARCHLOCK_HOST_SCRIPT (JSON array of answers; a step may be {expect:"text", send:"answer"}).
const http = require('http'), fs = require('fs'), path = require('path');
const {chromium} = require(path.join(process.env.PARCHLOCK_SOURCE_ROOT, 'node_modules/playwright'));
const work = path.resolve(process.env.PARCHLOCK_HOST_WORK);
const root = path.join(work, 'eamon-host/bin/Release/net8.0/publish/wwwroot');
const dataRoot = path.join(work, 'data');
const fixtures = new Set(['/host-index.html', '/host-sw.js']);
// App-owned host files live in the app's lib/eamon and are served to the standalone probe from there.
const appFiles = new Set(['/host-worker.js', '/input-relay.js']);
const appDir = path.join(__dirname, '../../../lib/eamon');
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm'};
const script = JSON.parse(fs.readFileSync(process.env.PARCHLOCK_HOST_SCRIPT, 'utf8').replace(/^﻿/, ''));
const receiptName = process.env.PARCHLOCK_HOST_RECEIPT || 'host-probe-receipt.json';
(async () => {
  const logs = [];
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file;
    if (fixtures.has(pathname)) file = path.join(__dirname, pathname.slice(1));
    else if (appFiles.has(pathname)) file = path.join(appDir, pathname.slice(1));
    else if (pathname.startsWith('/eamon-data/')) { file = path.resolve(dataRoot, pathname.slice(12)); if (!file.startsWith(dataRoot + path.sep)) { res.writeHead(403).end(); return; } }
    else { file = path.resolve(root, '.' + pathname); if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; } }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      if (path.basename(file) === 'manifest.json' && bytes[0] === 0xEF) bytes = bytes.subarray(3);
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
    });
  });
  await new Promise(r => server.listen(Number(process.env.PARCHLOCK_HOST_PORT) || 0, '127.0.0.1', r));
  let browser; const receipt = {scope: 'Local headless Chromium only. Real Eamon CS engine in a .NET worker with the ParchLock host adapters.', steps: []};
  try {
    const profile = process.env.PARCHLOCK_HOST_PROFILE;
    // PARCHLOCK_HOST_CDP drives an already running browser, e.g. Chrome on a phone over adb.
    const cdp = process.env.PARCHLOCK_HOST_CDP;
    browser = cdp ? await chromium.connectOverCDP(cdp) : profile ? await chromium.launchPersistentContext(profile, {headless: true}) : await chromium.launch({headless: true});
    // PARCHLOCK_HOST_URL: the host is already inside the app under test (an Android WebView cannot open tabs).
    const appUrl = process.env.PARCHLOCK_HOST_URL;
    const page = appUrl ? browser.contexts()[0].pages()[0] : cdp ? await browser.contexts()[0].newPage() : await browser.newPage();
    if (appUrl) receipt.appStartUrl = page.url();
    if (process.env.PARCHLOCK_HOST_FAIL_COMMIT) await page.addInitScript(() => {
      const transaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
        if (this.name === 'parchlock-eamon-probe' && mode === 'readwrite')
          throw new DOMException('Injected transaction-start storage failure', 'QuotaExceededError');
        return transaction.call(this, stores, mode, ...rest);
      };
      window.__probeTerminations = 0;
      const terminate = Worker.prototype.terminate;
      Worker.prototype.terminate = function () { window.__probeTerminations++; return terminate.call(this); };
    });
    if (cdp) receipt.scope = 'Remote browser over CDP: ' + (await browser.version()) + ' ' + (await page.evaluate(() => navigator.userAgent));
    page.on('console', m => logs.push({type: m.type(), text: m.text()}));
    page.on('pageerror', e => logs.push({type: 'pageerror', text: String(e)}));
    const began = Date.now();
    await page.goto(appUrl || 'http://127.0.0.1:' + server.address().port + '/host-index.html');
    const settle = () => page.waitForFunction(() => eamon.pending || eamon.events.some(e => e.kind === 'result' || e.kind === 'error'), null, {timeout: 120000});
    await settle();
    receipt.firstPromptMs = Date.now() - began;
    let mark = 0;
    // Rules mode: {rules:[[regex, answer]...], max:N}. Each prompt is answered by the first rule matching
    // its final line; a rule answer may be a list, used in order and then dropped.
    const rules = Array.isArray(script) ? null : script.rules.map(([pattern, answer]) => ({pattern: new RegExp(pattern), answer}));
    for (let n = 0; rules && n < (script.max || 200); n++) {
      const state = await page.evaluate(() => ({screen: eamon.screen, ended: eamon.events.some(e => e.kind === 'result' || e.kind === 'error')}));
      if (state.ended) break;
      const tail = state.screen.slice(state.screen.lastIndexOf('\n') + 1);
      const rule = rules.find(r => r.pattern.test(tail) && (!Array.isArray(r.answer) || r.answer.length));
      if (!rule) { receipt.steps.push({prompt: tail, failed: 'no rule for this prompt'}); break; }
      const send = Array.isArray(rule.answer) ? rule.answer.shift() : rule.answer;
      receipt.steps.push({prompt: tail.slice(-160), send, safePoint: await page.evaluate(() => !!(eamon.pending && eamon.pending.safePoint))});
      // Deliberately stop at this prompt without submitting input or a graceful game exit.
      if (send === '<stop>') break;
      // The answer "<cancel>" withdraws the pending input, as the app would when a session is closed.
      await page.evaluate(value => value === '<cancel>' ? eamon.answer('', true) : eamon.answer(value), send);
      await settle();
    }
    for (const step of rules ? [] : script) {
      const state = await page.evaluate(() => ({screen: eamon.screen, pending: eamon.pending, ended: eamon.events.some(e => e.kind === 'result' || e.kind === 'error')}));
      if (state.ended) break;
      const send = typeof step === 'string' ? step : step.send;
      const fresh = state.screen.slice(Math.min(mark, state.screen.length));
      const entry = {prompt: fresh.slice(-600), type: state.pending.type, send};
      if (step.expect && !fresh.includes(step.expect)) { entry.failed = 'expected text not shown: ' + step.expect; receipt.steps.push(entry); break; }
      mark = state.screen.length;
      receipt.steps.push(entry);
      await page.evaluate(value => eamon.answer(value), send);
      await settle();
    }
    await page.evaluate(() => eamon.commit.catch(() => {}));
    receipt.storage = await page.evaluate(() => ({restored: eamon.restored, commits: eamon.commits, commitError: eamon.commitError}));
    const final = await page.evaluate(() => ({screen: eamon.screen, pending: eamon.pending, events: eamon.events, turns: eamon.turns.map(t => Math.round(t.ms || -1)), ticks: eamon.ticks, failed: !!eamon.failed, inputDisabled: document.getElementById('entry').disabled, terminatedWorkers: window.__probeTerminations || 0}));
    if (script.expectFinal && !script.expectFinal.every(text => final.screen.includes(text)))
      receipt.steps.push({failed: 'required final screen text missing', expected: script.expectFinal});
    if (script.expectFinalRegex && !script.expectFinalRegex.every(pattern => new RegExp(pattern).test(final.screen)))
      receipt.steps.push({failed: 'required final screen pattern missing', expected: script.expectFinalRegex});
    if (script.safeFinal === true && !final.pending?.safePoint)
      receipt.steps.push({failed: 'final prompt was not a safe point'});
    if (process.env.PARCHLOCK_HOST_EXPORT) {
      const stored = await page.evaluate(async () => {
        const tx = (await database).transaction(['files', 'meta']);
        const get = request => new Promise((resolve,reject) => {request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
        const [files,meta] = await Promise.all([get(tx.objectStore('files').getAll()),get(tx.objectStore('meta').getAll())]);
        return {files:files.map(file=>({...file,bytes:file.bytes?Array.from(file.bytes):null})),meta};
      });
      fs.writeFileSync(path.join(work,process.env.PARCHLOCK_HOST_EXPORT),JSON.stringify(stored));
    }
    receipt.finalScreenTail = final.screen.slice(-3000);
    receipt.pending = final.pending; receipt.events = final.events; receipt.turnMs = final.turns;
    receipt.maxTurnMs = Math.max(0, ...final.turns); receipt.logs = logs.filter(l => l.type !== 'log').slice(0, 40);
    receipt.scriptCompleted = (rules ? true : receipt.steps.length === script.length) && !receipt.steps.some(s => s.failed);
    receipt.engineError = final.events.find(e => e.kind === 'error' || (e.kind === 'result' && String(e.value).startsWith('error'))) || null;
    if (process.env.PARCHLOCK_HOST_FAIL_COMMIT) receipt.expectedFailurePass = !!receipt.storage.commitError && final.failed && !final.pending && final.inputDisabled && final.terminatedWorkers === 1 && !!receipt.engineError;
    fs.writeFileSync(path.join(work, receiptName), JSON.stringify(receipt, null, 2));
    if (cdp && !appUrl && !process.env.PARCHLOCK_HOST_KEEP) await page.close();
    console.log(final.screen.slice(-(Number(process.env.PARCHLOCK_HOST_TAIL) || 2500)));
    console.log('\n--- first prompt ms', receipt.firstPromptMs, 'max turn ms', receipt.maxTurnMs, 'steps', receipt.steps.length, 'pending', JSON.stringify(final.pending), 'storage', JSON.stringify(receipt.storage), 'events', JSON.stringify(final.events.filter(e => e.kind !== 'result')).slice(0, 900));
    if (process.env.PARCHLOCK_HOST_FAIL_COMMIT ? !receipt.expectedFailurePass : (receipt.engineError || !receipt.scriptCompleted)) process.exitCode = 1;
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
