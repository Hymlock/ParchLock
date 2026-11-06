// Prints device-pixel centre of the last on-screen mark for a word, for an adb long-press (claude, 2026-10-22).
//   node phone-mark-xy.cjs <word>   -> "x y" in device pixels (or nothing)
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333'); const p = b.contexts()[0].pages()[0];
  const r = await p.evaluate((w) => { const re = new RegExp(w, 'i');
    const m = [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(e => re.test(e.textContent)).pop(); if (!m) return null;
    // First line box, not the bounding box: a mark that wraps across lines has its bounding-box centre over other
    // words (e.g. "package of Funny Bones" -> centre landed on "assignment").
    m.scrollIntoView({ block: 'center' }); const k = m.getClientRects()[0];
    return { x: k.left + k.width / 2, y: k.top + k.height / 2, dpr: devicePixelRatio, ih: innerHeight, sh: screen.height }; }, process.argv[2]);
  await b.close();
  if (!r) return;
  // WebView fills the screen below the status bar: offset = screen CSS height - viewport height.
  console.log(Math.round(r.x * r.dpr) + ' ' + Math.round((r.y + (r.sh - r.ih)) * r.dpr));
})().catch(e => console.log(''));
