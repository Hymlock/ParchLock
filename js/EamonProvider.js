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
        if (o.weapon && !o.ready) a.readyWeapon = true;
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
        return !!matches[0].open;
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

    collect: () => {
        if (!EamonProvider.active()) return { sources: [] };
        var world = EamonProvider.world();
        EamonProvider.syncMapScope(world);
        EamonProvider.noteRelocation(world);
        if (!world || !world.room) {
            // Structural, and empty on purpose: there is no room to map or act in right now.
            return {
                sources: [{ name: "eamon", confidence: 0.95 }], engineMode: "structural", vmType: "eamon",
                roomId: null, roomName: "", discoveredObjects: [], inventory: [], exits: [],
                probe: { status: "eamon-idle", playerId: null, roomId: 0, scopeCount: 0 }
            };
        }
        var objects = (world.objects || []).map(function (o) { return EamonProvider.item(o, world, false); });
        var inventory = (world.inventory || []).map(function (o) { return EamonProvider.item(o, world, true); });
        var exits = (world.exits || []).map(function (e) {
            return {
                label: e.label, command: e.command || e.label, prop: null,
                targetRoomId: e.to != null ? e.to : null, targetRoomName: e.toName || "",
                // Hall places are named exits, not directions (adventure exits are always compass).
                isNonCardinal: e.compass === false, ambiguousDiagonal: false, hinted: false, confidence: 0.95
            };
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
                measuredDark: !world.room.lit, scopeCount: objects.length
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
