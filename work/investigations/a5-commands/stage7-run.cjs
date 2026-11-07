// A5 stage 7 held-out challenge runner (evaluator). Interim-friendly.
// Usage: node work/investigations/a5-commands/stage7-run.cjs [maxTitles]
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.resolve("node_modules/playwright"));
const { pathToFileURL } = require("url");

const TITLES = [
  "catseye.z3.js",
  "905.z5.js",
  "dreamhold.z8.js",
  "Bronze.zblorb.js",
  "Moonmist.z3.js",
  "wump2ka.z5.js",
  "AOTYRZ.z5.js",
  "photopia.z5.js"
];
const maxTitles = Number(process.argv[2] || 3);
const ERROR_RE = /I don't understand|You can't see any|That's not a verb|I don't know the word/i;

async function boot(page, game) {
  await page.addInitScript(() => {
    sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
    localStorage.setItem("PL_TutorialSeen", "1");
    localStorage.setItem("PL_MobileTutorialSeen", "1");
  });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/" + game);
  await page.waitForTimeout(2500);
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => {
      document.querySelector(".parchlock-splash__start")?.click();
      try {
        Message.Hide();
      } catch (e) {}
    });
    if (await page.locator(".Input.LineInput").count()) return true;
    await page.keyboard.press("Space");
    await page.waitForTimeout(80);
  }
  return !!(await page.locator(".Input.LineInput").count());
}

async function send(page, c) {
  if (!(await page.locator(".Input.LineInput").count())) return "";
  const before = await page.evaluate(() => (document.querySelector("#windowport")?.innerText || "").length);
  await page.evaluate((c) => {
    Input.Clear();
    Input.Inject(c, true);
  }, c);
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(50);
    const n = await page.evaluate(() => (document.querySelector("#windowport")?.innerText || "").length);
    if (n > before + 1 && (await page.locator(".Input.LineInput").count())) break;
  }
  return page.evaluate((b) => (document.querySelector("#windowport")?.innerText || "").slice(b), before);
}

async function cmdsForMark(page, cutover) {
  return page.evaluate((cutover) => {
    localStorage.setItem("PL_SemanticActions_Cutover", cutover);
    const marks = [...document.querySelectorAll(".pl-act")].slice(0, 8);
    const out = [];
    for (const el of marks) {
      const noun = (el.textContent || "").trim();
      if (!noun || noun.length > 40) continue;
      // Find object in payload
      let obj = null;
      try {
        const pool = Actionable.payloadPool ? Actionable.payloadPool() : [];
        obj = pool.find(
          (o) =>
            (o.name || "").toLowerCase() === noun.toLowerCase() ||
            (o.aliases || []).some((a) => String(a).toLowerCase() === noun.toLowerCase())
        );
      } catch (e) {}
      if (!obj) continue;
      let cmds = [];
      try {
        if (cutover === "0") {
          cmds = (ActionSynth.commandsForObject(obj, "room") || []).map((c) => c.command || c.Command);
        } else {
          const sa =
            typeof SemanticActions !== "undefined" && SemanticActions.resolveForObject
              ? SemanticActions.resolveForObject(obj, "room")
              : null;
          const legacy = ActionSynth.commandsForObject(obj, "room") || [];
          const merged = []
            .concat(sa || [], legacy)
            .map((c) => c.command || c.Command)
            .filter(Boolean);
          cmds = [...new Set(merged)];
        }
      } catch (e) {
        cmds = ["ERR:" + e.message];
      }
      out.push({ noun, id: obj.id, cmds: cmds.slice(0, 12) });
    }
    return out;
  }, cutover);
}

async function runTitle(game) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const row = { game, rooms: [], error: null };
  try {
    if (!(await boot(page, game))) {
      row.error = "no-prompt";
      await browser.close();
      return row;
    }
    const dirs = ["look", "east", "west", "north", "south", "look"];
    for (let r = 0; r < 3; r++) {
      await send(page, dirs[r] || "look");
      await send(page, "look");
      const roomId = await page.evaluate(() => (WorldModel.lastPayload && WorldModel.lastPayload.roomId) || null);
      const off = await cmdsForMark(page, "0");
      const on = await cmdsForMark(page, "1");
      // parity: compare cmd sets by noun
      const diffs = [];
      const byNoun = {};
      off.forEach((o) => {
        byNoun[o.noun] = { off: o.cmds.slice().sort(), on: [] };
      });
      on.forEach((o) => {
        if (!byNoun[o.noun]) byNoun[o.noun] = { off: [], on: [] };
        byNoun[o.noun].on = o.cmds.slice().sort();
      });
      Object.keys(byNoun).forEach((n) => {
        const a = byNoun[n].off.join("|");
        const b = byNoun[n].on.join("|");
        if (a !== b) diffs.push({ noun: n, off: byNoun[n].off, on: byNoun[n].on });
      });
      // submit up to 3 commands from ON set
      const submits = [];
      const tryCmds = on.flatMap((o) => o.cmds.filter((c) => c && !c.startsWith("ERR")).slice(0, 1)).slice(0, 3);
      for (const c of tryCmds) {
        const reply = await send(page, c);
        submits.push({ cmd: c, parserError: ERROR_RE.test(reply), reply: reply.replace(/\s+/g, " ").slice(0, 120) });
      }
      row.rooms.push({ roomId, marksOff: off.length, marksOn: on.length, diffs, submits });
    }
  } catch (e) {
    row.error = String(e.message || e);
  }
  await browser.close();
  return row;
}

(async () => {
  const titles = TITLES.filter((t) => fs.existsSync(path.join("games", t))).slice(0, maxTitles);
  const out = { freeze: require("child_process").execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(), titles: [] };
  for (const t of titles) {
    console.log("RUNNING", t);
    const row = await runTitle(t);
    out.titles.push(row);
    console.log(
      t,
      "rooms",
      row.rooms.length,
      "diffs",
      row.rooms.reduce((n, r) => n + r.diffs.length, 0),
      "errors",
      row.rooms.reduce((n, r) => n + r.submits.filter((s) => s.parserError).length, 0),
      row.error || ""
    );
  }
  fs.writeFileSync("work/investigations/a5-commands/STAGE7-interim.json", JSON.stringify(out, null, 2));
  // markdown
  let md = "# A5 Stage 7 interim (grok2)\n\nFreeze: `" + out.freeze + "`\n\nHeld-out list: STAGE7-heldout-list.md\n\n";
  for (const t of out.titles) {
    md += "## `" + t.game + "`\n\n";
    if (t.error) {
      md += "ERROR: " + t.error + "\n\n";
      continue;
    }
    for (let i = 0; i < t.rooms.length; i++) {
      const r = t.rooms[i];
      md +=
        "### Room " +
        (i + 1) +
        " id=" +
        r.roomId +
        " marks off/on " +
        r.marksOff +
        "/" +
        r.marksOn +
        "\n";
      md += "- parity diffs: " + r.diffs.length + "\n";
      for (const d of r.diffs.slice(0, 5)) md += "  - **" + d.noun + "** off=" + JSON.stringify(d.off) + " on=" + JSON.stringify(d.on) + "\n";
      md += "- submits: " + r.submits.length + ", parser errors: " + r.submits.filter((s) => s.parserError).length + "\n";
      for (const s of r.submits) md += "  - `" + s.cmd + "` err=" + s.parserError + " `" + s.reply + "`\n";
      md += "\n";
    }
  }
  fs.writeFileSync("work/investigations/a5-commands/STAGE7-grok2.md", md);
  console.log("Wrote STAGE7-grok2.md");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
