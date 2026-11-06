/**
 * D100 live-turn regression: real Anchorhead, real command turns, stubbed native TextToSpeech
 * (Capacitor.Plugins.TextToSpeech) so it exercises the same path as the Android device.
 * Guards the operator-reported defects:
 *   - intro (after "any other key") must be spoken;
 *   - a move must speak only the NEW room text: no echoed command, no word-underline
 *     fragments (the app's pl-act pass re-adds text nodes ~170ms after output), and none of the
 *     previous room's paragraph.
 * Usage: node harness/d100-live-turns.js
 */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.error("FAIL:", m); } };

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true });
    page.on("pageerror", (e) => console.error("PAGEERROR:", String(e && e.message).slice(0, 160)));
    await page.addInitScript(() => {
        window.__PL_TEST_SPEECH = true;
        window.__spoken = [];
        window.Capacitor = window.Capacitor || {};
        window.Capacitor.Plugins = window.Capacitor.Plugins || {};
        window.Capacitor.Plugins.TextToSpeech = {
            speak(o) { window.__spoken.push(String(o && o.text || "")); return new Promise((r) => setTimeout(r, 600)); },
            stop() { return Promise.resolve(); }
        };
        try { localStorage.removeItem("PL_Prefs"); } catch (e) {}
    });
    if (process.env.RA_OVERRIDE) {
        const ov = require("fs").readFileSync(process.env.RA_OVERRIDE, "utf8");
        await page.addInitScript((src) => { document.addEventListener("DOMContentLoaded", () => { (0, eval)(src); }); }, ov);
    }
    await page.goto(pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/anchor.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
    await page.waitForTimeout(6000);
    await page.evaluate(() => { Message.Hide(); window.__spoken = []; });
    await page.keyboard.press("Space");
    await page.waitForTimeout(4500);
    const intro = await page.evaluate(() => window.__spoken.join(" | "));
    ok(/November, 1997/.test(intro) && /salty air/.test(intro), "intro screen after key is spoken");

    for (let i = 0; i < 5; i++) {
        if (await page.evaluate(() => $(".Input.LineInput:visible").length)) break;
        await page.keyboard.press("Space");
        await page.waitForTimeout(2500);
    }
    ok(await page.evaluate(() => $(".Input.LineInput:visible").length > 0), "reached the command prompt");

    const turn = async (cmd) => {
        await page.evaluate(() => { window.__spoken = []; });
        await page.evaluate((c) => Actionable.Submit(c), cmd);
        await page.waitForTimeout(3500);
        return page.evaluate(() => window.__spoken.slice());
    };

    const look = await turn("look");
    const lookText = look.join("\n");
    ok(!/^look\b/i.test(lookText.trim()), "look: echoed command is not spoken");

    const mv = await turn("n");
    const mvText = mv.join("\n");
    ok(mv.length <= 1, "move: at most one utterance (got " + mv.length + ")");
    ok(/The street goes west/.test(mvText), "move: new room text is spoken");
    ok(!/^n\b/i.test(mvText.trim()), "move: echoed command is not spoken");
    ok(!/in\s+real\s+estate\s+office\s+east\s+west/i.test(mvText.replace(/\s+/g, " ")), "move: no word-underline fragments spoken");
    ok(!/grim little cul-de-sac/i.test(mvText), "move: previous room paragraph is not re-spoken");
    ok(mvText.length < 700, "move: utterance is short (" + mvText.length + " chars)");

    const mv2 = await turn("n");
    const mv2Text = mv2.join("\n");
    ok(!/grim little cul-de-sac/i.test(mv2Text), "2nd move: previous room paragraph is not re-spoken");
    ok(mv2Text.length < 700, "2nd move: utterance is short (" + mv2Text.length + " chars)");


    // Optional "skip lines repeated from the previous turn" (default off).
    ok(await page.evaluate(() => Global.Prefs.ReadAloudSkipRepeats === false), "skip-repeats defaults to off");
    const roomA = (await turn("look")).join("\n");
    const key = roomA.split("\n").sort((x, y) => y.length - x.length)[0].slice(0, 40);
    ok(key.length >= 30, "look: got a long room line to track (" + JSON.stringify(key) + ")");
    const roomB = (await turn("look")).join("\n");
    ok(roomB.indexOf(key) !== -1, "pref off: a repeated LOOK speaks the room again");
    await page.evaluate(() => { Global.Prefs.ReadAloudSkipRepeats = true; });
    const roomC = (await turn("look")).join("\n");
    ok(roomC.indexOf(key) === -1, "pref on: a repeated LOOK does not re-speak the unchanged room text");
    await turn("inventory");
    const roomD = (await turn("look")).join("\n");
    ok(roomD.indexOf(key) !== -1, "pref on: same text after a DIFFERENT turn is spoken again (consecutive-only)");
    await page.evaluate(() => { Global.Prefs.ReadAloudSkipRepeats = false; });

    // D108: GlkOte append:true grows the existing final BufferLine. The narrator
    // must consume the appended suffix instead of permanently ignoring that node.
    const appendContract = await page.evaluate(() => {
        if (ReadAloud.observer) ReadAloud.observer.disconnect();
        const port = document.getElementById("windowport");
        const buffer = document.createElement("div");
        buffer.className = "BufferWindow";
        buffer.id = "d108-append-buffer";
        port.appendChild(buffer);
        ReadAloud.clearSessionMemory();
        ReadAloud.seedSilent();
        const line = document.createElement("div");
        line.className = "BufferLine";
        line.textContent = "Ah, scenic Las Mesas. Soon you'll be able to get the hell out of here -- provided you can avoid making any more slip-ups on the job.";
        buffer.appendChild(line);
        const first = ReadAloud.collectNewLines();
        line.textContent += "\n\nAs you cruise down the road, you notice a freeway onramp approaching. Would you like to get on? >>";
        const second = ReadAloud.collectNewLines();
        line.innerHTML = line.textContent.replace("Las Mesas", "<span class='pl-act'>Las Mesas</span>");
        const wrapped = ReadAloud.collectNewLines();
        buffer.remove();
        ReadAloud.clearSessionMemory();
        ReadAloud.seedSilent();
        ReadAloud.attachBufferObservers();
        return { first, second, wrapped };
    });
    ok(appendContract.first.length === 1 && /slip-ups on the job/.test(appendContract.first[0]),
        "append cursor: initial paragraph is consumed");
    ok(appendContract.second.length === 1 && /As you cruise down the road/.test(appendContract.second[0]),
        "append cursor: later paragraph from the same BufferLine is consumed");
    ok(appendContract.wrapped.length === 0,
        "append cursor: underline-only DOM wrapping is not re-spoken");

    const speechPrep = await page.evaluate(() => {
        const samples = {
            title: "WEST END OF ROYAL HALL",
            anchor: "ANCHORHEAD. An anchor is anchored here; an anchovy is not.",
            wall: "Tool Room\nYou are in a small, low-ceilinged room with the words\n\n\"Witt Company Tool Room - Melenkurion Division\"\n\ncarved into one of the walls. A doorway exits to the south from here.",
            driving: "Driving\nAh, scenic Las Mesas. Soon you'll be able to afford to get the hell out of here -- provided you can avoid making any more slip-ups on the job.\n\nAs you cruise down the road, you notice a freeway onramp approaching. Would you like to get on? >>",
            map: "   |    |\n---|   |----       ------------\n|    MAZE     |----|   MAZE     |----|\nMAZE       |----|      SE       |    SW ----\n       |WEST END OF   |\n       |ROYAL HALL    |",
            prose: "Anchorhead - an interactive gothic: November, 1997.",
            initials: "NPC UI TTS IBM"
        };
        const out = {};
        Object.keys(samples).forEach((key) => {
            out[key] = ReadAloud.scrubForSpeech(samples[key]);
            out[key + "Idempotent"] = ReadAloud.scrubForSpeech(out[key]);
        });
        return out;
    });
    ok(speechPrep.title === "West end of Royal Hall", "all-caps title is spoken as words");
    ok(speechPrep.anchor === "Ankerhead. An anker is ankered here; an anchovy is not.",
        "anchor stem receives the K-sound hint without changing anchovy");
    ok(/Witt Company Tool Room - Melenkurion Division/.test(speechPrep.wall),
        "known-good quoted and hyphenated Tool Room prose survives");
    ok(/slip-ups on the job/.test(speechPrep.driving) && /As you cruise down the road/.test(speechPrep.driving),
        "blank-separated Driving paragraphs remain in one prepared utterance");
    ok(!/[\r\n]/.test(speechPrep.wall + speechPrep.driving),
        "prepared speech is a single continuous payload");
    ok(!/[|_]/.test(speechPrep.map) && /Royal Hall/.test(speechPrep.map) && /Maze/.test(speechPrep.map),
        "ASCII map strokes are removed while useful labels remain: " + JSON.stringify(speechPrep.map));
    ok(speechPrep.prose === "Ankerhead - an interactive gothic: November, 1997.",
        "normal dash and colon prose is preserved exactly");
    ok(speechPrep.initials === "N. P. C. U. I. T. T. S. I. B. M.",
        "known initialisms remain letter-spoken");
    ok(Object.keys(speechPrep).filter((key) => /Idempotent$/.test(key))
        .every((key) => speechPrep[key] === speechPrep[key.replace(/Idempotent$/, "")]),
        "speech preparation is idempotent");

    const engineParity = await page.evaluate(async () => {
        const source = "ANCHORHEAD\n\nA doorway exits to the south. >>";
        const nativePlugin = window.Capacitor.Plugins.TextToSpeech;
        window.__spoken = [];
        ReadAloud.speak(source);
        await new Promise((resolve) => setTimeout(resolve, 90));
        const nativeText = window.__spoken[0] || "";
        const web = [];
        window.Capacitor.Plugins.TextToSpeech = null;
        const synth = { cancel() {}, resume() {}, speak(u) { web.push(u.text); }, getVoices() { return []; } };
        Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
        window.SpeechSynthesisUtterance = function (text) { this.text = text; this.rate = 1; this.volume = 1; };
        ReadAloud.warmed = true;
        ReadAloud.speak(source);
        window.Capacitor.Plugins.TextToSpeech = nativePlugin;
        return { nativeText, webText: web[0] || "" };
    });
    ok(engineParity.nativeText === engineParity.webText && /Ankerhead/.test(engineParity.nativeText),
        "Android native and Windows/browser engines receive identical prepared text");

    await page.close();

    // Real Huge Cave output proves that blank-separated quoted text does not end
    // narration and that the common Android payload contains the complete room.
    const cave = await browser.newPage({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true });
    await cave.addInitScript(() => {
        window.__PL_TEST_SPEECH = true;
        window.__spoken = [];
        window.Capacitor = window.Capacitor || {};
        window.Capacitor.Plugins = window.Capacitor.Plugins || {};
        window.Capacitor.Plugins.TextToSpeech = {
            speak(o) { window.__spoken.push(String(o && o.text || "")); return Promise.resolve(); },
            stop() { return Promise.resolve(); }
        };
        try { localStorage.clear(); } catch (e) {}
    });
    await cave.goto(pathToFileURL(path.resolve(__dirname, "..", "play.html")).href
        + "?story=games/HugeCave.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
    await cave.bringToFront();
    await cave.waitForTimeout(800);
    await cave.evaluate(() => document.querySelector(".parchlock-splash__start")?.click());
    await cave.waitForTimeout(3000);
    for (let i = 0; i < 4; i++) {
        await cave.keyboard.press("Space");
        await cave.waitForTimeout(900);
        if (await cave.evaluate(() => $(".Input.LineInput:visible").length > 0)) break;
    }
    await cave.evaluate(() => { try { Message.Hide(); } catch (e) {} window.__spoken = []; });
    for (const command of ["no", "east", "north"]) {
        await cave.evaluate((text) => { Input.Clear(); Actionable.Submit(text); }, command);
        await cave.waitForTimeout(1500);
    }
    await cave.waitForTimeout(1000);
    await cave.evaluate(() => ReadAloud.flush());
    await cave.waitForTimeout(200);
    const caveState = await cave.evaluate(() => ({
        speech: window.__spoken.join(" | "),
        room: window.WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.roomName,
        pref: window.Global && Global.Prefs.ReadAloud,
        log: (window.__readAloudLog || []).map((item) => item.text || item).join(" | ")
    }));
    const caveSpeech = caveState.speech || caveState.log;
    ok(/Tool Room/.test(caveSpeech) && /Witt Company Tool Room - Melenkurion Division/.test(caveSpeech)
        && /doorway exits to the south/.test(caveSpeech) && /long-handled shovel/.test(caveSpeech),
        "real Huge Cave Tool Room narration contains the complete output: " + JSON.stringify(caveState).slice(0, 500));
    ok(!/[\r\n]/.test(caveSpeech), "real native Tool Room payload contains no hard line breaks");
    await cave.close();

    await browser.close();
    console.log(JSON.stringify({ ok: fail === 0, pass, fail }));
    console.log((fail ? "FAIL" : "PASS") + ": d100-live-turns (" + pass + " passed, " + fail + " failed)");
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
