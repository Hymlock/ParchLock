const fs = require("fs");
let t = fs.readFileSync("js/HostEmglkenBridge.js", "utf8");
t = t.replace(
  `ensureFrame: () => {
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
    },`,
  `ensureFrame: () => {
        var port = document.getElementById("windowport");
        if (!port) return null;
        var frame = document.getElementById("pl-emglken-frame");
        // Never reload a live frame ? Quixe DOM churn was remounting and killing boot
        if (frame) {
            if (frame.parentElement !== port) {
                try { port.innerHTML = ""; port.appendChild(frame); } catch (e) {}
            }
            HostEmglkenBridge.iframe = frame;
            return frame;
        }
        if (HostEmglkenBridge._booted) return HostEmglkenBridge.iframe;
        port.innerHTML = "";
        frame = document.createElement("iframe");
        frame.id = "pl-emglken-frame";
        frame.title = "Emglken story host";
        frame.setAttribute("allow", "autoplay");
        frame.src = HostEmglkenBridge.buildSrc();
        frame.style.cssText = "border:0;width:100%;height:100%;min-height:70vh;background:#111;display:block;";
        port.appendChild(frame);
        HostEmglkenBridge.iframe = frame;
        HostEmglkenBridge._booted = true;
        var loading = document.getElementById("loadingpane");
        if (loading) loading.style.display = "none";
        var parchment = document.getElementById("parchment");
        if (parchment) parchment.style.display = "none";
        frame.addEventListener("load", function () { HostEmglkenBridge.startBridge(); });
        return frame;
    },`
);
fs.writeFileSync("js/HostEmglkenBridge.js", t);
console.log("ensureFrame fixed", t.includes("_booted"));
