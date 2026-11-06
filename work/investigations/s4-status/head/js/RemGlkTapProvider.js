/* RemGlkTapProvider - protocol-first GlkOte.update interceptor (distributable).
 * No machine-local paths. Works on parchment-single-tapped / any page with GlkOte.
 * D24/D29: this taps printed GlkOte text for HUD/meta telemetry only
 * (yes/no dialogue prompt detection) — it is NOT a source for
 * discoveredObjects/exits/roomName/inventory. Those regex/hardcoded-noun
 * extractions (direction words in prose, a fixed noun list) used to be
 * computed here and returned, relying on WorldModel.isStructuralFact()
 * silently discarding them downstream (this provider's engineMode is never
 * "structural" and its source name is never "z-ram"/"glulx-ram"/"live-heap").
 * That was a live landmine, not a real safeguard — removed rather than left
 * for a future edit to accidentally re-enable. Real Glulx room/object/exit
 * facts must come from an actual structural Glulx RAM reader (D28/Phase 4),
 * not text-mining GlkOte's rendered output.
 */
var RemGlkTapProvider = {
    name: "remglk",
    installed: false,
    lastGen: null,
    lastText: "",
    lastStatus: "",
    updates: 0,
    // True once the interpreter has really exited (glk_exit marks its final
    // update `disable: true`). Withdrawing input alone is not an exit.
    exited: false,
    specialCommands: [],

    flattenContent: (node) => {
        if (!node) return "";
        if (typeof node === "string") return node;
        if (Array.isArray(node)) {
            return node.map(RemGlkTapProvider.flattenContent).join("");
        }
        if (node.content) return RemGlkTapProvider.flattenContent(node.content);
        if (node.text && typeof node.text === "string") return node.text;
        if (node.text && Array.isArray(node.text)) return RemGlkTapProvider.flattenContent(node.text);
        if (node.lines) return RemGlkTapProvider.flattenContent(node.lines);
        return "";
    },

    extractFromMessage: (msg) => {
        if (!msg || msg.type !== "update") return;
        RemGlkTapProvider.updates += 1;
        RemGlkTapProvider.lastGen = msg.gen;
        if (msg.disable) RemGlkTapProvider.exited = true;
        else if (msg.input && msg.input.length) RemGlkTapProvider.exited = false;
        var chunks = [];
        var status = "";
        (msg.content || []).forEach(function (win) {
            if (win.lines) {
                var lineText = RemGlkTapProvider.flattenContent(win.lines).replace(/\s+/g, " ").trim();
                if (lineText) status = lineText;
            }
            if (win.text) {
                (win.text || []).forEach(function (block) {
                    (block.content || []).forEach(function (span) {
                        if (!span) return;
                        if (span.text) chunks.push(String(span.text));
                    });
                });
            }
        });
        var text = chunks.join(" ").replace(/\s+/g, " ").trim();
        if (text) RemGlkTapProvider.lastText = text;
        if (status) RemGlkTapProvider.lastStatus = status;

        // D24/D29: only HUD/meta telemetry (yes/no dialogue prompt
        // detection) is derived from this printed text — never room name,
        // exits, or discovered objects. See file-header comment.
        var src = (RemGlkTapProvider.lastText + " " + RemGlkTapProvider.lastStatus);
        var special = [];
        var low = src.toLowerCase();
        if (/please answer yes or no|do you wish to continue|would you like to/.test(low)) {
            special.push({ id: "answer-yes", label: "yes", command: "yes", confidence: 0.8 });
            special.push({ id: "answer-no", label: "no", command: "no", confidence: 0.8 });
        }
        if (/restore a saved game/.test(low)) {
            special.push({ id: "restore-no", label: "no (fresh start)", command: "no", confidence: 0.85 });
            special.push({ id: "restore-yes", label: "yes (restore)", command: "yes", confidence: 0.7 });
        }
        RemGlkTapProvider.specialCommands = special;
        try { window.__PARCHLOCK_REMGLK__ = RemGlkTapProvider.snapshot(); } catch (e) {}
    },

    findGlkOte: () => {
        if (window.GlkOte && typeof window.GlkOte.update === "function") return window.GlkOte;
        if (window.__PL_GLKOTE__) return window.__PL_GLKOTE__;
        try {
            if (window.parchment && window.parchment.options && window.parchment.options.GlkOte) {
                return window.parchment.options.GlkOte;
            }
        } catch (e) {}
        return null;
    },

    install: () => {
        var glk = RemGlkTapProvider.findGlkOte();
        if (!glk || typeof glk.update !== "function") return false;
        if (glk.__pm_remglk_tapped) {
            RemGlkTapProvider.installed = true;
            return true;
        }
        var orig = glk.update.bind(glk);
        glk.update = function (msg) {
            try { RemGlkTapProvider.extractFromMessage(msg); } catch (e) {}
            return orig(msg);
        };
        glk.__pm_remglk_tapped = true;
        window.__PL_GLKOTE__ = glk;
        RemGlkTapProvider.installed = true;
        return true;
    },

    snapshot: () => ({
        installed: RemGlkTapProvider.installed,
        updates: RemGlkTapProvider.updates,
        gen: RemGlkTapProvider.lastGen,
        status: RemGlkTapProvider.lastStatus,
        textSample: (RemGlkTapProvider.lastText || "").slice(0, 200),
        specialCommands: RemGlkTapProvider.specialCommands
    }),

    
    scanDomSpecials: () => {
        var special = [];
        try {
            var text = (document.body && document.body.innerText || "").toLowerCase().replace(/\s+/g, " ");
            if (/restore a saved game|restore \?/.test(text)) special.push({ label: "restore", command: "restore" });
            if (/do you wish to continue|would you like to continue|would you like to restore/.test(text)) {
                if (/continue/.test(text)) {
                    special.push({ label: "yes", command: "yes" });
                    special.push({ label: "no", command: "no" });
                }
                if (/restore/.test(text) && !special.some(function (s) { return s.command === "restore"; })) {
                    special.push({ label: "restore", command: "restore" });
                    special.push({ label: "no", command: "no" });
                }
            }
            if (/\byes\b.*\bno\b|\by\/n\b/.test(text) && special.length === 0) {
                special.push({ label: "yes", command: "yes" });
                special.push({ label: "no", command: "no" });
            }
        } catch (e) {}
        return special;
    },

    collect: () => {
        if (!RemGlkTapProvider.installed) RemGlkTapProvider.install();
        var live = !!(RemGlkTapProvider.installed && RemGlkTapProvider.updates > 0);
        var special = RemGlkTapProvider.specialCommands.slice();
        try {
            var dom = RemGlkTapProvider.scanDomSpecials();
            dom.forEach(function (s) {
                var cmd = s.command || s.label || s;
                if (!special.some(function (x) { return (x.command || x) === cmd; })) special.push(s);
            });
        } catch (e) {}
        // D24: never a source for roomId/roomName/exits/discoveredObjects/
        // inventory — those must come from a real structural Glulx RAM
        // reader (D28/Phase 4), not this printed-text tap. engineMode stays
        // "behavioral", never "structural", so WorldModel.isStructuralFact
        // correctly keeps this provider out of those fields regardless.
        return {
            sources: [{ name: "remglk", confidence: live ? 0.7 : (special.length ? 0.55 : 0.05) }],
            vmType: live ? "emglken-bocfel" : "pending-emglken",
            engineMode: live || special.length ? "behavioral" : "heuristic",
            roomName: "",
            roomConfidence: 0,
            roomId: null,
            exits: [],
            inventory: [],
            discoveredObjects: [],
            specialCommands: special,
            probe: {
                status: live ? "remglk-live" : (special.length ? "remglk-dom-specials" : (RemGlkTapProvider.installed ? "remglk-waiting" : "remglk-not-installed")),
                updates: RemGlkTapProvider.updates,
                gen: RemGlkTapProvider.lastGen,
                sample: (RemGlkTapProvider.lastText || RemGlkTapProvider.lastStatus || "").slice(0, 160)
            }
        };
    }
};

try {
    if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
        WorldModel.registerProvider(RemGlkTapProvider);
    }
} catch (e) {}

// Retry install until GlkOte appears (single-file parchment boots async).
(function retryInstall() {
    var tries = 0;
    var t = setInterval(function () {
        tries += 1;
        if (RemGlkTapProvider.install() || tries > 80) clearInterval(t);
    }, 250);
})();