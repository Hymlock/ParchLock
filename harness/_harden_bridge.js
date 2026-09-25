const fs = require("fs");
let b = fs.readFileSync("js/HostEmglkenBridge.js", "utf8");

// Rewrite mount to be resilient against Quixe reclaiming #windowport
const newFile = `/* HostEmglkenBridge - O1 complete: mount modern Parchment/Emglken under ParchLock chrome.
 * Activates when ?vm=emglken or ?host=emglken. Default Quixe path unchanged.
 */
var HostEmglkenBridge = {
    active: false,
    iframe: null,
    pollTimer: null,
    guardTimer: null,
    singlePath: "lib/parchment-modern/parchment-single-tapped.html",

    wants: () => {
        try {
            var q = (location.search || "").toLowerCase();
            if (q.indexOf("vm=emglken") >= 0 || q.indexOf("host=emglken") >= 0) return true;
            if (window.__PL_EMGLKEN_STORY__) return true;
        } catch (e) {}
        return false;
    },

    storyParam: () => {
        try {
            if (window.__PL_EMGLKEN_STORY__) return window.__PL_EMGLKEN_STORY__;
            var u = new URL(location.href);
            return u.searchParams.get("story") || u.searchParams.get("storyfile") || "";
        } catch (e) { return ""; }
    },

    buildSrc: () => {
        var story = HostEmglkenBridge.storyParam();
        var src = new URL(HostEmglkenBridge.singlePath, location.href).href + "?autoplay=1";
        if (story) {
            try { src += "&story=" + encodeURIComponent(new URL(story, location.href).href); }
            catch (e) { src += "&story=" + encodeURIComponent(story); }
        }
        return src;
    },

    ensureFrame: () => {
        var port = document.getElementById("windowport");
        if (!port) return null;
        var frame = document.getElementById("pl-emglken-frame");
        if (frame && frame.parentElement === port) return frame;
        port.innerHTML = "";
        frame = document.createElement("iframe");
        frame.id = "pl-emglken-frame";
        frame.title = "Emglken story host";
        frame.setAttribute("allow", "autoplay");
        frame.src = HostEmglkenBridge.buildSrc();
        frame.style.cssText = "border:0;width:100%;height:100%;min-height:70vh;background:#111;display:block;";
        port.appendChild(frame);
        HostEmglkenBridge.iframe = frame;
        var loading = document.getElementById("loadingpane");
        if (loading) loading.style.display = "none";
        var parchment = document.getElementById("parchment");
        if (parchment) parchment.style.display = "none";
        frame.addEventListener("load", function () { HostEmglkenBridge.startBridge(); });
        return frame;
    },

    mount: () => {
        document.documentElement.classList.add("pl-host-emglken");
        HostEmglkenBridge.active = true;
        HostEmglkenBridge.ensureFrame();
        HostEmglkenBridge.startBridge();
        if (!HostEmglkenBridge.guardTimer) {
            HostEmglkenBridge.guardTimer = setInterval(function () {
                try { HostEmglkenBridge.ensureFrame(); } catch (e) {}
            }, 1000);
        }
    },

    readChildWorld: () => {
        try {
            var w = HostEmglkenBridge.iframe && HostEmglkenBridge.iframe.contentWindow;
            if (!w) return null;
            if (w.WorldModel && w.WorldModel.lastPayload) return w.WorldModel.lastPayload;
            if (w.__PARCHLOCK_WORLD__) return w.__PARCHLOCK_WORLD__;
            return null;
        } catch (e) { return null; }
    },

    mergeIntoParent: (childPayload) => {
        if (!childPayload || typeof WorldModel === "undefined") return;
        try {
            var merged = WorldModel.createEmptyPayload();
            Object.keys(childPayload).forEach(function (k) { merged[k] = childPayload[k]; });
            merged.engineMode = childPayload.engineMode || "behavioral";
            merged.sources = (childPayload.sources || []).concat([{ name: "emglken-bridge", confidence: 0.7 }]);
            WorldModel.lastPayload = merged;
            WorldModel.engineMode = merged.engineMode;
            try { window.__PARCHLOCK_WORLD__ = merged; } catch (e) {}
            if (typeof TextGate !== "undefined" && childPayload.roomName) {
                TextGate.noteText(childPayload.roomName + " " + ((childPayload.discoveredObjects || []).map(function (o) { return o.name; }).join(" ")));
            }
            if (typeof TranslatorUI !== "undefined") TranslatorUI.apply(merged);
        } catch (e) {}
    },

    startBridge: () => {
        if (HostEmglkenBridge.pollTimer) return;
        HostEmglkenBridge.pollTimer = setInterval(function () {
            var frame = document.getElementById("pl-emglken-frame");
            if (frame) HostEmglkenBridge.iframe = frame;
            var p = HostEmglkenBridge.readChildWorld();
            if (p) HostEmglkenBridge.mergeIntoParent(p);
        }, 400);
    },

    init: () => {
        if (!HostEmglkenBridge.wants()) return;
        var go = function () { try { HostEmglkenBridge.mount(); } catch (e) { console.warn("HostEmglkenBridge", e); } };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
        else go();
        setTimeout(go, 50);
        setTimeout(go, 500);
        setTimeout(go, 1500);
    }
};

try { HostEmglkenBridge.init(); } catch (e) {}
`;
fs.writeFileSync("js/HostEmglkenBridge.js", newFile);
console.log("bridge hardened", fs.statSync("js/HostEmglkenBridge.js").size);

// Also ensure early guard disables parchment more aggressively
let html = fs.readFileSync("play.html", "utf8");
if (html.indexOf("parchment_options.disabled") < 0 && html.indexOf("__PL_EMGLKEN_STORY__") >= 0) {
  html = html.replace(
    "window.parchment_options.auto_load = false;",
    "window.parchment_options.auto_load = false;\n    window.parchment_options.story = \"\";\n    window.__PL_DISABLE_QUIXE__ = true;"
  );
  fs.writeFileSync("play.html", html);
  console.log("guard strengthened");
}
