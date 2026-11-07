/**
 * Story-ended UI after in-game QUIT / glk_exit.
 * Pins: detection offers WorkspaceUI.OfferStoryEnded once when enabled Glk
 * input stays gone; does not intercept RESTART/RESTORE/QUIT text; ExitGame
 * and /quit paths remain; overlays pause the streak.
 * Usage: node harness/story-ended-quit.js
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.error("FAIL:", m); } };

(async () => {
    // ---- source contracts (no browser) ----
    const wu = fs.readFileSync("js/WorkspaceUI.js", "utf8");
    const pl = fs.readFileSync("js/ParchLock.js", "utf8");
    const inp = fs.readFileSync("js/Input.js", "utf8");
    ok(/OfferStoryEnded\s*:/.test(wu), "WorkspaceUI.OfferStoryEnded exists");
    ok(/story-ended-library/.test(wu) && /story-ended-restart/.test(wu) && /story-ended-dismiss/.test(wu),
        "OfferStoryEnded has library/restart/dismiss actions");
    ok(/CheckStoryEnded\s*:/.test(pl), "ParchLock.CheckStoryEnded exists");
    ok(/ParchLock\.CheckStoryEnded\(lineReady, charReady\)/.test(pl), "Loop calls CheckStoryEnded");
    ok(/_storyEndedOffered/.test(pl) && /_everHadGlkInput/.test(pl), "story-ended state flags exist");
    ok(/text\.toLowerCase\(\)\s*==\s*"\/quit"/.test(inp) && /WorkspaceUI\.ExitGame\(\)/.test(inp),
        "/quit still routes to ExitGame (not OfferStoryEnded)");
    ok(!/Inject\(["']quit/i.test(pl) && !/Submit\(["']quit/i.test(pl),
        "no story-command quit interceptor in ParchLock");
    ok(/BUILD\s*=\s*\d+/.test(fs.readFileSync("js/Consts.js", "utf8")) &&
        Number((fs.readFileSync("js/Consts.js", "utf8").match(/BUILD\s*=\s*(\d+)/) || [])[1]) >= 50,
        "BUILD is at least 50 (story-ended gate)");

    // ---- live: simulate Glk input teardown after play ----
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 160)));
    await page.addInitScript(() => {
        try {
            localStorage.setItem("PL_MobileTutorialSeen", "1");
            localStorage.removeItem("PL_Prefs");
        } catch (e) {}
    });
    await page.goto(
        pathToFileURL(path.resolve(__dirname, "..", "play.html")).href +
            "?story=games/Advent.z5.js&t=" + Date.now(),
        { waitUntil: "domcontentloaded", timeout: 60000 }
    );
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const s = document.querySelector(".parchlock-splash__start");
        if (s) s.click();
    });
    // Wait until some Glk input has appeared (char or line).
    let ready = false;
    for (let i = 0; i < 40; i++) {
        ready = await page.evaluate(() =>
            !!(document.querySelector(".Input.LineInput") || document.querySelector(".Input.CharInput"))
        );
        if (ready) break;
        await page.waitForTimeout(500);
    }
    ok(ready, "Advent produced a Glk input prompt");
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });

    // Negative: without everHad, tearing down must not offer.
    const neg = await page.evaluate(() => {
        ParchLock._everHadGlkInput = false;
        ParchLock._noInputStreak = 0;
        ParchLock._storyEndedOffered = false;
        const keep = [];
        document.querySelectorAll(".Input.LineInput, .Input.CharInput").forEach((el) => {
            keep.push(el.outerHTML);
            el.remove();
        });
        for (let i = 0; i < 5; i++) ParchLock.CheckStoryEnded(false, false);
        const offered = !!ParchLock._storyEndedOffered;
        const msg = document.getElementById("message") && document.getElementById("message").classList.contains("show");
        // restore husks so later steps can re-seed
        keep.forEach((html) => {
            const wrap = document.createElement("div");
            wrap.innerHTML = html;
            const el = wrap.firstElementChild;
            if (el) document.getElementById("windowport").appendChild(el);
        });
        return { offered, msg };
    });
    ok(!neg.offered && !neg.msg, "no offer when _everHadGlkInput is false");

    // Positive: after everHad, sustained no enabled input offers once.
    const pos = await page.evaluate(() => {
        try { Message.Hide(); } catch (e) {}
        ParchLock._everHadGlkInput = true;
        ParchLock._noInputStreak = 0;
        ParchLock._storyEndedOffered = false;
        document.querySelectorAll(".Input.LineInput, .Input.CharInput").forEach((el) => el.remove());
        for (let i = 0; i < 5; i++) ParchLock.CheckStoryEnded(false, false);
        const title = (($("#message h2").text()) || "").trim();
        return {
            offered: !!ParchLock._storyEndedOffered,
            msg: $("#message").hasClass("show"),
            title,
            library: !!document.getElementById("story-ended-library"),
            restart: !!document.getElementById("story-ended-restart"),
            dismiss: !!document.getElementById("story-ended-dismiss"),
            streak: ParchLock._noInputStreak
        };
    });
    ok(pos.offered && pos.msg, "offers Story ended dialog after sustained no-input");
    ok(pos.title === "Story ended", "dialog title is Story ended (got: " + pos.title + ")");
    ok(pos.library && pos.restart && pos.dismiss, "library/restart/dismiss buttons present");

    // Idempotent: further checks do not stack another offer / reset.
    const again = await page.evaluate(() => {
        const before = ParchLock._storyEndedOffered;
        for (let i = 0; i < 5; i++) ParchLock.CheckStoryEnded(false, false);
        return {
            still: !!ParchLock._storyEndedOffered,
            before,
            count: document.querySelectorAll("#story-ended-library").length
        };
    });
    ok(again.still && again.before && again.count === 1, "offers only once");

    // Overlay pause: with Message open, streak stays 0 when resetting.
    const overlay = await page.evaluate(() => {
        try { Message.Hide(); } catch (e) {}
        ParchLock._everHadGlkInput = true;
        ParchLock._storyEndedOffered = false;
        ParchLock._noInputStreak = 0;
        Message.IsOpen = true;
        for (let i = 0; i < 5; i++) ParchLock.CheckStoryEnded(false, false);
        const streakWhileOpen = ParchLock._noInputStreak;
        const offeredWhileOpen = ParchLock._storyEndedOffered;
        Message.IsOpen = false;
        return { streakWhileOpen, offeredWhileOpen };
    });
    ok(overlay.streakWhileOpen === 0 && !overlay.offeredWhileOpen,
        "Message.IsOpen pauses streak and blocks offer");

    // Disabled husk without dialog still ends (glk disable after exit).
    const disabled = await page.evaluate(() => {
        try { Message.Hide(); } catch (e) {}
        ParchLock._everHadGlkInput = true;
        ParchLock._storyEndedOffered = false;
        ParchLock._noInputStreak = 0;
        document.querySelectorAll(".Input.LineInput, .Input.CharInput").forEach((el) => el.remove());
        const husk = document.createElement("input");
        husk.className = "Input LineInput";
        husk.disabled = true;
        husk.style.display = "block";
        document.getElementById("windowport").appendChild(husk);
        for (let i = 0; i < 5; i++) ParchLock.CheckStoryEnded(true, false);
        const out = {
            offered: !!ParchLock._storyEndedOffered,
            title: (($("#message h2").text()) || "").trim()
        };
        husk.remove();
        try { Message.Hide(); } catch (e) {}
        return out;
    });
    ok(disabled.offered && disabled.title === "Story ended",
        "disabled LineInput husk without dialog still offers Story ended");

    // Dismiss keeps viewing (no navigation).
    const dismissed = await page.evaluate(() => {
        ParchLock._everHadGlkInput = true;
        ParchLock._storyEndedOffered = false;
        ParchLock._noInputStreak = 0;
        document.querySelectorAll(".Input.LineInput, .Input.CharInput").forEach((el) => el.remove());
        for (let i = 0; i < 5; i++) ParchLock.CheckStoryEnded(false, false);
        const btn = document.getElementById("story-ended-dismiss");
        if (btn) btn.click();
        return {
            msg: $("#message").hasClass("show"),
            offeredFlag: !!ParchLock._storyEndedOffered,
            href: location.href.indexOf("play.html") >= 0
        };
    });
    ok(!dismissed.msg && dismissed.offeredFlag && dismissed.href,
        "Keep viewing dismisses dialog and stays on play.html");

    ok(errors.length === 0, "no page errors (" + errors.join(" | ") + ")");

    await browser.close();
    console.log("RESULT pass=" + pass + " fail=" + fail);
    process.exit(fail ? 1 : 0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
