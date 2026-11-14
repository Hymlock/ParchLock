// Gate G1, Windows target: the desktop distribution folder (what ParchLock.exe serves on 127.0.0.1) in the installed
// Google Chrome (the browser the launcher starts), headless so no window opens. Measures command round trip in the
// page (Enter keydown to the next live input, MutationObserver), long tasks, and cold start (new browser process,
// persisted campaign, to the first prompt). Usage: node g1-win.cjs <repo-for-playwright> <dist-dir> <package> <out>
const http = require('http'), fs = require('fs'), path = require('path');
const [repoArg, distArg, pkg, out] = process.argv.slice(2); const dist = path.resolve(distArg);
const { chromium } = require(path.join(path.resolve(repoArg), 'node_modules/playwright'));
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = path.join(dist, p);
  if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const log = []; const note = (s) => { log.push(s); console.log(s); };
const PORT = 8953, base = 'http://127.0.0.1:' + PORT;
const launch = () => chromium.launchPersistentContext(path.join(out, 'profile'), { channel: 'chrome', headless: true, viewport: { width: 1280, height: 900 } });
const noTour = () => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialLibrarySeen', '1'); localStorage.setItem('PL_TutorialSeen', '1'); } catch (e) {} };
const instrument = () => {
  window.__g1 = { long: [], firstPrompt: null };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__g1.long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  const mo = new MutationObserver(() => { if (!window.__g1.firstPrompt && document.querySelector('#windowport .Input.LineInput, #windowport .Input.CharInput')) window.__g1.firstPrompt = performance.now(); });
  document.addEventListener('DOMContentLoaded', () => mo.observe(document.documentElement, { childList: true, subtree: true }));
};
(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  let ctx = await launch(); await ctx.addInitScript(noTour);
  let page = ctx.pages()[0] || await ctx.newPage(); page.on('dialog', d => d.accept().catch(() => {}));
  note('browser: ' + (await page.evaluate(() => navigator.userAgent)));
  await page.goto(base + '/index.html'); await page.waitForFunction(() => typeof ModuleLibrary !== 'undefined');
  await page.evaluate(() => ModuleLibrary.openManager());
  await page.locator('#pl-module-files').setInputFiles(pkg);
  await page.waitForFunction(() => /added|already present/.test((document.querySelector('#pl-module-results') || {}).innerText || ''), null, { timeout: 180000 });
  const story = await page.evaluate(() => ModuleLibrary.all().filter(g => g.Format === 'eamon')[0].Path);
  await page.goto(base + '/play.html?story=' + story);
  const tail = () => page.evaluate(() => { const t = (document.querySelector('#windowport .BufferWindow') || { innerText: '' }).innerText.replace(/ /g, ' ').replace(/\s+$/, ''); return t.slice(t.lastIndexOf('\n') + 1); });
  const clickKey = async (k) => page.locator('span.pl-act[data-kind="prompt-key"]:not(.is-stale)', { hasText: new RegExp('^' + k + '$') }).last().click();
  const typeLine = async (s) => { await page.locator('.Input.LineInput').click(); await page.keyboard.type(s); await page.keyboard.press('Enter'); };
  const closeDialogs = async () => { for (let i = 0; i < 3; i++) { if (!(await page.evaluate(() => typeof Message !== 'undefined' && Message.IsOpen))) return; await page.keyboard.press('Escape'); await page.waitForTimeout(300); } };
  let entered = false;
  for (let step = 0; step < 80 && !entered; step++) {
    await page.waitForTimeout(900); await closeDialogs(); const t = await tail();
    if (/Press any key/i.test(t)) await page.keyboard.press('Space');
    else if (/D for desk/.test(t)) await clickKey('D');
    else if (/type it in now/.test(t)) await typeLine('TimeHero');
    else if (/Y for yes or N for no/.test(t)) await clickKey('Y');
    else if (/0=Male/.test(t)) await clickKey('0');
    else if (/commit suicide/.test(t)) await clickKey('N');
    else if (/R to read/.test(t)) await clickKey('T');
    else if (/\[X\]:$/.test(t)) await clickKey('1');
    else if (/Enter the selection/.test(t)) await typeLine('20');
    else if (/introduction story/.test(t)) await clickKey('N').catch(() => page.keyboard.press('n'));
    else if (t.trim() === '>') entered = true;
  }
  if (!entered) { note('STUCK: ' + JSON.stringify((await tail()).slice(-100))); throw new Error('no adventure prompt'); }
  note('in The Training Ground at the command line');
  // Command round trip, measured in the page: real Enter keydown to the next live line input on the last line.
  await page.evaluate(() => {
    window.__rt = []; let t0 = null;
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest && e.target.closest('.Input')) t0 = performance.now(); }, true);
    new MutationObserver(() => {
      if (t0 === null) return;
      const inp = document.querySelector('#windowport .Input.LineInput'); if (!inp) return;
      const lines = document.querySelectorAll('#windowport .BufferLine'); const l = lines[lines.length - 1];
      if (l && l.contains(inp)) { window.__rt.push(Math.round(performance.now() - t0)); t0 = null; }
    }).observe(document.getElementById('windowport'), { childList: true, subtree: true });
    window.__g1long = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__g1long.push(Math.round(e.duration)))).observe({ type: 'longtask' }); } catch (e) {}
  });
  const cmds = ['look', 'inventory', 'look', 'examine sign', 'look', 'inventory', 'look', 'status', 'look', 'inventory', 'look', 'look'];
  for (const c of cmds) { await typeLine(c); await page.waitForTimeout(1200); await closeDialogs(); }
  const rt = await page.evaluate(() => window.__rt), lt = await page.evaluate(() => window.__g1long);
  const sorted = rt.slice().sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
  note('command round trip ms (n=' + rt.length + '): ' + JSON.stringify(rt) + ' median=' + med + ' max=' + sorted[sorted.length - 1]);
  note('long tasks during commands (ms): ' + JSON.stringify(lt) + ' max=' + (lt.length ? Math.max(...lt) : 0));
  await ctx.close();
  // Cold start: a new browser process on the same profile (campaign persisted), straight to the play page.
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now(); ctx = await launch(); await ctx.addInitScript(noTour); await ctx.addInitScript(instrument);
    page = ctx.pages()[0] || await ctx.newPage(); page.on('dialog', d => d.accept().catch(() => {}));
    const tLaunched = Date.now();
    await page.goto(base + '/play.html?story=' + story);
    await page.waitForFunction(() => window.__g1 && window.__g1.firstPrompt, null, { timeout: 60000 });
    const tPrompt = Date.now(); const inPage = await page.evaluate(() => ({ first: Math.round(window.__g1.firstPrompt), long: window.__g1.long }));
    note('cold start ' + i + ': browser launch ' + (tLaunched - t0) + ' ms; launch to first prompt ' + (tPrompt - t0) + ' ms; navigation to first prompt (in page) ' + inPage.first + ' ms; prompt ' + JSON.stringify((await tail()).slice(-40)) + '; long tasks ' + JSON.stringify(inPage.long) + ' max=' + (inPage.long.length ? Math.max(...inPage.long) : 0));
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'g1-win.txt'), log.join('\n')); server.close();
})().catch(e => { note('ERROR ' + e.message.split('\n').slice(0, 6).join(' / ')); fs.writeFileSync(path.join(out, 'g1-win.txt'), log.join('\n')); server.close(); process.exit(1); });
