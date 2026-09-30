// D201: one deterministic translation pass for VM-owned status grids.
// It extracts presentation only: a room-label candidate and explicitly
// labelled numeric metrics. It never resolves a room or object identity.
var StatusGridDecoder = {
    CANON: {
        score: "score", points: "score",
        move: "turns", moves: "turns", turn: "turns", turns: "turns",
        health: "health", "hit points": "health", hp: "health", hits: "health",
        stamina: "stamina", energy: "stamina",
        strength: "strength", str: "strength",
        level: "level", lvl: "level",
        hunger: "hunger", food: "hunger", thirst: "thirst", water: "thirst",
        sleep: "sleep", rest: "sleep", time: "time", day: "day",
        money: "money", cash: "money", gold: "gold"
    },

    canonKey: function (label) {
        var key = String(label || "").trim().toLowerCase().replace(/\s+/g, " ");
        return StatusGridDecoder.CANON[key] || key;
    },

    metric: function (label, value, maximum, percent) {
        var key = StatusGridDecoder.canonKey(label);
        if (!key) return null;
        return {
            key: key,
            label: String(label || "").trim(),
            value: parseInt(value, 10),
            max: maximum != null && maximum !== "" ? parseInt(maximum, 10) : null,
            unit: maximum != null && maximum !== "" ? "fraction" : (percent ? "percent" : "plain"),
            source: "status-grid"
        };
    },

    decode: function (raw) {
        var text = String(raw || "").replace(/\u00a0/g, " ");
        var segments = text.split(/\r?\n| {3,}/).map(function (part) {
            return part.trim();
        }).filter(function (part) { return !!part; });
        var metrics = [], seen = {};
        var known = /(hit points|quest rate|score|points|moves?|turns?|health|hp|hits|stamina|energy|strength|str|level|lvl|hunger|food|thirst|water|sleep|rest|time|day|money|cash|gold)\s*[:=]\s*(-?\d+)\s*(?:\/\s*(\d+)|(%))?/ig;
        var generic = /^([A-Za-z][A-Za-z .'-]{0,24}?)\s*[:=]\s*(-?\d+)\s*(?:\/\s*(\d+)|(%))?$/;

        function add(label, value, maximum, percent) {
            var rec = StatusGridDecoder.metric(label, value, maximum, percent);
            if (!rec || !isFinite(rec.value)) return;
            // The same labelled field can be present in both a spaced column
            // and a glued mobile tail. One decode emits it once.
            seen[rec.key] = rec;
        }

        var leftovers = segments.map(function (segment) {
            var stripped = segment.replace(known, function (whole, label, value, maximum, percent) {
                add(label, value, maximum, percent);
                return " ";
            }).replace(/\s+/g, " ").trim();
            var full = generic.exec(stripped);
            if (full) {
                add(full[1], full[2], full[3], full[4]);
                return "";
            }
            return stripped;
        }).filter(function (part) { return !!part; });

        Object.keys(seen).forEach(function (key) { metrics.push(seen[key]); });
        var genericRoomNumber = /^(?:Room\s*#?\s*\d+|#\s*\d+)$/i;
        var roomCandidates = leftovers.filter(function (part) {
            return !genericRoomNumber.test(part) && !generic.test(part);
        });

        return {
            raw: text,
            columns: segments,
            roomCandidates: roomCandidates,
            roomLabel: roomCandidates.length ? roomCandidates[0] : "",
            metrics: metrics
        };
    },

    readRaw: function (doc) {
        try {
            doc = doc || (typeof document !== "undefined" ? document : null);
            if (!doc) return "";
            var el = doc.querySelector(".GridWindow.reverse") || doc.querySelector(".GridWindow");
            if (!el) return "";
            var clone = el.cloneNode(true);
            Array.prototype.forEach.call(clone.querySelectorAll("style"), function (style) {
                if (style.parentNode) style.parentNode.removeChild(style);
            });
            return String(clone.innerText || clone.textContent || "");
        } catch (e) { return ""; }
    },

    fromDocument: function (doc) {
        return StatusGridDecoder.decode(StatusGridDecoder.readRaw(doc));
    },

    metricColumns: function (metrics) {
        return (metrics || []).map(function (metric) {
            var tail = metric.max != null ? "/" + metric.max : (metric.unit === "percent" ? "%" : "");
            return metric.label + ": " + metric.value + tail;
        });
    },

    // StatTracker predates the shared decoder and is held by an independent
    // lifecycle repair. Install through its public parsing seam: observe()
    // still owns confirmation, persistence and change events, while this
    // decoder supplies exactly one normalized record per key.
    installStatTracker: function (tracker) {
        if (!tracker || tracker._statusGridDecoderInstalled) return;
        tracker._statusGridDecoderInstalled = true;
        tracker.CANON = tracker.CANON || {};
        tracker.CANON.level = "level";
        tracker.CANON.lvl = "level";
        tracker.CANON.str = "strength";
        tracker.splitColumns = function (raw) {
            var decoded = StatusGridDecoder.decode(raw);
            return decoded.roomCandidates.concat(StatusGridDecoder.metricColumns(decoded.metrics));
        };
    }
};

try {
    if (typeof StatTracker !== "undefined") StatusGridDecoder.installStatTracker(StatTracker);
} catch (e) {}

if (typeof module !== "undefined" && module.exports) module.exports = StatusGridDecoder;
