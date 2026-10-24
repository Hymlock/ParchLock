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
    // D214 U6: may a form with these mandatory literals be offered? EVERY
    // literal of the form ("give" and "to", "put" and "in") must be in the
    // story's dictionary. Only decided where a dictionary adapter exists (Z
    // RAM); elsewhere (Glulx, no memory yet) existing behaviour is unchanged.
    literalAvailable: (literals) => {
        var mem = null;
        try { mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null; } catch (eMem) { mem = null; }
        if (!mem || typeof ZRamReader === "undefined" || !ZRamReader.hasDictionaryWord) return true;
        // An adapter exists: an uncertain read must fail CLOSED (#1944), as
        // Actionable.isGameWord does, never license an invented form.
        try {
            return String(literals || "").trim().split(/\s+/).every(function (w) { return !!ZRamReader.hasDictionaryWord(mem, w); });
        } catch (e) { return false; }
    },

    // D150's edible-to-Drink inference belongs to Inform, not ZIL FOODBIT.
    // Keep the existing non-Z path; provider/classifier failures are not that path.
    edibleDrinkAllowed: (attrs, options) => {
        try {
            if (!attrs || !attrs.edible || (options && options.directEvidenceOnly)) return false;
            if (typeof Actionable === "undefined" || !Actionable.isGameWord || !Actionable.isGameWord("drink")) return false;
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            if (!mem) return true;
            return !!(typeof ZRamReader !== "undefined" && ZRamReader.isInformCompiled && ZRamReader.isInformCompiled(mem));
        } catch (e) { return false; }
    },

    formsForAttribute: (key, objectId, context) => {
        if (key === "container") {
            var containerForms = null;
            if (typeof AttributeSchema !== "undefined" && AttributeSchema.containerForms) {
                containerForms = AttributeSchema.containerForms(AttributeSchema._getMem(), objectId, context);
            }
            return (containerForms === null ? ActionSynth.rules.container : containerForms).filter(function (verb) {
                return ActionSynth.authoredCommandAllowed(objectId, verb, context);
            });
        }
        if (key === "switchable") {
            var policy = ActionSynth.activationFormPolicy(objectId, context);
            if (policy !== null) return policy;
        }
        if (key === "edible") {
            var edible = ActionSynth.edibleFormPolicy(objectId, context);
            if (edible !== null) return edible;
        }
        return ActionSynth.rules[key] || [];
    },
    edibleFormPolicy: (objectId, context) => {
        if (typeof AttributeSchema === "undefined" || !AttributeSchema.edibleForms) return null;
        var forms = AttributeSchema.edibleForms(AttributeSchema._getMem(), objectId, context);
        return forms && forms.every(ActionSynth.literalAvailable) ? forms : forms === null ? null : [];
    },
    // Semantic owner policy and measured state restrict only their own forms.
    // Evidence and saved user choices remain recorded; manual typing is untouched.
    authoredCommandAllowed: (objectId, verb, context) => {
        if (["eat", "drink", "search", "empty", "open", "close"].indexOf(verb) < 0) return true;
        if (!context) {
            var payload = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            context = payload && (payload.inventory || []).some(function (o) { return o && o.id === objectId; }) ? "inventory" : "room";
        }
        if (verb === "eat" || verb === "drink") {
            var policy = ActionSynth.edibleFormPolicy(objectId, context);
            return policy === null || policy.indexOf(verb) >= 0;
        }
        if (typeof AttributeSchema !== "undefined") {
            var mem = AttributeSchema._getMem && AttributeSchema._getMem();
            var forms = AttributeSchema.containerForms && AttributeSchema.containerForms(mem, objectId, context);
            if (forms != null && forms.indexOf(verb) < 0) return false;
            if ((verb === "open" || verb === "close") && AttributeSchema.containerOpenState) {
                var open = AttributeSchema.containerOpenState(mem, objectId);
                if (open !== null) return verb === "open" ? !open : open;
            }
        }
        return true;
    },
    nestedEdibleForms: (objectId, context) => {
        return ActionSynth.edibleFormPolicy(objectId, context) || [];
    },
    activationFormPolicy: (objectId, context) => {
        if (typeof AttributeSchema === "undefined" || !AttributeSchema.activationForms) return null;
        var forms = AttributeSchema.activationForms(AttributeSchema._getMem(), objectId, context);
        return forms && forms.every(ActionSynth.literalAvailable) ? forms : forms === null ? null : [];
    },
    projectGeneratedActivation: (verb, objectId, context) => {
        var match = /^(?:switch|turn) (on|off)$/.exec(verb);
        if (!match) return verb;
        var policy = ActionSynth.activationFormPolicy(objectId, context);
        if (policy === null) return verb;
        var form = "turn " + match[1];
        return policy.indexOf(form) >= 0 ? form : null;
    },

    verbsForAttrs: (attrs, objectId, options) => {
        options = options || {};
        var defaultVerb = ActionSynth.defaultInspectVerb();
        var verbs = ActionSynth.inspectVerbDisabled() ? [] : [defaultVerb];
        var a = attrs || {};
        // Surface-aware Open/Close (2026-10-11): when the story records an openCapability
        // predicate, the CONTAINER rule's open/close need it (Zork I: container and not
        // supporter; the kitchen table refuses CLOSE). Only this attribute-derived path;
        // the openable rule and learned AttrCalibrator verbs below are unchanged.
        var capOk = typeof AttributeSchema === "undefined" || !AttributeSchema.openCapabilityAllows
            || AttributeSchema.openCapabilityAllows(a, typeof AttributeSchema._getMem === "function" ? AttributeSchema._getMem() : null);
        Object.keys(ActionSynth.rules).forEach(function (key) {
            if (key === "default") return;
            if (a[key]) {
                ActionSynth.formsForAttribute(key, objectId, options.context).forEach(function (v) {
                    if (key === "container" && !capOk && (v === "open" || v === "close")) return;
                    if (verbs.indexOf(v) < 0) verbs.push(v);
                });
            }
        });
        // Preserve D150's Inform rain behavior and D147's vocabulary gate.
        // A ZIL edible fact alone does not prove the distinct Drink capability.
        if (ActionSynth.edibleDrinkAllowed(a, options) && verbs.indexOf("drink") < 0) verbs.push("drink");
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
        if (a.nativeUseVerb === "use" && verbs.indexOf("use") < 0) verbs.push("use");
        return verbs.map(function (v) { return ActionSynth.projectGeneratedActivation(v, objectId, options.context); })
            .filter(function (v, i, list) { return v && list.indexOf(v) === i; });
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
                var measured = false;
                if (!learned && copy[flag]) try {
                    measured = !!(typeof AttributeSchema !== 'undefined'
                        && AttributeSchema.measuredFlagOwner
                        && AttributeSchema.measuredFlagOwner(mem, flag, obj.id));
                } catch (eOwner) {}
                if (!learned && !measured) copy[flag] = false;
            });
            return copy;
        } catch (e) { return attrs; }
    },

    commandsForObject: (obj, context, containerName, options) => {
        if (!obj || !obj.name) return [];
        // Resolve the same observed vocabulary row used by marks and radials.
        // Raw payload names may still be dictionary fragments for shared copies.
        if (typeof Actionable !== "undefined" && Actionable.payloadPool && obj.id != null) {
            obj = Actionable.payloadPool().find(function (o) { return String(o.id) === String(obj.id); }) || obj;
        }
        if (!(options && options.allowAmbiguousReference) && typeof Actionable !== "undefined" && Actionable.referenceFor && !Actionable.referenceFor(obj).unique) return [];
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
            // Knapsack (2026-10-20): the inspect verb comes FIRST so a short
            // tap (which runs the first action) looks at the item instead of
            // taking it out; taking stays an explicit choice. A disabled
            // inspect verb is not resurrected.
            var nested = [];
            if (!ActionSynth.inspectVerbDisabled()) {
                var inspect = ActionSynth.defaultInspectVerb();
                nested.push({ verb: inspect, noun: name, objectId: obj.id || null, command: inspect + " " + name, confidence: obj.confidence || 0.8 });
            }
            nested.push({
                verb: "take out of " + containerName,
                noun: name,
                objectId: obj.id || null,
                command: "take " + name,
                confidence: obj.confidence || 0.8
            });
            ActionSynth.nestedEdibleForms(obj.id, context).forEach(function (verb) {
                nested.push({ verb: verb, noun: name, objectId: obj.id || null,
                    command: verb + " " + name, confidence: obj.confidence || 0.8 });
            });
            return nested;
        }
        var verbs = ActionSynth.verbsForAttrs(attrs, obj.id, Object.assign({}, options, { context: context }));
        // Inventory: drop is "you are holding this", independent of takeable.
        // Zeroing takeable used to collateral-suppress drop because both verbs
        // shared one flag. Take stays gated on attrs.takeable and is removed
        // here because the object is already held.
        if (context === "inventory" && ActionSynth.isWorn(obj)) {
            // Knapsack (2026-10-20): a worn CONTAINER keeps the container
            // verbs its own attributes already produced above (open/close,
            // search, empty -- still subject to the openCapability gate);
            // a worn non-container garment is unchanged.
            var containerVerbs = attrs.container ? verbs.filter(function (v) {
                return v === "open" || v === "close" || v === "search" || v === "empty";
            }) : [];
            verbs = (ActionSynth.inspectVerbDisabled() ? ["remove"] : [ActionSynth.defaultInspectVerb(), "remove"]).concat(containerVerbs);
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
            // D214 U6 (D147 extended): the mandatory verb literal must exist in
            // this story's dictionary when one can be read (Treasures has
            // neither "give" nor "put"); without a dictionary adapter (Glulx)
            // the forms stay as before.
            if (verbs.indexOf("give to") < 0 && ActionSynth.literalAvailable("give to")) verbs.push("give to");
            if (verbs.indexOf("put in") < 0 && ActionSynth.literalAvailable("put in")) verbs.push("put in");
        } else if (context === "room") {
            // Inform derives takeable from !static && !scenery, which also
            // describes people. Taking an actor requires that object's own
            // confirmed capability (e.g. a genuinely collectible creature).
            var actorTakeConfirmed = false;
            try {
                actorTakeConfirmed = !!(attrs.animate && typeof AttrCalibrator !== "undefined"
                    && AttrCalibrator.allowedVerbsFor && AttrCalibrator.allowedVerbsFor(obj.id).indexOf("take") >= 0);
            } catch (eActorTake) {}
            verbs = verbs.filter(function (v) {
                return v !== "drop" && v !== "remove" && v !== "wear"
                    && (v !== "take" || !attrs.animate || actorTakeConfirmed);
            });
        }
        // Some authenticated custom equipment uses one native toggle action.
        if (attrs.equipmentToggleVerb === "use") {
            verbs = verbs.map(function (v) { return v === "wear" || v === "remove" ? "use" : v; })
                .filter(function (v, i, all) { return all.indexOf(v) === i; });
        }
        // D236: Enter/Exit follow the measured player parent. ZIL games refuse a
        // bare EXIT while you sit in a bed, basket or barge ("You'll have to stand
        // up, first.") but accept GET OUT OF X; and Exit is meaningless while you
        // are not inside. Inside -> "get out of X" (when the dictionary has both
        // words), outside -> Enter only. Unknown player/parent keeps both offers.
        // ZIL only: Inform grammar has "get out" / "get off X" but no "get out of X".
        var memE = null;
        try { memE = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null; } catch (eMemE) { memE = null; }
        if ((verbs.indexOf("enter") >= 0 || verbs.indexOf("exit") >= 0) && memE &&
            !(ZRamReader.isInformCompiled && ZRamReader.isInformCompiled(memE))) {
            var inside = null;
            try {
                var pl = memE && ZRamReader.resolvePlayer(memE);
                var plLinks = pl && pl.id && ZRamReader.objectLinks(memE, pl.id);
                if (plLinks && obj.id != null) inside = String(plLinks.parent) === String(obj.id);
            } catch (eInside) { inside = null; }
            if (inside === true) {
                verbs = verbs.filter(function (v) { return v !== "enter"; });
                if (ActionSynth.literalAvailable("get out")) verbs = verbs.map(function (v) { return v === "exit" ? "get out of" : v; });
            } else if (inside === false) {
                verbs = verbs.filter(function (v) { return v !== "exit"; });
            }
        }
        var result = verbs.map(function (v) {
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
        if (typeof LearnedWords !== "undefined") LearnedWords.commands(obj).forEach(function (c) {
            if (!result.some(function (existing) { return existing.command === c.command; })) result.push(c);
        });
        return result.filter(function (entry) { return ActionSynth.authoredCommandAllowed(obj.id, entry.verb, context); });
    },

    // D201: objects whose printable identity was recovered from just-printed
    // parser vocabulary are real scoped IDs, but their identity remains less
    // complete than a normal catalogued object. Reuse the ordinary synthesis
    // rules for compiler-declared attributes and confirmed per-object learning,
    // while excluding dictionary-only additions (currently DRINK for EDIBLE).
    // Vocabulary proves how to address the object; it never proves a verb.
    // D233: true when the object sits (at any depth, from its live RAM parent) inside a container that is
    // measured transparent and measured closed: in view, out of reach (ZIL "You can't reach that!").
    // Unknown bits, missing memory or any error -> false (normal offers kept).
    outOfReach: (objectId) => {
        try {
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            var id = Number(objectId);
            if (!mem || !Number.isInteger(id) || id < 1) return false;
            // The walk stops at the measured player / inventory root and at the current room, and never treats an
            // actor as a box: LH PLAYER 56 carries container+transparent bits but is not a closed glass case
            // (codex #4722: held master key lost Unlock with...).
            var payload = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) || {};
            var stops = {};
            [payload.playerId, payload.roomId, payload.probe && payload.probe.playerId, payload.probe && payload.probe.roomId]
                .forEach(function (s) { if (s != null && s !== "" && s !== 0) stops[String(s)] = true; });
            try { var pl = ZRamReader.resolvePlayer(mem); if (pl && pl.id) stops[String(pl.id)] = true; } catch (ePl) {}
            var link = ZRamReader.objectLinks(mem, id), cur = link && link.parent;
            for (var guard = 0; cur && guard < 32; guard++) {
                if (stops[String(cur)]) return false;
                var pa = ZRamReader.attrsFromObject(mem, cur) || {};
                if (pa.animate) return false;
                if (pa.container && pa.transparent && !(pa.open || pa.isOpen)) return true;
                var up = ZRamReader.objectLinks(mem, cur);
                cur = up && up.parent;
            }
        } catch (e) {}
        return false;
    },
    commandsForEvidenceObject: (obj, context, options) => {
        return ActionSynth.commandsForObject(obj, context || "room", null, {
            directEvidenceOnly: true,
            allowAmbiguousReference: !!(options && options.allowAmbiguousReference)
        });
    },

    commandsForPayloadObjectId: (objectId, context, options) => {
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
            return ActionSynth.commandsForObject(obj, context, containerName, options);
        } catch (e) { return []; }
    },
    collectFromPayload: (p) => {
        if (typeof Actionable !== "undefined" && Actionable.withResolutionPool && !Actionable._resolutionPool && !Actionable._lazyPoolScope) {
            return Actionable.withResolutionPool(function () { return ActionSynth.collectFromPayload(p); });
        }
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
