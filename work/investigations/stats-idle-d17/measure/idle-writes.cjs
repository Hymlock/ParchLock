// D17 idle measurement: play 5 Zork I turns, then count PM_Stats_* setItem calls over 3 s idle.
// usage: node idle-writes.cjs <servedRoot> <label>
const ROOT = process.argv[2], LABEL = process.argv[3];
const OUT = __dirname;
const { chromium } = require('C:/Users/hymlo/Downloads/Projects/Parchmap-main/wt-claude-d17/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(path.normalize(ROOT)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch({ headless: true }); const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1');
    window.__w = []; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/^PM_Stats_/.test(k)) window.__w.push({ t: Date.now(), k }); return o.apply(this, arguments); }; });
  const errors = []; const p = await ctx.newPage(); p.on('pageerror', e => errors.push(String(e.message || e)));
  await p.goto(BASE + 'play.html?story=' + encodeURIComponent('games/Zork1-TheGreatUndergroundEmpire.z3.js')); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 14 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  for (const c of ['north', 'east', 'open window', 'enter', 'take bottle']) { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1200); }
  await p.waitForTimeout(1500);
  const playWrites = await p.evaluate(() => window.__w.length);
  await p.evaluate(() => { window.__w = []; }); await p.waitForTimeout(3000);
  const idle = await p.evaluate(() => window.__w.length);
  const stats = await p.evaluate(() => { const m = StatTracker.model(); const o = {}; for (const k in m.stats) o[k] = { value: m.stats[k].value, seen: m.stats[k].seen, confirmed: m.stats[k].confirmed }; return o; });
  const stored = await p.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^PM_Stats_/.test(k)) return { k, hasBadgeKeys: /badgeUntil|badgeDelta|lastChange/.test(localStorage.getItem(k)) }; } return null; });
  const res = { label: LABEL, root: ROOT, playWrites, idleWrites3s: idle, stats, stored, errors };
  console.log(JSON.stringify(res)); fs.writeFileSync(path.join(OUT, 'result-' + LABEL + '.json'), JSON.stringify(res, null, 1));
  await browser.close(); srv.close();
})();
