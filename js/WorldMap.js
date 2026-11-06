/*
 * World Map: a separate full-screen view of every discovered room, laid out
 * once and kept still (operator 2026-10-07; consensus bus #1878, plan in
 * work/investigations/2026-10-08-world-map-comparison-and-proposal.md).
 *
 * It never shares zoom or drawing with the compass map (the D202 lesson). It
 * reads only ParchLockMap.Rooms / Exits / ExitMeta; WorldMapLayout.place (a
 * pure module) decides cells, and this renderer stores them on the existing
 * room records (WorldX/WorldY/WorldLevel) so they travel with every existing
 * map save, export, package and restore. Nothing runs while it is closed.
 *
 * It opens ON TOP of the sheet it was opened from (map or equipment) and never
 * calls that sheet's owner, so returning to Equipment cannot start a status
 * check. It never touches the command line; travel is an explicit button.
 */
var WorldMap = {
    CELL_X: 132,
    CELL_Y: 84,
    NODE_W: 108,
    NODE_H: 44,
    MAX_AXIS: 10000,
    _open: false,
    _origin: null,
    _bound: false,
    _tokens: null,
    _tokenSeq: 0,
    _roomsRef: null,
    _layoutSig: null,
    _paintSig: null,
    _cells: null,
    _edgeKinds: null,
    _graph: null,
    _level: 0,
    _selected: null,
    _view: { scale: 1, tx: 0, ty: 0 },
    _pointers: null,

    IsOpen: function () { return WorldMap._open; },

    Toggle: function () { if (WorldMap._open) WorldMap.Close(); else WorldMap.Open(); },

    Open: function () {
        if (WorldMap._open) return;
        var body = document.body;
        WorldMap._origin = body.classList.contains("equip-open") ? "equipment" : "map";
        WorldMap._open = true;
        WorldMap._selected = null;
        WorldMap.ensureDom();
        // Not ParchLock.HandleOverlayOpened: that hides the origin map (#1878).
        try { if (typeof CharKeys !== "undefined" && CharKeys.isPadOpen()) CharKeys.closeArrowPad("system"); } catch (e) {}
        try { var a = document.activeElement; if (a && a.classList && a.classList.contains("Input")) a.blur(); } catch (e2) {}
        body.classList.add("world-open");
        WorldMap.Refresh(true);
        // Each opening shows the level you are standing on (#1883); a level
        // tab chosen while open stays chosen until the next opening.
        var lv = WorldMap.currentLevel(WorldMap.levels());
        if (lv !== WorldMap._level) { WorldMap._level = lv; WorldMap._paintSig = null; WorldMap.paint(); }
        WorldMap.CentreOnCurrent();
    },

    Close: function () {
        if (!WorldMap._open) return;
        WorldMap._open = false;
        WorldMap._selected = null;
        WorldMap._pointers = null;
        document.body.classList.remove("world-open");
        WorldMap.renderPanel();
    },

    // ---- graph from the existing map --------------------------------------

    keyFor: function (room) {
        if (room.HasRealId && room.ObjectId != null) return "o:" + room.ObjectId;
        var t = WorldMap._tokens.get(room);
        if (!t) { t = "t:" + (++WorldMap._tokenSeq); WorldMap._tokens.set(room, t); }
        return t;
    },

    // An exit is TRAVELLED when it carries no ExitMeta (the text path records
    // real moves without meta), keeps MapTopology's walked proof (travelledTo,
    // bound to the destination it reached), or its latest record is a real
    // RAM move. Anything else (look-ahead, calibrated, placeholder) is HINTED.
    evidence: function (room, dir) {
        var meta = room.ExitMeta && room.ExitMeta[dir];
        if (!meta || meta.source === "state-delta") return "travelled";
        // The stored proof must name THIS edge's destination (#1897): a real
        // id must match the target room's ObjectId. An id-less "?" cannot
        // bind a later observation to a particular text-only destination.
        var target = room.Exits && room.Exits[dir] != null && ParchLockMap.Rooms ? ParchLockMap.Rooms[room.Exits[dir]] : null;
        var proof = meta.travelledTo;
        if (proof == null || !target) return "hinted";
        var matches = proof !== "?" && target.HasRealId && String(target.ObjectId) === String(proof);
        return matches ? "travelled" : "hinted";
    },

    validCell: function (room) {
        var ok = function (v) { return typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= WorldMap.MAX_AXIS; };
        return ok(room.WorldX) && ok(room.WorldY) && ok(room.WorldLevel);
    },

    buildGraph: function () {
        var all = (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms) || [];
        if (all !== WorldMap._roomsRef || !WorldMap._tokens) {
            // Import, load or removal replaced the array: rebuild every cache
            // from the records themselves (their stored cells are kept).
            WorldMap._roomsRef = all;
            WorldMap._tokens = new WeakMap();
            WorldMap._layoutSig = null;
            WorldMap._paintSig = null;
        }
        var facing = function (r) { return r && (typeof MapTopology === "undefined" || !MapTopology.isPlayerFacingRoom || MapTopology.isPlayerFacingRoom(r)); };
        var rooms = all.filter(facing), keyOf = new Map(), byKey = new Map();
        rooms.forEach(function (r) { var k = WorldMap.keyFor(r); if (byKey.has(k)) return; keyOf.set(r, k); byKey.set(k, r); });
        rooms = rooms.filter(function (r) { return keyOf.has(r); });
        var nodes = rooms.map(function (r, i) { return i === 0 ? { key: keyOf.get(r), anchor: true } : { key: keyOf.get(r) }; });
        var edges = [];
        rooms.forEach(function (r) {
            Object.keys(r.Exits || {}).sort().forEach(function (dir) {
                var target = all[r.Exits[dir]];
                if (!target || !keyOf.has(target)) return;
                var meta = r.ExitMeta && r.ExitMeta[dir];
                var edge = { from: keyOf.get(r), to: keyOf.get(target), dir: dir, evidence: WorldMap.evidence(r, dir),
                    command: (meta && meta.command) || dir, locked: WorldMap.isLockedMeta(meta) };
                // Measured depth change (LLR3 regionDepth fact): place as a level step; dir/command stay the game's.
                var lc = typeof MapTopology !== "undefined" && MapTopology.levelChangeDir ? MapTopology.levelChangeDir(r, target) : null;
                if (lc) edge.layoutDir = lc;
                edges.push(edge);
            });
            // Decoder geography is a read-only hint graph, never the route
            // Exits[] graph. Bind by real ObjectId rather than array index.
            Object.keys(r.ExitMeta || {}).sort().forEach(function (dir) {
                var meta = r.ExitMeta[dir];
                if (!meta.hintOnly || meta.toId == null || (r.Exits || {})[dir] != null) return;
                var target = rooms.find(function (room) { return room.HasRealId && String(room.ObjectId) === String(meta.toId); });
                if (!target || target === r || !keyOf.has(target)) return;
                edges.push({ from: keyOf.get(r), to: keyOf.get(target), dir: dir, evidence: 'hinted', command: meta.command || dir,
                    locked: WorldMap.isLockedMeta(meta) });
            });
        });
        // Stored cells: valid ones only, first room wins a duplicate cell.
        var previous = new Map(), used = {};
        rooms.forEach(function (r) {
            if (!WorldMap.validCell(r)) return;
            var cellKey = r.WorldX + "," + r.WorldY + "," + r.WorldLevel;
            if (used[cellKey]) return;
            used[cellKey] = true;
            previous.set(keyOf.get(r), { x: r.WorldX, y: r.WorldY, level: r.WorldLevel });
        });
        return { rooms: rooms, keyOf: keyOf, byKey: byKey, nodes: nodes, edges: edges, previous: previous };
    },

    // R4: multi-section rooms (D224 SectionGroup) place internal cells with
    // unitLabelled, then place each group as one world node.
    layoutWithSections: function (g) {
        var groups = {}, ungrouped = [];
        g.rooms.forEach(function (r) {
            var sg = r.SectionGroup;
            if (sg != null && sg !== "" && !isNaN(+sg)) {
                var k = "sg:" + String(sg);
                (groups[k] = groups[k] || []).push(r);
            } else ungrouped.push(r);
        });
        Object.keys(groups).forEach(function (k) {
            if (groups[k].length < 2) {
                ungrouped.push(groups[k][0]);
                delete groups[k];
            }
        });
        if (!Object.keys(groups).length) {
            return WorldMapLayout.place(g.nodes, g.edges, g.previous);
        }
        var sectionCells = new Map();
        Object.keys(groups).sort().forEach(function (gk) {
            var members = groups[gk];
            var snodes = members.map(function (r, i) {
                return { key: g.keyOf.get(r), anchor: i === 0 };
            });
            var sedges = g.edges.filter(function (e) {
                return snodes.some(function (n) { return n.key === e.from; })
                    && snodes.some(function (n) { return n.key === e.to; });
            });
            var sprev = new Map();
            members.forEach(function (r) {
                if (r.SectionX != null && r.SectionY != null) {
                    var sk = g.keyOf.get(r);
                    if (WorldMapLayout.validCell({ x: r.SectionX, y: r.SectionY, level: r.SectionLevel || 0 })) {
                        sprev.set(sk, { x: r.SectionX, y: r.SectionY, level: r.SectionLevel || 0 });
                    }
                }
            });
            var sout = WorldMapLayout.place(snodes, sedges, sprev, { unitLabelled: true });
            members.forEach(function (r) {
                var sk = g.keyOf.get(r), c = sout.cells.get(sk);
                if (!c) return;
                r.SectionX = c.x; r.SectionY = c.y; r.SectionLevel = c.level;
                sectionCells.set(sk, c);
            });
        });
        // Meta graph: ungrouped rooms + one node per multi section group.
        var metaNodes = [], metaPrev = new Map(), metaKeyOf = new Map(), groupMeta = {};
        ungrouped.forEach(function (r, i) {
            var k = g.keyOf.get(r);
            metaNodes.push(i === 0 && !Object.keys(groups).length ? { key: k, anchor: true } : { key: k });
            metaKeyOf.set(k, k);
            if (g.previous.has(k)) metaPrev.set(k, g.previous.get(k));
        });
        Object.keys(groups).sort().forEach(function (gk, gi) {
            metaNodes.push({ key: gk, anchor: gi === 0 && !ungrouped.length });
            groupMeta[gk] = groups[gk];
            groups[gk].forEach(function (r) { metaKeyOf.set(g.keyOf.get(r), gk); });
            // Prior group anchor from first member world cell if present.
            var first = groups[gk][0], fk = g.keyOf.get(first);
            if (WorldMap.validCell(first)) metaPrev.set(gk, { x: first.WorldX, y: first.WorldY, level: first.WorldLevel });
            else if (g.previous.has(fk)) metaPrev.set(gk, g.previous.get(fk));
        });
        if (!metaNodes.length) return WorldMapLayout.place(g.nodes, g.edges, g.previous);
        if (!metaNodes.some(function (n) { return n.anchor; })) metaNodes[0].anchor = true;
        var metaEdges = [];
        g.edges.forEach(function (e) {
            var mf = metaKeyOf.get(e.from), mt = metaKeyOf.get(e.to);
            if (!mf || !mt || mf === mt) return;
            metaEdges.push({ from: mf, to: mt, dir: e.dir, evidence: e.evidence, command: e.command });
        });
        var mout = WorldMapLayout.place(metaNodes, metaEdges, metaPrev);
        var cells = new Map(), edgeKinds = [];
        // Expand group meta cells into section world cells.
        Object.keys(groupMeta).forEach(function (gk) {
            var origin = mout.cells.get(gk);
            if (!origin) return;
            var members = groupMeta[gk];
            var minX = Infinity, minY = Infinity;
            members.forEach(function (r) {
                var sc = sectionCells.get(g.keyOf.get(r));
                if (!sc) return;
                minX = Math.min(minX, sc.x); minY = Math.min(minY, sc.y);
            });
            if (!isFinite(minX)) minX = 0;
            if (!isFinite(minY)) minY = 0;
            members.forEach(function (r) {
                var sk = g.keyOf.get(r), sc = sectionCells.get(sk);
                if (!sc) return;
                cells.set(sk, {
                    x: origin.x + (sc.x - minX),
                    y: origin.y + (sc.y - minY),
                    level: origin.level + (sc.level || 0)
                });
            });
        });
        ungrouped.forEach(function (r) {
            var k = g.keyOf.get(r), c = mout.cells.get(k);
            if (c) cells.set(k, c);
        });
        // Edge kinds for original edges from geometry.
        edgeKinds = g.edges.map(function (e) {
            var a = cells.get(e.from), b = cells.get(e.to);
            if (!a || !b) return "hidden";
            var v = WorldMapLayout.vector(e.layoutDir || e.dir);
            if (v.kind === "labelled") return "labelled";
            return b.x - a.x === v.delta[0] && b.y - a.y === v.delta[1] && b.level - a.level === v.delta[2]
                ? v.kind : "bent";
        });
        return { cells: cells, edgeKinds: edgeKinds };
    },

    layoutSignature: function (g) {
        return JSON.stringify([g.nodes.map(function (n) { return n.key; }),
            g.edges.map(function (e) { return [e.from, e.to, e.dir, e.evidence, e.command]; }),
            Array.from(g.previous.entries())]);
    },

    isVisited: function (room, current) {
        return !!(room && (room.WorldVisited || room === current));
    },

    // Locked R2: only a positive live observation of a ZIL DEXIT's own door
    // (doorObjectId) draws a lock; unknown draws none, and Inform exits, whose
    // lock comes from destination attrs, stay as they were.
    isLockedMeta: function (meta) {
        return !!(meta && meta.doorObjectId != null && (meta.isLocked === true || meta.locked === true));
    },

    paintSignature: function (g, current) {
        return JSON.stringify([WorldMap._layoutSig, WorldMap._level, current ? WorldMap.keyFor(current) : null,
            g.rooms.map(function (r) { return [r.Name, (r.Notes || []).length, WorldMap.isVisited(r, current) ? 1 : 0]; }),
            WorldMap._selected, (g.edges || []).map(function (e) { return e.locked ? 1 : 0; }).join("")]);
    },

    // Called on open and from ParchLockMap.RefreshMapPanels while open.
    Refresh: function (force) {
        if (!WorldMap._open) return;
        var g = WorldMap.buildGraph();
        WorldMap._graph = g;
        var sig = WorldMap.layoutSignature(g);
        if (force || sig !== WorldMap._layoutSig || !WorldMap._cells) {
            if (typeof WorldMapLayout === "undefined" || !WorldMapLayout.place) {
                WorldMap._cells = new Map(); WorldMap._edgeKinds = [];
            } else {
                try {
                    var out = WorldMap.layoutWithSections(g);
                    WorldMap._cells = out.cells; WorldMap._edgeKinds = out.edgeKinds || [];
                    WorldMap.storeCells(g);
                } catch (eLayout) {
                    // A layout refusal must never break the view or the map.
                    WorldMap._cells = new Map(); WorldMap._edgeKinds = [];
                    try { console.warn("World map layout:", eLayout && eLayout.message); } catch (eW) {}
                }
            }
            // Re-read after storing so the signature matches the saved state.
            WorldMap._layoutSig = WorldMap.layoutSignature(WorldMap.buildGraph());
            var levels = WorldMap.levels();
            if (levels.indexOf(WorldMap._level) < 0) WorldMap._level = WorldMap.currentLevel(levels);
        }
        WorldMap.paint();
    },

    storeCells: function (g) {
        var changed = false;
        g.rooms.forEach(function (r) {
            var c = WorldMap._cells.get(g.keyOf.get(r));
            if (!c) return;
            if (r.WorldX !== c.x || r.WorldY !== c.y || r.WorldLevel !== c.level) {
                r.WorldX = c.x; r.WorldY = c.y; r.WorldLevel = c.level; changed = true;
            }
        });
        // The cells ride on the existing per-story map save (incl. Section*).
        if (changed) { try { ParchLockMap.Save(); } catch (e) {} }
    },

    levels: function () {
        var seen = {};
        if (WorldMap._cells) WorldMap._cells.forEach(function (c) { seen[c.level] = true; });
        return Object.keys(seen).map(Number).sort(function (a, b) { return b - a; });
    },

    currentLevel: function (levels) {
        var cur = WorldMap.currentRoom(), c = cur && WorldMap._graph && WorldMap._graph.keyOf.has(cur) && WorldMap._cells.get(WorldMap._graph.keyOf.get(cur));
        return c ? c.level : (levels.indexOf(0) >= 0 || !levels.length ? 0 : levels[0]);
    },

    currentRoom: function () {
        try { return ParchLockMap.GetCurrentRoom() || null; } catch (e) { return null; }
    },

    // ---- DOM ---------------------------------------------------------------

    ensureDom: function () {
        if (document.getElementById("world-map")) return;
        var root = document.createElement("div");
        root.id = "world-map";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-label", "World map");
        root.innerHTML =
            '<div class="world-bar"><span class="world-title">World</span><span class="world-levels"></span>' +
            '<button type="button" class="world-centre" title="Centre on your room">Centre</button>' +
            '<button type="button" class="world-close" title="Close" aria-label="Close">✕</button></div>' +
            '<div class="world-viewport"><div class="world-canvas"><svg class="world-lines" xmlns="http://www.w3.org/2000/svg">' +
            '<defs><marker id="world-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
            '<path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs></svg><div class="world-nodes"></div></div>' +
            '<div class="world-empty" hidden></div></div><div class="world-panel" hidden></div>';
        document.body.appendChild(root);
        root.querySelector(".world-close").addEventListener("click", function (e) { e.preventDefault(); WorldMap.Close(); });
        root.querySelector(".world-centre").addEventListener("click", function (e) { e.preventDefault(); WorldMap.CentreHere(); });
        var vp = root.querySelector(".world-viewport");
        vp.addEventListener("pointerdown", WorldMap.pointerDown);
        vp.addEventListener("pointermove", WorldMap.pointerMove);
        vp.addEventListener("pointerup", WorldMap.pointerUp);
        vp.addEventListener("pointercancel", WorldMap.pointerUp);
        vp.addEventListener("wheel", function (e) {
            e.preventDefault();
            var r = vp.getBoundingClientRect();
            WorldMap.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
        }, { passive: false });
    },

    pixel: function (cell, bounds) {
        return { x: (cell.x - bounds.minX) * WorldMap.CELL_X + 24, y: (cell.y - bounds.minY) * WorldMap.CELL_Y + 24 };
    },

    paint: function () {
        var root = document.getElementById("world-map");
        if (!root || !WorldMap._open) return;
        var g = WorldMap._graph, current = WorldMap.currentRoom();
        var sig = WorldMap.paintSignature(g, current);
        if (sig === WorldMap._paintSig) return;
        WorldMap._paintSig = sig;
        var level = WorldMap._level, cells = WorldMap._cells || new Map();
        var empty = root.querySelector(".world-empty");
        var nodesEl = root.querySelector(".world-nodes"), svg = root.querySelector(".world-lines");
        Array.prototype.slice.call(svg.querySelectorAll("line, polyline, text")).forEach(function (n) { n.remove(); });
        nodesEl.innerHTML = "";
        var missingLayout = typeof WorldMapLayout === "undefined";
        var onLevel = g.rooms.filter(function (r) { var c = cells.get(g.keyOf.get(r)); return c && c.level === level; });
        empty.hidden = !!onLevel.length;
        empty.textContent = missingLayout ? "The world layout is not available." : "No rooms have been mapped yet.";
        WorldMap.renderLevels(root);
        if (!onLevel.length) { WorldMap.renderPanel(); return; }
        var bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        cells.forEach(function (c) { if (c.level !== level) return; bounds.minX = Math.min(bounds.minX, c.x); bounds.minY = Math.min(bounds.minY, c.y); bounds.maxX = Math.max(bounds.maxX, c.x); bounds.maxY = Math.max(bounds.maxY, c.y); });
        WorldMap._bounds = bounds;
        var w = (bounds.maxX - bounds.minX + 1) * WorldMap.CELL_X + 48, h = (bounds.maxY - bounds.minY + 1) * WorldMap.CELL_Y + 48;
        var canvas = root.querySelector(".world-canvas");
        canvas.style.width = w + "px"; canvas.style.height = h + "px";
        svg.setAttribute("width", w); svg.setAttribute("height", h);
        var centre = function (key) { var p = WorldMap.pixel(cells.get(key), bounds); return { x: p.x + WorldMap.NODE_W / 2, y: p.y + WorldMap.NODE_H / 2 }; };
        var ns = "http://www.w3.org/2000/svg";
        // Two opposite exits share ONE line only when they say the same thing:
        // both plain compass exits of the same kind and evidence. Anything
        // else (enter/exit, differing evidence, several commands between one
        // pair) keeps its own path and label (#1883: no semantic merges).
        var dottedOf = function (e) { return e.evidence === "hinted" || !WorldMap.isVisited(g.byKey.get(e.from), current) || !WorldMap.isVisited(g.byKey.get(e.to), current); };
        var mergeable = function (e, i) { var k = WorldMap._edgeKinds[i] || "straight"; return k === "straight" || k === "bent"; };
        var reverseTwin = function (e, i) {
            if (!mergeable(e, i)) return -1;
            for (var j = 0; j < g.edges.length; j++) {
                var r = g.edges[j];
                if (j !== i && r.from === e.to && r.to === e.from && mergeable(r, j)
                    && (WorldMap._edgeKinds[j] || "straight") === (WorldMap._edgeKinds[i] || "straight")
                    && dottedOf(r) === dottedOf(e) && !!r.locked === !!e.locked) return j;
            }
            return -1;
        };
        var drawn = {}, labelsAt = {};
        g.edges.forEach(function (e, i) {
            var kind = WorldMap._edgeKinds[i] || "straight";
            if (kind === "hidden" || kind === "vertical") return;
            var a = cells.get(e.from), b = cells.get(e.to);
            if (!a || !b || a.level !== level || b.level !== level) return;
            var twin = reverseTwin(e, i), twoWay = twin >= 0;
            if (twoWay && drawn[twin]) return;       // its identical twin already drew the line
            drawn[i] = true;
            var dotted = dottedOf(e);
            var p = centre(e.from), q = centre(e.to), el;
            // End at the target card's edge (plus a small gap) so the arrow
            // head of a one-way exit is visible above, not under, the card.
            var trim = function (from, to) {
                var dx = to.x - from.x, dy = to.y - from.y;
                if (!dx && !dy) return to;
                var sx = dx ? (WorldMap.NODE_W / 2 + 4) / Math.abs(dx) : Infinity, sy = dy ? (WorldMap.NODE_H / 2 + 4) / Math.abs(dy) : Infinity;
                var s = Math.min(sx, sy, 1);
                return { x: to.x - dx * s, y: to.y - dy * s };
            };
            if (kind === "bent") {
                el = document.createElementNS(ns, "polyline");
                // Clip the last NON-zero segment: on one row the corner IS the
                // end point, so clip from the start instead (#1897).
                var corner = { x: q.x, y: p.y }, sameRow = corner.x === q.x && corner.y === q.y;
                var endB = sameRow ? trim(p, q) : trim(corner, q);
                // A degenerate corner at the target would reverse the final
                // segment after clipping, making the arrow point away.
                el.setAttribute("points", p.x + "," + p.y + " " + (sameRow ? "" : corner.x + "," + corner.y + " ") + endB.x + "," + endB.y);
            } else {
                el = document.createElementNS(ns, "line");
                var endS = trim(p, q);
                el.setAttribute("x1", p.x); el.setAttribute("y1", p.y); el.setAttribute("x2", endS.x); el.setAttribute("y2", endS.y);
            }
            el.setAttribute("class", "world-edge" + (dotted ? " dotted" : "") + (kind === "bent" ? " bent" : "") + (e.locked ? " locked" : ""));
            el.setAttribute('data-from', e.from);
            el.setAttribute('data-to', e.to);
            if (!twoWay) el.setAttribute("marker-end", "url(#world-arrow)");
            svg.appendChild(el);
            if (e.locked) {
                // Lock glyph at the line's midpoint (Locked R2): live state only.
                var lock = document.createElementNS(ns, "text");
                lock.setAttribute("x", (p.x + q.x) / 2);
                lock.setAttribute("y", (p.y + q.y) / 2 + 4);
                lock.setAttribute("class", "world-edge-lock");
                lock.setAttribute("aria-label", "locked");
                lock.textContent = "🔒";
                svg.appendChild(lock);
            }
            if (kind === "labelled") {
                // Several commands between one pair stack instead of overlapping.
                var pairKey = [e.from, e.to].sort().join("|"), n = labelsAt[pairKey] = (labelsAt[pairKey] || 0) + 1;
                var t = document.createElementNS(ns, "text");
                t.setAttribute("x", (p.x + q.x) / 2); t.setAttribute("y", (p.y + q.y) / 2 - 4 + (n - 1) * 13);
                t.setAttribute("class", "world-edge-label");
                t.textContent = String(e.command || e.dir).slice(0, 24);
                svg.appendChild(t);
            }
        });
        // R4: solid outer hull per SectionGroup (distinct from dotted hinted edges).
        var byGroup = {};
        onLevel.forEach(function (r) {
            if (r.SectionGroup == null || r.SectionGroup === "") return;
            var gk = String(r.SectionGroup);
            (byGroup[gk] = byGroup[gk] || []).push(r);
        });
        Object.keys(byGroup).forEach(function (gk) {
            var members = byGroup[gk];
            if (members.length < 2) return;
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            members.forEach(function (r) {
                var p = WorldMap.pixel(cells.get(g.keyOf.get(r)), bounds);
                minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x + WorldMap.NODE_W); maxY = Math.max(maxY, p.y + WorldMap.NODE_H);
            });
            var pad = 8;
            var hull = document.createElement("div");
            hull.className = "world-section-hull";
            hull.style.left = (minX - pad) + "px";
            hull.style.top = (minY - pad - 14) + "px";
            hull.style.width = (maxX - minX + pad * 2) + "px";
            hull.style.height = (maxY - minY + pad * 2 + 14) + "px";
            hull.setAttribute("data-section-group", gk);
            var cap = document.createElement("span");
            cap.className = "world-section-caption";
            cap.textContent = "Room #" + gk;
            hull.appendChild(cap);
            nodesEl.appendChild(hull);
        });
        onLevel.forEach(function (r) {
            var key = g.keyOf.get(r), c = cells.get(key), p = WorldMap.pixel(c, bounds);
            var b = document.createElement("button");
            b.type = "button";
            b.className = "world-room" + (WorldMap.isVisited(r, current) ? "" : " unvisited") + (r === current ? " current" : "") + (key === WorldMap._selected ? " selected" : "")
                + (r.SectionGroup != null ? " sectioned" : "");
            b.style.left = p.x + "px"; b.style.top = p.y + "px";
            b.setAttribute("data-key", key);
            if (r.SectionGroup != null) b.setAttribute("data-section-group", String(r.SectionGroup));
            var name = document.createElement("span"); name.className = "world-room-name"; name.textContent = r.Name; b.appendChild(name);
            var ups = g.edges.filter(function (e) { var o = cells.get(e.to); return e.from === key && o && o.level !== level; });
            if (ups.length) { var v = document.createElement("span"); v.className = "world-room-vertical"; v.textContent = ups.some(function (e) { return cells.get(e.to).level > level; }) ? "↑" : "↓"; b.appendChild(v); }
            if ((r.Notes || []).length) { var n = document.createElement("span"); n.className = "world-room-notes"; n.textContent = String(r.Notes.length); b.appendChild(n); }
            b.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); if (WorldMap._dragged) return; WorldMap.select(key); });
            nodesEl.appendChild(b);
        });
        WorldMap.applyView();
        WorldMap.renderPanel();
    },

    renderLevels: function (root) {
        var holder = root.querySelector(".world-levels"), levels = WorldMap.levels();
        holder.innerHTML = "";
        if (levels.length < 2) return;
        levels.forEach(function (lv, i) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "world-level" + (lv === WorldMap._level ? " active" : "");
            b.textContent = WorldMap.depthLabel(lv) || "Level " + (levels.length - i);
            b.addEventListener("click", function (e) { e.preventDefault(); WorldMap._level = lv; WorldMap._paintSig = null; WorldMap.paint(); WorldMap.CentreOnCurrent(); });
            holder.appendChild(b);
        });
    },

    // A game with a measured dungeon depth (LLR3 regionDepth) names each level
    // by that depth, so the deepest level is not "Level 1".
    depthLabel: function (level) {
        var g = WorldMap._graph, cells = WorldMap._cells;
        if (!g || !cells || typeof MapTopology === "undefined" || !MapTopology.roomDepth) return null;
        for (var i = 0; i < g.rooms.length; i++) {
            var c = cells.get(g.keyOf.get(g.rooms[i]));
            if (!c || c.level !== level) continue;
            var d = MapTopology.roomDepth(g.rooms[i]);
            if (d) return "Depth " + d;
        }
        return null;
    },

    select: function (key) {
        WorldMap._selected = WorldMap._selected === key ? null : key;
        WorldMap._paintSig = null;
        WorldMap.paint();
    },

    // Explicit actions only; choosing a room never sends a command.
    renderPanel: function () {
        var root = document.getElementById("world-map");
        if (!root) return;
        var panel = root.querySelector(".world-panel");
        var room = WorldMap._selected && WorldMap._graph && WorldMap._graph.byKey.get(WorldMap._selected);
        panel.hidden = !(WorldMap._open && room);
        panel.innerHTML = "";
        if (!room || !WorldMap._open) return;
        var title = document.createElement("div"); title.className = "world-panel-title"; title.textContent = room.Name; panel.appendChild(title);
        var cur = WorldMap.currentRoom();
        var actions = [["Browse", function () { WorldMap.browse(room); }]];
        if (room !== cur) actions.push(["Travel here", function () { WorldMap.travel(room); }]);
        actions.push(["Notes" + ((room.Notes || []).length ? " (" + room.Notes.length + ")" : ""), function () { WorldMap.notes(room); }]);
        actions.forEach(function (a) {
            var b = document.createElement("button"); b.type = "button"; b.className = "world-action"; b.textContent = a[0];
            b.addEventListener("click", function (e) { e.preventDefault(); a[1](); });
            panel.appendChild(b);
        });
    },

    browse: function (room) {
        WorldMap.Close();
        // The record, not its name: same-name rooms stay distinct (#1887).
        try { ParchLockMap.Show(); ParchLockMap.Draw(room); } catch (e) {}
    },

    // Travel closes the obstructing sheets first, then runs the existing route
    // exactly as the rooms list's Go does (Navigator.FindRoute shows its own
    // "no route" / "already there" messages).
    travel: function (room) {
        WorldMap.Close();
        var narrow = typeof $ !== "undefined" ? $(window).width() < 850 : window.innerWidth < 850;
        try {
            // Probe the route without side effects first; only a real route
            // clears the sheets, and that happens BEFORE Navigator queues and
            // pumps the first step (#1883). FindRoute then shows its own
            // "no route" / "already there" message on a failure.
            var origin = ParchLockMap.GetRoom(ParchLockMap.GetCurrentRoom());
            var reachable = origin && origin !== room && Navigator.FindShortestRoute(origin.Id, room.Id).length > 0;
            if (reachable && narrow) {
                if (document.body.classList.contains("equip-open") && typeof EquipmentUI !== "undefined") EquipmentUI.Hide();
                if (document.body.classList.contains("map-open")) ParchLockMap.Hide();
            }
            Navigator.FindRoute(ParchLockMap.GetCurrentRoom(), room);
        } catch (e) {}
    },

    notes: function (room) {
        WorldMap.Close();
        try { ParchLockMap.ShowNotes(null, room); } catch (e) {}
    },

    // ---- pan / zoom ----------------------------------------------------------

    applyView: function () {
        var canvas = document.querySelector("#world-map .world-canvas");
        if (canvas) canvas.style.transform = "translate(" + WorldMap._view.tx + "px," + WorldMap._view.ty + "px) scale(" + WorldMap._view.scale + ")";
    },

    zoomAt: function (factor, ox, oy) {
        var v = WorldMap._view, s = Math.max(0.3, Math.min(2.5, v.scale * factor)), k = s / v.scale;
        v.tx = ox - (ox - v.tx) * k; v.ty = oy - (oy - v.ty) * k; v.scale = s;
        WorldMap.applyView();
    },

    // The Centre button: switch to the level you are on and centre your room.
    CentreHere: function () {
        var lv = WorldMap.currentLevel(WorldMap.levels());
        if (lv !== WorldMap._level) { WorldMap._level = lv; WorldMap._paintSig = null; WorldMap.paint(); }
        WorldMap.CentreOnCurrent();
    },

    CentreOnCurrent: function () {
        var vp = document.querySelector("#world-map .world-viewport");
        if (!vp || !WorldMap._graph || !WorldMap._bounds) return;
        var cur = WorldMap.currentRoom(), key = cur && WorldMap._graph.keyOf.get(cur), cell = key && WorldMap._cells.get(key);
        var r = vp.getBoundingClientRect(), v = WorldMap._view;
        if (!cell || cell.level !== WorldMap._level) { v.tx = 12; v.ty = 12; WorldMap.applyView(); return; }
        var p = WorldMap.pixel(cell, WorldMap._bounds);
        v.tx = r.width / 2 - (p.x + WorldMap.NODE_W / 2) * v.scale;
        v.ty = r.height / 2 - (p.y + WorldMap.NODE_H / 2) * v.scale;
        WorldMap.applyView();
    },

    pointerDown: function (e) {
        if (e.target.closest && e.target.closest(".world-panel")) return;
        WorldMap._pointers = WorldMap._pointers || {};
        WorldMap._pointers[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
        WorldMap._dragged = false;
        WorldMap._captureEl = e.currentTarget;
    },

    pointerMove: function (e) {
        var ps = WorldMap._pointers;
        if (!ps || !ps[e.pointerId]) return;
        var ids = Object.keys(ps);
        if (ids.length === 2) {
            var o = ps[ids[0] == e.pointerId ? ids[1] : ids[0]], prev = ps[e.pointerId];
            var d0 = Math.hypot(prev.x - o.x, prev.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y);
            var r = e.currentTarget.getBoundingClientRect();
            if (d0 > 0) WorldMap.zoomAt(d1 / d0, (e.clientX + o.x) / 2 - r.left, (e.clientY + o.y) / 2 - r.top);
            if (!WorldMap._dragged) { WorldMap._dragged = true; WorldMap.capture(e); }
        } else {
            var cur = ps[e.pointerId], dx = e.clientX - cur.x, dy = e.clientY - cur.y;
            // Threshold measured from the press point, so a slow drag of
            // many 1px moves still becomes a pan (#1883).
            if (!WorldMap._dragged && Math.abs(e.clientX - cur.x0) + Math.abs(e.clientY - cur.y0) > 6) { WorldMap._dragged = true; WorldMap.capture(e); }
            if (WorldMap._dragged) { WorldMap._view.tx += dx; WorldMap._view.ty += dy; WorldMap.applyView(); }
        }
        var p0 = ps[e.pointerId];
        ps[e.pointerId] = { x: e.clientX, y: e.clientY, x0: p0.x0, y0: p0.y0 };
    },

    // Capture only once a pan/pinch has started: capturing at press time
    // retargets the click away from the room button (#1888/#1890). After
    // that, release anywhere still ends the gesture.
    capture: function (e) {
        var el = WorldMap._captureEl;
        if (!el || !el.setPointerCapture) return;
        Object.keys(WorldMap._pointers || {}).forEach(function (id) { try { el.setPointerCapture(Number(id)); } catch (eCap) {} });
    },

    pointerUp: function (e) {
        try { if (WorldMap._captureEl && WorldMap._captureEl.hasPointerCapture && WorldMap._captureEl.hasPointerCapture(e.pointerId)) WorldMap._captureEl.releasePointerCapture(e.pointerId); } catch (eRel) {}
        if (WorldMap._pointers) delete WorldMap._pointers[e.pointerId];
        // A drag must not also select the room it ended on.
        setTimeout(function () { WorldMap._dragged = false; }, 0);
    },

    // ---- side rail -----------------------------------------------------------

    Init: function () {
        if (WorldMap._bound) return;
        var tab = document.getElementById("pl-world-tab");
        if (!tab) return;
        WorldMap._bound = true;
        tab.addEventListener("click", function (e) { e.preventDefault(); WorldMap.Toggle(); });
        // While World is open, tapping the sheet it came from just closes it
        // (consumed); the other tab closes it and then does its usual job.
        document.addEventListener("click", function (e) {
            if (!WorldMap._open) return;
            var t = e.target && e.target.closest && e.target.closest("#pl-map-tab, #pl-equip-tab");
            if (!t) return;
            var tabOrigin = t.id === "pl-equip-tab" ? "equipment" : "map";
            WorldMap.Close();
            if (tabOrigin === WorldMap._origin) { e.preventDefault(); e.stopImmediatePropagation(); }
        }, true);
    }
};

if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", WorldMap.Init);
    else WorldMap.Init();
}
