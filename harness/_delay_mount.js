const fs = require("fs");
let t = fs.readFileSync("js/HostEmglkenBridge.js", "utf8");
// Change init to delay first mount until layout CSS applies; reload src once after size known
t = t.replace(
  `init: () => {
        if (!HostEmglkenBridge.wants()) return;
        var go = function () { try { HostEmglkenBridge.mount(); } catch (e) { console.warn("HostEmglkenBridge", e); } };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
        else go();
        setTimeout(go, 50);
        setTimeout(go, 500);
        setTimeout(go, 1500);
    }`,
  `init: () => {
        if (!HostEmglkenBridge.wants()) return;
        var go = function () { try { HostEmglkenBridge.mount(); } catch (e) { console.warn("HostEmglkenBridge", e); } };
        var start = function () {
            document.documentElement.classList.add("pl-host-emglken");
            // wait a frame so CSS min-height applies before first engine boot
            requestAnimationFrame(function () {
                setTimeout(go, 50);
            });
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
        else start();
    }`
);
fs.writeFileSync("js/HostEmglkenBridge.js", t);

// Also: if child stuck >3s with empty room, nudge by setting iframe src again once
if (t.indexOf("nudgeBoot") < 0) {
  t = fs.readFileSync("js/HostEmglkenBridge.js", "utf8");
  t = t.replace(
    "startBridge: () => {",
    `nudgeBoot: () => {
        try {
            var frame = HostEmglkenBridge.iframe || document.getElementById("pl-emglken-frame");
            if (!frame || HostEmglkenBridge._nudged) return;
            var w = frame.contentWindow;
            var room = w && w.WorldModel && w.WorldModel.lastPayload && w.WorldModel.lastPayload.roomName;
            if (room) return;
            HostEmglkenBridge._nudged = true;
            var src = HostEmglkenBridge.buildSrc();
            if (frame.src !== src) frame.src = src;
            else { frame.src = "about:blank"; setTimeout(function(){ frame.src = src; }, 50); }
        } catch (e) {}
    },

    startBridge: () => {`
  );
  t = t.replace(
    "if (p) HostEmglkenBridge.mergeIntoParent(p);",
    "if (p) HostEmglkenBridge.mergeIntoParent(p);\n            if (!HostEmglkenBridge._nudged) {\n                HostEmglkenBridge._nudgeAt = HostEmglkenBridge._nudgeAt || Date.now();\n                if (Date.now() - HostEmglkenBridge._nudgeAt > 4000) HostEmglkenBridge.nudgeBoot();\n            }"
  );
  fs.writeFileSync("js/HostEmglkenBridge.js", t);
}
console.log("delay+nudge ok");
