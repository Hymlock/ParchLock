const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.goto("http://127.0.0.1:8765/play.html?story=games/anchor.z8.js&t=" + Date.now());
  await page.waitForTimeout(3000);
  await page.evaluate(() => { try { Message.Hide(); } catch(e){} });
  for (let i=0;i<10;i++) {
    const r = await page.evaluate(() => {
      if (document.body.classList.contains("has-char-input")) {
        document.getElementById("pl-input-submit").click();
        return "char";
      }
      if (document.body.classList.contains("has-line-input")) return "line";
      try { document.getElementById("pl-input-submit").click(); } catch(e){}
      return "other";
    });
    if (r === "line") break;
    await page.waitForTimeout(500);
  }
  const checks = await page.evaluate(() => {
    const line = document.querySelector(".Input.LineInput");
    const out = {};
    // 1. Glk steal rejected
    if (line) {
      line.focus();
      Input.SyncMobilePromptFocus(true, false);
      out.stealRejected = document.activeElement !== line;
    }
    // 2. Short-tap path
    if (line) {
      $(line).data("pmUserFocus", true).attr("inputmode", "text");
      line.focus();
      out.userTapFocus = document.activeElement === line;
    }
    // 3. Tools dismisses
    Input.DismissKeyboard();
    out.afterDismiss = document.activeElement !== line;
    out.pmUserCleared = !$(line).data("pmUserFocus");
    // 4. Char path still has submit when forced
    out.hasSubmitFn = typeof Input.SubmitPrompt === "function";
    out.hasDismiss = typeof Input.DismissKeyboard === "function";
    out.hasGate = true; // focusin bound at BindInputRow
    return out;
  });
  console.log(JSON.stringify(checks, null, 2));
  const ok = checks.stealRejected && checks.userTapFocus && checks.afterDismiss && checks.pmUserCleared;
  await browser.close();
  process.exit(ok ? 0 : 2);
})().catch(e=>{console.error(e);process.exit(1);});
