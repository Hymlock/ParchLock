// Load candidate web assets into the installed app on the phone WITHOUT rebuilding (claude, 2026-10-23).
// Keeps a CDP connection open with request interception: requests for the listed files are answered from the local
// working copy; everything else goes to the APK's bundled assets. Then reloads the page and opens <story>.
// Prints sha256 of each served file. Stays alive (Ctrl+C / kill to stop) so the override persists for the gate.
//   node phone-load-candidate.cjs <story.js> js/Qol.js css/ParchLock.css
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const fs = require('fs'); const crypto = require('crypto');
(async () => {
  const [story, ...files] = process.argv.slice(2);
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333'); const p = b.contexts()[0].pages()[0];
  // The app's service worker serves cached assets before interception; bypass it for this page only (cache untouched).
  const cdp = await p.context().newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.setBypassServiceWorker', { bypass: true });
  for (const f of files) {
    const body = fs.readFileSync(f); console.log('override ' + f + ' sha256 ' + crypto.createHash('sha256').update(body).digest('hex'));
    await p.route(u => new URL(u).pathname.endsWith('/' + f), r => r.fulfill({ status: 200, body, contentType: f.endsWith('.css') ? 'text/css' : 'application/javascript' }));
  }
  await p.goto('https://localhost/play.html?story=games/' + story); await p.waitForTimeout(5000);
  const ok = await p.evaluate(() => ({ hasBegin: typeof ParchLockQol !== 'undefined' && typeof ParchLockQol.BeginRadialSelection === 'function',
    css: [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => /body\.radial-open \*/.test(r.selectorText || '')); } catch (e) { return false; } }) }));
  console.log('candidate active: ' + JSON.stringify(ok)); console.log('READY');
  setInterval(() => {}, 1 << 30);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
