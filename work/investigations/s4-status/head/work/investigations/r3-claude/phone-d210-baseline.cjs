// D210 device baseline (claude, 2026-10-23): for up to N visible marks, real adb long-press (900 ms), then read over
// CDP whether the radial opened and whether any native selection exists (and what it covers). Screenshot per press.
// Closes the radial with Back between presses. Run on the phone, before and after the fix; compare counts.
//   node phone-d210-baseline.cjs <outDir> [N]
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const sh = c => execSync(c, { encoding: 'utf8' });
(async () => {
  const [out, n] = [process.argv[2], +(process.argv[3] || 6)]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333'); const p = b.contexts()[0].pages()[0];
  const marks = await p.evaluate(() => { const vh = innerHeight, off = screen.height - innerHeight, d = devicePixelRatio;
    return [...document.querySelectorAll('.pl-act:not(.is-stale)')].map(m => { const r = m.getClientRects()[0]; return r && { t: m.textContent.trim(), x: Math.round((r.left + r.width / 2) * d), y: Math.round((r.top + r.height / 2 + off) * d), vis: r.top > 60 && r.bottom < vh - 220 }; })
      .filter(x => x && x.vis); });
  const pick = marks.slice(-n); const rows = [];
  for (const [i, m] of pick.entries()) {
    sh(`adb shell input swipe ${m.x} ${m.y} ${m.x} ${m.y} ${process.env.HOLD || 900}`); await p.waitForTimeout(1200);
    const s = await p.evaluate(() => { const sel = getSelection(); const t = sel ? sel.toString() : ''; const node = sel && sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
      const el = node && (node.nodeType === 1 ? node : node.parentElement); return { radial: document.body.classList.contains('radial-open'), selected: t.slice(0, 40), inMenu: !!(el && el.closest && el.closest('#radial-menu')) }; });
    fs.writeFileSync(`${out}/press${i}.png`, execSync('adb exec-out screencap -p'));
    rows.push({ mark: m.t, ...s }); console.log(JSON.stringify(rows[rows.length - 1]));
    sh('adb shell input keyevent KEYCODE_BACK'); await p.waitForTimeout(500); await p.evaluate(() => { try { getSelection().removeAllRanges(); } catch (e) {} }); await p.waitForTimeout(300);
  }
  const sel = rows.filter(r => r.selected).length;
  console.log(`SUMMARY presses=${rows.length} radialOpened=${rows.filter(r => r.radial).length} withSelection=${sel} selectionInMenu=${rows.filter(r => r.inMenu).length}`);
  fs.writeFileSync(`${out}/summary.json`, JSON.stringify(rows, null, 1)); await b.close();
})().catch(e => console.log('ERR ' + e.message));
