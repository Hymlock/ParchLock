// Plays a scripted session against the real engine host in headless Chromium and writes a receipt.
// Env: PARCHLOCK_SOURCE_ROOT (repo, for playwright), PARCHLOCK_HOST_WORK (scratch build dir),
//      PARCHLOCK_HOST_SCRIPT (JSON array of answers; a step may be {expect:"text", send:"answer"}).
const http = require('http'), fs = require('fs'), path = require('path');
const {chromium} = require(path.join(process.env.PARCHLOCK_SOURCE_ROOT, 'node_modules/playwright'));
const work = path.resolve(process.env.PARCHLOCK_HOST_WORK);
const root = path.join(work, 'eamon-host/bin/Release/net8.0/publish/wwwroot');
const dataRoot = path.join(work, 'data');
const fixtures = new Set(['/host-index.html', '/host-sw.js', '/host-worker.js']);
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm'};
const script = JSON.parse(fs.readFileSync(process.env.PARCHLOCK_HOST_SCRIPT, 'utf8').replace(/^﻿/, ''));
const receiptName = process.env.PARCHLOCK_HOST_RECEIPT || 'host-probe-receipt.json';
(async () => {
  const logs = [];
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file;
    if (fixtures.has(pathname)) file = path.join(__dirname, pathname.slice(1));
    else if (pathname.startsWith('/eamon-data/')) { file = path.resolve(dataRoot, pathname.slice(12)); if (!file.startsWith(dataRoot + path.sep)) { res.writeHead(403).end(); return; } }
    else { file = path.resolve(root, '.' + pathname); if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; } }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      if (path.basename(file) === 'manifest.json' && bytes[0] === 0xEF) bytes = bytes.subarray(3);
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser; const receipt = {scope: 'Local headless Chromium only. Real Eamon CS engine in a .NET worker with the ParchLock host adapters.', steps: []};
  try {
    browser = await chromium.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', m => logs.push({type: m.type(), text: m.text()}));
    page.on('pageerror', e => logs.push({type: 'pageerror', text: String(e)}));
    const began = Date.now();
    await page.goto('http://127.0.0.1:' + server.address().port + '/host-index.html');
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
      receipt.steps.push({prompt: tail.slice(-160), send});
      await page.evaluate(value => eamon.answer(value), send);
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
    const final = await page.evaluate(() => ({screen: eamon.screen, pending: eamon.pending, events: eamon.events, turns: eamon.turns.map(t => Math.round(t.ms || -1)), ticks: eamon.ticks}));
    receipt.finalScreenTail = final.screen.slice(-3000);
    receipt.pending = final.pending; receipt.events = final.events; receipt.turnMs = final.turns;
    receipt.maxTurnMs = Math.max(0, ...final.turns); receipt.logs = logs.filter(l => l.type !== 'log').slice(0, 40);
    receipt.scriptCompleted = (rules ? true : receipt.steps.length === script.length) && !receipt.steps.some(s => s.failed);
    receipt.engineError = final.events.find(e => e.kind === 'error' || (e.kind === 'result' && String(e.value).startsWith('error'))) || null;
    fs.writeFileSync(path.join(work, receiptName), JSON.stringify(receipt, null, 2));
    console.log(final.screen.slice(-(Number(process.env.PARCHLOCK_HOST_TAIL) || 2500)));
    console.log('\n--- first prompt ms', receipt.firstPromptMs, 'max turn ms', receipt.maxTurnMs, 'steps', receipt.steps.length, 'pending', JSON.stringify(final.pending), 'events', JSON.stringify(final.events).slice(0, 1500));
    if (receipt.engineError || !receipt.scriptCompleted) process.exitCode = 1;
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
