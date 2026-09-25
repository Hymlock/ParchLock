const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROME || undefined,
    headless: true
  });
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push("PAGE: " + e.message + "\n" + (e.stack || "")));
  page.on("console", m => { if (m.type() === "error") errs.push("CON: " + m.text()); });
  const url = "http://127.0.0.1:8765/play.html";
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  const globals = await page.evaluate(() => ({
    Autocomplete: typeof Autocomplete,
    Input: typeof Input,
    TranslatorUI: typeof TranslatorUI,
    WorldModel: typeof WorldModel,
    HostEmglkenBridge: typeof HostEmglkenBridge,
    RemGlk: typeof RemGlkTapProvider,
    BUILD: (typeof Consts !== "undefined" && Consts.BUILD) || (window.BUILD) || null
  }));
  console.log(JSON.stringify({ globals, errs: errs.slice(0, 12) }, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
