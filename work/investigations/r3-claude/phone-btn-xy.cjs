// Device-pixel centre of a visible on-screen element whose text is exactly <label> (e.g. a radial entry "Drink").
//   node phone-btn-xy.cjs <label>   -> "x y" or nothing (claude, 2026-10-22)
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333'); const p = b.contexts()[0].pages()[0];
  const r = await p.evaluate((t) => { const want = t.toLowerCase();
    const el = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && e.textContent.trim().toLowerCase() === want)
      .map(e => ({ e, k: e.getBoundingClientRect() })).filter(x => x.k.width > 0 && x.k.height > 0).pop();
    if (!el) return null; return { x: el.k.left + el.k.width / 2, y: el.k.top + el.k.height / 2, dpr: devicePixelRatio, ih: innerHeight, sh: screen.height }; }, process.argv[2]);
  await b.close();
  if (r) console.log(Math.round(r.x * r.dpr) + ' ' + Math.round((r.y + (r.sh - r.ih)) * r.dpr));
})().catch(() => {});
