/* EamonProvider - world facts for an Eamon module, from the Eamon engine's own data.
 *
 * The Eamon host (lib/eamon/zvm.js) receives, at each of an adventure's own prompts, a read-only picture
 * of what the player can perceive: the room, the exits the game itself lists, the objects and monsters
 * the game has already shown, and what the player carries. This provider hands that picture to the
 * existing WorldModel so the map, direction buttons, underlines, radials and Equipment work as they do
 * for any other story. It reads no Z-machine memory and invents nothing: outside an adventure prompt
 * (the Main Hall, a nested question) it reports honest absence.
 */
var EamonProvider = {
    name: "eamon",

    active: () => !!(typeof window !== "undefined" && window.__PARCHLOCK_EAMON__),

    // Eamon fact -> Eamon command rows, read by ActionSynth.verbsForAttrs only while an Eamon adventure is
    // active. Deliberately not in ActionSynth.rules, which AttrCalibrator enumerates for every story.
    RULES: {
        readyWeapon: ["ready"],
        drinkable: ["drink"],
        readable: ["read"],
        lightSource: ["light"],
        attackable: ["attack"]
    },

    world: () => {
        var vm = typeof window !== "undefined" && window.__PARCHLOCK_EAMON__;
        return vm && vm.state ? vm.state.world : null;
    },

    attrs: (o) => {
        var a = {};
        if (o.kind === "monster") { a.animate = true; a.talkable = true; if (o.reaction !== "Friend") a.attackable = true; return a; }
        a.takeable = true;
        if (o.worn) { a.worn = true; a.isWorn = true; }
        if (o.wearable) { a.wearable = true; a.clothing = true; }
        // Equipment drop targets follow the game: an in-container takes "put X in Y" only while open; an
        // on-container is a supporter ("put X on Y").
        if (o.inside) { a.container = true; a.open = a.isOpen = !!o.open; a.openable = true; }
        if (o.onTop) a.supporter = true;
        if (o.edible) a.edible = true;
        if (o.fixed || o.door) { a.takeable = false; a.scenery = true; }
        // Eamon object facts that select the matching rows of the shared ActionSynth.rules table.
        // READY is still a valid Eamon command when this is already the ready weapon, so the inventory / Yourself radial can offer it.
        if (o.weapon) a.readyWeapon = true;
        if (o.drinkable) a.drinkable = true;
        if (o.readable) a.readable = true;
        if (o.light) a.lightSource = true;
        if (o.climb) a.climbable = true;
        return a;
    },

    // The adventure's own words: command verbs and synonyms, prepositions, and the names and synonyms of
    // the objects the game has shown. Null outside an adventure (no parser to ask).
    vocabulary: () => {
        var world = EamonProvider.active() ? EamonProvider.world() : null;
        if (!world || !world.vocabulary) return null;
        if (EamonProvider._vocabFor === world) return EamonProvider._vocab;
        var words = {};
        var add = function (text) { String(text || "").toLowerCase().split(/[^a-z0-9'-]+/).forEach(function (w) { if (w) words[w] = true; }); };
        (world.vocabulary.commands || []).forEach(function (c) { add(c.verb); (c.synonyms || []).forEach(add); });
        (world.vocabulary.preps || []).forEach(add);
        (world.objects || []).concat(world.inventory || []).forEach(function (o) { add(o.name); (o.aliases || []).forEach(add); });
        EamonProvider._vocabFor = world;
        EamonProvider._vocab = words;
        return words;
    },
    hasWord: (word) => {
        var vocab = EamonProvider.vocabulary();
        return !!vocab && !!vocab[String(word || "").toLowerCase()];
    },

    aliasWords: (aliases) => {
        var out = [];
        (aliases || []).forEach(function (a) {
            var text = String(a || "").toLowerCase().trim();
            if (text && out.indexOf(text) < 0) out.push(text);
            // Grammar particles ("of", "the") name nothing and would read as a word shared between objects.
            text.split(/[^a-z0-9'-]+/).forEach(function (w) { if (w && !/^(a|an|the|of|and|or|to|in|on|at|by|with|for|from|into|onto|under|behind)$/.test(w) && out.indexOf(w) < 0) out.push(w); });
        });
        return out;
    },

    item: (o, world, held) => ({
        id: o.id,
        name: o.name,
        parentId: o.parent != null ? o.parent : null,
        attrs: EamonProvider.attrs(o),
        // Eamon synonyms can be phrases ("scrap of parchment"); ParchLock's references match word by word, so each
        // phrase also gives its words (as vocabulary() already does).
        aliases: EamonProvider.aliasWords(o.aliases),
        confidence: 0.95,
        discovered: true,

        eamon: { kind: o.kind, ready: !!o.ready, weapon: !!o.weapon, readable: !!o.readable, light: !!o.light, door: !!o.door, state: o.state || "", reaction: o.reaction || "" }
    }),

    // An in-container's open state exactly as the engine reports it in the current snapshot (Grok #3466), for the shared
    // open/close filter (AttributeSchema.containerOpenState). Null unless the id names exactly one in-container: the
    // shared code then offers both forms, as for any story it cannot read. A locked container is closed, so OPEN stays
    // offered and the game itself says it is locked.
    containerOpenState: (objectId) => {
        var world = EamonProvider.active() ? EamonProvider.world() : null;
        if (!world || objectId == null) return null;
        var matches = (world.objects || []).concat(world.inventory || []).filter(function (o) { return o && String(o.id) === String(objectId); });
        if (matches.length !== 1 || matches[0].kind !== "artifact" || !matches[0].inside) return null;
        // The host snapshot always sends a boolean open for artifacts (WorldSnapshot.Describe); anything else is unknown (Grok #3468 F1).
        return typeof matches[0].open === "boolean" ? matches[0].open : null;
    },

    // Fast travel stops for a known, visible threat (plan section 7): a monster the game has shown in this room
    // whose reaction is Enemy. Only what the snapshot already holds (seen, lit), so a hidden one is never revealed.
    routeThreat: () => {
        var world = EamonProvider.active() ? EamonProvider.world() : null;
        if (!world || !world.room) return null;
        var enemies = (world.objects || []).filter(function (o) { return o.kind === "monster" && o.reaction === "Enemy"; });
        return enemies.length ? enemies.map(function (o) { return o.name; }) : null;
    },

    // One map per adventure (plan section 7): the existing map storage, scoped by adventure name.
    syncMapScope: (world) => {
        try {
            if (typeof ParchLockMap === "undefined" || !ParchLockMap.SetScope) return;
            var vm = window.__PARCHLOCK_EAMON__;
            var inHall = vm && vm.state && /EamonMH/.test(vm.state.phase || "");
            if (world && world.adventure) ParchLockMap.SetScope(world.adventure);
            else if (inHall) ParchLockMap.SetScope("Main Hall");
        } catch (e) {
            if (!EamonProvider._scopeWarned) { EamonProvider._scopeWarned = true; try { console.warn("Eamon map scope switch failed", e); } catch (e2) {} }
        }
    },

    // Returning from a Hall place, or any room change not made by the move just sent, is the engine
    // relocating the player: clear the map's previous room, the same way undo/restore do, so MapTopology
    // learns no edge from it (Grok #3379 Q1).
    noteRelocation: (world) => {
        try {
            var room = world && world.room;
            // Main Hall only (Grok #3381 F1): adventure exits to unseen, dark or door rooms carry no target id,
            // and MapTopology's own movement rules already govern adventure edges.
            if (!room || world.adventure !== "Main Hall") return;   // a room-less prompt keeps the last room (F3)
            var prev = EamonProvider._prevRoom;
            EamonProvider._prevRoom = { id: room.id, exits: world.exits || [], adventure: world.adventure };
            if (!prev || prev.id === room.id || prev.adventure !== world.adventure) return;
            // The words the Hall accepts for a move (HallSnapshot.Translate): the key, the label, n/s, "go <x>" (F2).
            var last = typeof MapTopology !== "undefined" ? String(MapTopology.lastCommand || "").trim().toLowerCase() : "";
            if (last.indexOf("go ") === 0) last = last.slice(3).trim();
            var words = [last, last === "n" ? "north" : last === "s" ? "south" : last];
            var moved = prev.exits.some(function (e) {
                if (e.to !== room.id) return false;
                var command = String(e.command || "").toLowerCase(), label = String(e.label || "").toLowerCase();
                return words.indexOf(command) >= 0 || words.indexOf(label) >= 0;
            });
            if (!moved && typeof MapTopology !== "undefined") { MapTopology.prevRoomId = null; MapTopology.prevRoomName = ""; }
        } catch (e) {}
    },

    // Current Eamon prompt choices from the printed reply (any menu shape, not
    // a per-shop list): "1. ...", "1=Label;", "[X]:", "Press D ... or M", "(Y/N)".
    // Fed into payload.exits so the native radial, compass chips and Actionable
    // underline path see them even when HallSnapshot gave an empty Level (shops).
    latestPromptText: () => {
        // The engine's own boundary first: the text printed for the question now waiting (zvm state.promptText).
        try { var vmState = window.__PARCHLOCK_EAMON__ && window.__PARCHLOCK_EAMON__.state; if (vmState && typeof vmState.promptText === "string") return vmState.promptText; } catch (eVm) {}
        try {
            var lines = document.querySelectorAll("#windowport .BufferWindow .BufferLine");
            var lastInput = -1, i, parts = [], el;
            for (i = 0; i < lines.length; i++) {
                if (lines[i].querySelector && lines[i].querySelector(".Style_input")) lastInput = i;
            }
            for (i = lastInput + 1; i < lines.length; i++) {
                el = lines[i];
                if (el.querySelector && el.querySelector(".Input, .Style_input")) continue;
                parts.push(el.textContent || "");
            }
            return parts.join("\n");
        } catch (e) { return ""; }
    },
    // True at an adventure's own command line (GetPlayerInputState, printed as ">").
    // Numbered or lettered menu patterns must not run here: a room line like "12. ..." is
    // description, not a waiting menu (Grok #3541 item 2).
    isAdventureCommandPrompt: () => {
        try {
            var st = typeof window !== "undefined" && window.__PARCHLOCK_EAMON__ && window.__PARCHLOCK_EAMON__.state;
            if (!st || !st.awaiting) return false;
            var world = st.world;
            if (st.atTopLevel && !st.charPrompt && world && world.room && world.adventure !== "Main Hall") return true;
            var text = typeof st.promptText === "string" ? st.promptText : "";
            var lines = String(text).split("\n").map(function (s) { return s.replace(/\u00a0/g, " ").trim(); }).filter(Boolean);
            return lines.length > 0 && /^>$/.test(lines[lines.length - 1]);
        } catch (e) { return false; }
    },
    // Eamon only: a radial verb is offered when the snapshot says this object can take it.
    // Eat / drink / wear and other type-gated verbs stay off a sword (Grok #3541 phone finding ii).
    // Always-ok inventory verbs (examine, drop, take, look) stay. Unknown verbs are not suggested.
    verbAllowedFor: (obj, verb) => {
        verb = String(verb || "").trim().toLowerCase();
        if (!verb) return false;
        var a = (obj && obj.attrs) || {};
        var e = (obj && obj.eamon) || {};
        if (/^(examine|look|look at|drop|take|inventory|wait|give|put|request)$/.test(verb)) return true;
        if (/^(eat|taste)$/.test(verb)) return !!a.edible;
        if (verb === "drink") return !!a.drinkable;
        if (verb === "wear") return !!(a.wearable || a.clothing);
        if (verb === "remove") return !!(a.worn || a.isWorn || a.wearable || a.clothing || a.container);
        if (/^(ready|wield|equip)$/.test(verb)) return !!(a.readyWeapon || e.weapon);
        if (verb === "read") return !!a.readable;
        if (/^(light|extinguish|turn on|turn off|switch on|switch off)$/.test(verb)) return !!a.lightSource;
        if (/^(open|close|search|look in|empty)$/.test(verb)) return !!(a.container || a.openable || a.supporter);
        if (/^(attack|kill|hit)$/.test(verb)) return !!a.attackable;
        if (/^(talk|talk to|ask|tell)$/.test(verb)) return !!(a.animate || a.talkable);
        if (verb === "climb") return !!a.climbable;
        return false;
    },
    promptChoicesFromText: (text) => {
        var source = String(text || ""), out = [], seen = {};
        var add = function (key, name, start) {
            if (key == null || key === "" || /^(enter|space)$/i.test(key) || start < 0) return;
            var k = String(key);
            if (seen[k.toLowerCase()]) return;
            seen[k.toLowerCase()] = true;
            out.push({ key: k, name: String(name || "").replace(/\s+/g, " ").trim(), start: start });
        };
        var groupIndex = function (match, n) {
            var consumed = 0, at, i;
            for (i = 1; i <= n; i++) {
                if (match[i] == null) continue;
                at = match[0].indexOf(match[i], consumed);
                if (at < 0) return -1;
                if (i === n) return match.index + at;
                consumed = at + match[i].length;
            }
            return -1;
        };
        var re, m;
        // Numbered / lettered menu lines and "1=Label" only when the waiting prompt is a menu or question,
        // not the adventure's ">" command line (Grok #3541 item 2).
        if (!EamonProvider.isAdventureCommandPrompt()) {
            re = /(^|\n)(\s*)(\d{1,3}|[A-Za-z])[.)]\s+(\S[^\n]*)/g;   // up to three-digit numbers ("10. Orb of My Life")
            while ((m = re.exec(source))) add(m[3], m[4], m.index + m[1].length + m[2].length);
            re = /(?:^|\n|;|\()\s*([A-Za-z0-9])\s*=\s*([A-Za-z][^;:\n]*)/g;
            while ((m = re.exec(source))) add(m[1], m[2], groupIndex(m, 1));
        }
        re = /\bor\s+([A-Za-z0-9])\s+to\s+(?:exit|leave|quit|return)\b/gi;   // "... or X to exit:" (owner, 2026-11-13)
        while ((m = re.exec(source))) add(m[1], "", groupIndex(m, 1));
        re = /\[([A-Za-z0-9])\]\s*:/g;
        while ((m = re.exec(source))) add(m[1], "", m.index + 1);
        re = /\bPress\s+([A-Za-z0-9])\b(?:\s+\S+){0,10}\s+or\s+([A-Za-z0-9])\b/gi;
        while ((m = re.exec(source))) { add(m[1], "", groupIndex(m, 1)); add(m[2], "", groupIndex(m, 2)); }
        re = /\(([A-Za-z0-9])\s*\/\s*([A-Za-z0-9])\)/g;
        while ((m = re.exec(source))) { add(m[1], "", groupIndex(m, 1)); add(m[2], "", groupIndex(m, 2)); }
        re = /\b(?:Press|Type)\s+([A-Za-z0-9])\s+or\s+([A-Za-z0-9])\b/gi;
        while ((m = re.exec(source))) { add(m[1], "", groupIndex(m, 1)); add(m[2], "", groupIndex(m, 2)); }
        return out;
    },
    // ParchLock's status card, filled from the engine's own status values in the world snapshot (host StatsSnapshot;
    // plan section 11 item 11). Same model and card as every story; each value is a confirmed engine reading. Keys
    // the card already knew from the old STATUS probe keep their names (health, gold, bank, intellect, hardiness,
    // agility, charisma, armor expertise, weight).
    _statusKeys: [],
    _statusJson: null,
    _statusModel: null,
    applyStatus: function (status) {
        try {
            if (typeof StatTracker === "undefined" || !StatTracker.model) return;
            var json = JSON.stringify(status || null);
            var model = StatTracker.model();
            // Unchanged values are skipped only while the rows are still there and confirmed in the same model:
            // StatTracker replaces its model (story change, reset) and unconfirms every row (restart, restore), and the
            // card must come back at once with the same values (Grok #3558 F2).
            var intact = model === EamonProvider._statusModel && EamonProvider._statusKeys.every(function (k) { return model.stats[k] && model.stats[k].confirmed && model.stats[k].source === "eamon-native"; });
            if (json === EamonProvider._statusJson && intact) return;
            var previous = EamonProvider._statusModel;
            EamonProvider._statusJson = json;
            EamonProvider._statusModel = model;
            StatTracker._eamonNative = !!status;
            [previous, model].forEach(function (m) {
                if (m && m.stats) EamonProvider._statusKeys.forEach(function (k) { if (m.stats[k] && m.stats[k].source === "eamon-native") delete m.stats[k]; });
            });
            EamonProvider._statusKeys = [];
            if (!status) return;
            var now = Date.now();
            var put = function (key, label, value, max, unit) {
                if (value == null || value === "") return;
                model.stats[key] = { key: key, label: label, value: value, max: max == null ? null : max, unit: unit || (max == null ? "plain" : "fraction"),
                    kind: "counter", confirmed: true, seen: StatTracker.CONFIRM_SAMPLES, source: "eamon-native", boundSource: max == null ? undefined : "eamon-native", readAt: now };
                EamonProvider._statusKeys.push(key);
            };
            if (status.profile === "health-percent") {
                put("health", "Health", status.healthPct, 100, "percent");
                (status.conditions || []).forEach(function (c, i) { put("condition" + (i ? " " + (i + 1) : ""), "Condition", c, null, "text"); });
            } else {
                if (status.health != null) put("health", "Health", status.health, status.maxHealth, "fraction");
                if (status.profile !== "health-only") {
                    put("intellect", "Intellect", status.intellect);
                    // Numeric units pack two-up in the equipment grid; string "text" forces a full-width row.
                    if (status.learningPct != null) put("learning", "Learning", status.learningPct, null, "percent");
                    put("hardiness", "Hardiness", status.hardiness);
                    // Temporary boosts beside the base value, never folded into it.
                    if (status.hardinessBoost) put("hardiness boost", "Hardiness boost", "+" + status.hardinessBoost + " (magic dagger)", null, "text");
                    put("agility", "Agility", status.agility);
                    if (status.agilityNow != null) put("agility boost", "Agility boost", "x2 = " + status.agilityNow + (status.speedTurns ? " (speed, " + status.speedTurns + " turns)" : " (speed)"), null, "text");
                    put("charisma", "Charisma", status.charisma);
                    if (status.charmPct != null) put("charm", "Charm", status.charmPct, null, "percent");
                    (status.weapons || []).forEach(function (w) {
                        if (w == null || w.pct == null) return;
                        put("weapon " + String(w.name).toLowerCase(), w.name, w.pct, null, "percent");
                    });
                    (status.spells || []).forEach(function (s) {
                        if (s == null) return;
                        var key = "spell " + String(s.name).toLowerCase();
                        if (s.now != null && s.max != null) put(key, s.name, s.now, s.max, "fraction");
                        else if (s.now != null) put(key, s.name, s.now, null, "percent");
                        else if (s.max != null) put(key, s.name, s.max, null, "percent");
                    });
                    if (status.armor) put("armor", "Armor", status.armor, null, "text");
                    if (status.armorExpertise != null) put("armor expertise", "Armor exp.", status.armorExpertise, 100, "percent");
                    if (status.weight != null) put("weight", "Weight", status.weight, status.weightMax, "fraction");
                    (status.effects || []).forEach(function (e, i) { put("effect" + (i ? " " + (i + 1) : ""), "Effect", e, null, "text"); });
                }
            }
            put("gold", "Gold", status.gold);
            put("bank", "Bank", status.bank);
            if (typeof EquipmentUI !== "undefined" && EquipmentUI.IsOpen && EquipmentUI.IsOpen() && EquipmentUI.Render) EquipmentUI.Render();
        } catch (e) {}
    },
    // Owner 2026-11-14: Hall top-level X ("Temporarily leave the universe") is Exit game.
    // Only when the engine itself offers that special as key X — never intercept adventure "x"/examine.
    interceptLeaveUniverse: function (command) {
        try {
            if (!EamonProvider.active()) return false;
            var cmd = String(command || "").trim();
            if (!/^[xX]$/.test(cmd)) return false;
            var world = EamonProvider.world();
            if (!world || String(world.adventure || "") !== "Main Hall") return false;
            var specials = world.special || [];
            var leave = specials.some(function (s) {
                return String(s.command || "").toUpperCase() === "X"
                    && /leave the universe|left the universe|temporarily leave/i.test(String(s.label || ""));
            });
            if (!leave) return false;
            if (typeof WorkspaceUI !== "undefined" && WorkspaceUI.ExitGame) {
                WorkspaceUI.ExitGame();
                return true;
            }
            return false;
        } catch (e) { return false; }
    },

    // Showcase package installed (any trusted id in ModuleLibrary / EamonPackage).
    showcaseInstalled: function () {
        try {
            if (typeof ModuleLibrary !== "undefined" && ModuleLibrary.all) {
                if (ModuleLibrary.all().some(function (g) { return g && g.Format === "eamon"; })) return true;
            }
            if (typeof EamonPackage !== "undefined" && EamonPackage.trusted && EamonPackage.isInstalled) {
                var t = EamonPackage.trusted();
                for (var id in t) if (Object.prototype.hasOwnProperty.call(t, id) && EamonPackage.isInstalled(id)) return true;
            }
        } catch (e) {}
        return false;
    },

    collect: () => {
        if (!EamonProvider.active()) return { sources: [] };
        var world = EamonProvider.world();
        EamonProvider.applyStatus(world && world.status ? world.status : null);
        EamonProvider.syncMapScope(world);
        EamonProvider.noteRelocation(world);
        if (!world || !world.room) {
            // Structural, and empty on purpose: there is no room to map or act in right now. The waiting prompt's own
            // keys (character creation's Y/N, 0/1, R/T) are still its choices, on the radial as well (plan section 2a).
            var promptExits = EamonProvider.promptChoicesFromText(EamonProvider.latestPromptText()).map(function (c) {
                return { label: String(c.key), command: String(c.key), prop: null, targetRoomId: null, targetRoomName: "",
                    isNonCardinal: true, ambiguousDiagonal: false, hinted: false, confidence: 0.95, promptKey: true };
            });
            return {
                sources: [{ name: "eamon", confidence: 0.95 }], engineMode: "structural", vmType: "eamon",
                roomId: null, roomName: "", discoveredObjects: [], inventory: [], exits: promptExits,
                probe: { status: "eamon-idle", playerId: null, roomId: 0, scopeCount: 0 }
            };
        }
        var objects = (world.objects || []).map(function (o) { return EamonProvider.item(o, world, false); });
        var inventory = (world.inventory || []).map(function (o) { return EamonProvider.item(o, world, true); });
        // Conversion layer (plan section 2a): non-compass Hall/menu exits present
        // the accepted key as the payload label, not the option phrase. The native
        // radial, #exits chips, map edges and Actionable.exitLabels then use the
        // key ("1 -> Weapons and Armor Shop"), so phrases cannot steal D/M or
        // underline "Go on an adventure". Compass exits keep "north"/"south".
        var keyLabel = function (command, fallback) {
            var cmd = String(command || "").trim();
            return /^[A-Za-z0-9]$/.test(cmd) ? cmd : String(fallback || cmd).trim();
        };
        var exits = (world.exits || []).map(function (e) {
            var command = String(e.command || e.label || "").trim();
            var label = (e.compass === false) ? keyLabel(command, e.label) : String(e.label || command).trim();
            return {
                label: label, command: command || label, prop: null,
                targetRoomId: e.to != null ? e.to : null, targetRoomName: e.toName || "",
                // Hall places are named exits, not directions (adventure exits are always compass).
                isNonCardinal: e.compass === false, ambiguousDiagonal: false, hinted: false, confidence: 0.95,
                // A Hall place is reached by its menu key ("D" for the desk), never a compass direction, even when the
                // key is a direction letter (Grok #3532 (a)).
                keyExit: e.compass === false
            };
        });
        // Room commands (Examine your abilities, Seek New Game+, leave the universe)
        // already travel as world.special. The abbreviated nav / compass chips read
        // payload.exits only, so fold those specials into the same exit list as
        // key-only entries. Skip any key already present as an exit.
        var seenCmd = {}, seenLab = {};
        exits.forEach(function (e) {
            if (e.command) seenCmd[String(e.command).toLowerCase()] = true;
            if (e.label) seenLab[String(e.label).toLowerCase()] = true;
        });
        (world.special || []).forEach(function (c) {
            var name = String((c && c.label) || "").trim();
            var command = String((c && c.command) || "").trim();
            if (!command) return;
            var label = keyLabel(command, name);
            if (!label) return;
            if (seenCmd[command.toLowerCase()] || seenLab[label.toLowerCase()]) return;
            seenCmd[command.toLowerCase()] = true;
            seenLab[label.toLowerCase()] = true;
            exits.push({
                label: label, command: command, prop: null,
                targetRoomId: null, targetRoomName: "",
                isNonCardinal: true, ambiguousDiagonal: false, hinted: false, confidence: 0.95, keyExit: true
            });
        });
        EamonProvider.promptChoicesFromText(EamonProvider.latestPromptText()).forEach(function (c) {
            var command = String(c.key || "").trim();
            if (!command) return;
            if (seenCmd[command.toLowerCase()]) return;
            seenCmd[command.toLowerCase()] = true;
            var label = keyLabel(command, command);
            if (seenLab[label.toLowerCase()]) return;
            seenLab[label.toLowerCase()] = true;
            exits.push({
                label: label, command: command, prop: null,
                targetRoomId: null, targetRoomName: "",
                isNonCardinal: true, ambiguousDiagonal: false, hinted: false, confidence: 0.95,
                promptKey: true   // the prompt's own key: answered only through the prompt-key path (Grok #3515 S1)
            });
        });
        return {
            sources: [{ name: "eamon", confidence: 0.95 }],
            engineMode: "structural",
            vmType: "eamon",
            roomId: world.room.id,
            roomName: world.room.name || "",
            discoveredObjects: objects,
            unnamedCandidates: [],
            inventory: inventory,
            exits: exits,
            hudMetrics: [],
            // The command verbs, as the submit-button command list and autocomplete read a story's verbs.
            specialCommands: world.special ? world.special.map(function (c) {
                // A Hall room's own commands (Examine your abilities, Leave the universe), sent as the engine key.
                return { label: c.label, command: c.command, source: "ram-special" };
            }) : ((world.vocabulary && world.vocabulary.commands) || []).map(function (c) {
                return { label: c.verb, command: c.verb, source: "dictionary-verb" };
            }),
            probe: {
                status: "eamon-live", playerId: world.playerId, inventoryRootId: world.playerId,
                playerSource: "eamon-native", roomId: world.room.id, roomSource: "eamon-native",
                measuredDark: !world.room.lit, scopeCount: objects.length,
                // Main Hall menus list every exit; MapTopology can drop stale edges on visit.
                completeExits: world.adventure === "Main Hall"
            },
            confidence: 0.95
        };
    }
};

try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "eamon", collect: function () { return EamonProvider.collect(); } });
        }
    }, 0);
} catch (e) {}

// One save system (owner ruling 2026-11-13, plan section 5). The Showcase saves through ParchLock's own file-picking
// dialog (lib/main.js Dialog), never through Eamon's slot menus. The adventure's Eamon saves are mirrored into that
// dialog's store by name (one entry per engine save slot, keyed by an adventure-specific game id, so the Save files
// panel lists them too); the player names or picks a save there, and ParchLock sends the engine's own direct
// commands, "save <slot> <name>" and "restore <slot>" (EamonRT CommandParser quick forms), through the normal
// command line, so every author rule and refusal applies and is shown as the game prints it.
var EamonSaves = {
    MAX: 5,                                   // Eamon's NumSaveSlots
    NAME_MAX: 40,                             // Eamon's FsNameLen
    // When saving or restoring is not possible, the player is told so plainly, in a pop-up (owner 2026-11-13).
    UNSAFE: "You glance around furtively and try to save your game. There is movement in the corner, and it doesn't seem safe to do that right now.",
    // The owner's line is for a refusal inside an adventure; the Main Hall gets a plain one (Grok #3547 F6; wording is
    // the owner's to review, plan section 5).
    notNow: function (kind, why, hall) {
        if (hall) {
            Message.Show(kind === "restore" ? "Restore" : "Save", "<p>Saved games belong to an adventure. Here in the Hall your character and progress are kept for you automatically.</p>", true);
            return;
        }
        var title = kind === "restore" ? "Not now" : "Not safe to save";
        var lead = kind === "restore"
            ? "You try to recall where you were, but the moment isn't right; something here still needs your attention."
            : EamonSaves.UNSAFE;
        Message.Show(title, "<p>" + lead + "</p>" + (why ? "<p>" + why + "</p>" : ""), true);
    },
    // Eamon splits a command line at . ! ? ; , and at the words "and", "then" and "also" (Engine CommandSepTokens), so
    // "save 2 Bread and butter" would save "Bread" and then run "butter". Only letters, digits, spaces, apostrophes
    // and hyphens pass, at most FsNameLen, and a name with one of those words is refused (Grok #3547 F1).
    cleanName: function (name) {
        return String(name || "").replace(/[^A-Za-z0-9 '\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, EamonSaves.NAME_MAX).trim();
    },
    separatorWord: function (name) {
        var m = /\b(and|then|also)\b/i.exec(String(name || ""));
        return m ? m[1].toLowerCase() : null;
    },
    // The save or restore just sent, settled by the engine's own lifecycle event, never by matching printed text
    // (Grok #3545 C4).
    _pending: null,
    onLifecycle: function (event) {
        var p = EamonSaves._pending;
        if (p && event === p.kind) p.done = true;
        // A save made a moment ago is listed at once the next time the dialog opens (Grok #3547 F4).
        if (event === "save") {
            try {
                var vm = EamonSaves.vm(), folder = EamonSaves.folder();
                if (vm && vm.saveSlots && folder) vm.saveSlots().then(function (slots) { if (slots) EamonSaves.sync(slots, EamonSaves.gameId(folder)); });
            } catch (e) {}
        }
    },
    submit: function (kind, command) {
        var vm = EamonSaves.vm();
        var p = EamonSaves._pending = { kind: kind, done: false, sent: Date.now() };
        var lineText = function (el) { return String(el.textContent || "").replace(/ /g, " ").trim().replace(/^>\s*/, "").toLowerCase(); };
        // Lines already showing this text are the player's own, never ours to hide (Grok #3547 F5).
        var before = [];
        Array.prototype.forEach.call(document.querySelectorAll("#windowport .BufferLine"), function (el) { if (lineText(el) === command.toLowerCase()) before.push(el); });
        Actionable.Submit(command);
        // Our own command line is not the player's typing: its echo is not shown, on screen or in the transcript
        // (aria-hidden lines are not recorded; Grok #3545 C3, #3547 F5). The game's reply is shown in full.
        var echo = null;
        var hideEcho = function () {
            if (!echo || !echo.isConnected) {
                echo = null;
                var all = document.querySelectorAll("#windowport .BufferLine");
                // The story window keeps a fixed number of lines and drops the oldest, so search back from the end.
                for (var i = all.length - 1; i >= Math.max(0, all.length - 16); i--) {
                    if (before.indexOf(all[i]) < 0 && lineText(all[i]) === command.toLowerCase()) { echo = all[i]; break; }
                }
            }
            if (!echo) return;
            echo.style.display = "none";
            echo.setAttribute("aria-hidden", "true");
            var next = echo.nextElementSibling;
            if (next && next.classList.contains("BufferLine") && !/\S/.test(String(next.textContent || "").replace(/ /g, " "))) {
                next.style.display = "none"; next.setAttribute("aria-hidden", "true");
            }
        };
        // The page may redraw the line after the reply arrives, so keep it hidden for a few seconds.
        var hides = 0;
        var keepHidden = function () { hideEcho(); if (++hides < 16) setTimeout(keepHidden, 250); };
        hideEcho();
        setTimeout(keepHidden, 50);
        // Settled by the engine's own save/restore event. A refusal is the prompt coming back without that event; a
        // short grace lets an event already on its way arrive first. A wait that runs out says nothing (Grok #3547 F3).
        var tries = 0, backAt = 0;
        var watch = function () {
            tries++;
            if (EamonSaves._pending !== p) return;
            if (p.done) { EamonSaves._pending = null; return; }
            var st = vm && vm.state;
            var back = st && st.awaiting && st.atTopLevel && Date.now() - p.sent > 400;
            if (back && !backAt) backAt = Date.now();
            if (back && Date.now() - backAt >= 1000) {
                EamonSaves._pending = null;
                EamonSaves.notNow(kind, "The game's own answer is in the story.");
                return;
            }
            if (tries < 120) { setTimeout(watch, 250); return; }
            EamonSaves._pending = null;   // timed out: no claim either way
        };
        setTimeout(watch, 250);
    },
    // The engine can show its own restore slot menu without a typed RESTORE: the death menu's "Restore a saved game"
    // puts "restore" in the engine's own input. ParchLock answers that menu through its save dialog instead: the
    // menu lines are not shown, the dialog lists the same saves, and the chosen slot (or "Don't restore" on cancel)
    // is sent as the menu's own key, a key the waiting question accepts (one save system, 2026-11-13).
    _menuSeen: -1,
    onQuestion: function () {
        var vm = EamonSaves.vm(), st = vm && vm.state;
        if (!st || st.atTopLevel || !st.awaiting || EamonSaves._menuSeen === st.prompts) return;
        var text = String(st.promptText || "");
        if (!/Saved games:/.test(text) || !/Your choice \(1-\d+\):?\s*$/.test(text.replace(/\s+$/, "") + " ")) return;
        EamonSaves._menuSeen = st.prompts;
        var entries = [], cancelKey = null;
        text.split("\n").forEach(function (line) {
            var m = /^\s*(\d+)\.\s+(.*?)\s*$/.exec(line);
            if (!m) return;
            if (/^\(Don't/i.test(m[2])) cancelKey = m[1];
            else if (!/^\(none\)$/i.test(m[2])) entries.push({ slot: Number(m[1]), name: m[2] });
        });
        if (cancelKey == null) return;
        // The engine's slot list is replaced by the dialog: hide it, keeping the game's other text.
        var lines = Array.prototype.slice.call(document.querySelectorAll("#windowport .BufferLine"));
        var start = -1;
        for (var i = lines.length - 1; i >= Math.max(0, lines.length - 40); i--) {
            if (/Saved games:/.test(lines[i].textContent || "")) { start = i; break; }
        }
        var hidden = [];
        if (start >= 0) for (var k = start; k < lines.length; k++) {
            if (lines[k].querySelector(".Input, .LineInput, .CharInput")) continue;   // the live field stays usable
            lines[k].style.display = "none"; lines[k].setAttribute("aria-hidden", "true"); hidden.push(lines[k]);
        }
        var answer = function (key) {
            try { Actionable.SubmitPromptChoice(String(key)); } catch (e) {}
            // Once answered, the menu's own question line goes too (it held the live field until now).
            setTimeout(function () {
                var all = document.querySelectorAll("#windowport .BufferLine");
                for (var q = all.length - 1; q >= Math.max(0, all.length - 12); q--) {
                    if (/Your choice \(1-\d+\)/.test(all[q].textContent || "")) { all[q].style.display = "none"; all[q].setAttribute("aria-hidden", "true"); break; }
                }
            }, 300);
        };
        var Dialog = EamonSaves.dialog(), folder = EamonSaves.folder();
        if (!Dialog || !folder || !entries.length) {
            // Nothing to pick (no saves) or no dialog: show the game's own list again rather than strand the player.
            hidden.forEach(function (el) { el.style.display = ""; el.removeAttribute("aria-hidden"); });
            if (!entries.length) {
                // Say why the game goes back to its menu (Grok #3554 N1).
                Message.Show("Restore", "There are no saved games in this adventure yet.", true);
                answer(cancelKey);
            }
            return;
        }
        var gid = EamonSaves.gameId(folder);
        EamonSaves.sync(entries, gid);
        try { ParchLock.GameId = gid; } catch (e) {}
        setTimeout(function () { try { $("#dialog_edit").hide(); } catch (eE) {} }, 0);
        Dialog.open(false, "save", gid, function (ref) {
            try { if (typeof Transcript !== "undefined") Transcript._choice = null; } catch (eC) {}
            var name = ref && ref.filename ? String(ref.filename).trim().toLowerCase() : "";
            var hit = EamonSaves.labels(entries).filter(function (e) { return e.label.toLowerCase() === name; })[0];
            answer(hit ? hit.slot : cancelKey);
        });
    },
    vm: function () { return (typeof window !== "undefined" && window.__PARCHLOCK_EAMON__) || null; },
    folder: function () {
        var vm = EamonSaves.vm(), m = vm && /-wd\s+(?:\.\.\/)*Adventures\/([A-Za-z0-9_-]{1,64})/.exec(String((vm.state && vm.state.phase) || ""));
        return m ? m[1] : null;
    },
    // No ":" in the id: the dialog keys files as usage:gameid:filename and splits on ":".
    gameId: function (folder) { return "eamonshowcase-" + folder; },
    // ParchLock's own file-picking dialog (lib/main.js Dialog), as the Glk interface exposes it.
    dialog: function () {
        // main.js starts the Eamon VM through its Z-code path and hands it the same Dialog (vm.prepare keeps options).
        try { var vm = EamonSaves.vm(); if (vm && vm.options && vm.options.Dialog) return vm.options.Dialog; } catch (e0) {}
        try { var iface = window.GlkOte && GlkOte.getinterface && GlkOte.getinterface(); if (iface && iface.Dialog) return iface.Dialog; } catch (e) {}
        return (typeof Dialog !== "undefined") ? Dialog : null;
    },
    // Typed SAVE / RESTORE and the Tools and panel entries come here; anything else is not ours.
    // A bare SAVE / RESTORE, and a SAVE whose first word is not a slot 1-5 ("save foo", "save 9 x"), which the engine
    // would answer with its own slot menu (Grok #3554 S1). "save 2 name", "save 3" and "restore 2" are the engine's
    // own direct forms and pass through; an out-of-range "restore 9" reaches onQuestion.
    handles: function (command) {
        var vm = EamonSaves.vm(), text = String(command || "");
        if (!vm || !vm.saveSlots) return false;
        if (/^\s*(save|restore)\s*$/i.test(text)) return true;
        return /^\s*save\s+\S/i.test(text) && !/^\s*save\s+[1-5](\s|$)/i.test(text);
    },
    // The picker's name for each used slot: its Eamon name, or "name #slot" when two slots share a name (#3554 N2).
    labels: function (slots) {
        var count = {};
        slots.forEach(function (s) { if (s.name && !/^\(none\)$/i.test(s.name)) count[s.name.toLowerCase()] = (count[s.name.toLowerCase()] || 0) + 1; });
        return slots.filter(function (s) { return s.name && !/^\(none\)$/i.test(s.name); }).map(function (s) {
            return { slot: s.slot, name: s.name, label: count[s.name.toLowerCase()] > 1 ? s.name + " #" + s.slot : s.name };
        });
    },
    sync: function (slots, gid) {
        var Dialog = EamonSaves.dialog();
        if (!Dialog || !Dialog.file_construct_ref) return;
        var names = {};
        EamonSaves.labels(slots).forEach(function (s) {
            names[s.label] = s.slot;
            var ref = Dialog.file_construct_ref(s.label, "save", gid);
            Dialog.file_write(ref, JSON.stringify({ eamonSlot: s.slot }), true);
        });
        // Entries for saves the engine no longer has (a name changed in another way) leave the picker.
        Object.keys(localStorage).forEach(function (key) {
            var prefix = "dirent:save:" + gid + ":";
            if (key.indexOf(prefix) !== 0) return;
            var name = key.slice(prefix.length);
            if (!(name in names)) Dialog.file_remove_ref(Dialog.file_construct_ref(name, "save", gid));
        });
    },
    open: function (command) {
        var kind = /restore/i.test(command) ? "restore" : "save";
        var vm = EamonSaves.vm();
        if (Message.IsOpen) Message.Hide();
        if (!vm.state || !vm.state.atTopLevel || !vm.state.awaiting) {
            EamonSaves.notNow(kind, "Finish the game's current question first.");
            return true;
        }
        vm.saveSlots().then(function (slots) {
            if (slots === null) {
                EamonSaves.notNow(kind, null, true);
                return;
            }
            var folder = EamonSaves.folder(), gid = EamonSaves.gameId(folder);
            EamonSaves.sync(slots, gid);
            var used = slots.filter(function (s) { return s.name && !/^\(none\)$/i.test(s.name); });
            if (kind === "restore" && !used.length) { Message.Show("Restore", "There are no saved games in this adventure yet.", true); return; }
            try { ParchLock.GameId = gid; } catch (e) {}
            var Dialog = EamonSaves.dialog();
            if (!Dialog) { Message.Show("Save", "The save window is not available.", true); return; }
            // Eamon saves are replaced, never deleted or renamed from here: the dialog's Edit (delete / rename) would
            // change only this mirror and mislead the player (Grok #3547 F2).
            // A typed "save foo" brings its words along as the suggested name (Grok #3554 S1).
            var suggested = kind === "save" ? EamonSaves.cleanName(String(command || "").replace(/^\s*save\s*/i, "")) : "";
            setTimeout(function () {
                try { $("#dialog_edit").hide(); } catch (eE) {}
                try { if (suggested && $("#dialog_infield").length && !$("#dialog_infield").val()) $("#dialog_infield").val(suggested); } catch (eS) {}
            }, 0);
            Dialog.open(kind === "save", "save", gid, function (ref) {
                // The engine's own save/restore event attaches the transcript and map (Transcript.commitSave via the
                // host lifecycle); the dialog's pick must not also count as a Glk file save.
                try { if (typeof Transcript !== "undefined") Transcript._choice = null; } catch (eC) {}
                if (!ref || !ref.filename) return;
                // A pick from the list is that slot exactly (its label may carry "#slot" when two names repeat).
                var picked = EamonSaves.labels(slots).filter(function (l) { return l.label.toLowerCase() === String(ref.filename).trim().toLowerCase(); })[0];
                var name = picked ? EamonSaves.cleanName(picked.name) : EamonSaves.cleanName(ref.filename);
                if (!name) { Message.Show("Save", "Please give the save a name using letters or numbers.", true); return; }
                var word = EamonSaves.separatorWord(name);
                if (word && kind === "save") {
                    Message.Show("Save", "“" + name + "” can't be used: the word “" + word + "” would make the game read the rest as another command. Please choose another name.", true);
                    return;
                }
                var hit = picked || slots.filter(function (s) { return String(s.name).toLowerCase() === name.toLowerCase(); })[0];
                if (kind === "restore") {
                    if (!hit) { Message.Show("Restore", "That save is not in this adventure.", true); return; }
                    EamonSaves.submit("restore", "restore " + hit.slot);
                    return;
                }
                var slot = hit ? hit.slot : (slots.length < EamonSaves.MAX ? slots.length + 1 : null);
                if (slot == null) {
                    // A "(none)" slot left by the engine is reused before asking to replace a named save.
                    var empty = slots.filter(function (s) { return /^\(none\)$/i.test(s.name); })[0];
                    if (empty) slot = empty.slot;
                }
                if (slot == null) {
                    Message.Show("Save", "This adventure keeps " + EamonSaves.MAX + " saved games and all are in use. Save again and choose one of them to replace.", true);
                    return;
                }
                EamonSaves.submit("save", "save " + slot + " " + name);
            });
        }).catch(function (e) { Message.Show("Save", "The saved games could not be read (" + (e && e.message || e) + ").", true); });
        return true;
    }
};
