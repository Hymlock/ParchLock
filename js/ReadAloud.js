/* D100: on-device read-aloud for NEW story BufferLine elements only.
 * Claude #673/#683: MutationObserver is a debounce trigger only — never speak
 * mutation text (pl-act underline re-adds old room text ~170ms later).
 * Options-only; no chrome button.
 */
var ReadAloud = {

    // GlkOte append:true can grow an existing BufferLine. Track how much text
    // has been consumed from each element instead of treating identity as final.
    spokenLengths: typeof WeakMap !== "undefined" ? new WeakMap() : null,
    spokenFingerprints: {},
    spokenOrder: [],
    debounceTimer: null,
    observer: null,
    windowObserver: null,
    warmed: false,
    unsupportedNoted: false,
    watching: false,
    bootTimer: null,
    pendingText: "",
    lastPlain: "",
    // Consecutive-turn line fingerprints for optional skip-repeats (Claude #701).
    lastLineFps: {},

    prefsOn: () => !(typeof Global !== "undefined" && Global.Prefs && Global.Prefs.ReadAloud === false),

    skipRepeatsOn: () => !!(typeof Global !== "undefined" && Global.Prefs && Global.Prefs.ReadAloudSkipRepeats),

    rate: () => {
        var r = (typeof Global !== "undefined" && Global.Prefs && parseFloat(Global.Prefs.ReadAloudRate)) || 1;
        if (!r || r < 0.7) r = 0.7;
        if (r > 1.4) r = 1.4;
        return r;
    },

    nativePlugin: () => {
        try {
            return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) || null;
        } catch (e) { return null; }
    },

    isSupported: () => !!(ReadAloud.nativePlugin() || (typeof window !== "undefined" && window.speechSynthesis)),

    normalize: (text) => {
        if (!text) return "";
        return String(text)
            .replace(/\r/g, "")
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/[ \t]{2,}/g, " ")
            .trim();
    },

    isNoise: (text) => {
        var t = ReadAloud.normalize(text);
        if (!t || t.length < 2) return true;
        if (/^>+\s*$/.test(t)) return true;
        if (/^#window\d+/i.test(t)) return true;
        if (/span\.Style_/i.test(t) && /font-size|font-family|glkote/i.test(t)) return true;
        if (/\{[^}]{0,40}font-(size|weight|style|family)/i.test(t)) return true;
        if (/--glkote-/i.test(t)) return true;
        if (/layout_test_pane/i.test(t)) return true;
        var cssHits = (t.match(/[{};]|font-size:|font-family:|Style_/g) || []).length;
        if (cssHits >= 3 && /#window|span\./i.test(t)) return true;
        if (!/[A-Za-z]/.test(t)) return true;
        return false;
    },

    meaningful: (delta) => {
        var d = ReadAloud.normalize(delta);
        if (!d || ReadAloud.isNoise(d)) return false;
        return d.replace(/^>+\s*/gm, "").trim().length >= 2;
    },

    isStrongDiagramLine: (line) => {
        var s = String(line || "").trim();
        if (!s) return false;
        var compact = s.replace(/\s/g, "");
        var structural = (compact.match(/[|_+=\\\/<>\[\]{}\u2500-\u257F-]/g) || []).length;
        if (/(?:[-_=+|\\\/]{3,}|[\u2500-\u257F]{2,})/.test(s)) return true;
        return structural >= 3 && structural / Math.max(1, compact.length) >= 0.24;
    },

    isBorderedDiagramLine: (line) => {
        var s = String(line || "").trim();
        return s.length >= 3 && /^[|\u2500-\u257F]/.test(s) && /[|\u2500-\u257F]$/.test(s);
    },

    diagramLabels: (line) => String(line || "")
        .replace(/[|_+=\\\/<>\[\]{}\u2500-\u257F]/g, " ")
        .replace(/-{2,}/g, " ")
        .split(/\s{2,}/)
        .map(function (piece) { return piece.trim(); })
        .filter(function (piece) { return /[A-Za-z]/.test(piece); }),

    normalizeSpokenCaps: (text) => {
        var directions = {
            N: "north", S: "south", E: "east", W: "west",
            NE: "northeast", NW: "northwest", SE: "southeast", SW: "southwest"
        };
        var shortWords = {
            A: "a", AN: "an", AND: "and", AS: "as", AT: "at", BY: "by",
            END: "end", FOR: "for", FROM: "from", IN: "in", IS: "is",
            OF: "of", ON: "on", OR: "or", THE: "the", TO: "to"
        };
        var initialisms = {
            AI: "A. I.", CPU: "C. P. U.", FBI: "F. B. I.", GPU: "G. P. U.",
            GPS: "G. P. S.", HTML: "H. T. M. L.", IBM: "I. B. M.", NPC: "N. P. C.",
            TTS: "T. T. S.", UI: "U. I.", URL: "U. R. L.", USB: "U. S. B."
        };
        var source = String(text || "");
        var compassTokens = source.match(/\b(?:N|S|E|W)\b/g) || [];
        var dottedInitialism = /(?:\b[A-Z]\.\s*){2,}/.test(source);
        if (/^\s*(?:N|S|E|W)\.?\s*$/.test(source) ||
                (compassTokens.length >= 2 && !dottedInitialism)) {
            source = source.replace(/\b(?:N|S|E|W)\b/g, function (word) {
                return directions[word] || word;
            });
        }
        return source.replace(/\b[A-Z][A-Z']+\b/g, function (word) {
            if (directions[word]) return directions[word];
            if (shortWords[word]) return shortWords[word];
            if (initialisms[word]) return initialisms[word];
            if (word.length >= 4) return word.charAt(0) + word.slice(1).toLowerCase();
            return word;
        });
    },

    // Plain-text pronunciation hints must work identically in Android TTS and
    // Web Speech. Every respelling lives in ONE place: js/PronunciationCatalog.js
    // (compiled from the operator's projects; each entry carries its source and
    // tested examples). The anchor rule is kept here only as a fallback should
    // the catalog script fail to load.
    applyPronunciations: (text) => {
        if (typeof PronunciationCatalog !== "undefined" && PronunciationCatalog.apply) return PronunciationCatalog.apply(text);
        return String(text || "").replace(/\banchor/gi, function (stem) {
            return stem.charAt(0) === "A" ? "Anker" : "anker";
        });
    },

    joinForSpeech: (segments) => {
        var out = "";
        (segments || []).forEach(function (segment) {
            var s = String(segment || "").replace(/\s+/g, " ").trim();
            if (!s) return;
            if (out) {
                if (!/[.!?;:][\"')\]]*$/.test(out)) out += ".";
                out += " ";
            }
            out += s;
        });
        return out.replace(/\s+/g, " ").trim();
    },

    scrubForSpeech: (text) => {
        if (!text) return "";
        var raw = String(text)
            .replace(/\r/g, "")
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
            .replace(/[ \t]+\n/g, "\n")
            .trim();
        if (!raw) return "";

        // Preserve two-dimensional spacing until diagram labels have been found.
        var sourceLines = raw.split("\n");
        var hasDiagram = sourceLines.some(ReadAloud.isStrongDiagramLine);
        var lines = [];
        sourceLines.forEach(function (line) {
            var original = String(line || "");
            var L = original.trim();
            if (!L || /^>+\s*$/.test(L) || ReadAloud.isNoise(L)) return;

            var columnLabels = hasDiagram && /\s{2,}/.test(original) &&
                ((original.match(/\b[A-Z]+(?:\s+[A-Z]+)*\b/g) || []).length >= 2);
            if (ReadAloud.isStrongDiagramLine(original) || ReadAloud.isBorderedDiagramLine(original) || columnLabels) {
                ReadAloud.diagramLabels(original).forEach(function (label) { lines.push(label); });
                return;
            }
            if (/^(?:[A-Za-z0-9]\s+){3,}[A-Za-z0-9]$/.test(L)) L = L.replace(/\s+/g, "");
            lines.push(L);
        });

        var uniq = [];
        lines.forEach(function (line) {
            var prepared = ReadAloud.applyPronunciations(ReadAloud.normalizeSpokenCaps(line))
                .replace(/[\u2500-\u257F]/g, " ")
                .replace(/(?:[_=+|\\\/]{2,})/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            if (hasDiagram) {
                prepared = prepared
                    .replace(/[|_+=\u2500-\u257F]/g, " ")
                    .replace(/-{2,}/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
            }
            if (!prepared || !/[A-Za-z]/.test(prepared)) return;
            var key = prepared.toLowerCase();
            if (uniq.some(function (item) { return item.key === key; })) return;
            uniq.push({ key: key, text: prepared });
        });
        return ReadAloud.joinForSpeech(uniq.map(function (item) { return item.text; }));
    },

    // Kept for harness unit tests (title->intro delta semantics).
    computeDelta: (prev, now) => {
        prev = prev || "";
        now = now || "";
        if (now === prev) return { delta: "", next: now, silent: true };
        if (!prev) return { delta: now, next: now, silent: false };
        if (now.startsWith(prev)) return { delta: now.slice(prev.length), next: now, silent: false };
        if (prev.startsWith(now)) return { delta: "", next: now, silent: true };
        if (now.length + 40 < prev.length * 0.5 && now.length < prev.length) {
            return { delta: "", next: now, silent: true };
        }
        var i = 0;
        var max = Math.min(prev.length, now.length);
        while (i < max && prev.charAt(i) === now.charAt(i)) i++;
        if (i < 12 && now.length > 20) return { delta: now, next: now, silent: false };
        if (now.length > prev.length) return { delta: now.slice(i), next: now, silent: false };
        return { delta: "", next: now, silent: true };
    },

    bufferRoots: () => {
        try {
            return Array.prototype.slice.call(document.querySelectorAll("#windowport .BufferWindow") || []);
        } catch (e) { return []; }
    },

    // Consume only growth in each BufferLine. Underline wrapping preserves
    // textContent length; GlkOte append:true contributes only its new suffix.
    // D207: a reused prompt line can hold owned status-probe children beside
    // real narration. Only the unowned text of a line is speakable.
    speakableText: (el) => {
        var parts = [];
        (function walk(n) {
            Array.prototype.forEach.call(n.childNodes || [], function (c) {
                if (c.nodeType === 3) { parts.push(c.nodeValue || ""); return; }
                if (c.nodeType !== 1) return;
                if (c.classList && (c.classList.contains("pl-stat-probe") || c.classList.contains("pl-carry-probe") || c.classList.contains("Style_input"))) return;
                if (c.getAttribute && c.getAttribute("aria-hidden") === "true") return;
                walk(c);
            });
        })(el);
        return parts.join("");
    },

    collectNewLines: () => {
        var out = [];
        ReadAloud.bufferRoots().forEach(function (root) {
            Array.prototype.forEach.call(root.querySelectorAll(".BufferLine"), function (el) {
                if (el.parentElement && el.parentElement.classList && el.parentElement.classList.contains("BufferLine")) return;
                // D207: a line hidden as status-probe output is not consumed.
                // Recording its length here would make a turn event that is
                // released later read as already spoken (Suspect: the fairy
                // queen's spilled drink was shown but never read).
                if (el.closest && el.closest(".pl-carry-probe, .pl-stat-probe")) return;
                var raw = String(ReadAloud.speakableText(el) || "");
                var previousLength = 0;
                if (ReadAloud.spokenLengths) {
                    try { previousLength = ReadAloud.spokenLengths.get(el) || 0; } catch (eLen) {}
                    try { ReadAloud.spokenLengths.set(el, raw.length); } catch (eSet) {}
                }
                // D207: only a LIVE prompt suspends a line. A historical echo
                // (Style_input) is dropped by speakableText, so narration that
                // follows it on a reused line is still read.
                if (el.querySelector && el.querySelector(".Input, .InvisibleCursor, .LineInput, .CharInput")) return;
                if (el.classList && (el.classList.contains("pl-carry-probe") || el.classList.contains("pl-stat-probe"))) return;
                if (el.closest && el.closest("[aria-hidden='true'], style, script, .pl-carry-probe, .pl-stat-probe")) return;
                if (raw.length <= previousLength) return;
                var t = ReadAloud.normalize(raw.slice(previousLength));
                if (!t || /^>+\s*$/.test(t) || ReadAloud.isNoise(t)) return;
                out.push(t);
            });
        });
        return out;
    },

    // Legacy helpers kept so d100-read-aloud unit/live pieces that call them still load.
    extractStoryText: (root) => {
        if (!root) return "";
        var parts = [];
        Array.prototype.forEach.call(root.querySelectorAll(".BufferLine"), function (n) {
            if (n.parentElement && n.parentElement.classList && n.parentElement.classList.contains("BufferLine")) return;
            if (n.querySelector && n.querySelector(".Style_input, .Input")) return;
            var piece = (n.innerText || n.textContent || "").trim();
            if (piece) parts.push(piece);
        });
        if (!parts.length) {
            try { parts.push(root.innerText || ""); } catch (e) {}
        }
        return ReadAloud.normalize(parts.join("\n"));
    },

    bufferPlain: () => {
        var parts = [];
        ReadAloud.bufferRoots().forEach(function (root) {
            parts.push(ReadAloud.extractStoryText(root));
        });
        return ReadAloud.normalize(parts.join("\n"));
    },

    warm: () => {
        if (ReadAloud.warmed) return;
        ReadAloud.warmed = true;
        try {
            if (window.speechSynthesis) {
                window.speechSynthesis.resume();
                var u = new SpeechSynthesisUtterance(" ");
                u.volume = 0;
                window.speechSynthesis.speak(u);
                window.speechSynthesis.cancel();
            }
        } catch (e) {}
    },

    // I3/P3: speak/stop counts feed the mic diagnostics (metadata only).
    ttsCounts: { speak: 0, stop: 0, stopFail: 0, nativePending: 0, nativePendingMax: 0, nativeCompleted: 0, nativeFailed: 0 },
    _speechGeneration: 0,
    _micDeferredSpeech: "",
    micBusy: () => {
        return typeof Input !== "undefined" && Input.Mic && (Input.Mic.active || Input.Mic.finalizing);
    },
    // Explicit UI narration follows the latest requested instruction (tours
    // already Stop before advancing). Buffer narration remains unconsumed.
    resumeAfterMic: () => {
        if (ReadAloud.micBusy()) return;
        var text = ReadAloud._micDeferredSpeech;
        ReadAloud._micDeferredSpeech = "";
        if (text) ReadAloud.speak(text);
        ReadAloud.schedule();
    },

    // Returns a promise that settles when the engine reports the stop -- or
    // never rejects and is bounded by callers (the native plugin's stop may
    // never resolve). Existing synchronous callers ignore the return value.
    stop: () => {
        ReadAloud._speechGeneration++;
        ReadAloud._micDeferredSpeech = "";
        ReadAloud.ttsCounts.stop++;
        var done = Promise.resolve();
        try {
            var native = ReadAloud.nativePlugin();
            if (native && typeof native.stop === "function") {
                done = Promise.resolve(native.stop()).catch(function () { ReadAloud.ttsCounts.stopFail++; });
            }
        } catch (e) { ReadAloud.ttsCounts.stopFail++; }
        try {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (e2) {}
        return done;
    },

    // Automated browsers (Playwright/WebDriver) must never make the developer's PC talk: the real OS speech engine would read
    // every intro aloud on each test run. A test that needs to observe speech stubs speechSynthesis/TextToSpeech AND sets
    // window.__PL_TEST_SPEECH = true. Real users (navigator.webdriver is false) are unaffected.
    automationMuted: () => { try { return !!(navigator.webdriver && !window.__PL_TEST_SPEECH); } catch (e) { return false; } },

    speak: (text) => {
        if (!ReadAloud.prefsOn()) return false;
        if (ReadAloud.automationMuted()) return false;
        var t = ReadAloud.scrubForSpeech(text);
        if (!t || t.length < 2 || !ReadAloud.meaningful(t)) return false;
        if (t.length > 4000) t = t.slice(0, 4000);
        if (ReadAloud.micBusy()) {
            ReadAloud._micDeferredSpeech = t;
            return true;
        }
        var generation = ++ReadAloud._speechGeneration;

        try {
            if (typeof window !== "undefined") {
                window.__readAloudLast = t;
                window.__readAloudLog = window.__readAloudLog || [];
                window.__readAloudLog.push({ t: Date.now(), text: t });
                // Bounded: a long session must not accumulate every utterance.
                if (window.__readAloudLog.length > 200) window.__readAloudLog.splice(0, window.__readAloudLog.length - 200);
            }
        } catch (logErr) {}

        ReadAloud._lastSpeakAt = Date.now();
        var rate = ReadAloud.rate();
        var native = ReadAloud.nativePlugin();
        if (native && typeof native.speak === "function") {
            try {
                var payload = { text: t, rate: rate, pitch: 1.0, category: "ambient" };
                var run = function () {
                    if (generation !== ReadAloud._speechGeneration || ReadAloud.micBusy()) return;
                    try {
                        ReadAloud.ttsCounts.speak++;
                        ReadAloud.ttsCounts.nativePending++;
                        ReadAloud.ttsCounts.nativePendingMax = Math.max(ReadAloud.ttsCounts.nativePendingMax, ReadAloud.ttsCounts.nativePending);
                        Promise.resolve(native.speak(payload)).then(function () {
                            ReadAloud.ttsCounts.nativePending--;
                            ReadAloud.ttsCounts.nativeCompleted++;
                        }, function () {
                            ReadAloud.ttsCounts.nativePending--;
                            ReadAloud.ttsCounts.nativeFailed++;
                        });
                    } catch (eN) {
                        ReadAloud.ttsCounts.nativePending--;
                        ReadAloud.ttsCounts.nativeFailed++;
                    }
                };
                try {
                    if (typeof native.stop === "function") {
                        ReadAloud.ttsCounts.stop++;
                        Promise.resolve(native.stop()).then(function () {
                            setTimeout(run, 40);
                        }).catch(function () { ReadAloud.ttsCounts.stopFail++; setTimeout(run, 40); });
                    } else {
                        run();
                    }
                } catch (eS) { ReadAloud.ttsCounts.stopFail++; run(); }
                return true;
            } catch (e) {}
        }
        if (typeof window !== "undefined" && window.speechSynthesis) {
            try {
                ReadAloud.warm();
                ReadAloud.ttsCounts.stop++;
                try { window.speechSynthesis.cancel(); } catch (eC) {}
                var u = new SpeechSynthesisUtterance(t);
                u.rate = rate;
                ReadAloud.ttsCounts.speak++;
                window.speechSynthesis.speak(u);
                return true;
            } catch (e2) {}
        }
        if (!ReadAloud.unsupportedNoted) {
            ReadAloud.unsupportedNoted = true;
            try { console.warn("ReadAloud: speech not available on this device"); } catch (e3) {}
        }
        return false;
    },

    onStoryDelta: (delta) => {
        if (!ReadAloud.prefsOn()) return;
        var t = ReadAloud.scrubForSpeech(delta);
        if (ReadAloud.meaningful(t)) ReadAloud.speak(t);
    },

    onDialog: (title, bodyHtml) => {
        if (!ReadAloud.prefsOn()) return;
        if (!(typeof Global !== "undefined" && Global.Prefs && Global.Prefs.ReadAloudDialogs)) return;
        var tmp = document.createElement("div");
        tmp.innerHTML = bodyHtml || "";
        Array.prototype.forEach.call(tmp.querySelectorAll("style, script"), function (n) { n.remove(); });
        var plain = ReadAloud.scrubForSpeech((title || "") + ". " + (tmp.innerText || ""));
        if (ReadAloud.meaningful(plain)) ReadAloud.speak(plain);
    },

    // Mutation records ignored — underline pass rewrites old lines (Claude #673).
    schedule: () => {
        clearTimeout(ReadAloud.debounceTimer);
        ReadAloud.debounceTimer = setTimeout(function () { ReadAloud.flush(); }, 350);
    },

    flush: () => {
        // Check BEFORE collecting: the mic must neither compete for audio
        // focus nor mark deferred game narration as already read.
        if (ReadAloud.micBusy()) return;
        if (document.getElementById("parchlock-splash") || document.body.classList.contains("parchlock-splash-active")) return;
        if (!ReadAloud.prefsOn()) return;
        var lines = ReadAloud.collectNewLines();
        if (!lines.length) return;
        // Consecutive-turn skip-repeats (default OFF). lastLineFps is replaced every
        // flush (even when pref off) so it never grows into session history.
        var skip = ReadAloud.skipRepeatsOn();
        var prev = ReadAloud.lastLineFps || {};
        var cur = {};
        var kept = [];
        lines.forEach(function (l) {
            var fp = ReadAloud.normalize(l).toLowerCase().replace(/\s+/g, " ");
            if (fp) cur[fp] = true;
            if (!(skip && fp && prev[fp])) kept.push(l);
        });
        ReadAloud.lastLineFps = cur;
        if (!kept.length) return;
        var chunk = ReadAloud.scrubForSpeech(kept.join("\n"));
        if (!ReadAloud.meaningful(chunk)) return;
        ReadAloud.speak(chunk);
    },

    // Mark on-screen lines handled (enable mid-game / new story only).
    seedSilent: () => {
        ReadAloud.collectNewLines();
        ReadAloud.pendingText = "";
        ReadAloud.lastLineFps = {};
        try { ReadAloud.lastPlain = ReadAloud.bufferPlain(); } catch (e) {}
    },

    clearSessionMemory: () => {
        ReadAloud.spokenLengths = typeof WeakMap !== "undefined" ? new WeakMap() : null;
        ReadAloud.spokenFingerprints = {};
        ReadAloud.spokenOrder = [];
        ReadAloud.pendingText = "";
        ReadAloud.lastPlain = "";
        ReadAloud.lastLineFps = {};
    },

    onPlayerTurn: () => {
        // Per-element consumed lengths handle repeats; no reset needed here.
    },

    attachBufferObservers: () => {
        if (ReadAloud.observer) {
            try { ReadAloud.observer.disconnect(); } catch (e) {}
        }
        ReadAloud.observer = new MutationObserver(function () { ReadAloud.schedule(); });
        ReadAloud.bufferRoots().forEach(function (root) {
            try {
                ReadAloud.observer.observe(root, { childList: true, characterData: true, subtree: true });
            } catch (e) {}
        });
    },

    resetForNewStory: () => {
        ReadAloud.stop();
        ReadAloud.clearSessionMemory();
        setTimeout(function () {
            ReadAloud.seedSilent();
            ReadAloud.attachBufferObservers();
            ReadAloud.schedule();
        }, 50);
    },

    applyPrefs: () => {
        if (!ReadAloud.prefsOn()) {
            ReadAloud.stop();
            return;
        }
        ReadAloud.warm();
        if (!ReadAloud.watching) {
            // Mid-game enable: seed current screen so we only speak NEW text after.
            ReadAloud.seedSilent();
            ReadAloud.start();
        } else {
            ReadAloud.seedSilent();
            ReadAloud.attachBufferObservers();
        }
    },

    // Do NOT seed on start — title/intro already painted must be read (Claude #683).
    start: () => {
        if (ReadAloud.watching) return;
        ReadAloud.watching = true;
        ReadAloud.attachBufferObservers();
        var port = document.getElementById("windowport");
        if (port && !ReadAloud.windowObserver) {
            ReadAloud.windowObserver = new MutationObserver(function () {
                ReadAloud.attachBufferObservers();
                ReadAloud.schedule();
            });
            try {
                ReadAloud.windowObserver.observe(port, { childList: true, subtree: false });
            } catch (e) {}
        }
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) ReadAloud.stop();
        });
        ReadAloud.schedule();
    },

    init: () => {
        if (!ReadAloud.prefsOn()) {
            document.addEventListener("click", function () { ReadAloud.warm(); }, { once: true, capture: true });
            return;
        }
        ReadAloud.start();
        var tries = 0;
        clearInterval(ReadAloud.bootTimer);
        ReadAloud.bootTimer = setInterval(function () {
            tries++;
            ReadAloud.attachBufferObservers();
            ReadAloud.flush();
            if (tries >= 40) clearInterval(ReadAloud.bootTimer);
        }, 500);
        document.addEventListener("click", function () { ReadAloud.warm(); }, { once: true, capture: true });
        document.addEventListener("touchend", function () { ReadAloud.warm(); }, { once: true, capture: true });
        document.addEventListener("keydown", function (ev) {
            if (!ev || ev.key !== "Enter") return;
            if (ev.target && (ev.target.classList && (ev.target.classList.contains("Input") || ev.target.classList.contains("LineInput")) || (ev.target.closest && ev.target.closest(".Input, .LineInput")))) {
                ReadAloud.onPlayerTurn();
            }
        }, true);
        document.addEventListener("click", function (ev) {
            var t = ev && ev.target;
            if (!t) return;
            if (t.id === "submit" || t.id === "pl-input-submit" || (t.closest && t.closest("#submit, #pl-input-submit, .submit, button.pl-submit"))) {
                ReadAloud.onPlayerTurn();
            }
        }, true);
    }
};

if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { setTimeout(ReadAloud.init, 0); });
    } else {
        setTimeout(ReadAloud.init, 0);
    }
}
