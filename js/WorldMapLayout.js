/* World Map visual cells only. Consensus bus1878/1879: no graph, room,
 * command or persistence writes. The renderer supplies identity keys and
 * owns WorldX/WorldY/WorldLevel annotations on existing room records. */
var WorldMapLayout = {
    LIMIT: 10000,

    validCell: function (cell) {
        return !!cell && [cell.x, cell.y, cell.level].every(function (value) {
            return Number.isInteger(value) && Math.abs(value) <= WorldMapLayout.LIMIT;
        });
    },

    // options.unitLabelled (R4 section-group only): labelled exits use a unit
    // orthogonal step so sections stack adjacent. World-level callers omit it
    // and keep the radius-2 hashed ring (D202 unchanged).
    vector: function (direction, options) {
        var label = String(direction || "").trim().toLowerCase();
        var compass = {
            n: [0, -1, 0], north: [0, -1, 0], s: [0, 1, 0], south: [0, 1, 0],
            e: [1, 0, 0], east: [1, 0, 0], w: [-1, 0, 0], west: [-1, 0, 0],
            ne: [1, -1, 0], northeast: [1, -1, 0], nw: [-1, -1, 0], northwest: [-1, -1, 0],
            se: [1, 1, 0], southeast: [1, 1, 0], sw: [-1, 1, 0], southwest: [-1, 1, 0],
            u: [0, 0, 1], up: [0, 0, 1], d: [0, 0, -1], down: [0, 0, -1]
        };
        if (Object.prototype.hasOwnProperty.call(compass, label)) {
            return { delta: compass[label], kind: compass[label][2] ? "vertical" : "straight" };
        }
        // A repeatable visual offset, never a suggested parser direction.
        var hash = 2166136261;
        for (var i = 0; i < label.length; i++) { hash ^= label.charCodeAt(i); hash = Math.imul(hash, 16777619); }
        if (options && options.unitLabelled) {
            var unit = [[1, 0], [0, 1], [-1, 0], [0, -1]];
            var u = unit[(hash >>> 0) % unit.length];
            return { delta: [u[0], u[1], 0], kind: "labelled" };
        }
        var ring = [[2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1],
            [-2, 0], [-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1]];
        var offset = ring[(hash >>> 0) % ring.length];
        return { delta: [offset[0], offset[1], 0], kind: "labelled" };
    },

    place: function (nodes, edges, previous, options) {
        if (!Array.isArray(nodes) || !Array.isArray(edges)) throw new TypeError("World Map nodes and edges must be arrays");
        options = options || null;
        var cells = new Map(), byKey = new Map(), neighbors = new Map(), occupied = new Set();
        nodes.forEach(function (node, index) {
            if (!node || typeof node.key !== "string" || !node.key || byKey.has(node.key)) {
                throw new Error("World Map node keys must be unique nonempty strings");
            }
            byKey.set(node.key, { node: node, index: index });
            neighbors.set(node.key, []);
        });
        function cellKey(cell) { return cell.x + ":" + cell.y + ":" + cell.level; }
        function put(key, cell) {
            var copy = { x: cell.x, y: cell.y, level: cell.level };
            cells.set(key, copy);
            occupied.add(cellKey(copy));
        }
        // Input order resolves corrupt duplicate stored cells. Every valid
        // distinct old cell is kept; removed node keys never survive here.
        if (previous && typeof previous.get === "function") nodes.forEach(function (node) {
            var old = previous.get(node.key);
            if (WorldMapLayout.validCell(old) && !occupied.has(cellKey(old))) put(node.key, old);
        });
        edges.forEach(function (edge) {
            if (!edge || !byKey.has(edge.from) || !byKey.has(edge.to)) return;
            var vector = WorldMapLayout.vector(edge.layoutDir || edge.dir, options).delta;
            neighbors.get(edge.from).push({ key: edge.to, delta: vector, label: String(edge.dir || "") });
            // Incoming adjacency is used for placement only. The result
            // still contains exactly the caller's original directed edges.
            neighbors.get(edge.to).push({ key: edge.from, delta: vector.map(function (v) { return -v; }), label: String(edge.dir || "") });
        });
        neighbors.forEach(function (list) {
            list.sort(function (a, b) {
                return a.label < b.label ? -1 : a.label > b.label ? 1 : byKey.get(a.key).index - byKey.get(b.key).index;
            });
        });
        function clamp(value) { return Math.max(-WorldMapLayout.LIMIT, Math.min(WorldMapLayout.LIMIT, value)); }
        function placeFree(key, proposed) {
            var base = { x: clamp(proposed.x), y: clamp(proposed.y), level: clamp(proposed.level) };
            if (!occupied.has(cellKey(base))) { put(key, base); return; }
            // Complete square perimeters, including the corners, find a
            // free cell deterministically without moving an existing node.
            var maxRadius = occupied.size + 1;
            for (var radius = 1; radius <= maxRadius; radius++) {
                var candidates = [];
                for (var x = -radius; x <= radius; x++) candidates.push([x, -radius]);
                for (var y = -radius + 1; y <= radius; y++) candidates.push([radius, y]);
                for (var x2 = radius - 1; x2 >= -radius; x2--) candidates.push([x2, radius]);
                for (var y2 = radius - 1; y2 > -radius; y2--) candidates.push([-radius, y2]);
                for (var i = 0; i < candidates.length; i++) {
                    var trial = { x: base.x + candidates[i][0], y: base.y + candidates[i][1], level: base.level };
                    if (WorldMapLayout.validCell(trial) && !occupied.has(cellKey(trial))) { put(key, trial); return; }
                }
            }
            throw new Error("World Map has no available visual cell");
        }
        function extend(queue) {
            for (var cursor = 0; cursor < queue.length; cursor++) {
                var key = queue[cursor], origin = cells.get(key);
                neighbors.get(key).forEach(function (next) {
                    if (cells.has(next.key)) return;
                    placeFree(next.key, { x: origin.x + next.delta[0], y: origin.y + next.delta[1], level: origin.level + next.delta[2] });
                    queue.push(next.key);
                });
            }
        }
        // Extend every existing component first, including new incoming
        // neighbors. First discovery anchors a fresh graph, never the player.
        extend(nodes.filter(function (node) { return cells.has(node.key); }).map(function (node) { return node.key; }));
        var roots = nodes.filter(function (node) { return node.anchor; }).concat(nodes.filter(function (node) { return !node.anchor; }));
        roots.forEach(function (node) {
            if (cells.has(node.key)) return;
            var right = null;
            cells.forEach(function (cell) { right = right === null ? cell.x : Math.max(right, cell.x); });
            placeFree(node.key, { x: right === null ? 0 : right + 4, y: 0, level: 0 });
            extend([node.key]);
        });
        var edgeKinds = edges.map(function (edge) {
            if (!edge || !cells.has(edge.from) || !cells.has(edge.to)) return "hidden";
            var a = cells.get(edge.from), b = cells.get(edge.to), vector = WorldMapLayout.vector(edge.layoutDir || edge.dir, options);
            if (vector.kind === "labelled") return "labelled";
            return b.x - a.x === vector.delta[0] && b.y - a.y === vector.delta[1] && b.level - a.level === vector.delta[2]
                ? vector.kind : "bent";
        });
        return { cells: cells, edgeKinds: edgeKinds };
    }
};
