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
        money: "money", cash: "money", gold: "gold",
        experience: "experience", exp: "experience", xp: "experience"
    },

    canonKey: function (label) {
        var key = String(label || "").trim().toLowerCase().replace(/\s+/g, " ");
        return StatusGridDecoder.CANON[key] || key;
    },

    metric: function (label, value, maximum, percent) {
        var key = StatusGridDecoder.canonKey(label);
        if (!key) return null;
        var shown = String(label || "").trim();
        if (key === "experience") shown = "EXP";
        return {
            key: key,
            label: shown,
            value: parseInt(value, 10),
            max: maximum != null && maximum !== "" ? parseInt(maximum, 10) : null,
            unit: maximum != null && maximum !== "" ? "fraction" : (percent ? "percent" : "plain"),
            source: "status-grid"
        };
    },

    decode: function (raw, measuredPair, gridCols) {
        var text = String(raw || "").replace(/\u00a0/g, " ");
        if (gridCols > 0) text = text.split(/\r?\n/).map(function(line) {
            if (line.length !== gridCols || /\s$/.test(line)) return line;
            // A VM-width edge may truncate even a syntactically valid number.
            // Remove only the final field; retain earlier complete columns.
            var boundary = 0, gaps = / {3,}/g, gap;
            while ((gap = gaps.exec(line))) boundary = gap.index + gap[0].length;
            return /(?:[:=]|\d)/.test(line.slice(boundary)) ? line.slice(0,boundary) : line;
        }).join("\n");
        var segments = text.replace(/\b(Time|Season|Date)\s*[:=][ \t]+/ig, "$1: ").split(/\r?\n| {3,}/).map(function (part) {
            return part.trim();
        }).filter(function (part) { return !!part; });
        var metrics = [], seen = {};
        var known = /(hit points|quest rate|score|points|moves?|turns?|health|hp|hits|stamina|energy|strength|str|level|lvl|hunger|food|thirst|water|sleep|rest|time|day|money|cash|gold|experience|xp|exp)\s*[:=]\s*(-?\d+)\s*(?:\/\s*(\d+)|(%))?/ig;
        // "20 exp" / "20 experience" / "20/50 exp" — number before the word.
        var leadingMax = /(-?\d+)\s*\/\s*(\d+)\s+(experience|xp|exp)\b/ig;
        var leading = /(-?\d+)\s+(experience|xp|exp)\b/ig;
        var generic = /^([A-Za-z][A-Za-z .'-]{0,24}?)\s*[:=]\s*(-?\d+)\s*(?:\/\s*(\d+)|(%))?$/;

        function add(label, value, maximum, percent) {
            var rec = StatusGridDecoder.metric(label, value, maximum, percent);
            if (!rec || !isFinite(rec.value)) return;
            // Treasures' combat grid lists the player's row first, then each
            // enemy: "BARBARIAN HIT POINTS: 9/16  VON DARTH THE SLY HIT POINTS:
            // 58/65". Last-wins showed the enemy's HP as the player's. Health
            // keeps its FIRST sighting (a measured layout, not a parser proof);
            // other keys keep their existing policy.
            if (rec.key === "health" && seen.health) return;
            // The same labelled field can be present in both a spaced column
            // and a glued mobile tail. One decode emits it once.
            seen[rec.key] = rec;
        }

        var leftovers = segments.map(function (segment) {
            var chapterPhase=/^.+, (Night|Morning|Afternoon|Evening|Dawn|Dusk)\s+-\s+Chapter (?:[a-z -]+|\d+)$/i.exec(segment);
            if(chapterPhase){seen.time={key:'time',label:'Time',value:chapterPhase[1],max:null,unit:'text',source:'status-grid'};return '';}
            var points=/^(-?\d+)\s*\/\s*(\d+) points$/i.exec(segment), act=/^Act (\d+)$/i.exec(segment), problems=/^(\d+) problems?$/i.exec(segment);
            if(points){add('Score',points[1],points[2],null);return '';}
            if(act){add('Act',act[1],null,null);return '';}
            if(problems){add('Problems',problems[1],null,null);return '';}
            var turn = /^Turn (\d+)$/i.exec(segment), completion = /^(\d+)% complete$/i.exec(segment);
            if (turn) { add("Turns",turn[1],null,null); return ""; }
            if (completion) { add("Progress",completion[1],null,"%"); return ""; }
            var namedDay = /^Day (zero|one|two|three|four|five|six|seven|eight|nine|ten)$/i.exec(segment);
            if(namedDay){add("Day",['zero','one','two','three','four','five','six','seven','eight','nine','ten'].indexOf(namedDay[1].toLowerCase()),null,null);return "";}
            var namedText = /^(Time|Season|Date|Tone|Memory)\s*[:=]\s*(.+)$/i.exec(segment);
            var clock = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day|sday|nesday|rsday|urday)?\.?,?\s+)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?m\.?)?$/i.test(segment);
            var date = /^(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) years? (?:before|after) \d{4}$/i.test(segment) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(segment) || /^(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}$/i.test(segment);
            if ((namedText && !/^-?\d+(?:\s*\/\s*\d+|%)?$/.test(namedText[2])) || clock || date) {
                var textLabel = namedText ? namedText[1] : clock ? "Time" : "Date";
                var textKey = StatusGridDecoder.canonKey(textLabel);
                seen[textKey] = { key: textKey, label: textLabel, value: namedText ? namedText[2].trim() : segment, max: null, unit: "text", source: "status-grid" };
                return "";
            }
            if (/^-?\d+$/.test(segment) && measuredPair && measuredPair.length === 1) {
                add(measuredPair[0], segment, null, null);
                return "";
            }
            var pair = /^(-?\d+)\s*\/\s*(\d+)$/.exec(segment);
            if (pair && measuredPair && measuredPair.length === 2) {
                // Only executable-authenticated measured layout ownership can
                // interpret an otherwise ambiguous unlabelled pair.
                add(measuredPair[0], pair[1], null, null);
                add(measuredPair[1], pair[2], null, null);
                return "";
            }
            // Preserve the complete printed clock/duration, before the numeric
            // matcher can truncate 2:26 pm to 2 or discard "minutes".
            var stripped = segment.replace(/\b(Time)\s*[:=]\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?|\d+\s+(?:seconds?|minutes?|hours?|days?)|Unstarted)\b/ig, function (whole, label, value) {
                seen.time = { key: "time", label: label, value: value.trim(), max: null, unit: "text", source: "status-grid" };
                return " ";
            }).replace(known, function (whole, label, value, maximum, percent) {
                add(label, value, maximum, percent);
                return " ";
            }).replace(leadingMax, function (whole, value, maximum, label) {
                add(label, value, maximum, null);
                return " ";
            }).replace(leading, function (whole, value, label) {
                add(label, value, null, null);
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
        tracker.CANON.experience = "experience";
        tracker.CANON.exp = "experience";
        tracker.CANON.xp = "experience";
        tracker.splitColumns = function (raw) {
            var cols = null;
            try { var mem = ZRamProvider.getMem(); if (mem && mem.getUint8(0) >= 4) cols = mem.getUint8(0x21); } catch(e) {}
            var decoded = StatusGridDecoder.decode(raw, tracker.measuredStatusPair ? tracker.measuredStatusPair() : null, cols);
            return decoded.roomCandidates.concat(StatusGridDecoder.metricColumns(decoded.metrics));
        };
    }
};

try {
    if (typeof StatTracker !== "undefined") StatusGridDecoder.installStatTracker(StatTracker);
} catch (e) {}

if (typeof module !== "undefined" && module.exports) module.exports = StatusGridDecoder;
