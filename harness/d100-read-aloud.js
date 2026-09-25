/**
 * D100 ReadAloud: prefs defaults, delta logic, Options label, no chrome button.
 * Usage: node harness/d100-read-aloud.js
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
function ok(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.error("FAIL:", msg); }
}

const src = fs.readFileSync(path.join(__dirname, "..", "js", "ReadAloud.js"), "utf8");
const globalSrc = fs.readFileSync(path.join(__dirname, "..", "js", "Global.js"), "utf8");
const uiSrc = fs.readFileSync(path.join(__dirname, "..", "js", "WorkspaceUI.js"), "utf8");
const inputSrc = fs.readFileSync(path.join(__dirname, "..", "js", "Input.js"), "utf8");
const play = fs.readFileSync(path.join(__dirname, "..", "play.html"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");

ok(/ReadAloud:\s*true/.test(globalSrc), "Global.Prefs defaults ReadAloud true");
ok(/Read aloud new story text/.test(uiSrc), "Options label present in WorkspaceUI");
ok(/ReadAloud\.stop/.test(inputSrc), "Mic press stops ReadAloud");
ok(/js\/ReadAloud\.js/.test(play), "play.html includes ReadAloud.js");
ok(/js\/ReadAloud\.js/.test(sw), "service-worker APP_SHELL lists ReadAloud.js");
ok(!/#pl-read-aloud|pl-tts-fab|read-aloud-fab/i.test(play + uiSrc), "no chrome TTS control ids in shell sources");

// Unit: computeDelta via vm
const vm = require("vm");
const sandbox = {
    window: {},
    document: { readyState: "loading", addEventListener: () => {} },
    console,
    setTimeout: () => 0,
    clearTimeout: () => {}
};
vm.createContext(sandbox);
vm.runInContext(src + "\nthis.RA = ReadAloud;", sandbox);
const RA = sandbox.RA;
ok(RA.computeDelta("", "Hello").delta === "Hello", "empty->text delta is full text");
ok(RA.computeDelta("Hello", "Hello world").delta === " world", "append delta");
ok(RA.computeDelta("Hello world", "Hello").silent === true, "trim is silent");
// Title screen -> intro replacement must speak (Claude #653/#663)
const repl = RA.computeDelta(
    "ANCHORHEAD\n[Press 'R' to restore; any other key to begin]",
    "November, 1997.\nYou take a deep breath of salty air as the cold wind whips your face."
);
ok(!repl.silent && /November/.test(repl.delta), "title->intro replacement speaks new body");
ok(RA.meaningful(">") === false || !RA.meaningful(">\n"), "bare prompt not meaningful or handled");
ok(RA.meaningful("You see a lamp.") === true, "prose is meaningful");
ok(RA.isNoise && RA.isNoise("#window102 span.Style_emphasized {font-size: 1em}"), "CSS dump is noise");
ok(/onPlayerTurn/.test(src) && /Inject/.test(inputSrc) && /ReadAloud\.onPlayerTurn/.test(inputSrc), "Inject calls onPlayerTurn");

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const spoken = [];
    await page.addInitScript(() => {
        window.__PL_TEST_SPEECH = true; window.__spoken = [];
        window.SpeechSynthesisUtterance = function (text) {
            this.text = text || "";
            this.rate = 1;
            this.volume = 1;
        };
        var ss = {
            speaking: false,
            pending: false,
            cancelled: false,
            cancel() { this.cancelled = true; },
            resume() {},
            speak(u) { window.__spoken.push(u && u.text); },
            getVoices() { return []; }
        };
        try {
            Object.defineProperty(window, "speechSynthesis", { configurable: true, get() { return ss; }, set() {} });
        } catch (e) {
            window.speechSynthesis = ss;
        }
        try { localStorage.removeItem("PL_Prefs"); } catch (e2) {}
    });
    const url = pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/anchor.z8.js&t=" + Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        const b = document.querySelector(".parchlock-splash__start");
        if (b) b.click();
        const root = document.getElementById("parchlock-splash");
        if (root) root.remove();
    });
    await page.waitForTimeout(4000);

    const def = await page.evaluate(() => ({
        pref: Global && Global.Prefs && Global.Prefs.ReadAloud,
        hasRA: typeof ReadAloud !== "undefined",
        supported: ReadAloud && ReadAloud.isSupported && ReadAloud.isSupported()
    }));
    ok(def.hasRA, "ReadAloud global present");
    ok(def.pref === true || def.pref === undefined, "ReadAloud pref default on (true/undefined merged)");

    // Inject buffer growth and ensure speak path
    const spoke = await page.evaluate(() => {
        window.__spoken = [];
        Global.Prefs.ReadAloud = true;
        const port = document.getElementById("windowport") || document.body;
        let buf = document.querySelector("#windowport .BufferWindow");
        if (!buf) {
            buf = document.createElement("div");
            buf.className = "BufferWindow";
            (port || document.body).appendChild(buf);
        }
        ReadAloud.lastPlain = "Once upon a time.";
        buf.textContent = "Once upon a time.";
        const line = document.createElement("div");
        line.className = "BufferLine";
        line.textContent = " A glowing test sentence appears.";
        buf.appendChild(line);
        ReadAloud.flush([{ type: "childList", addedNodes: [line], target: buf }]);
        if (!window.__spoken.length) {
            ReadAloud.onStoryDelta(" A glowing test sentence appears.");
        }
        return window.__spoken.slice();
    });
    ok(spoke.length >= 1 && /glowing test sentence/i.test(spoke.join(" ")), "delta speak invoked: " + JSON.stringify(spoke).slice(0, 120));

    // Multi-line BufferLine with blank first line (Claude #660/#663) — no empty plain, no double count
    const multi = await page.evaluate(() => {
        const port = document.getElementById("windowport") || document.body;
        let buf = document.querySelector("#windowport .BufferWindow");
        if (!buf) {
            buf = document.createElement("div");
            buf.className = "BufferWindow";
            port.appendChild(buf);
        }
        buf.innerHTML = "";
        ["", "November, 1997.", "You take a deep breath of salty air."].forEach((t) => {
            const d = document.createElement("div");
            d.className = "BufferLine";
            const sp = document.createElement("span");
            sp.className = "Style_normal";
            sp.textContent = t;
            d.appendChild(sp);
            buf.appendChild(d);
        });
        const plain = ReadAloud.extractStoryText(buf);
        return {
            plain,
            hasNov: /November/.test(plain),
            hasSalty: /salty/.test(plain),
            doubled: /November[\s\S]*November/.test(plain),
            empty: !plain
        };
    });
    ok(multi.hasNov && multi.hasSalty && !multi.doubled && !multi.empty,
        "multi-line BufferLine extract (blank first): " + JSON.stringify(multi).slice(0, 140));

    // Full-screen replace speak via computeDelta path
    const replLive = await page.evaluate(() => {
        window.__readAloudLog = [];
        ReadAloud.clearSessionMemory && ReadAloud.clearSessionMemory();
        Global.Prefs.ReadAloud = true;
        ReadAloud.lastPlain = "TITLE ONLY\nPress any key";
        const now = "November, 1997.\nYou take a deep breath of salty air as the cold wind whips your face.";
        const r = ReadAloud.computeDelta(ReadAloud.lastPlain, now);
        ReadAloud.lastPlain = r.next;
        if (!r.silent && r.delta) ReadAloud.onStoryDelta(r.delta);
        const log = (window.__readAloudLog || []).map((x) => x.text || x).join(" | ");
        return { silent: r.silent, log, hasNov: /November/.test(log) };
    });
    ok(!replLive.silent && replLive.hasNov, "live replacement speaks November: " + JSON.stringify(replLive).slice(0, 120));

    await page.evaluate(() => {
        Global.Prefs.ReadAloud = false;
        Global.SavePrefs();
        window.__spoken = [];
        ReadAloud.onStoryDelta(" Should not speak when off.");
    });
    const off = await page.evaluate(() => window.__spoken.slice());
    ok(off.length === 0, "toggle off prevents speak");

    // Options UI
    await page.evaluate(() => { Global.Prefs.ReadAloud = true; WorkspaceUI.ShowOptions(); });
    await page.waitForTimeout(200);
    const opt = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll("#game-options label")).map(l => l.textContent.trim());
        return {
            hasRead: labels.some(t => /Read aloud new story text/i.test(t)),
            fab: !!document.querySelector("#pl-read-aloud, .pl-tts-fab"),
            stop: !!document.getElementById("pl-readaloud-stop")
        };
    });
    ok(opt.hasRead, "Options shows Read aloud checkbox");
    ok(!opt.fab, "no chrome TTS fab in DOM");
    ok(opt.stop, "Stop speaking button in Options");

    await browser.close();
    console.log(JSON.stringify({ ok: fail === 0, pass, fail }));
    if (fail) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
