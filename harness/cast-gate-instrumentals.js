/**
 * Cast-gate: instrumentals need dictionary VERB (Inform) or ZIL 2-obj+prep template.
 * gamlet loses Cast at...; Balances keeps it; unlock still appears where verb exists.
 */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
function ok(c, m) {
  if (c) { pass++; console.log("PASS:", m); }
  else { fail++; console.error("FAIL:", m); }
}

async function boot(page, story) {
  await page.addInitScript(() => {
    sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
    localStorage.setItem("PL_TutorialSeen", "1");
    localStorage.setItem("PL_MobileTutorialSeen", "1");
  });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/" + story);
  await page.waitForTimeout(1400);
  for (let i = 0; i < 18; i++) {
    await page.evaluate(() => {
      document.querySelector(".parchlock-splash__start")?.click();
      try { Message.Hide(); } catch (e) {}
    });
    if (await page.locator(".Input.LineInput").count()) break;
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
  }
}

async function inst(page) {
  return page.evaluate(() => Actionable.availableInstrumentals().map((i) => i.verb));
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // gamlet: cast is a word, not a verb → no Cast at
  {
    const page = await browser.newPage();
    await boot(page, "gamlet.z5.js");
    const v = await inst(page);
    ok(!v.includes("cast"), "gamlet: no Cast at... (word≠verb), got " + JSON.stringify(v));
    await page.close();
  }

  // Balances: real cast verb → keep Cast at
  {
    const page = await browser.newPage();
    await boot(page, "Balances.z5.js");
    const v = await inst(page);
    ok(v.includes("cast"), "Balances: keeps Cast at..., got " + JSON.stringify(v));
    ok(v.includes("unlock"), "Balances: Unlock with... still present when unlock is a verb");
    await page.close();
  }

  // anchor: no cast verb
  {
    const page = await browser.newPage();
    await boot(page, "anchor.z8.js");
    const v = await inst(page);
    ok(!v.includes("cast"), "anchor: no Cast at..., got " + JSON.stringify(v));
    ok(v.includes("unlock"), "anchor: Unlock with... still present");
    await page.close();
  }

  // Enchanter ZIL: cast 2-obj at template
  {
    const page = await browser.newPage();
    await boot(page, "Enchanter.z3.js");
    const v = await inst(page);
    ok(v.includes("cast"), "Enchanter: keeps Cast at... (ZIL template), got " + JSON.stringify(v));
    await page.close();
  }

  // BibleRetold: cast is dictionary-verb (cast-at parses)
  {
    const page = await browser.newPage();
    await boot(page, "BibleRetold.z5.js");
    const v = await inst(page);
    ok(v.includes("cast"), "BibleRetold: keeps Cast at... (dictionary-verb), got " + JSON.stringify(v));
    await page.close();
  }

  await browser.close();
  console.log(pass + " PASS / " + fail + " FAIL");
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
