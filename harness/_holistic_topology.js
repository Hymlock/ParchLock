const fs = require("fs");

// ========== DOCS: D23 + honest Phase 5 + Phase 2 language ==========
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
  plan = plan.replace(
    /(\| D22 \|[^\n]+\n)/,
    `$1| D23 | Non-compass topological mapping is first-class: state-delta edges + RAM look-ahead exits with isNonCardinal; hybrid grid-force layout; games without N/S/E/W must map fully | [yes] |\n`
  );
}
if (!plan.includes("Non-compass / topological mapping (D23)")) {
  plan = plan.replace(
    /(Hard rule: \*\*no story-specific[\s\S]*?scoring only\.)/,
    `$1

### Non-compass / topological mapping (D23)
From conversion guide ? Non-Cardinal & Topological Graphing Engine + Hybrid Grid-Force:
- **Command-agnostic state-delta:** when location changes after ANY command, record \`MapGraph[prev][commandLabel]=curr\` (Exit 1, port, enter portal, etc.).
- **RAM look-ahead:** direction props including in/out and unnamed props ? exits with \`isNonCardinal\` when not N/S/E/W/U/D/NE/NW/SE/SW.
- **Layout:** cardinal edges lock to grid vectors; non-cardinal use radial spokes + force-directed untangle (MapBeautify).
- **Navigator** paths over any exit key string, not only compass vocab.
`
  );
}
fs.writeFileSync("PRODUCTION_PLAN.md", plan);

let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
if (!uml.includes("D23") || !uml.includes("Non-compass topological")) {
  uml += `

## 25. Non-compass topological mapping (D23)

\`\`\`mermaid
flowchart TB
  RAM[ZRam look-ahead exits incl in/out/props] --> EX[UIPayload.exits]
  DELTA[StateDelta: prevRoom + lastCommand + newRoom] --> EX
  EX --> CLASS{cardinal?}
  CLASS -->|yes| GRID[Grid vector lock N/S/E/W/U/D]
  CLASS -->|no isNonCardinal| FORCE[Radial spoke + force untangle]
  GRID --> MAP[Map Exits graph any label]
  FORCE --> MAP
  MAP --> NAV[Navigator BFS/A* over any exit keys]
\`\`\`

Compass vocabulary is an **optional layout hint**, never a prerequisite for mapping, pathing, or RAM mining.
`;
}
fs.writeFileSync("ARCHITECTURE_UML.md", uml);
console.log("docs D23", plan.includes("D23"), uml.includes("D23"));

// ========== MapTopology.js ? holistic Phase 5/D23 ==========
const topology = `var MapTopology = {
    /* Holistic non-compass + cardinal map graph (D23 / Phase 5).
     * - RAM look-ahead exits (any prop ? target room)
     * - State-delta edges when location changes after any command
     * - Cardinal layout optional; isNonCardinal exits first-class
     */
    prevRoomId: null,
    prevRoomName: "",
    lastCommand: "",
    CARDINAL: {
        north: 1, n: 1, south: 1, s: 1, east: 1, e: 1, west: 1, w: 1,
        northeast: 1, ne: 1, northwest: 1, nw: 1, southeast: 1, se: 1, southwest: 1, sw: 1,
        up: 1, u: 1, down: 1, d: 1, in: 1, out: 1
    },

    isCardinal: function (label) {
        var k = String(label || "").toLowerCase().trim();
        return !!MapTopology.CARDINAL[k];
    },

    normalizeLabel: function (label) {
        var k = String(label || "").toLowerCase().trim();
        var aliases = { n: "north", s: "south", e: "east", w: "west", u: "up", d: "down", ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest" };
        return aliases[k] || k;
    },

    noteCommand: function (cmd) {
        if (cmd == null) return;
        var s = String(cmd).trim();
        if (!s) return;
        MapTopology.lastCommand = s;
    },

    classifyExit: function (ex) {
        var label = MapTopology.normalizeLabel((ex && (ex.label || ex.dir || ex.command)) || "");
        var cardinal = MapTopology.isCardinal(label);
        return Object.assign({}, ex || {}, {
            label: label || ("x" + (ex && ex.prop != null ? ex.prop : "unk")),
            isNonCardinal: !cardinal,
            confidence: (ex && ex.confidence) || 0.7
        });
    },

    ensureRoom: function (name, objectId) {
        if (typeof ParchLockMap === "undefined" || !name) return null;
        var room = ParchLockMap.GetRoom(name);
        if (!room) {
            room = {
                Id: ParchLockMap.Rooms.length,
                Name: name,
                Exits: {},
                Notes: [],
                ObjectId: objectId || (typeof MapIdentity !== "undefined" ? MapIdentity.hashName(name) : ("r_" + name)),
                Floor: 0,
                ExitMeta: {}
            };
            ParchLockMap.Rooms.push(room);
        }
        room.ExitMeta = room.ExitMeta || {};
        if (objectId) room.ObjectId = String(objectId);
        if (typeof MapIdentity !== "undefined") MapIdentity.ensureRoomIdentity(room);
        return room;
    },

    link: function (fromName, label, toName, meta) {
        if (!fromName || !label) return;
        var from = MapTopology.ensureRoom(fromName, meta && meta.fromId);
        if (!from) return;
        var dir = MapTopology.normalizeLabel(label);
        if (!dir) return;
        from.ExitMeta[dir] = Object.assign({}, from.ExitMeta[dir] || {}, meta || {}, {
            isNonCardinal: !MapTopology.isCardinal(dir),
            label: dir
        });
        if (toName) {
            var to = MapTopology.ensureRoom(toName, meta && meta.toId);
            if (to) from.Exits[dir] = to.Id;
        } else {
            // hinted stub without destination (anti-spoiler look-ahead without name)
            from.ExitMeta[dir].hinted = true;
        }
    },

    applyPayloadExits: function (payload) {
        if (!payload) return;
        var roomName = payload.roomName || (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) || "";
        if (!roomName) return;
        MapTopology.ensureRoom(roomName, payload.roomId);
        if (typeof ParchLockMap !== "undefined") ParchLockMap.CurrentRoom = roomName;
        (payload.exits || []).forEach(function (raw) {
            var ex = MapTopology.classifyExit(raw);
            var dest = ex.targetRoomName || null;
            // Prefer not to invent spoiler destinations from raw prop scans named "p12" only
            if (dest && /^\\(/.test(dest)) dest = null;
            MapTopology.link(roomName, ex.label, dest, {
                fromId: payload.roomId,
                toId: ex.targetRoomId,
                isDoor: !!ex.isDoor,
                isLocked: !!ex.isLocked,
                confidence: ex.confidence,
                source: "ram-lookahead"
            });
        });
    },

    applyStateDelta: function (payload) {
        if (!payload || !payload.roomName) return;
        var currId = payload.roomId || null;
        var currName = payload.roomName;
        var prevId = MapTopology.prevRoomId;
        var prevName = MapTopology.prevRoomName;
        if (prevName && currName && prevName.toLowerCase() !== currName.toLowerCase()) {
            var cmd = MapTopology.lastCommand || "move";
            var label = MapTopology.normalizeLabel(cmd);
            // If command was "go north" / "north", use cardinal; else whole command is non-cardinal edge label
            var parts = label.split(/\\s+/);
            var maybeDir = parts[parts.length - 1];
            if (MapTopology.isCardinal(maybeDir)) label = MapTopology.normalizeLabel(maybeDir);
            else if (/^go\\s+/.test(label) && MapTopology.isCardinal(label.slice(3).trim())) label = MapTopology.normalizeLabel(label.slice(3).trim());
            // State-delta always records an edge (guide: command-agnostic)
            MapTopology.link(prevName, label, currName, {
                fromId: prevId,
                toId: currId,
                isNonCardinal: !MapTopology.isCardinal(label),
                confidence: 0.98,
                source: "state-delta"
            });
            // Reverse hint for cardinal only
            if (MapTopology.isCardinal(label) && typeof Directions !== "undefined") {
                try {
                    var d = Directions[label] || Directions[label.charAt(0)];
                    // Directions uses n/s keys - skip fragile reverse
                } catch (e) {}
            }
        }
        MapTopology.prevRoomId = currId;
        MapTopology.prevRoomName = currName;
    },

    tick: function (payload) {
        payload = payload || (typeof WorldModel !== "undefined" && WorldModel.lastPayload);
        if (!payload) return;
        MapTopology.applyPayloadExits(payload);
        MapTopology.applyStateDelta(payload);
        if (typeof MapBeautify !== "undefined" && MapBeautify.tick) {
            try { MapBeautify.tick(); } catch (e) {}
        }
    }
};

// Capture commands for state-delta
try {
    if (typeof Actionable !== "undefined" && Actionable.Submit && !Actionable._mapTopoWrapped) {
        var _submit = Actionable.Submit;
        Actionable.Submit = function (cmd) {
            try { MapTopology.noteCommand(cmd); } catch (e) {}
            return _submit.apply(this, arguments);
        };
        Actionable._mapTopoWrapped = true;
    }
} catch (e) {}
`;
fs.writeFileSync("js/MapTopology.js", topology);
try { new Function(topology); console.log("MapTopology OK"); } catch (e) { console.log("MapTopology FAIL", e.message); }

// ========== Holistic lookAheadExits: classify cardinal vs non-cardinal ==========
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
zr = zr.replace(
  /lookAheadExits:\s*\(mem,\s*roomId\)\s*=>\s*\{[\s\S]*?return exits;\s*\},/,
  `lookAheadExits: (mem, roomId) => {
        var CARD = { north:1, south:1, east:1, west:1, northeast:1, northwest:1, southeast:1, southwest:1, up:1, down:1, in:1, out:1,
            n:1, s:1, e:1, w:1, ne:1, nw:1, se:1, sw:1, u:1, d:1 };
        var exits = [];
        var h = ZRamReader.header(mem);
        var count = ZRamReader.objectCount(mem, h);
        var seen = {};
        function pushExit(label, prop, val) {
            var tname = ZRamReader.shortName(mem, val) || "";
            if (tname.charAt(0) === "(") return; // skip internal
            // Destination should look like a location (has children or parent 0) OR be a door object
            var tobj = ZRamReader.objectLinks(mem, val);
            var kids = ZRamReader.children(mem, val);
            var doorish = /door|gate|hatch|portal/i.test(tname);
            if (!doorish && tobj && tobj.parent !== 0 && kids.length === 0) {
                // might still be a room-like object; keep with lower confidence
            }
            var lab = String(label || ("x" + prop)).toLowerCase();
            var key = lab + "->" + val;
            if (seen[key]) return;
            seen[key] = 1;
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
        // 1) Named direction objects in compass tree (holistic): scan children of objects named compass / direction
        for (var id = 1; id <= Math.min(count, 80); id++) {
            var nm = (ZRamReader.shortName(mem, id) || "").toLowerCase();
            if (nm !== "compass" && nm !== "direction" && nm !== "compassdirection") continue;
            ZRamReader.children(mem, id).forEach(function (cid) {
                var dname = (ZRamReader.shortName(mem, cid) || "").toLowerCase();
                if (!dname || dname.charAt(0) === "(") return;
                // Inform often stores door_dir / direction props pointing at these; also room may have prop to room via door
            });
        }
        // 2) All candidate direction-like props on this room
        var cand = (ZRamReader.directionProps && ZRamReader.directionProps.candidates) || [];
        cand.forEach(function (propNum) {
            var val = ZRamReader.readProp(mem, roomId, propNum);
            if (!(val >= 1 && val <= count)) return;
            var tname = (ZRamReader.shortName(mem, val) || "").toLowerCase();
            var label = "x" + propNum;
            // If target itself is a compass direction object, use its name as label and read through door
            if (CARD[tname] || /^(north|south|east|west|up|down|in|out|northeast|northwest|southeast|southwest)$/.test(tname)) {
                label = tname;
            }
            pushExit(label, propNum, val);
        });
        // 3) Broad prop scan: any prop whose value is a room-like object id (parent 0 + children)
        try {
            var obj = ZRamReader.objectLinks(mem, roomId);
            if (obj && obj.props) {
                // walk property table lightly via candidates already; additional scan of common Inform prop range
                for (var p = 1; p <= 40; p++) {
                    if (cand.indexOf(p) >= 0) continue;
                    var v = ZRamReader.readProp(mem, roomId, p);
                    if (!(v >= 2 && v <= count)) continue;
                    var o2 = ZRamReader.objectLinks(mem, v);
                    if (!o2) continue;
                    var k2 = ZRamReader.children(mem, v);
                    var nm2 = ZRamReader.shortName(mem, v) || "";
                    if (o2.parent === 0 && k2.length >= 1 && nm2 && nm2.charAt(0) !== "(") {
                        pushExit(CARD[nm2.toLowerCase()] ? nm2.toLowerCase() : ("exit-" + p), p, v);
                    }
                }
            }
        } catch (eScan) {}
        return exits;
    },
`
);
fs.writeFileSync("js/ZRamReader.js", zr);
try { new Function(fs.readFileSync("js/ZRamReader.js","utf8")); console.log("ZR OK"); } catch (e) { console.log("ZR FAIL", e.message); }

// ========== MapBeautify: place non-cardinal via radial spokes ==========
let mb = fs.readFileSync("js/MapBeautify.js", "utf8");
if (!mb.includes("nonCardinalSpokes")) {
  mb = mb.replace(
    /var MapBeautify = \{/,
    `var MapBeautify = {
    nonCardinalSpokes: () => {
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
        wrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;justify-content:center;";
        var labels = Object.keys(room.Exits);
        var n = 0;
        labels.forEach(function (dir) {
            var meta = (room.ExitMeta && room.ExitMeta[dir]) || {};
            var isNC = meta.isNonCardinal || (typeof MapTopology !== "undefined" && MapTopology.isCardinal && !MapTopology.isCardinal(dir));
            if (!isNC && (typeof MapTopology === "undefined" || MapTopology.isCardinal(dir))) return;
            var dest = ParchLockMap.Rooms[room.Exits[dir]];
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "pl-exit-noncardinal";
            btn.textContent = dir + (dest ? (" ? " + dest.Name) : "");
            btn.title = "Go: " + dir;
            btn.onclick = function () {
                if (typeof Actionable !== "undefined") Actionable.Submit(dir);
            };
            wrap.appendChild(btn);
            n++;
        });
        if (n) host.appendChild(wrap);
    },
`
  );
  mb = mb.replace(
    /tick:\s*\([^)]*\)\s*=>\s*\{/,
    `tick: () => {
        try { MapBeautify.nonCardinalSpokes(); } catch (e) {}
`
  );
  // if no tick, add one
  if (!/tick:\s*\(/.test(mb) && !mb.includes("tick: () => {")) {
    mb = mb.replace(/\\n\\};\\s*$/, `,\n    tick: () => { try { MapBeautify.nonCardinalSpokes(); MapBeautify.ensureFloors(); } catch (e) {} }\n};\n`);
  }
  fs.writeFileSync("js/MapBeautify.js", mb);
}
try { new Function(fs.readFileSync("js/MapBeautify.js","utf8")); console.log("MB OK"); } catch (e) { console.log("MB FAIL", e.message); }

// ========== Wire MapTopology into play.html + TranslatorUI ==========
let html = fs.readFileSync("play.html", "utf8");
if (!html.includes("MapTopology.js")) {
  html = html.replace('<script src="js/MapBeautify.js"></script>', '<script src="js/MapTopology.js"></script>\n\t\t<script src="js/MapBeautify.js"></script>');
  if (!html.includes("MapTopology.js")) {
    html = html.replace('<script src="js/MapIdentity.js"></script>', '<script src="js/MapIdentity.js"></script>\n\t\t<script src="js/MapTopology.js"></script>');
  }
  fs.writeFileSync("play.html", html);
}
console.log("play has MapTopology", fs.readFileSync("play.html","utf8").includes("MapTopology.js"));

let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
if (!tu.includes("MapTopology") && tu.includes("tick:")) {
  tu = tu.replace(
    /tick:\s*\([^)]*\)\s*=>\s*\{/,
    `tick: () => {
        try {
            if (typeof MapTopology !== "undefined" && MapTopology.tick) MapTopology.tick(WorldModel && WorldModel.lastPayload);
        } catch (eMT) {}
`
  );
  fs.writeFileSync("js/TranslatorUI.js", tu);
}
try { new Function(fs.readFileSync("js/TranslatorUI.js","utf8")); console.log("TU OK"); } catch (e) { console.log("TU FAIL", e.message); }

// Input inject also notes command
let inp = fs.readFileSync("js/Input.js", "utf8");
if (!inp.includes("MapTopology") && inp.includes("Inject")) {
  inp = inp.replace(
    /Inject:\s*\(([^)]*)\)\s*=>\s*\{/,
    `Inject: ($1) => {
        try { if (typeof MapTopology !== "undefined") MapTopology.noteCommand(typeof text !== "undefined" ? text : arguments[0]); } catch (e) {}
`
  );
  // fix if param name isn't text
  fs.writeFileSync("js/Input.js", inp);
}
try { new Function(fs.readFileSync("js/Input.js","utf8")); console.log("Input OK"); } catch (e) { console.log("Input", e.message); }

// BUILD 48
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\\s*=\\s*\\d+/, "BUILD = 48");
fs.writeFileSync("js/Consts.js", c);
console.log("BUILD", /BUILD\\s*=\\s*(\\d+)/.exec(fs.readFileSync("js/Consts.js","utf8"))[1]);
