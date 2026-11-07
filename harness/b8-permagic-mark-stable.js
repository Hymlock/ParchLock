/** B8: permagic obj29 mark stable across unseeded LOOKs (shortName junk). */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
function ok(c, m) {
  if (c) { pass++; console.log("PASS:", m); }
  else { fail++; console.error("FAIL:", m); }
}

(async () => {
  const marks = [];
  const names = [];
  for (let run = 0; run < 16; run++) {
    const b = await chromium.launch({ headless: true });
    const p = await b.newPage();
    await p.addInitScript(() => {
      sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
      localStorage.setItem("PL_TutorialSeen", "1");
    });
    await p.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/permagic.z5.js&r=" + Date.now() + run);
    await p.waitForTimeout(1500);
    for (let i = 0; i < 18; i++) {
      await p.evaluate(() => {
        document.querySelector(".parchlock-splash__start")?.click();
        try { Message.Hide(); } catch (e) {}
      });
      if (await p.locator(".Input.LineInput").count()) break;
      await p.keyboard.press("Space");
      await p.waitForTimeout(90);
    }
    await p.evaluate(() => { Input.Clear(); Input.Inject("look", true); });
    let last = "", stable = 0;
    for (let i = 0; i < 20; i++) {
      await p.waitForTimeout(150);
      const m = await p.evaluate(() =>
        [...document.querySelectorAll(".pl-act")]
          .filter((e) => String(e.dataset.objectId) === "29")
          .map((e) => e.textContent.trim())
          .sort()
          .join("|")
      );
      if (m === last) stable++;
      else { stable = 0; last = m; }
      if (stable >= 3 && last) break;
    }
    const pack = await p.evaluate(() => {
      const o = Actionable.payloadPool().find((x) => x.id === 29);
      return {
        mark: [...document.querySelectorAll(".pl-act")]
          .filter((e) => String(e.dataset.objectId) === "29")
          .map((e) => e.textContent.trim())[0] || null,
        name: o && o.name,
        short: (() => { try { return ZRamReader.shortName(ZRamProvider.getMem(), 29); } catch (e) { return null; } })()
      };
    });
    marks.push(pack.mark);
    names.push(pack.name);
    console.log("run", run, pack);
    await b.close();
  }
  const uniq = [...new Set(marks)];
  ok(uniq.length === 1 && marks[0] != null, "16 unseeded LOOKs same mark for id 29: " + JSON.stringify(uniq));
  ok(marks[0] === "junk", "mark is shortName head 'junk' (printed in LOOK), got " + marks[0]);
  ok(names.every((n) => n === "junk"), "obj.name stable 'junk' every run, got " + JSON.stringify([...new Set(names)]));
  console.log(pass + " PASS / " + fail + " FAIL");
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
