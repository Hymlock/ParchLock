var ActionSynth = {
    profile: "inform6-lite+ram",
    rules: {
        takeable: ["take"],
        openable: ["open", "close"],
        lockable: ["lock", "unlock"],
        enterable: ["enter", "exit"],
        switchable: ["switch on", "switch off"],
        edible: ["eat"],
        wearable: ["wear", "remove"],
        container: ["search", "empty", "open", "close"],
        door: ["open", "close"],
        supporter: ["search"],
        animate: ["talk to"],
        talkable: ["talk to"],
        default: ["examine"]
    },

    // D85: "examine" (or a learned substitute) is the sole DEFAULT verb
    // offered for every object regardless of attrs -- confirmed live on
    // AOTYRZ.z5.js that a game can keep "examine" as valid grammar (D34 is
    // right that the word exists) while its action routine is a permanent,
    // confirmed-by-repeated-observation stub (see AttrCalibrator.js's
    // observeVerbBehavior). Consulting the learned facts here means every
    // object stops offering a command already proven to always fail,
    // without any per-title branching -- a game with no such observation
    // behaves byte-identically to before (defaultVerb stays "examine",
    // disabled stays false).
    defaultInspectVerb: () => {
        try {
            if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.defaultInspectVerb) return AttrCalibrator.defaultInspectVerb();
        } catch (e) {}
        return "examine";
    },
    inspectVerbDisabled: () => {
        try {
            if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.inspectVerbCurrentlyDisabled) return AttrCalibrator.inspectVerbCurrentlyDisabled();
        } catch (e) {}
        return false;
    },

    verbsForAttrs: (attrs, objectId) => {
        var defaultVerb = ActionSynth.defaultInspectVerb();
        var verbs = ActionSynth.inspectVerbDisabled() ? [] : [defaultVerb];
        var a = attrs || {};
        Object.keys(ActionSynth.rules).forEach(function (key) {
            if (key === "default") return;
            if (a[key]) {
                ActionSynth.rules[key].forEach(function (v) {
                    if (verbs.indexOf(v) < 0) verbs.push(v);
                });
            }
        });
        // D150: an `edible` object is not necessarily something you EAT. The
        // Inform library gives one attribute to both eating and drinking, so a
        // liquid carries `edible` too -- measured on Anchorhead, whose `rain`
        // has it set, and whose own reply to the command the radial offered was
        // "You don't eat rain, you drink it." DRINK is therefore offered
        // alongside EAT whenever this story's dictionary actually has the verb,
        // which is the same dictionary-verified gate D147 uses. EAT is kept: the
        // game's own attribute licenses it, food exists, and for a liquid the
        // story refuses it gracefully in one line rather than failing to parse.
        try {
            if (a.edible && typeof Actionable !== "undefined" && Actionable.isGameWord
                && Actionable.isGameWord("drink") && verbs.indexOf("drink") < 0) {
                verbs.push("drink");
            }
        } catch (eD) {}
        // Learned per-object functionable verbs (AttrCalibrator allowedVerbs):
        // e.g. Glow Bar accepts switch on without I6 switchable bit after
        // confirmed successful turn-on. Additive; never removes attr verbs.
        try {
            if (objectId != null && typeof AttrCalibrator !== "undefined" && AttrCalibrator.allowedVerbsFor) {
                AttrCalibrator.allowedVerbsFor(objectId).forEach(function (v) {
                    if (v && verbs.indexOf(v) < 0) verbs.push(v);
                });
            }
        } catch (eL) {}
        return verbs;
    },

    payloadPlayerId: (p) => {
        if (!p) return null;
        if (p.playerId != null && p.playerId !== "") return p.playerId;
        if (p.probe && p.probe.playerId != null && p.probe.playerId !== "") return p.probe.playerId;
        return null;
    },

    isWorn: (obj) => {
        var a = obj && obj.attrs;
        if (!a) return false;
        // D58/D68: shared structural worn gate (bits only).
        if (typeof AttributeSchema !== "undefined" && AttributeSchema.isTrulyWorn) {
            return AttributeSchema.isTrulyWorn(a);
        }
        if (!(a.worn || a.isWorn)) return false;
        if (a.scenery && !(a.clothing || a.wearable)) return false;
        return true;
    },

    // Walk parentId up to the player. Directly held: parent == player, return
    // null. Nested inside a held container: return the immediate named
    // ancestor (TAKE OUT OF that container). WorldModel payloads historically
    // only set probe.playerId, so payloadPlayerId reads both.
    heldContainerName: (obj, p) => {
        if (!obj || obj.parentId == null) return null;
        var playerId = ActionSynth.payloadPlayerId(p);
        if (playerId == null) return null;
        if (String(obj.parentId) === String(playerId)) return null;
        var pool = ((p && p.discoveredObjects) || []).concat((p && p.inventory) || []);
        var byId = {};
        pool.forEach(function (o) {
            if (o && o.id != null) byId[String(o.id)] = o;
        });
        var named = null;
        var id = obj.parentId;
        var hops = 0;
        while (id != null && String(id) !== String(playerId) && hops++ < 8) {
            var parent = byId[String(id)];
            if (!parent) break;
            if (parent.name && !named) named = String(parent.name);
            if (parent.parentId == null) break;
            id = parent.parentId;
        }
        return named || "it";
    },

    // containerName: set only when obj is nested one or more levels inside
    // a held container (not held directly) — suppresses every normal verb
    // and returns a single synthesized "take X out of <container>" command
    // instead (D31: nested-in-container inventory items only offer this,
    // never WEAR/LIGHT/etc. directly, until moved to top-level inventory).
    // D145: attribute bits mean different things to different compilers.
    //
    // AttributeSchema.PROFILE is an Inform-6 map, and D73 already established
    // that the bit-to-semantic mapping genuinely differs per compiler and has
    // to be LEARNED from observed opcodes rather than assumed. Applying the
    // Inform profile to a ZIL game therefore invents verbs: measured live on
    // Planetfall, the Patrol uniform offered LOCK / UNLOCK / TALK TO and the
    // chronometer offered TALK TO -- nonsense the player is invited to submit.
    //
    // For a non-Inform game, semantic flags are not asserted unless
    // AttrCalibrator has actually confirmed that bit for THIS game. Physical,
    // broadly-applicable actions are kept: they apply to most objects and fail
    // gracefully ("You can't open that"), whereas offering TALK TO a wristwatch
    // is simply wrong. An Inform game, and any flag a calibrator has confirmed,
    // is completely unaffected.
    //
    // This is deliberately conservative rather than clever: the honest position
    // is that we do not yet know these bits for this compiler (D24/D61), and
    // AttrCalibrator restores each one as real evidence arrives.
    SEMANTIC_FLAGS: ["lockable", "switchable", "edible", "wearable", "enterable", "animate", "talkable"],

    trustworthyAttrs: (obj) => {
        var attrs = (obj && obj.attrs) || {};
        try {
            var mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
            if (!mem || typeof ZRamReader === "undefined" || !ZRamReader.isInformCompiled) return attrs;
            if (ZRamReader.isInformCompiled(mem)) return attrs;          // Inform: unchanged

            var copy = {};
            Object.keys(attrs).forEach(function (k) { copy[k] = attrs[k]; });
            ActionSynth.SEMANTIC_FLAGS.forEach(function (flag) {
                var learned = false;
                try {
                    learned = !!(typeof AttrCalibrator !== "undefined"
                        && AttrCalibrator.hasConfirmedFlag
                        && AttrCalibrator.hasConfirmedFlag(mem, flag));
                } catch (e) {}
                if (!learned) copy[flag] = false;
            });
            return copy;
        } catch (e) { return attrs; }
    },

    commandsForObject: (obj, context, containerName) => {
        if (!obj || !obj.name) return [];
        // D64: obj.name is the object's structural short-name (a display
        // string, not guaranteed real parser vocabulary). Actionable
        // remembers, per RAM object id, whichever phrase was actually
        // confirmed present in real printed game text (its own name, or
        // one of its real dictionary-name-property synonyms) -- prefer
        // that verified noun for the actual command text so TAKE/EXAMINE/
        // etc. submit real vocabulary instead of a possibly-unparseable
        // display string. Falls back to obj.name when nothing has been
        // verified yet (the common case, where the two already match).
        // D141: use the disambiguating form when a same-named object is in
        // scope, so "take blob" does not force the story to ask which blob.
        // Falls back to the plain verified noun whenever nothing rivals it.
        var name = String((typeof Actionable !== "undefined" && Actionable.disambiguatedNoun)
            ? Actionable.disambiguatedNoun(obj)
            : ((typeof Actionable !== "undefined" && Actionable.commandNounFor) ? Actionable.commandNounFor(obj) : obj.name));
        var attrs = ActionSynth.trustworthyAttrs(obj);
        if (context === "inventory" && containerName) {
            // D78: "take X out of Y" was BOTH the display label and the
            // literal submitted command -- confirmed live on Anchorhead
            // (a mainstream, well-known Inform game, not an edge case)
            // that this exact phrasing is never actually understood as a
            // completed take: the parser repeatedly replies "I only
            // understood you as far as wanting to take the umbrella" and
            // never executes it, while plain "take X" alone correctly
            // retrieves the SAME nested-in-a-worn-container item every
            // time. Same fix shape as D55 (numbered exits) and D64 (alias
            // matching): the label shown to the player can differ from
            // the real command actually submitted. The "out of Y" label
            // stays (it's genuinely useful UI context -- where the item
            // currently sits), but the command that gets submitted is now
            // the verified-working plain "take X".
            return [{
                verb: "take out of " + containerName,
                noun: name,
                objectId: obj.id || null,
                command: "take " + name,
                confidence: obj.confidence || 0.8
            }];
        }
        var verbs = ActionSynth.verbsForAttrs(attrs, obj.id);
        // Inventory: drop is "you are holding this", independent of takeable.
        // Zeroing takeable used to collateral-suppress drop because both verbs
        // shared one flag. Take stays gated on attrs.takeable and is removed
        // here because the object is already held.
        if (context === "inventory" && ActionSynth.isWorn(obj)) {
            verbs = ActionSynth.inspectVerbDisabled() ? ["remove"] : [ActionSynth.defaultInspectVerb(), "remove"];
        } else if (context === "inventory") {
            // "wearable" maps to the pair ["wear","remove"] since either
            // could apply depending on current worn state -- but "remove"
            // only ever makes sense while worn (the isWorn branch above
            // handles that case exclusively). Held-but-not-worn must drop
            // "remove" here or a wearable item shows both "Wear" and
            // "Remove" simultaneously, which is contradictory (confirmed
            // live: real trenchcoat radial after Remove still offered
            // Remove again).
            verbs = verbs.filter(function (v) { return v !== "take" && v !== "remove"; });
            if (verbs.indexOf("drop") < 0) verbs.push("drop");
            if (verbs.indexOf("give to") < 0) verbs.push("give to");
            if (verbs.indexOf("put in") < 0) verbs.push("put in");
        } else if (context === "room") {
            verbs = verbs.filter(function (v) {
                return v !== "drop" && v !== "remove" && v !== "wear";
            });
        }
        return verbs.map(function (v) {
            var cmd = v === "examine" ? ("examine " + name) : (v + " " + name);
            if (v === "talk to") cmd = "talk to " + name;
            if (v === "give to") cmd = "give " + name + " to ";
            if (v === "put in") cmd = "put " + name + " in ";
            return {
                verb: v,
                noun: name,
                objectId: obj.id || null,
                command: cmd,
                confidence: obj.confidence || 0.8
            };
        });
    },

    commandsForPayloadObjectId: (objectId, context) => {
        try {
            var p = WorldModel && WorldModel.lastPayload;
            if (!p) return [];
            var pool = (p.discoveredObjects || []).concat(p.inventory || []);
            var obj = pool.find(function (o) {
                return o && String(o.id) === String(objectId);
            });
            if (!obj) return [];
            context = (p.inventory || []).some(function (o) { return o && String(o.id) === String(objectId); }) ? "inventory" : "room";
            var containerName = context === "inventory" ? ActionSynth.heldContainerName(obj, p) : null;
            return ActionSynth.commandsForObject(obj, context, containerName);
        } catch (e) { return []; }
    },
    collectFromPayload: (p) => {
        var cmds = [];
        if (!p) return cmds;
        var seen = {};
        var inventoryIds = {};
        (p.inventory || []).forEach(function (o) { if (o) inventoryIds[String(o.id)] = true; });
        (p.inventory || []).concat(p.discoveredObjects || []).forEach(function (o) {
            if (!o || !o.name) return;
            if (o.id == null || seen[String(o.id)]) return;
            seen[String(o.id)] = true;
            var context = inventoryIds[String(o.id)] ? "inventory" : "room";
            var container = context === "inventory" ? ActionSynth.heldContainerName(o, p) : null;
            ActionSynth.commandsForObject(o, context, container).forEach(function (c) { cmds.push(c); });
        });
        return cmds;
    }
};
