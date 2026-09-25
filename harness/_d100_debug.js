const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__spoken = [];
    window.SpeechSynthesisUtterance = function (text) { this.text = text || ""; this.rate = 1; this.volume = 1; };
    window.speechSynthesis = {
      cancel() {}, resume() {}, speak(u) { window.__spoken.push(u && u.text); console.log("SPEAK", u && u.text); }, getVoices() { return []; }
    };
    try { localStorage.removeItem("PL_Prefs"); } catch (e) {}
  });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    const out = { hasRA: typeof ReadAloud, pref: Global && Global.Prefs && Global.Prefs.ReadAloud, supported: ReadAloud.isSupported(), hasSS: !!window.speechSynthesis, hasUtt: typeof SpeechSynthesisUtterance };
    try {
      Global.Prefs.ReadAloud = true;
      window.__spoken = [];
      ReadAloud.speak("hello test voice");
      out.spoken = window.__spoken.slice();
      out.err = null;
    } catch (e) { out.err = String(e); out.spoken = window.__spoken.slice(); }
    return out;
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e => console.error(e));
