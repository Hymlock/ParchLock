// grok lane: Sherlock inventoryHidden (FL-NODESC 32) native proof via Lair rope double-tie.
// Read-only replay of jericho sherlock route (seed 0, same RNG shim as grok2 runners). No state forcing.
// Memory decoded directly (z5 object table), independent of dirty ZRamReader.js.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { chromium } = require(path.resolve("node_modules/playwright"));
const { pathToFileURL } = require("url");
const route = require(path.resolve("work/investigations/2026-10-11-jericho-walkthroughs.json")).sherlock;
const OUTDIR = "work/investigations/zil-titles/grok-lane-1031/cache";
const gameSha = crypto.createHash("sha256").update(fs.readFileSync("games/Sherlock.z5.js")).digest("hex");
const IDS = { rope: 176, knife: 151, akbar: 219, moriarty: 257, holmes: null, player: 232, lair: 68 };
(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript((J) => {
    let A = J >>> 0, iv = 0, ct = 0;
    const fr = function (t) {
      t = t << 16 >> 16;
      if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; }
      let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; }
      return r % t + 1;
    };
    let cur;
    Object.defineProperty(window, "__PARCHLOCK_ZVM__", { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } });
    sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
    localStorage.setItem("PL_TutorialSeen", "1");
  }, 0);
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/Sherlock.z5.js");
  await page.waitForTimeout(3500);
  const settle = async () => {
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => { document.querySelector(".parchlock-splash__start")?.click(); try { Message.Hide(); } catch (e) {} });
      if (await page.locator(".Input.LineInput").count()) return true;
      const c = page.locator(".Input.CharInput");
      if (await c.count()) {
        const t = await page.evaluate(() => (document.querySelector("#windowport")?.innerText || "").slice(-200));
        await c.first().focus();
        await page.keyboard.press(/Y or N|press Y/i.test(t) ? "n" : "Space");
      }
      await page.waitForTimeout(80);
    }
    return false;
  };
  const txtLen = () => page.evaluate(() => (document.querySelector("#windowport")?.innerText || "").length);
  const cmd = async (c) => {
    await settle();
    const n0 = await txtLen();
    if (await page.locator(".Input.LineInput").count()) {
      await page.locator(".Input.LineInput").fill(c);
      await page.keyboard.press("Enter");
    } else if (await page.locator(".Input.CharInput").count()) {
      await page.locator(".Input.CharInput").first().focus();
      await page.keyboard.press(c[0]);
    }
    await page.waitForTimeout(550);
    await settle();
    return page.evaluate((n0) => { const s = document.querySelector("#windowport")?.innerText || ""; return s.length >= n0 ? s.slice(Math.max(0, n0 - 40)) : s.slice(-900); }, n0);
  };
  const snap = () => page.evaluate((IDS) => {
    const M = ZRamProvider.getMem();
    const g = (M && typeof M.getUint8 === "function") ? (a) => M.getUint8(a) : (a) => M[a];
    const w = (a) => (g(a) << 8) | g(a + 1);
    const base = w(0x0A) + 126;
    const o = (n) => base + (n - 1) * 14;
    const at = (n, b) => (g(o(n) + (b >> 3)) >> (7 - (b & 7))) & 1;
    const r = {};
    for (const [k, n] of Object.entries(IDS)) if (n) {
      const hex = [0,1,2,3,4,5].map((i) => g(o(n) + i)).map((x) => x.toString(16).padStart(2, "0")).join("");
      r[k] = { id: n, attrHex: hex, parent: w(o(n) + 6), nodesc32: at(n, 32), locked15: at(n, 15), asleep24: at(n, 24) };
    }
    const kids = []; let c = w(o(232) + 10); while (c) { kids.push({ id: c, nodesc32: at(c, 32) }); c = w(o(c) + 8); }
    r.playerChildren = kids;
    r.memType = Object.prototype.toString.call(M);
    return r;
  }, IDS);
  await settle();
  const log = [];
  const step = async (label, c) => { const text = await cmd(c); const s = await snap(); log.push({ label, cmd: c, text, snap: s }); return { text, s }; };
  { const s0 = await snap(); log.push({ label: "boot", snap: s0 }); console.log("boot snap", s0.memType, JSON.stringify(s0.rope)); }
  for (let i = 0; i <= 326; i++) await cmd(route[i]);
  log.push({ label: "checkpoint-after-route-0..326", snap: await snap() });
  await step("route327-single-untie-holmes", route[327]);
  await step("NEG-same-object-inventory-after-single-untie", "inventory");
  await step("route328-double-tie", route[328]);
  await step("POS1-untie-rope-double", "untie rope");
  await step("POS1-inventory", "inventory");
  await step("RESET-drop", "drop rope");
  await step("RESET-take", "take rope");
  await step("RESET-inventory", "inventory");
  await step("RETIE", route[328]);
  await step("POS2-cut-rope-double", "cut rope with knife");
  await step("POS2-inventory", "inventory");
  const out = { game: "Sherlock.z5.js", gameSha256: gameSha, seed: 0, route: "jericho sherlock 0..328 (2026-10-11-jericho-walkthroughs.json)",
    producer: "work/investigations/zil-titles/grok-lane-1031/run-invhidden-lair.cjs", bitOrder: "attr b: byte[b>>3] & (128>>(b&7))", ids: IDS, log };
  const raw = JSON.stringify(out, null, 2);
  const dg = crypto.createHash("sha256").update(raw).digest("hex");
  fs.writeFileSync(OUTDIR + "/run-invhidden-lair.json", raw);
  fs.writeFileSync(OUTDIR + "/run-invhidden-lair.sha256", dg);
  console.log("digest", dg);
  for (const e of log) console.log("==", e.label, "|", e.cmd || "", "| rope", JSON.stringify(e.snap.rope), "| akbarSleep", e.snap.akbar.asleep24, "moriSleep", e.snap.moriarty.asleep24, "\n", (e.text || "").replace(/\s+/g, " ").slice(-420));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
