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
        takeable: null,
        // D239: ZIL CLIMBBIT. No Inform default bit; only an exact-digest attributeMap.climbable resolves it.
        climbable: null
    },

    confidence: "unverified",
    _hits: {},
    _misses: {},
    _wrapped: false,
    MISS_THRESHOLD: 3,

    // Surface-aware container Open/Close (2026-10-11): an evidence-owned per-executable
    // predicate from the digest row (ModuleStatFactsClaude openCapability). null = none
    // recorded: callers keep existing behavior (Inform/Glulx and unrecorded titles untouched).
    // D198 family per story memory, memoized (grok #4088 / claude #4090): GrammarProvider.decodeD198 caches only
    // ZIL results, so on Inform titles every call re-parsed the dictionary and bitFor (per object x flag) hung.
    // The classification depends only on the story bytes, so one decode per memory buffer is exact.
    _familyOf: function (mem) {
        var key = mem && mem.buffer ? mem.buffer : mem;
        if (!key || typeof GrammarProvider === "undefined" || !GrammarProvider.decodeD198) return null;
        var c = AttributeSchema._famCache || (AttributeSchema._famCache = new WeakMap());
        var ident = typeof ZRamReader !== "undefined" && ZRamReader.gameIdentityKey ? ZRamReader.gameIdentityKey(mem) : null;
        var hit = c.get(key);
        if (hit && hit.ident === ident) return hit.fam;
        var fam = null;
        try { fam = GrammarProvider.decodeD198(mem); } catch (e) { fam = null; }
        c.set(key, { ident: ident, fam: fam });
        return fam;
    },
    // D12 R2: title-owned V-CLOSE eligibility; null preserves existing forms.
    closeRuleAllows: function (mem, objectId) {
        try {
            var live = AttributeSchema._getMem();
            if (!mem || !live || mem.buffer !== live.buffer || mem.byteOffset !== live.byteOffset || mem.byteLength !== live.byteLength) return null;
            var fact = ZRamReader.executableLayoutFacts(mem), rule = fact && fact.closeRule;
            if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).length !== 1) return null;
            var h = ZRamReader.header(mem), prop = rule.capacityProp;
            if (!h || h.version < 3 || h.version > 5 || !Number.isInteger(prop) || prop < 1 || prop > (h.version <= 3 ? 31 : 63)) return null;
            var fam = AttributeSchema._familyOf(mem);
            if (!fam || fam.classification !== "confirmed-zil-family" || fam.evidence !== "validated") return null;
            var count = ZRamReader.objectCount(mem, h);
            if (!Number.isInteger(objectId) || objectId < 2 || objectId > count) return null;
            var flags = ["container", "supporter", "door"];
            if (!flags.every(function (k) { return AttributeSchema.measuredFlagOwner(mem, k, objectId); })) return null;
            var raw = ZRamReader.objectLinks(mem, objectId);
            if (!raw || !Number.isInteger(raw.props) || raw.props < 1 || raw.props >= mem.byteLength) return null;
            var defaults = h.objTable + (h.version <= 3 ? 31 : 63) * 2;
            if (!Number.isInteger(h.objTable) || h.objTable < 64 || defaults > mem.byteLength || defaults > h.staticMem) return null;
            var start = raw.props + 1 + ZRamReader.u8(mem, raw.props) * 2;
            if (start >= mem.byteLength) return null;
            var props = ZRamReader.listProps(mem, objectId), previous = h.version <= 3 ? 32 : 64, end = start, matches = [];
            if (!Array.isArray(props) || !props.every(function (p) {
                var headerSize = h.version <= 3 || p.sz <= 2 ? 1 : 2;
                // v4+ long headers may also encode one/two-byte values.
                if (h.version > 3 && end < mem.byteLength && (ZRamReader.u8(mem, end) & 128)) headerSize = 2;
                if (!Number.isInteger(p.num) || p.num < 1 || p.num >= previous || !Number.isInteger(p.sz) || p.sz < 1 || p.sz > 64 || p.dataAddr !== end + headerSize || p.dataAddr + p.sz > mem.byteLength) return false;
                previous = p.num; end = p.dataAddr + p.sz;
                if (p.num === prop) matches.push(p);
                return true;
            }) || end >= mem.byteLength || ZRamReader.u8(mem, end) !== 0 || matches.length > 1) return null;
            var value;
            if (matches.length) {
                if (matches[0].sz !== 1 && matches[0].sz !== 2) return null;
                value = matches[0].sz === 1 ? ZRamReader.u8(mem, matches[0].dataAddr) : ZRamReader.u16(mem, matches[0].dataAddr);
            } else value = ZRamReader.u16(mem, h.objTable + (prop - 1) * 2);
            var has = function (k) { return ZRamReader.attr(raw, fact.attributeMap[k]); };
            return !!((has("container") && !has("supporter") && value !== 0) || has("door"));
        } catch (eCloseRule) { return null; }
    },
    // D5 R2: current observed status on an audited owner domain; never capability.
    lockedObjectStatus: function (objectId) {
        try {
            var mem = AttributeSchema._getMem(), fact = mem && ZRamReader.executableLayoutFacts(mem);
            var h = mem && ZRamReader.header(mem), ids = fact && fact.lockedStatusObjects;
            var observation = fact && Object.prototype.hasOwnProperty.call(fact, "lockedObservation");
            var bit = fact && fact.attributeMap && fact.attributeMap.locked;
            if (observation) {
                // Display-only ownership must never create the generic locked fact
                // consumed by exit/navigation readers (Moonmist auto-unlocks).
                var rule = fact.lockedObservation;
                var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                    ? ModuleLibrary.currentExecutableDigest() : null;
                if (!rule || typeof rule !== "object" || Array.isArray(rule) ||
                    !digest || typeof ModuleStatFactsClaude === "undefined" || ModuleStatFactsClaude[digest] !== fact ||
                    Object.keys(rule).sort().join(",") !== "attribute,objects" ||
                    Object.prototype.hasOwnProperty.call(fact, "lockedStatusObjects") ||
                    (fact.attributeMap && Object.prototype.hasOwnProperty.call(fact.attributeMap, "locked")) ||
                    !h || !Number.isInteger(rule.attribute) || rule.attribute < 0 ||
                    rule.attribute >= (h.version <= 3 ? 32 : 48) ||
                    (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem))) return null;
                ids = rule.objects;
                bit = rule.attribute;
            }
            if (!Array.isArray(ids) || !ids.length || !h || h.version < 3 || h.version > 5) return null;
            var first = ZRamReader.objectBase(h, 1), size = mem.byteLength;
            if (!Number.isInteger(first) || first < 64 || first + h.entrySize > size) return null;
            var frontier = ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12));
            var count = (frontier - first) / h.entrySize, seen = {};
            if (!Number.isInteger(count) || count < 2 || frontier >= h.staticMem || h.staticMem > size ||
                !ids.every(function (id) { if (!Number.isInteger(id) || id < 2 || id > count || seen[id]) return false; seen[id] = true; return true; }) || ids.indexOf(objectId) < 0) return null;
            var family = AttributeSchema._familyOf(mem);
            if (!family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated" ||
                (!observation && !AttributeSchema.measuredFlagOwner(mem, "locked", objectId))) return null;
            var raw = ZRamReader.objectLinks(mem, objectId);
            return raw && Number.isInteger(bit) && ZRamReader.attr(raw, bit) ? "Locked" : null;
        } catch (eLockedStatus) { return null; }
    },
    openCapability: function () {
        try {
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest ? ModuleLibrary.currentExecutableDigest() : null;
            var fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
            var cap = fact && fact.openCapability;
            return cap && Array.isArray(cap.all) && Array.isArray(cap.none) ? cap : null;
        } catch (e) { return null; }
    },
    // True when container-derived Open/Close may be offered. none:[X] with no measured bit for X is UNKNOWN and
    // fails closed (no Open) — Zork III container:10 with unmapped supporter must not open pedestals/cages (#3642).
    openCapabilityAllows: function (attrs, mem) {
        var cap = AttributeSchema.openCapability();
        if (!cap) return true;
        var a = attrs || {};
        if (!cap.all.every(function (k) { return !!a[k]; })) return false;
        for (var i = 0; i < cap.none.length; i++) {
            var flag = cap.none[i];
            var bit = null;
            try { bit = AttributeSchema.bitFor(flag, mem); } catch (eB) { bit = null; }
            // Unmapped none-flag or attrs omitting the key = UNKNOWN → fail closed (Codex #3668/#3682).
            // Real decoder yields boolean; require a[flag] === false for explicit negative.
            if (bit == null) return false;
            if (!Object.prototype.hasOwnProperty.call(a, flag)) return false;
            if (a[flag] !== false) return false;
        }
        return true;
    },
    // Reuse digest/stable-header ownership; decode the family only for a mapped flag.
    measuredFlagOwner: function (mem, flag, objectId) {
        try {
            if (!mem || typeof ZRamReader === 'undefined' || !ZRamReader.executableLayoutFacts) return false;
            var fact = ZRamReader.executableLayoutFacts(mem), map = fact && fact.attributeMap;
            if (!map || !Object.prototype.hasOwnProperty.call(map, flag)) {
                var ids = AttributeSchema.objectCapabilityIds(mem, flag);
                return !!(ids && Number.isInteger(objectId) && ids.indexOf(objectId) >= 0);
            }
            var bit = map[flag], h = ZRamReader.header(mem);
            if (!Number.isInteger(bit) || !h || h.version < 3 || h.version > 5
                || bit < 0 || bit >= (h.version <= 3 ? 32 : 48)) return false;
            if (typeof GrammarProvider === 'undefined' || !GrammarProvider.decodeD198) return false;
            var family = GrammarProvider.decodeD198(mem);
            return !!(family && family.classification === 'confirmed-zil-family'
                && family.evidence === 'validated' && AttributeSchema.bitFor(flag, mem) === bit);
        } catch (e) { return false; }
    },
    // Some source handlers define a capability by object identity, not a bit.
    // Only qualified capabilities are supported. Never use names/shared raw flags.
    // opts.allowMapped (D238, edibleForms only): authored owners may coexist with a
    // mapped bit for the same flag; every other caller keeps the strict form.
    objectCapabilityIds: function (mem, flag, opts) {
        var allowMapped = !!(opts && opts.allowMapped);
        try {
            if (["edible", "switchable"].indexOf(flag) < 0 || !mem || typeof ZRamReader === "undefined" ||
                !ZRamReader.executableLayoutFacts) return null;
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                ? ModuleLibrary.currentExecutableDigest() : null;
            var fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
            if (!fact || !fact.attributeObjects || !Object.prototype.hasOwnProperty.call(fact.attributeObjects, flag) ||
                ZRamReader.executableLayoutFacts(mem) !== fact ||
                (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) ||
                (!allowMapped && fact.attributeMap && Object.prototype.hasOwnProperty.call(fact.attributeMap, flag))) return null;
            var ids = fact.attributeObjects && fact.attributeObjects[flag], h = ZRamReader.header(mem);
            if (!Array.isArray(ids) || !ids.length || !h || h.version < 3 || h.version > 5) return null;
            var family = AttributeSchema._familyOf(mem);
            if (!family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return null;
            var count = ZRamReader.objectCount(mem, h), seen = {};
            if (!ids.every(function (id) {
                if (!Number.isInteger(id) || id < 2 || id > count || seen[id]) return false;
                seen[id] = true;
                return true;
            })) return null;
            return ids;
        } catch (eObjectCapability) { return null; }
    },
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
            // An explicit null in a measured map means this executable has no such bit: its library numbers another
            // attribute there (phlegm/heist: bit 3 is container, not the I6 default concealed).
            if (map && Object.prototype.hasOwnProperty.call(map, flagName) && map[flagName] === null) return null;
            // Identity-owned capability has no numeric attribute. A malformed
            // declaration must not silently borrow an Inform fallback bit.
            if (["edible", "switchable"].indexOf(flagName) >= 0 && fact && fact.attributeObjects &&
                Object.prototype.hasOwnProperty.call(fact.attributeObjects, flagName)) return null;
            // ZIL fail-closed (operator 2026-10-11): never apply I6 PROFILE bit
            // numbers to non-Inform stories for containment/open family. Wrong
            // PROFILE made Zork mailbox look non-container and leaked false
            // open/close on body parts (LGOP). D73 calibrator may still own a
            // confirmed bit; worn already fail-closed above.
            // ZIL structural flags without attributeMap: null (fail closed).
            // AttrCalibrator object overrides still apply later in applyTo.
            // animate included: I6 PROFILE bit 0 is not Infocom ACTORBIT (grok1 #3590).
            var zilStructural = {
                animate: 1, absent: 1, container: 1, openable: 1, open: 1, isOpen: 1, supporter: 1,
                lockable: 1, locked: 1, door: 1, transparent: 1, enterable: 1, climbable: 1,
                // D11 P11a (claude+codex #5543): PROFILE bit 2 read rooms as garments
                // (Planetfall FLOYDBIT, Suspended ONBIT). A measured attributeMap still wins.
                clothing: 1, wearable: 1
            };
            // Operator #3782/#3790: ZIL PROFILE skip only for confirmed-zil-family (D198),
            // not every !isInformCompiled title. Unknown family still fail-closed (null).
            if (zilStructural[flagName] && mem) {
                var famZ = null;
                try {
                    if (typeof GrammarProvider !== "undefined" && GrammarProvider.decodeD198)
                        famZ = AttributeSchema._familyOf(mem);
                } catch (eF) { famZ = null; }
                if (famZ && famZ.classification === "confirmed-inform") {
                    // Inform without name table: fall through to PROFILE below.
                } else if (famZ && famZ.classification === "confirmed-zil-family") {
                    return null;
                } else if (!famZ || famZ.classification !== "confirmed-inform") {
                    // Unknown / non-Inform non-ZIL: no I6 PROFILE.
                    if (!(typeof ZRamReader !== "undefined" && ZRamReader.isInformCompiled
                        && ZRamReader.isInformCompiled(mem))) return null;
                }
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
            return !!(fact && Number.isInteger(fact.wornAttribute)) || !!AttributeSchema.directPlayerWornFact(mem);
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
                var mem = mem || AttributeSchema._getMem();
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
        AttributeSchema.applyObjectCapabilities(attrs, obj, mem);
        AttributeSchema.applyEquipmentState(attrs, obj, mem);
        AttributeSchema.applyContainerState(attrs, obj, mem);
        AttributeSchema.applyIlluminationState(attrs, obj, mem);
        return attrs;
    },

    applyObjectCapabilities: function (attrs, obj, mem) {
        ["edible", "switchable"].forEach(function (flag) {
            var owns = false;
            try {
                var fact = flag === "switchable" && ZRamReader.executableLayoutFacts && ZRamReader.executableLayoutFacts(mem);
                if (!fact) {
                    var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                        ? ModuleLibrary.currentExecutableDigest() : null;
                    fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
                }
                if (!fact || !fact.attributeObjects || !Object.prototype.hasOwnProperty.call(fact.attributeObjects, flag) ||
                    (fact.attributeMap && Object.prototype.hasOwnProperty.call(fact.attributeMap, flag))) return;
                owns = true;
                if (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) return;
                attrs[flag] = false;
                var ids = AttributeSchema.objectCapabilityIds(mem, flag);
                attrs[flag] = !!(obj && ids && Number.isInteger(obj.id) && ids.indexOf(obj.id) >= 0);
            } catch (eObjectCapability) { if (owns) attrs[flag] = false; }
            });
    },

    // null means no authored spelling policy; [] means a claimed owner was rejected.
    activationForms: function (mem, objectId, context) {
        var owned = false;
        try {
            var fact = ZRamReader.executableLayoutFacts(mem);
            if (!fact) {
                var digest = ModuleLibrary.currentExecutableDigest();
                fact = digest && ModuleStatFactsClaude[digest];
            }
            if (!fact || !((fact.attributeObjects && Object.prototype.hasOwnProperty.call(fact.attributeObjects, "switchable")) ||
                (fact.capabilityForms && Object.prototype.hasOwnProperty.call(fact.capabilityForms, "switchable")))) return null;
            owned = true;
            if ((ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) ||
                (fact.attributeMap && Object.prototype.hasOwnProperty.call(fact.attributeMap, "switchable"))) return null;
            var ids = AttributeSchema.objectCapabilityIds(mem, "switchable");
            var forms = fact.capabilityForms && fact.capabilityForms.switchable;
            var inScope = context === "inventory" || (context === "room" && ids &&
                AttributeSchema.switchableRoomScoped(mem, fact, ids, objectId) && AttributeSchema.inPlayerRoom(mem, objectId));
            if (!inScope || !ids || !Number.isInteger(objectId) || ids.indexOf(objectId) < 0 ||
                !Array.isArray(forms) || forms.length !== 2 || forms[0] !== "turn on" || forms[1] !== "turn off") return [];
            var family = AttributeSchema._familyOf(mem);
            if (!family || !Array.isArray(family.templates) || !forms.every(function (form) {
                var prep = form.split(" ")[1];
                return family.templates.some(function (t) { return t.verb === "turn" && t.objectCount === 1 &&
                    t.prepositions.length === 1 && t.prepositions[0] === prep; });
            })) return [];
            return forms.slice();
        } catch (eActivationForms) { return owned ? [] : null; }
    },

    // P4 (claude+codex #5543): an authored switchable owner may list ids proven to toggle natively
    // in room context: switchableScope {"<id>": "room"}. Only for the exact executable fact of a
    // validated confirmed-zil-family title; every key an integer id in the same entry's switchable
    // list, every value exactly "room". Anything malformed makes the whole scope absent.
    switchableRoomScoped: function (mem, fact, ids, objectId) {
        try {
            var digest = ModuleLibrary.currentExecutableDigest();
            if (!fact || !digest || ModuleStatFactsClaude[digest] !== fact || ZRamReader.executableLayoutFacts(mem) !== fact) return false;
            var family = AttributeSchema._familyOf(mem);
            if (!family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return false;
            var scope = fact.switchableScope;
            if (!scope || typeof scope !== "object" || Object.getPrototypeOf(scope) !== Object.prototype) return false;
            var members = fact.attributeObjects && fact.attributeObjects.switchable, keys = Object.keys(scope);
            if (!Array.isArray(members) || !keys.length || !keys.every(function (k) {
                var id = Number(k);
                return /^[1-9][0-9]*$/.test(k) && Number.isInteger(id) && members.indexOf(id) >= 0 && ids.indexOf(id) >= 0 &&
                    scope[k] === "room";
            })) return false;
            return Number.isInteger(objectId) && Object.prototype.hasOwnProperty.call(scope, String(objectId));
        } catch (eScope) { return false; }
    },
    // lightForms (four-seat ACCEPT, grok2 draft sha 76e755d4; codex 0231 + grok review): per-title light
    // owners with per-owner on/off verbs. The objects list is AUTHORITATIVE; capabilityBit is informational
    // only and never gates (Infidel BURNBIT 11 also marks flammable non-lights). The live stateBit picks
    // on (clear) or off (set). Only the exact executable fact of a validated confirmed-zil-family title;
    // any malformed descriptor makes the whole fact absent (null), leaving every other path unchanged.
    lightForms: function (mem, objectId, context) {
        try {
            if (!mem || !Number.isInteger(objectId) || objectId < 1 || typeof ModuleLibrary === "undefined" ||
                typeof ModuleStatFactsClaude === "undefined" || typeof ZRamReader === "undefined") return null;
            var digest = ModuleLibrary.currentExecutableDigest(), fact = digest && ModuleStatFactsClaude[digest];
            if (!fact || ZRamReader.executableLayoutFacts(mem) !== fact ||
                (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem))) return null;
            var lf = fact.lightForms, own = Object.prototype.hasOwnProperty;
            var plain = function (o) { return !!o && typeof o === "object" && Object.getPrototypeOf(o) === Object.prototype; };
            if (!plain(lf) || !Object.keys(lf).every(function (k) { return ["capabilityBit", "stateBit", "objects", "on", "off"].indexOf(k) >= 0; }) ||
                !own.call(lf, "stateBit") || !own.call(lf, "objects") || !own.call(lf, "on") || !own.call(lf, "off")) return null;
            var family = AttributeSchema._familyOf(mem), h = ZRamReader.header(mem);
            if (!h || h.version < 3 || h.version > 5 || !family || family.classification !== "confirmed-zil-family" ||
                family.evidence !== "validated") return null;
            // True object frontier from the first object's property-table pointer (codex 0907: objectCount is a
            // heuristic scan that runs past the table, e.g. Infidel 438 vs 249).
            var bits = h.version <= 3 ? 32 : 48, size0 = mem.byteLength || mem.length;
            var first = ZRamReader.objectBase(h, 1), firstProps = ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12));
            var count = (firstProps - first) / h.entrySize;
            if (!Number.isInteger(count) || count < 2 || firstProps >= h.staticMem || firstProps >= size0) return null;
            var bitOk = function (b) { return Number.isInteger(b) && b >= 0 && b < bits; };
            if (!bitOk(lf.stateBit) || (own.call(lf, "capabilityBit") && lf.capabilityBit !== null && !bitOk(lf.capabilityBit))) return null;
            var objs = lf.objects;
            if (!Array.isArray(objs) || !objs.length || !Number.isInteger(count) || !objs.every(function (id, i) {
                return Number.isInteger(id) && id >= 1 && id <= count && objs.indexOf(id) === i;
            })) return null;
            var formOk = function (side) {
                if (side === null) return true;
                if (!plain(side) || !Object.keys(side).length) return false;
                return Object.keys(side).every(function (k) {
                    return (k === "default" || (/^[1-9][0-9]*$/.test(k) && objs.indexOf(Number(k)) >= 0)) &&
                        typeof side[k] === "string" && /^[a-z]+( [a-z]+)?$/.test(side[k]);
                });
            };
            if (!formOk(lf.on) || !formOk(lf.off) || (lf.on === null && lf.off === null)) return null;
            if (objs.indexOf(objectId) < 0) return null;
            // Actual custody, never the caller's context alone (codex 0907): inventory means the player holds it
            // directly right now; room means its live parent chain reaches the player's room.
            if (context === "inventory") {
                var holder = ZRamReader.resolvePlayer(mem), link = ZRamReader.objectLinks(mem, objectId);
                if (!holder || holder.ambiguous || !Number.isInteger(holder.id) || holder.id < 1 || holder.id > count ||
                    holder.id === objectId || !link || link.parent !== holder.id) return [];
            } else if (!(context === "room" && AttributeSchema.inPlayerRoom(mem, objectId))) return [];
            var base = ZRamReader.objectBase(h, objectId), size = mem.byteLength || mem.length;
            if (!Number.isInteger(base) || base < 0 || base + 6 > size) return [];
            var lit = !!(mem.getUint8(base + (lf.stateBit >> 3)) & (0x80 >> (lf.stateBit & 7)));
            var side = lit ? lf.off : lf.on, form = side && (own.call(side, String(objectId)) ? side[String(objectId)] : side["default"]);
            return typeof form === "string" ? [form] : [];
        } catch (eLight) { return null; }
    },
    // Live RAM: the object's parent chain reaches the player's actual current room, passing only
    // supporters and open or transparent containers. Another actor's possessions never qualify.
    inPlayerRoom: function (mem, objectId) {
        try {
            var player = ZRamReader.resolvePlayer(mem);
            if (!player || player.ambiguous || !Number.isInteger(player.id) || player.id < 1) return false;
            var room = ZRamReader.enclosingRoom(mem, player.id), count = ZRamReader.objectCount(mem);
            if (!Number.isInteger(room) || room < 1 || objectId === room || objectId === player.id) return false;
            var raw = ZRamReader.objectLinks(mem, objectId), seen = {};
            for (var depth = 0; raw && depth < count; depth++) {
                var parent = raw.parent;
                if (parent === room || parent === player.id) return true;
                if (!Number.isInteger(parent) || parent < 1 || parent > count || seen[parent]) return false;
                seen[parent] = true;
                raw = ZRamReader.objectLinks(mem, parent);
                if (!raw) return false;
                var a = AttributeSchema.applyTo({}, raw, mem);
                if (a.animate) return false;
                if (!(a.supporter || a.transparent || (a.container && (a.isOpen || a.open)))) return false;
            }
            return false;
        } catch (eRoom) { return false; }
    },

    // Explicit local light-emission state, separate from capability and room light.
    illuminationState: function (mem, objectId) {
        try {
            if (!mem || !Number.isInteger(objectId) || typeof ZRamReader === 'undefined' ||
                typeof ModuleLibrary === 'undefined' || typeof ModuleStatFactsClaude === 'undefined') return null;
            var digest = ModuleLibrary.currentExecutableDigest(), fact = digest && ModuleStatFactsClaude[digest];
            if (!fact || ZRamReader.executableLayoutFacts(mem) !== fact ||
                (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem))) return null;
            var rule = fact.illuminationState;
            if (!rule || typeof rule !== 'object' || Array.isArray(rule) || Object.keys(rule).length !== 2 ||
                !Object.prototype.hasOwnProperty.call(rule, 'flag') || !Object.prototype.hasOwnProperty.call(rule, 'scope') ||
                rule.flag !== 'on' || rule.scope !== 'inventory') return null;
            var family = AttributeSchema._familyOf(mem), h = ZRamReader.header(mem);
            if (!h || h.version < 3 || h.version > 5 || !family || family.classification !== 'confirmed-zil-family' ||
                family.evidence !== 'validated' || !AttributeSchema.measuredFlagOwner(mem, 'on', objectId)) return null;
            var first = ZRamReader.objectBase(h, 1), size = mem.byteLength || mem.length;
            if (!Number.isInteger(first) || first < 0 || first > size - h.entrySize) return null;
            var frontier = ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12));
            var count = (frontier - first) / h.entrySize, bit = fact.attributeMap && fact.attributeMap.on;
            if (!Number.isInteger(count) || count < 2 || frontier >= h.staticMem || h.staticMem > size ||
                objectId < 2 || objectId > count || !Number.isInteger(bit) || bit < 0 || bit >= (h.version <= 3 ? 32 : 48)) return null;
            var player = ZRamReader.resolvePlayer(mem);
            if (!player || player.ambiguous || ['measured-player-object', 'measured-player-global'].indexOf(player.source) < 0 ||
                !Number.isInteger(player.id) || player.id < 2 || player.id > count || objectId === player.id) return null;
            var current = objectId, seen = {};
            for (var depth = 0; depth < count; depth++) {
                if (current === player.id) return !!ZRamReader.attr(ZRamReader.objectLinks(mem, objectId), bit);
                if (!Number.isInteger(current) || current < 2 || current > count || seen[current]) return null;
                seen[current] = true;
                var raw = ZRamReader.objectLinks(mem, current);
                if (!raw) return null;
                current = raw.parent;
            }
            return null;
        } catch (eIlluminationState) { return null; }
    },
    applyIlluminationState: function (attrs, obj, mem) {
        delete attrs.providingLight;
        var state = AttributeSchema.illuminationState(mem, obj && obj.id);
        if (state !== null) attrs.providingLight = state;
    },

    // State restricts existing commands only when both meanings have a
    // positive owner. A legacy profile guess is never an open-state proof.
    // Exact-executable authored container state; raw flags only, never calibration.
    // Tagged invalid ownership prevents stale commands/badges from borrowing OPEN.
    containerStateAuthority: function (mem, objectId) {
        var claimed = false;
        function result(status) { return { status: status }; }
        try {
            if (!mem || !Number.isInteger(objectId) || typeof ZRamReader === "undefined" ||
                typeof ModuleLibrary === "undefined" || typeof ModuleStatFactsClaude === "undefined") return result("unowned");
            var fact = ZRamReader.executableLayoutFacts(mem);
            var digest = ModuleLibrary.currentExecutableDigest();
            if (!fact || !digest || ModuleStatFactsClaude[digest] !== fact ||
                (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem))) return result("unowned");
            var rules = fact.containerStateRules;
            if (!Array.isArray(rules)) return result("unowned");
            claimed = rules.some(function (rule) {
                return rule && typeof rule === "object" && Number.isInteger(rule.objectId) &&
                    rule.objectId > 0 && rule.objectId === objectId;
            });
            if (!claimed) return result("unowned");
            var h = ZRamReader.header(mem), family = AttributeSchema._familyOf(mem);
            if (!h || h.version < 3 || h.version > 5 || !family ||
                family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return result("claimed-invalid");
            var size = mem.byteLength || mem.length, first = ZRamReader.objectBase(h, 1);
            if (!Number.isInteger(first) || first < 0 || first > size - h.entrySize) return result("claimed-invalid");
            var frontier = ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12));
            var count = (frontier - first) / h.entrySize, seen = {}, selected = null;
            if (!Number.isInteger(count) || count < 2 || frontier >= h.staticMem || h.staticMem > size) return result("claimed-invalid");
            var valid = rules.length > 0 && rules.every(function (rule) {
                if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).length !== 2 ||
                    !Object.prototype.hasOwnProperty.call(rule, "objectId") || !Object.prototype.hasOwnProperty.call(rule, "closedFlag") ||
                    !Number.isInteger(rule.objectId) || rule.objectId < 2 || rule.objectId > count || seen[rule.objectId] ||
                    rule.closedFlag !== "supporter") return false;
                seen[rule.objectId] = true;
                if (!AttributeSchema.measuredFlagOwner(mem, "container", rule.objectId) ||
                    !AttributeSchema.measuredFlagOwner(mem, rule.closedFlag, rule.objectId)) return false;
                var cb = fact.attributeMap && fact.attributeMap.container, sb = fact.attributeMap && fact.attributeMap.supporter;
                var limit = h.version <= 3 ? 32 : 48;
                if (!Number.isInteger(cb) || !Number.isInteger(sb) || cb < 0 || sb < 0 || cb >= limit || sb >= limit || cb === sb) return false;
                var raw = ZRamReader.objectLinks(mem, rule.objectId);
                if (!raw || [raw.parent, raw.sibling, raw.child].some(function (id) {
                    return !Number.isInteger(id) || id < 0 || id > count;
                }) || !ZRamReader.attr(raw, cb)) return false;
                if (rule.objectId === objectId) selected = !ZRamReader.attr(raw, sb);
                return true;
            });
            return valid && selected !== null ? { status: "valid", logicalOpen: selected, openable: true }
                : result("claimed-invalid");
        } catch (eContainerAuthority) { return result(claimed ? "claimed-invalid" : "unowned"); }
    },
    applyContainerState: function (attrs, obj, mem) {
        delete attrs.containerContentsOnSurface;
        var state = AttributeSchema.containerStateAuthority(mem, obj && obj.id);
        if (state.status === "valid") {
            attrs.open = attrs.isOpen = state.logicalOpen;
            attrs.openable = true;
            if (state.logicalOpen === false) attrs.containerContentsOnSurface = true;
        } else if (state.status === "claimed-invalid") {
            delete attrs.open; delete attrs.isOpen; delete attrs.openable;
        }
    },

    containerOpenState: function (mem, objectId) {
        try {
            var authority = AttributeSchema.containerStateAuthority(mem, objectId);
            if (authority.status === "valid") return authority.logicalOpen;
            if (authority.status === "claimed-invalid") return null;
            if (!mem || !Number.isInteger(objectId)) return null;
            var h = ZRamReader.header(mem), count = ZRamReader.objectCount(mem, h);
            if (!h || objectId < 2 || objectId > count) return null;
            var declared = ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem);
            var owns = function (flag) {
                return !!(declared && declared.bits && Number.isInteger(declared.bits[flag])) ||
                    AttributeSchema.measuredFlagOwner(mem, flag, objectId);
            };
            if (!owns("container") || !owns("open")) return null;
            var container = AttributeSchema.bitFor("container", mem), open = AttributeSchema.bitFor("open", mem);
            var limit = h.version <= 3 ? 32 : 48;
            if (!Number.isInteger(container) || !Number.isInteger(open) || container < 0 || open < 0 ||
                container >= limit || open >= limit) return null;
            var raw = ZRamReader.objectLinks(mem, objectId);
            return raw && ZRamReader.attr(raw, container) ? !!ZRamReader.attr(raw, open) : null;
        } catch (eContainerState) { return null; }
    },

    // Exact authored TOOL domain for the generic Unlock-with launcher only.
    // null preserves unknown/malformed/noncarried cases; false is a measured exclusion.
    unlockToolAllowed: function (mem, objectId, context) {
        try {
            if (context !== "inventory" || !mem || typeof ZRamReader === "undefined") return null;
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                ? ModuleLibrary.currentExecutableDigest() : null;
            var fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
            if (!fact || ZRamReader.executableLayoutFacts(mem) !== fact || !fact.capabilityForms ||
                !Object.prototype.hasOwnProperty.call(fact.capabilityForms, "unlockTools")) return null;
            var rule = fact.capabilityForms.unlockTools;
            if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).length !== 2 ||
                rule.scope !== "held" || !Array.isArray(rule.objectIds) || !rule.objectIds.length) return null;
            var family = AttributeSchema._familyOf(mem), h = ZRamReader.header(mem);
            if (!h || !family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return null;
            // For this confirmed Infocom layout, property tables bound the contiguous object table.
            // Do not admit property bytes via the reader's looser generic count heuristic.
            var first = h.objTable + h.defaultsWords * 2;
            var pointer = ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12));
            var count = (pointer - first) / h.entrySize, seen = {};
            if (!Number.isInteger(count) || count < 2 || pointer > h.staticMem) return null;
            if (!rule.objectIds.every(function (id) {
                if (!Number.isInteger(id) || id < 2 || id > count || seen[id]) return false;
                seen[id] = true;
                return true;
            })) return null;
            var id = Number(objectId), player = ZRamReader.resolvePlayer(mem);
            if (!Number.isInteger(id) || id < 2 || id > count || !player ||
                ["measured-player-object", "measured-player-global"].indexOf(player.source) < 0 ||
                !Number.isInteger(player.id) || player.id < 2 || player.id > count || id === player.id) return null;
            var current = id, parents = {};
            for (var depth = 0; depth < count; depth++) {
                if (current === player.id) return rule.objectIds.indexOf(id) >= 0;
                if (!Number.isInteger(current) || current < 2 || current > count || parents[current]) return null;
                parents[current] = true;
                var raw = ZRamReader.objectLinks(mem, current);
                if (!raw) return null;
                current = raw.parent;
            }
            return null;
        } catch (eUnlockTool) { return null; }
    },

    // Authored semantic forms do not replace structural containment/state.
    containerForms: function (mem, objectId, context) {
        var owned = false;
        try {
            var fact = ZRamReader.executableLayoutFacts(mem);
            if (!fact || !fact.capabilityForms || !Object.prototype.hasOwnProperty.call(fact.capabilityForms, "container")) return null;
            var rules = fact.capabilityForms.container;
            if (!Array.isArray(rules)) return null;
            var selected = rules.find(function (rule) { return rule && rule.objectId === objectId; });
            if (!selected) return null;
            owned = true;
            var h = ZRamReader.header(mem), count = ZRamReader.objectCount(mem, h);
            var family = AttributeSchema._familyOf(mem), seen = {};
            if (!h || !family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated" ||
                !AttributeSchema.measuredFlagOwner(mem, "container", objectId) || !rules.every(function (rule) {
                    if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).length !== 3 ||
                        !Object.prototype.hasOwnProperty.call(rule, "objectId") || !Object.prototype.hasOwnProperty.call(rule, "scope") ||
                        !Object.prototype.hasOwnProperty.call(rule, "forms") || !Number.isInteger(rule.objectId) ||
                        rule.objectId < 2 || rule.objectId > count || seen[rule.objectId] || rule.scope !== "held" || !Array.isArray(rule.forms)) return false;
                    seen[rule.objectId] = true;
                    return rule.forms.every(function (form, index) {
                        return ["search", "empty", "open", "close"].indexOf(form) >= 0 && rule.forms.indexOf(form) === index &&
                            family.templates.some(function (t) { return t.verb === form && t.objectCount === 1 &&
                                (!t.prepositions || t.prepositions.length === 0); });
                    });
                })) return [];
            var raw = ZRamReader.objectLinks(mem, objectId), bit = AttributeSchema.bitFor("container", mem);
            if (!raw || !Number.isInteger(bit) || !ZRamReader.attr(raw, bit)) return [];
            var player = ZRamReader.resolvePlayer(mem).id;
            if (context !== "inventory" || !Number.isInteger(player) || player < 2 || raw.parent !== player) return null;
            return selected.forms.slice();
        } catch (eContainerForms) { return owned ? [] : null; }
    },

    // Authored owner-local food actions. Capability and current availability
    // are distinct: an empty bottle or a consumed wrapper keeps its identity.
    // null = no authored owner policy; [] = owned but unavailable/invalid.
    edibleForms: function (mem, objectId, context) {
        var owned = false;
        try {
            var fact = ZRamReader.executableLayoutFacts(mem);
            if (!fact) {
                var digest = ModuleLibrary.currentExecutableDigest();
                fact = digest && ModuleStatFactsClaude[digest];
            }
            if (!fact || !(fact.capabilityForms && Object.prototype.hasOwnProperty.call(fact.capabilityForms, "edible"))) return null;
            if (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) return null;
            // D238: a title mapping the FOODBIT may still author owner rules (drinkables are not FOODBIT
            // carriers). Membership is decided first, so an unlisted FOODBIT object keeps the bit path (null).
            var mapped = !!(fact.attributeMap && Object.prototype.hasOwnProperty.call(fact.attributeMap, "edible"));
            var claimed = fact.attributeObjects && fact.attributeObjects.edible;
            if (mapped && !(Array.isArray(claimed) && claimed.indexOf(objectId) >= 0)) return null;
            if (!Array.isArray(claimed)) return [];
            if (claimed.indexOf(objectId) < 0) return null;
            owned = true;
            var ids = AttributeSchema.objectCapabilityIds(mem, "edible", { allowMapped: mapped });
            var rules = fact.capabilityForms.edible, header = ZRamReader.header(mem);
            if ((context !== "inventory" && context !== "room") || !ids || !header || !Number.isInteger(objectId) ||
                !Array.isArray(rules) || rules.length !== ids.length) return [];
            var count = ZRamReader.objectCount(mem, header), limit = header.version <= 3 ? 32 : 48;
            var family = AttributeSchema._familyOf(mem), seen = {}, selected = null;
            function keys(value, required, optional) {
                return value && typeof value === "object" && !Array.isArray(value) &&
                    required.every(function (k) { return Object.prototype.hasOwnProperty.call(value, k); }) &&
                    Object.keys(value).every(function (k) { return required.indexOf(k) >= 0 || optional.indexOf(k) >= 0; });
            }
            function bit(value) { return Number.isInteger(value) && value >= 0 && value < limit; }
            function scope(value) {
                return value === "held" || (keys(value, ["containerObject", "openAttribute"], ["held"]) &&
                    Number.isInteger(value.containerObject) && value.containerObject >= 2 && value.containerObject <= count &&
                    bit(value.openAttribute) && (value.held === undefined || value.held === true));
            }
            if (!family || !Array.isArray(family.templates) || !rules.every(function (rule) {
                if (!keys(rule, ["objectId", "scope", "actions"], []) || ids.indexOf(rule.objectId) < 0 ||
                    seen[rule.objectId] || !scope(rule.scope) || !Array.isArray(rule.actions) || !rule.actions.length) return false;
                seen[rule.objectId] = true;
                var verbs = {};
                var valid = rule.actions.every(function (action) {
                    if (!keys(action, ["verb"], ["clearAttribute", "property"]) ||
                        ["eat", "drink"].indexOf(action.verb) < 0 || verbs[action.verb]) return false;
                    verbs[action.verb] = true;
                    if (Object.prototype.hasOwnProperty.call(action, "clearAttribute") && !bit(action.clearAttribute)) return false;
                    if (Object.prototype.hasOwnProperty.call(action, "property")) {
                        var p = action.property;
                        if (!keys(p, ["id", "size", "min", "max"], []) || !Number.isInteger(p.id) || p.id < 1 ||
                            p.id > (header.version <= 3 ? 31 : 63) || p.size !== 2 || !Number.isInteger(p.min) ||
                            !Number.isInteger(p.max) || p.min < 0 || p.max > 65535 || p.min > p.max) return false;
                    }
                    return family.templates.some(function (t) { return t.verb === action.verb && t.objectCount === 1 &&
                        (!t.prepositions || t.prepositions.length === 0); });
                });
                if (rule.objectId === objectId) selected = rule;
                return valid;
            })) return [];
            if (!selected) return [];
            var player = ZRamReader.resolvePlayer(mem).id, object = ZRamReader.objectLinks(mem, objectId);
            if (!Number.isInteger(player) || player < 2 || player > count || !object) return [];
            if (selected.scope === "held") {
                if (context !== "inventory" || object.parent !== player) return [];
            } else {
                // D235: the open container may be held (inventory) or merely in view (room): EAT succeeds natively from an
                // open carton on the counter or inside the closed glass oven. Live parent and open bit stay authoritative;
                // the payload only says the food is currently in view, it never grants Eat by itself.
                var parentId = selected.scope.containerObject, parent = ZRamReader.objectLinks(mem, parentId);
                var payload = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
                var listed = payload && (context === "inventory" ? payload.inventory : payload.discoveredObjects);
                // D238: scope.held (e.g. Zork I V-DRINK needs the bottle in hand) rejects room context.
                if (selected.scope.held === true && context !== "inventory") return [];
                if (object.parent !== parentId || !parent || (context === "inventory" && parent.parent !== player) ||
                    !ZRamReader.attr(parent, selected.scope.openAttribute) || !payload ||
                    !(listed || []).some(function (o) { return o && o.id === objectId; })) return [];
            }
            return selected.actions.filter(function (action) {
                if (Object.prototype.hasOwnProperty.call(action, "clearAttribute") &&
                    ZRamReader.attr(object, action.clearAttribute)) return false;
                if (action.property) {
                    var p = action.property, props = ZRamReader.listProps(mem, objectId).filter(function (q) { return q.num === p.id; });
                    if (props.length !== 1 || props[0].sz !== p.size) return false;
                    var value = ZRamReader.u16(mem, props[0].dataAddr);
                    if (value < p.min || value > p.max) return false;
                }
                return true;
            }).map(function (action) { return action.verb; });
        } catch (eEdibleForms) { return owned ? [] : null; }
    },

    // Additional restriction on activation badges, never a source of on-state authority.
    activationStateAllows: function (mem, objectId) {
        var owned = false;
        try {
            var fact = ZRamReader.executableLayoutFacts(mem);
            if (!fact) {
                var digest = ModuleLibrary.currentExecutableDigest();
                fact = digest && ModuleStatFactsClaude[digest];
            }
            if (!fact || !(Object.prototype.hasOwnProperty.call(fact, "activationState") ||
                (fact.attributeObjects && Object.prototype.hasOwnProperty.call(fact.attributeObjects, "switchable")))) return true;
            owned = true;
            if ((ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) ||
                (fact.attributeMap && Object.prototype.hasOwnProperty.call(fact.attributeMap, "switchable"))) return true;
            var ids = AttributeSchema.objectCapabilityIds(mem, "switchable");
            var stateIds = fact.activationState && fact.activationState.onObjects;
            if (!ids || !Array.isArray(stateIds) || !stateIds.length ||
                !stateIds.every(function (id, i) { return Number.isInteger(id) && ids.indexOf(id) >= 0 && stateIds.indexOf(id) === i; })) return false;
            return Number.isInteger(objectId) && stateIds.indexOf(objectId) >= 0;
        } catch (eActivationState) { return !owned; }
    },

    // Only an authenticated measured actor layout may own this relationship.
    // Calling heuristic player resolution here would recurse through attributes.
    directPlayerWornFact: function (mem) {
        try {
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                ? ModuleLibrary.currentExecutableDigest() : null;
            var fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
            if (!fact || !fact.equipmentState || fact.equipmentState.wornWhen !== "wearable-direct-player" ||
                typeof ZRamReader === "undefined" || !ZRamReader.executableLayoutFacts ||
                ZRamReader.executableLayoutFacts(mem) !== fact) return null;
            var measured = (Number.isInteger(fact.playerObject) && fact.playerObject >= 2) ||
                (Number.isInteger(fact.playerGlobal) && fact.playerGlobal >= 0 && fact.playerGlobal < 240);
            var header = ZRamReader.header(mem), capability = fact.attributeMap && fact.attributeMap.wearable;
            var limit = header && header.version <= 3 ? 32 : 48;
            return measured && header && Number.isInteger(capability) && capability >= 0 && capability < limit ? fact : null;
        } catch (eMeasuredWorn) { return null; }
    },

    // Exact authored removal policy; capability alone never selects an action.
    wornRemovalForm: function (mem, objectId) {
        try {
            var live = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            if (!mem || !live || !mem.buffer || mem.buffer !== live.buffer ||
                mem.byteOffset !== live.byteOffset || mem.byteLength !== live.byteLength) return null;
            var fact = AttributeSchema.directPlayerWornFact(mem);
            if (!fact || fact.equipmentState.wornRemoval !== "drop" ||
                Number.isInteger(fact.wornAttribute) ||
                (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem))) return null;
            var h = ZRamReader.header(mem), family = AttributeSchema._familyOf(mem);
            if (!h || h.version < 3 || h.version > 5 || !family ||
                family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return null;
            var count = ZRamReader.objectCount(mem, h), bit = AttributeSchema.bitFor("wearable", mem);
            if (!Number.isInteger(count) || !Number.isInteger(objectId) || objectId < 2 || objectId > count ||
                bit !== fact.attributeMap.wearable) return null;
            var player = ZRamReader.resolvePlayer(mem);
            if (!player || player.ambiguous || !Number.isInteger(player.id) || player.id < 2 || player.id > count ||
                player.id === objectId || ["measured-player-global", "measured-player-object"].indexOf(player.source) < 0) return null;
            var links = ZRamReader.objectLinks(mem, objectId);
            return links && links.parent === player.id && ZRamReader.attr(links, bit) ? "drop" : null;
        } catch (eWornRemoval) { return null; }
    },

    // An authored physical garment domain, independently measured from the
    // room/global flag reuse. Never resolve player/room through attrs here.
    garmentWornDomainFact: function (mem, fact) {
        try {
            if (!mem || !fact || !fact.equipmentState || fact.equipmentState.wornWhen !== "bit-garment-domain" ||
                typeof ZRamReader === "undefined" || !ZRamReader.executableLayoutFacts ||
                ZRamReader.executableLayoutFacts(mem) !== fact) return null;
            var h = ZRamReader.header(mem), state = fact.equipmentState;
            var wearable = fact.attributeMap && fact.attributeMap.wearable, worn = fact.wornAttribute;
            if (!h || h.version < 3 || h.version > 5) return null;
            var limit = h.version <= 3 ? 32 : 48;
            if (!Number.isInteger(wearable) || wearable < 0 || wearable >= limit ||
                !Number.isInteger(worn) || worn < 0 || worn >= limit || wearable === worn ||
                AttributeSchema.bitFor("wearable", mem) !== wearable) return null;
            var family = AttributeSchema._familyOf(mem);
            if (!family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return null;
            var count = state.objectCount, rootId = state.roomRootObject;
            if (!Number.isInteger(count) || count < 2 || count > 20000 ||
                !Number.isInteger(rootId) || rootId < 2 || rootId > count) return null;
            var first = ZRamReader.objectBase(h, 1), firstProps = ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12));
            if (firstProps !== first + count * h.entrySize || firstProps >= h.staticMem ||
                firstProps >= (mem.byteLength || mem.length || 0)) return null;
            var root = ZRamReader.objectLinks(mem, rootId);
            if (!root || root.parent !== 0 || !Number.isInteger(root.child) || root.child < 1 || root.child > count ||
                ZRamReader.attr(root, wearable) || ZRamReader.attr(root, worn)) return null;
            return { count: count, rootId: rootId, wearable: wearable, worn: worn };
        } catch (eGarmentDomain) { return null; }
    },

    // Measured executable semantics complement standard compiler attributes.
    // Never infer equipment state from an object's name or inventory prose.
    applyEquipmentState: function (attrs, obj, mem) {
        var garmentDomainOwned = false;
        try {
            if (!obj || !mem || typeof ModuleLibrary === "undefined" ||
                typeof ModuleStatFactsClaude === "undefined" || typeof ZRamReader === "undefined") return;
            // Select this measured domain through the supplied-memory identity
            // owner first, so a failing digest accessor cannot leak calibration.
            var layoutFact = ZRamReader.executableLayoutFacts && ZRamReader.executableLayoutFacts(mem);
            var layoutState = layoutFact && layoutFact.equipmentState;
            var layoutOwnsGarment = layoutState && (layoutState.wornWhen === "bit-garment-domain" ||
                Object.prototype.hasOwnProperty.call(layoutState, "roomRootObject") ||
                Object.prototype.hasOwnProperty.call(layoutState, "objectCount"));
            var digest = layoutOwnsGarment ? null : ModuleLibrary.currentExecutableDigest();
            var fact = layoutOwnsGarment ? layoutFact : digest && ModuleStatFactsClaude[digest];
            if (fact && fact.objectUseVerb === "use") attrs.nativeUseVerb = "use";
            var state = fact && fact.equipmentState;
            if (state && (state.wornWhen === "bit-garment-domain" ||
                Object.prototype.hasOwnProperty.call(state, "roomRootObject") ||
                Object.prototype.hasOwnProperty.call(state, "objectCount"))) {
                garmentDomainOwned = true;
                if (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) return;
                attrs.worn = attrs.isWorn = false;
                var domain = AttributeSchema.garmentWornDomainFact(mem, fact);
                if (!domain || !Number.isInteger(obj.id) || obj.id < 2 || obj.id > domain.count || obj.id === domain.rootId) return;
                var garment = ZRamReader.objectLinks(mem, obj.id);
                attrs.worn = attrs.isWorn = !!(garment && Number.isInteger(garment.parent) && garment.parent > 0 &&
                    garment.parent <= domain.count && garment.parent !== domain.rootId &&
                    ZRamReader.attr(garment, domain.wearable) && ZRamReader.attr(garment, domain.worn));
                return;
            }
            if (state && state.wornWhen === "wearable-direct-player") {
                // Declared/bit-owned worn state remains ahead of this relation.
                if ((ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem)) ||
                    Number.isInteger(fact.wornAttribute)) return;
                attrs.worn = attrs.isWorn = false;
                if (!AttributeSchema.directPlayerWornFact(mem)) return;
                var bit = AttributeSchema.bitFor("wearable", mem);
                if (bit !== fact.attributeMap.wearable || !ZRamReader.resolvePlayer) return;
                var player = ZRamReader.resolvePlayer(mem);
                if (!player || player.ambiguous || !Number.isInteger(player.id) || player.id <= 0 ||
                    (player.source !== "measured-player-global" && player.source !== "measured-player-object")) return;
                var links = ZRamReader.objectLinks(mem, obj.id);
                attrs.worn = attrs.isWorn = !!(links && links.parent === player.id && ZRamReader.attr(links, bit));
                return;
            }
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
        } catch (eEquipment) { if (garmentDomainOwned) attrs.worn = attrs.isWorn = false; }
    },

    /* Closed-tin rule (design addendum 3.1 / Phase 1 task). */
    canSeeInside: function (attrs) {
        attrs = attrs || {};
        if (attrs.containerContentsOnSurface === true) return true;
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
