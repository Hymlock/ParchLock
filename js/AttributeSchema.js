/* AttributeSchema
 *
 * Inform-6 Standard Library attribute profile for ParchLock RAM reads.
 *
 * THIS IS A PROFILE, NOT A UNIVERSAL ABI.
 * PRODUCTION_PLAN.md §3.3: I7 / PunyInform / INFIX / $NUM_ATTR_BYTES shift layouts.
 * Glulx objects are compiler-synthesized and are not this table.
 *
 * Numbering is the declaration order in Inform 6 library 6.12.2 `linklpa.h`
 * (DavidGriffith/inform6lib, serial 180520), which matches Graham Nelson's
 * stock library `linklpa.h` from 6/10 onward:
 *
 *   0 animate
 *   1 absent          (alias non_floating)
 *   2 clothing
 *   3 concealed
 *   4 container
 *   5 door
 *   6 edible
 *   7 enterable
 *   8 general
 *   9 light
 *  10 lockable
 *  11 locked
 *  12 moved
 *  13 on
 *  14 open
 *  15 openable
 *  16 proper
 *  17 scenery
 *  18 scored
 *  19 static
 *  20 supporter
 *  21 switchable
 *  22 talkable
 *  23 transparent
 *  24 visited
 *  25 workflag
 *  26 worn
 *  27 male
 *  28 female
 *  29 neuter
 *  30 pluralname
 *
 * Semantic aliases used by ParchLock:
 *   wearable -> clothing (I6 has no `wearable` attribute)
 *   isOpen   -> open
 *   takeable has NO I6 bit (takability is ~static & ~scenery). Left unmapped
 *   so attrsFromObject will not invent a boolean for it.
 */
var AttributeSchema = {
    SOURCE: "Inform 6 Standard Library 6.12.2 linklpa.h (https://github.com/DavidGriffith/inform6lib)",
    PROFILE_ID: "i6-lib-6.12.2-linklpa",

    /* flag name -> attribute number, or null if the flag is not a real I6 bit */
    PROFILE: {
        animate: 0,
        absent: 1,
        clothing: 2,
        wearable: 2,
        concealed: 3,
        container: 4,
        door: 5,
        edible: 6,
        enterable: 7,
        general: 8,
        light: 9,
        lockable: 10,
        locked: 11,
        moved: 12,
        on: 13,
        open: 14,
        isOpen: 14,
        openable: 15,
        proper: 16,
        scenery: 17,
        scored: 18,
        static: 19,
        supporter: 20,
        switchable: 21,
        talkable: 22,
        transparent: 23,
        visited: 24,
        workflag: 25,
        worn: 26,
        male: 27,
        female: 28,
        neuter: 29,
        pluralname: 30,
        takeable: null
    },

    confidence: "unverified",
    _hits: {},
    _misses: {},
    _wrapped: false,
    MISS_THRESHOLD: 3,

    bitFor: function (flagName, mem) {
        if (!flagName || !Object.prototype.hasOwnProperty.call(AttributeSchema.PROFILE, flagName)) return null;
        try {
            mem = mem || AttributeSchema._getMem();
            var declared = typeof ZRamReader !== "undefined" && ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem);
            if (declared) {
                var name = flagName === "wearable" ? "clothing" : flagName === "isOpen" ? "open" : flagName;
                return Object.prototype.hasOwnProperty.call(declared.bits, name) ? declared.bits[name] : null;
            }
            // Worn has ONE owner per executable, first match wins: declared
            // Inform names (above), a measured executable fact, a bit the
            // game's own inventory routine was seen testing, then the Inform
            // default only for an Inform-compiled story. A ZIL story with no
            // evidence reads nothing as worn rather than a wrong bit.
            if (flagName === "worn") return AttributeSchema.wornBitFallback(mem);
            // Measured per-executable ZIL/custom attribute numbers (e.g. Zork I
            // mailbox OPENBIT/CONTBIT). Prefer over Inform PROFILE defaults.
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                ? ModuleLibrary.currentExecutableDigest() : null;
            var fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
            var map = fact && fact.attributeMap;
            if (map && Object.prototype.hasOwnProperty.call(map, flagName)
                && Number.isInteger(map[flagName]) && map[flagName] >= 0 && map[flagName] < 48) {
                return map[flagName];
            }
        } catch (e) {}
        var n = AttributeSchema.PROFILE[flagName];
        return typeof n === "number" ? n : null;
    },

    // Worn source when no Inform attribute names are declared. Returns the
    // bit and records which source owns it (for the override guard).
    wornBitFallback: function (mem) {
        var fact = null;
        try {
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                ? ModuleLibrary.currentExecutableDigest() : null;
            fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
        } catch (eF) {}
        if (fact && Number.isInteger(fact.wornAttribute) && fact.wornAttribute >= 0 && fact.wornAttribute < 48) return fact.wornAttribute;
        try {
            var learned = typeof AttrCalibrator !== "undefined" && AttrCalibrator.learnedWornBit
                ? AttrCalibrator.learnedWornBit(mem) : null;
            if (Number.isInteger(learned)) return learned;
        } catch (eL) {}
        var inform = false;
        try { inform = !!(mem && typeof ZRamReader !== "undefined" && ZRamReader.isInformCompiled && ZRamReader.isInformCompiled(mem)); } catch (eI) {}
        return inform ? AttributeSchema.PROFILE.worn : null;
    },
    // True when worn is owned by a source stronger than calibration
    // overrides (declared names or a measured fact): the override loop in
    // applyTo must not overwrite it.
    wornOwnedAboveCalibration: function (mem) {
        try {
            if (typeof ZRamReader !== "undefined" && ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) return true;
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest ? ModuleLibrary.currentExecutableDigest() : null;
            var fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
            return !!(fact && Number.isInteger(fact.wornAttribute));
        } catch (e) { return false; }
    },

    applyTo: function (attrs, obj, mem) {
        attrs = attrs || {};
        var keys = Object.keys(AttributeSchema.PROFILE);
        for (var i = 0; i < keys.length; i++) {
            var flag = keys[i];
            var bit = AttributeSchema.bitFor(flag, mem);
            if (bit === null) {
                // Codex #1668: no trusted worn source for this story -- never
                // keep a predecoded worn value. A measured custom equipment
                // state (applyEquipmentState, below) may still set it.
                if (flag === "worn") { attrs.worn = false; attrs.isWorn = false; }
                continue;
            }
            if (typeof ZRamReader !== "undefined" && typeof ZRamReader.attr === "function") {
                attrs[flag] = ZRamReader.attr(obj, bit);
            }
        }
        // takeable has no I6 bit of its own (see file header comment) --
        // it's the standard library's own TAKE-verb precondition, derived
        // from two real bits that ARE read above: an object can be taken
        // unless it's flagged static (nailed down) or scenery (background
        // dressing). Previously left permanently unset (undefined), which
        // silently suppressed "take" on every takeable object in every
        // game (ActionSynth.verbsForAttrs only adds a verb when its attrs
        // key is truthy) -- found via live holistic play, not a synthetic
        // fixture. Only derived when both real bits were actually read.
        if (attrs.static !== undefined && attrs.scenery !== undefined) {
            attrs.takeable = !attrs.static && !attrs.scenery;
        }

        // Proven fixed ZIL grammar owns TAKE's FIND capability, rather than
        // interpreting this compiler's bits as Inform scenery/static flags.
        try {
            var takeBit = typeof GrammarProvider !== 'undefined' && GrammarProvider.d214TakeAttribute
                ? GrammarProvider.d214TakeAttribute(mem) : null;
            if (Number.isInteger(takeBit) && obj) attrs.takeable = !!ZRamReader.attr(obj,takeBit);
        } catch(eTake) {}

        // D73 Phase D: consult AttrCalibrator's live-opcode-observed,
        // per-game calibration -- evidence-only, additive, never a guess.
        // A game/flag with no confirmed observation yet is byte-for-byte
        // unaffected (AttrCalibrator.overrideFor()/objectOverrideFor()
        // return nothing until real play has confirmed something), so an
        // already-correct static-profile prediction (e.g. every verified
        // Anchorhead object) can never regress from loading this file.
        if (typeof AttrCalibrator !== "undefined") {
            try {
                var mem = AttributeSchema._getMem();
                if (mem) {
                    AttrCalibrator.hydrate(mem);
                    var bitOverrides = AttrCalibrator.overrideFor();
                    var wornOwned = AttributeSchema.wornOwnedAboveCalibration(mem);
                    for (var ovFlag in bitOverrides) {
                        if (ovFlag === "worn" && wornOwned) continue;   // first-match ownership
                        if (typeof ZRamReader !== "undefined" && typeof ZRamReader.attr === "function") {
                            attrs[ovFlag] = ZRamReader.attr(obj, bitOverrides[ovFlag].bit);
                        }
                    }
                    // Per-object takeable override wins last: it is a
                    // directly observed fact about THIS object (a real
                    // confirmed take or refusal), strictly more specific
                    // than the generic static-bit derivation just above.
                    var objOverride = obj && obj.id != null ? AttrCalibrator.objectOverrideFor(obj.id) : null;
                    if (objOverride && typeof objOverride.takeable === "boolean") {
                        attrs.takeable = objOverride.takeable;
                    }
                }
            } catch (eCal) {}
        }
        AttributeSchema.applyEquipmentState(attrs, obj, mem);
        return attrs;
    },

    // Measured executable semantics complement standard compiler attributes.
    // Never infer equipment state from an object's name or inventory prose.
    applyEquipmentState: function (attrs, obj, mem) {
        try {
            if (!obj || !mem || typeof ModuleLibrary === "undefined" ||
                typeof ModuleStatFactsClaude === "undefined" || typeof ZRamReader === "undefined") return;
            var digest = ModuleLibrary.currentExecutableDigest();
            var fact = digest && ModuleStatFactsClaude[digest];
            if (fact && fact.objectUseVerb === "use") attrs.nativeUseVerb = "use";
            var state = fact && fact.equipmentState;
            if (!state || typeof state.wornProperty !== "string" || state.toggleVerb !== "use") return;
            var declarations = ZRamReader.informPropertyNames(mem);
            var property = declarations && declarations.names[state.wornProperty];
            if (!Number.isInteger(property) || property < 64) return;
            var values = ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, obj.id, 3));
            if (!Object.prototype.hasOwnProperty.call(values, property) ||
                (values[property] !== 0 && values[property] !== 1)) return;
            attrs.worn = values[property] === 1;
            attrs.clothing = attrs.wearable = true;
            attrs.equipmentToggleVerb = state.toggleVerb;
        } catch (eEquipment) {}
    },

    /* Closed-tin rule (design addendum 3.1 / Phase 1 task). */
    canSeeInside: function (attrs) {
        attrs = attrs || {};
        return !!(attrs.container ? (attrs.open || attrs.transparent) : attrs.supporter);
    },

    // D58/D68: structural worn display gate — bits only, no text.
    // Glow Bar live combo is scenery+worn without clothing/wearable: that is
    // decorative noise, not equipped gear. A worn bit on non-scenery (ring,
    // coat) remains worn even if clothing is clear on a sparse fixture.
    isTrulyWorn: function (attrs) {
        attrs = attrs || {};
        if (!(attrs.worn || attrs.isWorn)) return false;
        if (attrs.scenery && !(attrs.clothing || attrs.wearable)) return false;
        return true;
    },

    _getMem: function () {
        try {
            if (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) return ZRamProvider.getMem();
        } catch (e0) {}
        try {
            if (typeof ZvmCapture !== "undefined" && ZvmCapture.getMem) return ZvmCapture.getMem();
        } catch (e1) {}
        return null;
    },

    _transcript: function () {
        var text = "";
        try {
            if (typeof Actionable !== "undefined" && Actionable.Scope) {
                text += " " + (Actionable.Scope.lastLookText || "");
                text += " " + (Actionable.Scope.lastInventoryText || "");
            }
        } catch (e0) {}
        try {
            if (typeof $ !== "undefined") {
                text += " " + ($(".BufferWindow, .GridWindow, #windowport").text() || "");
            }
        } catch (e1) {}
        return String(text || "");
    },

    _findIdByName: function (mem, noun) {
        if (!mem || !noun || typeof ZRamReader === "undefined") return 0;
        var want = String(noun).toLowerCase().replace(/^(the|a|an)\s+/, "").trim();
        if (!want) return 0;
        var count = ZRamReader.objectCount(mem);
        var best = 0;
        for (var id = 1; id <= count; id++) {
            var nm = (ZRamReader.shortName(mem, id) || "").toLowerCase().replace(/^the\s+/, "").trim();
            if (!nm) continue;
            if (nm === want) return id;
            if (!best && (nm.indexOf(want) >= 0 || want.indexOf(nm) >= 0)) best = id;
        }
        try {
            var p = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) ? WorldModel.lastPayload : null;
            var pool = ((p && p.discoveredObjects) || []).concat((p && p.inventory) || []);
            for (var i = 0; i < pool.length; i++) {
                var o = pool[i];
                if (!o || !o.id || !o.name) continue;
                var n = String(o.name).toLowerCase().replace(/^the\s+/, "").trim();
                if (n === want || n.indexOf(want) >= 0) return o.id;
            }
        } catch (e) {}
        return best;
    },

    /* Lightweight runtime calibration: if OPEN/CLOSE/WEAR/TAKE appears to succeed
     * in the transcript but the predicted I6 bit did not flip, mark confidence low.
     * Does not edit Actionable.js — wraps Submit after that file has loaded. */
    observeCommand: function (command) {
        var s = String(command || "").trim();
        var m = /^(open|close|wear|put on|take|get)\s+(.+)$/i.exec(s);
        if (!m) return;
        var verb = m[1].toLowerCase();
        var noun = m[2].replace(/^(the|a|an)\s+/i, "").trim();
        var flag = (verb === "open" || verb === "close") ? "open"
            : (verb === "wear" || verb === "put on") ? "worn"
            : "moved";
        var expect = verb !== "close";
        var bit = AttributeSchema.bitFor(flag);
        if (bit === null) return;
        var mem = AttributeSchema._getMem();
        if (!mem || typeof ZRamReader === "undefined") return;
        var id = AttributeSchema._findIdByName(mem, noun);
        if (!id) return;
        var obj = ZRamReader.objectLinks(mem, id);
        var before = ZRamReader.attr(obj, bit);
        setTimeout(function () {
            try {
                var text = AttributeSchema._transcript();
                var low = text.toLowerCase();
                var failed = /\b(can'?t|cannot|already|don't|dont|not open|not close)\b/i.test(text);
                var mentioned = low.indexOf(noun.toLowerCase()) >= 0;
                if (failed || !mentioned) return;
                var mem2 = AttributeSchema._getMem();
                if (!mem2) return;
                var after = ZRamReader.attr(ZRamReader.objectLinks(mem2, id), bit);
                if (after === expect && after !== before) {
                    AttributeSchema._hits[flag] = (AttributeSchema._hits[flag] || 0) + 1;
                    if (AttributeSchema.confidence !== "low") AttributeSchema.confidence = "ok";
                } else if (after !== expect) {
                    AttributeSchema._misses[flag] = (AttributeSchema._misses[flag] || 0) + 1;
                    if (AttributeSchema._misses[flag] >= AttributeSchema.MISS_THRESHOLD) {
                        AttributeSchema.confidence = "low";
                    }
                }
            } catch (e) {}
        }, 450);
    },

    attachToPayload: function (payload) {
        if (payload && typeof payload === "object") payload.schemaConfidence = AttributeSchema.confidence;
        return payload;
    },

    installHooks: function () {
        try {
            if (typeof Actionable !== "undefined" && Actionable.Submit && !Actionable.Submit._attrSchemaWrapped) {
                var origSubmit = Actionable.Submit;
                Actionable.Submit = function (command) {
                    try { AttributeSchema.observeCommand(command); } catch (eS) {}
                    return origSubmit.apply(this, arguments);
                };
                Actionable.Submit._attrSchemaWrapped = true;
            }
        } catch (e0) {}
        try {
            if (typeof WorldModel !== "undefined" && WorldModel.tick && !WorldModel.tick._attrSchemaWrapped) {
                var origTick = WorldModel.tick;
                WorldModel.tick = function () {
                    var p = origTick.apply(this, arguments);
                    try { AttributeSchema.attachToPayload(p); } catch (eT) {}
                    try {
                        if (typeof window !== "undefined" && window.__PARCHLOCK_WORLD__) {
                            window.__PARCHLOCK_WORLD__.schemaConfidence = AttributeSchema.confidence;
                        }
                    } catch (eW) {}
                    return p;
                };
                WorldModel.tick._attrSchemaWrapped = true;
            }
        } catch (e1) {}
        try {
            if (typeof ZRamProvider !== "undefined" && ZRamProvider.collect && !ZRamProvider.collect._attrSchemaWrapped) {
                var origCollect = ZRamProvider.collect;
                ZRamProvider.collect = function () {
                    var r = origCollect.apply(this, arguments) || {};
                    r.schemaConfidence = AttributeSchema.confidence;
                    return r;
                };
                ZRamProvider.collect._attrSchemaWrapped = true;
            }
        } catch (e2) {}
    }
};

AttributeSchema.installHooks();
if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function () { AttributeSchema.installHooks(); });
}
if (typeof setTimeout === "function") {
    setTimeout(function () { AttributeSchema.installHooks(); }, 0);
    setTimeout(function () { AttributeSchema.installHooks(); }, 50);
}
