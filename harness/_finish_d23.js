const fs = require("fs");

// --- lookAheadExits with isNonCardinal ---
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const start = zr.indexOf("lookAheadExits:");
const end = zr.indexOf("attrsFromObject:", start);
if (start < 0) throw new Error("no lookAheadExits");
const replacement = `lookAheadExits: (mem, roomId) => {
        var CARD = {
            north:1, south:1, east:1, west:1, northeast:1, northwest:1, southeast:1, southwest:1,
            up:1, down:1, in:1, out:1, n:1, s:1, e:1, w:1, ne:1, nw:1, se:1, sw:1, u:1, d:1
        };
        var exits = [];
        var h = ZRamReader.header(mem);
        var count = ZRamReader.objectCount(mem, h);
        var seen = {};
        function pushExit(label, prop, val) {
            var tname = ZRamReader.shortName(mem, val) || "";
            if (!tname || tname.charAt(0) === "(") return;
            var lab = String(label || ("exit-" + prop)).toLowerCase();
            var key = lab + "->" + val;
            if (seen[key]) return;
            seen[key] = 1;
            var doorish = /door|gate|hatch|portal/i.test(tname);
            exits.push({
                label: lab,
                prop: prop,
                targetRoomId: val,
                targetRoomName: tname,
                isDoor: doorish,
                isLocked: false,
                isNonCardinal: !CARD[lab],
                confidence: CARD[lab] ? 0.85 : 0.75
            });
        }
        var cand = (ZRamReader.directionProps && ZRamReader.directionProps.candidates) || [];
        cand.forEach(function (propNum) {
            var val = ZRamReader.readProp(mem, roomId, propNum);
            if (!(val >= 1 && val <= count)) return;
            var tname = (ZRamReader.shortName(mem, val) || "").toLowerCase();
            var label = CARD[tname] ? tname : ("exit-" + propNum);
            pushExit(label, propNum, val);
        });
        // Broad room-like prop scan (non-compass portals / numbered exits often live here)
        for (var p = 1; p <= 48; p++) {
            if (cand.indexOf(p) >= 0) continue;
            var v = ZRamReader.readProp(mem, roomId, p);
            if (!(v >= 2 && v <= count)) continue;
            var o2 = ZRamReader.objectLinks(mem, v);
            if (!o2) continue;
            var k2 = ZRamReader.children(mem, v);
            var nm2 = ZRamReader.shortName(mem, v) || "";
            if (!nm2 || nm2.charAt(0) === "(") continue;
            if (o2.parent === 0 && k2.length >= 1) {
                var lab2 = CARD[nm2.toLowerCase()] ? nm2.toLowerCase() : ("exit-" + p);
                pushExit(lab2, p, v);
            }
        }
        return exits;
    },

`;
if (end > start) {
  zr = zr.slice(0, start) + replacement + zr.slice(end);
  fs.writeFileSync("js/ZRamReader.js", zr);
}
try { new Function(fs.readFileSync("js/ZRamReader.js","utf8")); console.log("ZR lookAhead OK", zr.includes("isNonCardinal")); }
catch (e) { console.log("ZR FAIL", e.message); }

// --- MapBeautify non-cardinal spokes ---
let mb = fs.readFileSync("js/MapBeautify.js", "utf8");
if (!mb.includes("nonCardinalSpokes")) {
  mb = mb.replace(
    "var MapBeautify = {",
    `var MapBeautify = {
    nonCardinalSpokes: function () {
        if (typeof ParchLockMap === "undefined" || !ParchLockMap.Rooms) return;
        var curName = ParchLockMap.CurrentRoom || ParchLockMap.DisplayedRoom;
        var room = curName && ParchLockMap.GetRoom(curName);
        if (!room || !room.Exits) return;
        var host = document.getElementById("exits");
        if (!host) return;
        var existing = host.querySelector(".pl-noncardinal");
        if (existing) existing.remove();
        var wrap = document.createElement("div");
        wrap.className = "pl-noncardinal";
        wrap.setAttribute("style", "display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;justify-content:center;");
        var n = 0;
        Object.keys(room.Exits).forEach(function (dir) {
            var meta = (room.ExitMeta && room.ExitMeta[dir]) || {};
            var isNC = meta.isNonCardinal || (typeof MapTopology !== "undefined" && !MapTopology.isCardinal(dir));
            if (!isNC) return;
            var dest = ParchLockMap.Rooms[room.Exits[dir]];
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "pl-exit-noncardinal";
            btn.textContent = dir + (dest ? (" -> " + dest.Name) : "");
            btn.title = "Go: " + dir;
            btn.onclick = function () { if (typeof Actionable !== "undefined") Actionable.Submit(dir); };
            wrap.appendChild(btn);
            n++;
        });
        if (n) host.appendChild(wrap);
    },`
  );
}
if (!mb.includes("tick:")) {
  mb = mb.replace(/\n\}\s*;\s*$/, `,\n    tick: function () {\n        try { MapBeautify.nonCardinalSpokes(); if (MapBeautify.ensureFloors) MapBeautify.ensureFloors(); } catch (e) {}\n    }\n};\n`);
} else if (!mb.includes("nonCardinalSpokes()")) {
  mb = mb.replace(/tick:\s*\(\)\s*=>\s*\{/, "tick: () => {\n        try { MapBeautify.nonCardinalSpokes(); } catch (e) {}");
  mb = mb.replace(/tick:\s*function\s*\(\)\s*\{/, "tick: function () {\n        try { MapBeautify.nonCardinalSpokes(); } catch (e) {}");
}
fs.writeFileSync("js/MapBeautify.js", mb);
try { new Function(mb); console.log("MB OK"); } catch (e) { console.log("MB FAIL", e.message); }

// --- docs D23 ---
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
plan = plan.replace(
  /\*\*This phase is the heart of deterministic actionable \+ mapping\.\*\* Without it, alley objects \(cans\/window\/fence\) cannot be proven from RAM\./,
  "**This phase is the heart of deterministic actionable + mapping for EVERY room/module/system.** Fixture harnesses may use specific rooms; product code must not."
);
plan = plan.replace(
  /### Phase 5 - Map object-id identity \+ path queue \[x\]/,
  "### Phase 5 - Map object-id identity + path queue + non-compass topology [~]"
);
plan = plan.replace(
  /ID graph; state-delta non-cardinal edges; Navigator A\* \+ step queue \+ interrupt; note-key migrator\./,
  "ID graph; **state-delta non-cardinal edges (D23)**; hybrid grid-force when mixed/non-compass; Navigator A* + step queue + interrupt; note-key migrator. Compass directions are optional, never required."
);
if (!plan.includes("| D23 |")) {
  if (plan.includes("| D22 |")) {
    plan = plan.replace(/(\| D22 \|[^\n]+\n)/, "$1| D23 | Non-compass topological mapping is first-class: state-delta edges + RAM look-ahead with isNonCardinal; hybrid layout; games without N/S/E/W must map fully | [yes] |\n");
  } else {
    plan += "\n| D23 | Non-compass topological mapping first-class | [yes] |\n";
  }
}
if (!plan.includes("Non-compass / topological mapping (D23)")) {
  plan = plan.replace(
    /(Hard rule: \*\*no story-specific[\s\S]*?Alley is never a product dependency\.\*\*[^\n]*)/,
    `$1

### Non-compass / topological mapping (D23)
From conversion guide Non-Cardinal & Topological Graphing Engine + Hybrid Grid-Force:
- Command-agnostic state-delta: when location changes after ANY command, record MapGraph[prev][commandLabel]=curr.
- RAM look-ahead exits including in/out and unnamed props; isNonCardinal when not compass.
- Layout: cardinal edges may lock to grid; non-cardinal use spokes + force untangle.
- Navigator paths over any exit key string ? compass vocab is optional, never required.
`
  );
}
fs.writeFileSync("PRODUCTION_PLAN.md", plan);

let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
if (!uml.includes("## 25. Non-compass")) {
  uml += `

## 25. Non-compass topological mapping (D23)

\`\`\`mermaid
flowchart TB
  RAM[ZRam look-ahead exits] --> EX[UIPayload.exits]
  DELTA[StateDelta prevRoom + lastCommand + newRoom] --> EX
  EX --> CLASS{cardinal?}
  CLASS -->|yes| GRID[Grid vector optional]
  CLASS -->|no| FORCE[Non-cardinal spokes + force]
  GRID --> MAP[Map Exits any label]
  FORCE --> MAP
  MAP --> NAV[Navigator over any exit keys]
\`\`\`

Compass vocabulary is an optional layout hint, never a prerequisite for mapping, pathing, or RAM mining.
`;
  fs.writeFileSync("ARCHITECTURE_UML.md", uml);
}
console.log("D23", plan.includes("D23"), uml.includes("D23"));

// wire play + TranslatorUI + Input + BUILD
let html = fs.readFileSync("play.html", "utf8");
if (!html.includes("MapTopology.js")) {
  if (html.includes("MapBeautify.js")) html = html.replace('<script src="js/MapBeautify.js"></script>', '<script src="js/MapTopology.js"></script>\n\t\t<script src="js/MapBeautify.js"></script>');
  else if (html.includes("MapIdentity.js")) html = html.replace('<script src="js/MapIdentity.js"></script>', '<script src="js/MapIdentity.js"></script>\n\t\t<script src="js/MapTopology.js"></script>');
  fs.writeFileSync("play.html", html);
}
console.log("play", fs.readFileSync("play.html","utf8").includes("MapTopology.js"));

let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
if (!tu.includes("MapTopology")) {
  tu = tu.replace(/tick:\s*\(\)\s*=>\s*\{/, 'tick: () => {\n        try { if (typeof MapTopology !== "undefined" && MapTopology.tick) MapTopology.tick(WorldModel && WorldModel.lastPayload); } catch (eMT) {}');
  tu = tu.replace(/tick:\s*function\s*\(\)\s*\{/, 'tick: function () {\n        try { if (typeof MapTopology !== "undefined" && MapTopology.tick) MapTopology.tick(WorldModel && WorldModel.lastPayload); } catch (eMT) {}');
  fs.writeFileSync("js/TranslatorUI.js", tu);
}
try { new Function(fs.readFileSync("js/TranslatorUI.js","utf8")); console.log("TU OK"); } catch (e) { console.log("TU", e.message); }

let inp = fs.readFileSync("js/Input.js", "utf8");
if (!inp.includes("MapTopology.noteCommand")) {
  inp = inp.replace(/Inject:\s*\(([^)]*)\)\s*=>\s*\{/, function (m) {
    return m + '\n        try { if (typeof MapTopology !== "undefined") MapTopology.noteCommand(arguments[0]); } catch (e) {}';
  });
  fs.writeFileSync("js/Input.js", inp);
}
try { new Function(fs.readFileSync("js/Input.js","utf8")); console.log("Input OK"); } catch (e) { console.log("Input", e.message); }

let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 48");
fs.writeFileSync("js/Consts.js", c);
console.log("BUILD 48");
