const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const out = path.join(__dirname, "shots-build43");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  const story = "http://127.0.0.1:8765/harness/fixtures/LostPig.z8";
  await page.goto(`http://127.0.0.1:8765/play.html?host=emglken&story=${encodeURIComponent(story)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  let best = null;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    best = await page.evaluate(() => {
      const f = document.getElementById("pl-emglken-frame");
      let child = null;
      try {
        const w = f && f.contentWindow;
        child = w && {
          href: w.location.href,
          glk: typeof w.GlkOte,
          text: (w.document.body && w.document.body.innerText || "").slice(0, 160)
        };
      } catch (e) { child = { err: String(e) }; }
      return {
        url: location.href,
        onPlayHtml: /play\.html/.test(location.pathname),
        hostClass: document.documentElement.classList.contains("pl-host-emglken"),
        hasMap: !!document.getElementById("map"),
        hasTools: !!document.getElementById("tools-toggle"),
        hasFrame: !!f,
        frameRect: f ? { w: f.getBoundingClientRect().width, h: f.getBoundingClientRect().height } : null,
        current: typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom,
        rooms: typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms && ParchLockMap.Rooms.length,
        payloadRoom: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
        payloadMode: WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.engineMode,
        translator: typeof TranslatorUI,
        child
      };
    });
    if (best.onPlayHtml && (best.payloadRoom || (best.child && best.child.glk === "object") || (best.child && /Pig lost|Outside|Score:/i.test(best.child.text||"")))) break;
  }
  await page.screenshot({ path: path.join(out, "playhtml-emglken-lostpig.png"), fullPage: true });
  const report = { best, errs: errs.slice(0, 8) };
  fs.writeFileSync(path.join(out, "playhtml-emglken-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!best.onPlayHtml) process.exit(2);
  if (!best.hasMap || !best.hasTools) process.exit(3);
})().catch(e => { console.error(e); process.exit(1); });
