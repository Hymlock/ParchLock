const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const outDir = path.join("tools", "screenshots", "matrix");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    window.__speakLog = [];
    window.SpeechSynthesisUtterance = function (text) {
      this.text = text || ""; this.rate = 1; this.volume = 1;
    };
    const ss = {
      cancel() {}, resume() {},
      speak(u) {
        const t = (u && u.text) || "";
        window.__speakLog.push({ t: Date.now(), text: t, n: t.length });
      },
      getVoices() { return []; }
    };
    try {
      Object.defineProperty(window, "speechSynthesis", { configurable: true, get() { return ss; }, set() {} });
    } catch (e) { window.speechSynthesis = ss; }
    // Also wrap ReadAloud.speak after load via hook below
    try { localStorage.removeItem("PL_Prefs"); } catch (e) {}
  });

  const url = pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js&t=" + Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const b = document.querySelector(".parchlock-splash__start");
    if (b) b.click();
    const root = document.getElementById("parchlock-splash");
    if (root) root.remove();
    document.body.classList.remove("parchlock-splash-active");
  });

  // Hook ReadAloud.speak if present
  await page.waitForFunction(() => typeof ReadAloud !== "undefined", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => {
    if (typeof ReadAloud === "undefined") return;
    Global.Prefs.ReadAloud = true;
    window.__speakLog = window.__readAloudLog || [];
    // Prefer engine-committed log (only real speaks), poll it
  });

  // Wait for game text
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate(() => {
      const b = document.querySelector("#windowport .BufferWindow");
      return b && (b.innerText || "").replace(/\s+/g, " ").trim().length > 30;
    });
    if (ok) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(5000);

  // Simulate a few "turns" by injecting keys if possible
  await page.keyboard.press("Enter").catch(() => {});
  await page.waitForTimeout(1500);
  await page.keyboard.type("look").catch(() => {});
  await page.keyboard.press("Enter").catch(() => {});
  await page.waitForTimeout(2500);

  const report = await page.evaluate(() => {
    const log = window.__readAloudLog || window.__speakLog || [];
    const texts = log.map(x => x.text || x);
    const norm = s => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
    const counts = {};
    texts.forEach(t => {
      const k = norm(t).slice(0, 200);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    const repeats = Object.entries(counts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
    const buf = document.querySelector("#windowport .BufferWindow");
    return {
      speakCount: log.length,
      totalChars: texts.reduce((a, t) => a + t.length, 0),
      repeats: repeats.slice(0, 20).map(([k, c]) => ({ count: c, sample: k.slice(0, 120) })),
      first5: texts.slice(0, 5).map(t => t.slice(0, 160)),
      all: texts.map(t => t.slice(0, 300)),
      bufferSample: buf ? (buf.innerText || "").replace(/\s+/g, " ").trim().slice(0, 400) : null,
      pref: Global && Global.Prefs && Global.Prefs.ReadAloud
    };
  });

  const analysis = {
    operatorComplaint: ["headers/setup noise", "repeating main blocks"],
    speakCount: report.speakCount,
    uniqueApprox: report.speakCount - report.repeats.reduce((a, r) => a + (r.count - 1), 0),
    topRepeats: report.repeats.slice(0, 8),
    likelyCauses: [],
    raw: report
  };
  if (report.repeats.some(r => r.count >= 3)) analysis.likelyCauses.push("R1/R4: same prose spoken 3+ times (rebuild or weak dedup)");
  if (report.speakCount > 15) analysis.likelyCauses.push("R1/R3: excessive speak events during boot (poll or multi-mutation)");
  if (report.all.some(t => /aria|layout|test pane|opacity|pm-|pl-act/i.test(t))) analysis.likelyCauses.push("R2: chrome/setup strings in speak stream");
  // spaced headers
  if (report.all.some(t => /^(\s*[A-Z]\s+){4,}/.test(t) || /A N C H O R/.test(t))) analysis.likelyCauses.push("letter-spaced title/header spoken as text");

  fs.writeFileSync(path.join(outDir, "d100-speak-capture.json"), JSON.stringify(analysis, null, 2));
  console.log(JSON.stringify({
    speakCount: analysis.speakCount,
    topRepeats: analysis.topRepeats,
    likelyCauses: analysis.likelyCauses,
    first5: report.first5
  }, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
