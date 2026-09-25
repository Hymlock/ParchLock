const fs = require("fs");

// --- Harden ZRamProvider.resolveStatusRoom: prefer look headers, Glk status, Map ---
let zp = fs.readFileSync("js/ZRamProvider.js", "utf8");
zp = zp.replace(
  /resolveStatusRoom:\s*function\s*\(\)\s*\{[\s\S]*?\n\s*\},/,
  `resolveStatusRoom: function () {
        try {
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) {
                var cr = String(ParchLockMap.CurrentRoom).trim();
                if (cr && cr.charAt(0) !== "(") return cr;
            }
            var el = document.querySelector("#statusline, .StatusLine, #status, .statusline, #status_right, #status_left");
            if (el && el.textContent) {
                var st = el.textContent.trim().split(/\\n/)[0].trim();
                if (st) return st.replace(/\\s{2,}.*$/, "").trim();
            }
            // Grid status cells (Quixe)
            var cells = document.querySelectorAll(".StatusGrid .Style_subheader, .statusline, #windowport .Style_subheader");
            for (var ci = 0; ci < cells.length; ci++) {
                var ct = (cells[ci].textContent || "").trim();
                if (ct && ct.length < 60) return ct;
            }
            var wp = document.querySelector("#windowport");
            if (wp) {
                var t = (wp.innerText || "").trim().split(/\\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
                // Prefer a recent short Title-Case / ALLCAPS room line after a look
                for (var i = t.length - 1; i >= 0; i--) {
                    var line = t[i];
                    if (line.length < 2 || line.length > 48) continue;
                    if (/^(You |I |There |The |A |An |It |She |He |>|What |Would |Do you)/i.test(line)) continue;
                    if (/^[A-Z][A-Za-z0-9'., \\-]{1,47}$/.test(line) || /^[A-Z0-9' \\-]{3,40}$/.test(line)) return line;
                }
            }
        } catch (e) {}
        return "";
    },`
);
fs.writeFileSync("js/ZRamProvider.js", zp);
try { new Function(zp); console.log("ZP OK"); } catch (e) { console.log("ZP FAIL", e.message); }

// --- TranslatorUI apply: sync room from payload every apply ---
let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
try { new Function(tu); console.log("TU already OK"); } catch (e) {
  console.log("TU broken", e.message);
}
// Ensure apply() syncs room
if (tu.includes("apply:") && !tu.includes("SYNC_ROOM_IN_APPLY")) {
  tu = tu.replace(
    /apply:\s*\(payload\)\s*=>\s*\{/,
    `apply: (payload) => {
        /* SYNC_ROOM_IN_APPLY */
        try {
            if (payload && payload.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = payload.roomName;
            }
        } catch (eS) {}
`
  );
  fs.writeFileSync("js/TranslatorUI.js", tu);
  try { new Function(fs.readFileSync("js/TranslatorUI.js","utf8")); console.log("TU fixed OK"); } catch (e2) { console.log("TU still", e2.message); }
}

// --- docs-sync require D22 ---
let ds = fs.readFileSync("harness/docs-sync.js", "utf8");
if (!ds.includes("D22")) {
  // inject into token list heuristically
  if (ds.includes("D17")) {
    ds = ds.replace(/("D17"|'D17')/, "$1, \"D22\", \"6C. Universal\", \"Universal coverage\"");
  } else {
    ds = ds.replace(
      /(const tokens = \[|requiredTokens = \[|mustInclude = \[)/,
      "$1\"D22\", \"Universal coverage\", "
    );
  }
  fs.writeFileSync("harness/docs-sync.js", ds);
}
console.log("docs-sync has D22", fs.readFileSync("harness/docs-sync.js","utf8").includes("D22"));
