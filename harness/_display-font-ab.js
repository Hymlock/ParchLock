const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const outDir = path.join("tools", "screenshots", "matrix");
fs.mkdirSync(outDir, { recursive: true });

function splash(page) {
  return page.evaluate(() => {
    const b = document.querySelector(".parchlock-splash__start, .parchmap-splash__start, button.parchlock-splash__start");
    if (b) b.click();
    const root = document.getElementById("parchlock-splash") || document.querySelector(".parchlock-splash");
    if (root) root.remove();
    document.body && document.body.classList.remove("parchlock-splash-active");
  }).catch(() => {});
}

async function waitGame(page) {
  for (let i = 0; i < 60; i++) {
    const ok = await page.evaluate(() => {
      const buf = document.querySelector("#windowport .BufferWindow");
      return !!(buf && (buf.innerText || "").trim().length > 20);
    });
    if (ok) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function measure(page) {
  return page.evaluate(() => {
    const buf = document.querySelector("#windowport .BufferWindow");
    const span = document.querySelector("#windowport .BufferWindow .Style_normal, #windowport .BufferWindow span");
    const grid = document.querySelector("#windowport .GridWindow");
    const input = document.querySelector(".Input.LineInput");
    const menu = document.querySelector("#game-menu");
    const cs = (el) => el ? getComputedStyle(el) : null;
    const b = cs(buf), s = cs(span), g = cs(grid), inp = cs(input), m = cs(menu);
    return {
      pref: (window.Global && Global.Prefs && Global.Prefs.FontSize) || null,
      cssVar: getComputedStyle(document.documentElement).getPropertyValue("--pl-play-font-size").trim(),
      bufferFs: b && b.fontSize,
      spanFs: s && s.fontSize,
      gridFs: g && g.fontSize,
      inputFs: inp && inp.fontSize,
      menuFs: m && m.fontSize,
      sample: buf ? (buf.innerText || "").slice(0, 80).replace(/\s+/g, " ") : ""
    };
  });
}

async function setSizeViaDisplay(page, targetPx) {
  await page.evaluate(() => {
    if (typeof Global !== "undefined" && Global.SetFontSize) Global.SetFontSize(20);
  });
  // Use the Display UI path
  await page.evaluate(() => {
    if (typeof ParchLockQol !== "undefined" && ParchLockQol.ShowDisplay) ParchLockQol.ShowDisplay();
    else if (typeof Message !== "undefined") { /* fallback */ }
  });
  await page.waitForTimeout(300);
  const cur = await page.evaluate(() => (Global && Global.Prefs && Global.Prefs.FontSize) || 20);
  const steps = targetPx - cur;
  if (steps > 0) {
    for (let i = 0; i < steps; i++) {
      await page.click("#font-larger");
      await page.waitForTimeout(80);
    }
  } else if (steps < 0) {
    for (let i = 0; i < -steps; i++) {
      await page.click("#font-smaller");
      await page.waitForTimeout(80);
    }
  }
  await page.waitForTimeout(400);
  await page.evaluate(() => { if (typeof Message !== "undefined" && Message.Hide) Message.Hide(); });
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = { desktop: {}, mobile: {} };

  // --- Desktop viewport ---
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto("http://127.0.0.1:8765/play.html?story=games/anchor.z8.js", { waitUntil: "domcontentloaded", timeout: 60000 });
    await splash(page);
    await page.waitForTimeout(1500);
    await splash(page);
    const loaded = await waitGame(page);
    results.desktop.loaded = loaded;
    if (loaded) {
      await page.evaluate(() => { if (Global && Global.SetFontSize) Global.SetFontSize(20); });
      await page.waitForTimeout(500);
      results.desktop.at20 = await measure(page);
      await page.screenshot({ path: path.join(outDir, "display-font-desktop-20.png"), fullPage: false });

      await setSizeViaDisplay(page, 28);
      results.desktop.at28 = await measure(page);
      await page.screenshot({ path: path.join(outDir, "display-font-desktop-28.png"), fullPage: false });

      await setSizeViaDisplay(page, 14);
      results.desktop.at14 = await measure(page);
      await page.screenshot({ path: path.join(outDir, "display-font-desktop-14.png"), fullPage: false });

      // Direct API path (same as Display buttons)
      await page.evaluate(() => Global.SetFontSize(24));
      await page.waitForTimeout(500);
      results.desktop.at24_api = await measure(page);
    }
    await page.close();
  }

  // --- Mobile viewport ---
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    });
    await page.goto("http://127.0.0.1:8765/play.html?story=games/anchor.z8.js", { waitUntil: "domcontentloaded", timeout: 60000 });
    await splash(page);
    await page.waitForTimeout(1500);
    await splash(page);
    // force mobile class if needed
    await page.evaluate(() => { document.body.classList.add("pl-mobile"); });
    const loaded = await waitGame(page);
    results.mobile.loaded = loaded;
    if (loaded) {
      await page.evaluate(() => { if (Global && Global.SetFontSize) Global.SetFontSize(20); });
      await page.waitForTimeout(600);
      results.mobile.at20 = await measure(page);
      await page.screenshot({ path: path.join(outDir, "display-font-mobile-20.png"), fullPage: false });

      await page.evaluate(() => Global.SetFontSize(28));
      await page.waitForTimeout(600);
      results.mobile.at28 = await measure(page);
      await page.screenshot({ path: path.join(outDir, "display-font-mobile-28.png"), fullPage: false });

      await page.evaluate(() => Global.SetFontSize(14));
      await page.waitForTimeout(600);
      results.mobile.at14 = await measure(page);
      await page.screenshot({ path: path.join(outDir, "display-font-mobile-14.png"), fullPage: false });
    }
    await page.close();
  }

  await browser.close();

  const px = (s) => parseFloat(String(s || "").replace("px", "")) || 0;
  const verdict = {
    desktopBufferChanges: results.desktop.at20 && results.desktop.at28
      ? Math.abs(px(results.desktop.at28.bufferFs) - px(results.desktop.at20.bufferFs)) >= 1
      : false,
    desktopMenuUnchanged: results.desktop.at20 && results.desktop.at28
      ? px(results.desktop.at20.menuFs) === px(results.desktop.at28.menuFs)
      : null,
    mobileBufferChanges: results.mobile.at20 && results.mobile.at28
      ? Math.abs(px(results.mobile.at28.bufferFs) - px(results.mobile.at20.bufferFs)) >= 1
      : false,
    mobileAt28VsFit: results.mobile.at28 || null
  };
  results.verdict = verdict;
  const outPath = path.join(outDir, "display-font-live-ab.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.log("WROTE", outPath);
  process.exit(verdict.desktopBufferChanges ? 0 : 2);
})().catch((e) => { console.error(e); process.exit(1); });
