/**
 * D88 Stage 2 -- semantic action registry, shadow mode.
 *
 * PRODUCTION_PLAN.md "September 16 Semantic Action Plan (D88)" and
 * ARCHITECTURE_UML.md section 28 are the contract. This file adds the pure
 * intent/registry/resolver layer described there WITHOUT changing any UI
 * behavior yet (stage 6 does the consumer cutover). Nothing in this file may
 * call Input.Inject, Actionable.Submit, or any interpreter API -- it only
 * computes descriptors from data already on WorldModel.lastPayload / the
 * objects handed to it, the same inputs ActionSynth already reads.
 *
 * Stage 2 scope: only precedence step 7 (migration compatibility form) is
 * populated, by wrapping the existing ActionSynth output byte-for-byte.
 * Steps 1-6 are real hooks but intentionally return no match yet -- there is
 * no confirmed structural/object/build-wide/compiler evidence to source them
 * from until stages 3-5 land. Step 8 (no resolved command) is therefore only
 * reachable when ActionSynth itself has nothing to offer, which preserves
 * the current "ambiguity/missing data returns nothing" behavior exactly.
 */
var SemanticActions = {

    // Stable semantic intents. Never a parser verb, display label, or
    // command string -- see D88 invariant list.
    Intent: {
        INSPECT: "INSPECT",
        TAKE: "TAKE",
        TAKE_OUT_OF: "TAKE_OUT_OF",
        DROP: "DROP",
        OPEN: "OPEN",
        CLOSE: "CLOSE",
        LOCK: "LOCK",
        UNLOCK: "UNLOCK",
        ENTER: "ENTER",
        EXIT: "EXIT",
        SWITCH_ON: "SWITCH_ON",
        SWITCH_OFF: "SWITCH_OFF",
        EAT: "EAT",
        WEAR: "WEAR",
        REMOVE: "REMOVE",
        SEARCH: "SEARCH",
        EMPTY: "EMPTY",
        TALK_TO: "TALK_TO",
        ASK_ABOUT: "ASK_ABOUT",
        GIVE_TO: "GIVE_TO",
        PUT_IN: "PUT_IN"
    },

    // Legacy ActionSynth verb string -> stable intent. This is lexical
    // bookkeeping only (mapping the CURRENT literal English verb this
    // codebase already emits to its stable meaning) -- it is not a grammar
    // table and does not grant any new verb applicability. A verb this map
    // does not recognize resolves to intent: null rather than guessing.
    verbIntent: {
        "take": "TAKE",
        "take out of": "TAKE_OUT_OF",
        "drop": "DROP",
        "open": "OPEN",
        "close": "CLOSE",
        "lock": "LOCK",
        "unlock": "UNLOCK",
        "enter": "ENTER",
        "exit": "EXIT",
        "get out of": "EXIT",
        "sit on": "ENTER",
        "switch on": "SWITCH_ON",
        "switch off": "SWITCH_OFF",
        "turn on": "SWITCH_ON",
        "turn off": "SWITCH_OFF",
        "eat": "EAT",
        "wear": "WEAR",
        "remove": "REMOVE",
        "search": "SEARCH",
        "empty": "EMPTY",
        "talk to": "TALK_TO",
        "give to": "GIVE_TO",
        "put in": "PUT_IN",
        "ask about": "ASK_ABOUT"
    },

    // ASK_ABOUT has no ActionSynth verb (js/Actionable.js Open() builds it
    // directly, per-topic, from a NPC/topic pair -- it was never one of
    // ActionSynth.rules' flat per-object verbs). Flagged by grok's Stage 1
    // cross-check (#490): migrationCompatFormsFor alone cannot carry this
    // intent because there is no ActionSynth output to wrap. This mirrors
    // Actionable.Open()'s "Ask about..." construction (js/Actionable.js
    // ~613-634) directly instead: same payload pool, same self/player
    // exclusion, same commandNounFor-sourced command text. Kept OUT of
    // resolveForObject (which stays byte-parity-locked to ActionSynth's flat
    // per-object verb list for the Stage 2 gate) and exposed as its own
    // entry point so a future consumer can ask for it without disturbing
    // that parity guarantee.
    // --- Stage 6: unified consumer cutover, behind one flag ---
    //
    // Default ON after D198's parity gates. An explicit persisted 0 remains
    // the rollback path. A consumer
    // checks CutoverFlag.isEnabled() and only then reads from this file
    // instead of calling ActionSynth/building its own construction --
    // exactly the "one flag" the plan specifies. Every function this stage
    // adds (resolveExitCommand) or exposes for consumers to call
    // (resolveForPayloadObjectId, resolveAskAboutFormsForObject, already
    // Stage 2/2b) is already parity-proven identical to the legacy output it
    // replaces, so flipping the flag changes WHERE the command text is
    // computed, never WHAT it is.
    CutoverFlag: {
        _testOverride: null,
        isEnabled: function () {
            if (SemanticActions.CutoverFlag._testOverride != null) return SemanticActions.CutoverFlag._testOverride;
            try {
                if (typeof localStorage !== "undefined") return localStorage.getItem("PL_SemanticActions_Cutover") !== "0";
            } catch (e) {}
            return true;
        },
        enable: function () { try { if (typeof localStorage !== "undefined") localStorage.setItem("PL_SemanticActions_Cutover", "1"); } catch (e) {} },
        disable: function () { try { if (typeof localStorage !== "undefined") localStorage.setItem("PL_SemanticActions_Cutover", "0"); } catch (e) {} }
    },

    // D198 semantic facts have an owner-local valve independent of D88's
    // consumer cutover. A D198 form is visible only when both controls are
    // on. Shadow mode records diagnostics but cannot alter resolver output.
    D198SemanticValve: {
        StorageKey: "PL_D198_SemanticValve_v1",
        _testOverride: null,
        mode: function () {
            var value = SemanticActions.D198SemanticValve._testOverride;
            if (value == null) {
                try { value = typeof localStorage !== "undefined" && localStorage.getItem(SemanticActions.D198SemanticValve.StorageKey); } catch (e) {}
            }
            return value === "off" || value === "shadow" ? value : "on";
        },
        setMode: function (mode) {
            var value = mode === "shadow" || mode === "on" ? mode : "off";
            if (value !== "shadow") {
                try { delete SemanticActions._d198SemanticShadowSnapshot; } catch (e0) { SemanticActions._d198SemanticShadowSnapshot = null; }
            }
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(SemanticActions.D198SemanticValve.StorageKey, value);
                }
            } catch (e) {}
            return value;
        }
    },

    _d198Clone: function (value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    },

    d198SemanticDiagnostics: function () {
        return SemanticActions._d198Clone(SemanticActions._d198SemanticShadowSnapshot || null);
    },

    _d198FamilyDiagnostics: function () {
        try {
            if (typeof GrammarProvider === "undefined" || !GrammarProvider.d198Diagnostics) return null;
            var mem = null;
            if (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) mem = ZRamProvider.getMem();
            if (!mem && typeof AttributeSchema !== "undefined" && AttributeSchema._getMem) mem = AttributeSchema._getMem();
            return mem ? GrammarProvider.d198Diagnostics(mem) : null;
        } catch (e) { return null; }
    },

    _d198ConfirmedForms: function (obj, context, family) {
        if (!obj || obj.id == null || (context !== "room" && context !== "inventory")) return [];
        if (typeof AttrCalibrator === "undefined" || !AttrCalibrator.d198ProvenanceForObject) return [];
        var noun = SemanticActions.commandNounForObj(obj);
        if (!noun) return [];
        return AttrCalibrator.d198ProvenanceForObject(obj.id, context).filter(function (record) {
            if (!record || !record.confirmed || !record.direct || record.provenance !== "opcode-state") return false;
            // Containment supplies a current applicability guard for these
            // two actions. Other successful mutations describe past state,
            // so they remain diagnostic until a current-state witness exists.
            return (record.verb === "take" && context === "room") ||
                (record.verb === "drop" && context === "inventory");
        }).map(function (record) {
            var familyId = family && family.family ? family.family : "validated-zil-family";
            return {
                verb: record.verb,
                noun: noun,
                objectId: obj.id,
                command: record.verb + " " + noun,
                confidence: 1,
                intent: SemanticActions.intentForVerb(record.verb),
                source: "d198-opcode-state",
                evidence: [SemanticActions._d198Clone(record)],
                evidenceIdentity: [record.executableDigest, familyId, record.actionId,
                    context, String(obj.id), record.provenance].join("|"),
                legacy: null
            };
        }).filter(function (form) { return !!form.intent; });
    },

    // Mirrors Actionable.commandForExitLabel exactly (js/Actionable.js:131-
    // 139): same exits array, same case-insensitive label lookup, same
    // fallback to the raw label when no structural match exists. A separate
    // function (not folded into resolveForObject, which is about per-object
    // verbs) because exits are label/command pairs, not object ids -- same
    // reasoning as resolveAskAboutFormsForObject staying separate.
    resolveExitCommand: function (label, payload) {
        try {
            var p = payload || (typeof WorldModel !== "undefined" && WorldModel.lastPayload);
            var exits = (p && p.exits) || [];
            var lab = String(label || "").toLowerCase();
            var hit = exits.find(function (e) { return e && String(e.label || "").toLowerCase() === lab; });
            return (hit && hit.command) || label;
        } catch (e) { return label; }
    },

    payloadPoolFor: function (p) {
        if (!p) return [];
        // Current-world consumers share D184's recovered scoped identities.
        // Explicit snapshots must never borrow objects from a later world.
        if (typeof WorldModel !== "undefined" && p === WorldModel.lastPayload
            && typeof Actionable !== "undefined" && Actionable.payloadPool) {
            return Actionable.payloadPool();
        }
        return (p.discoveredObjects || []).concat(p.inventory || []).filter(function (o) {
            return o && o.id != null && o.id !== "" && o.name;
        });
    },

    commandNounForObj: function (obj) {
        try {
            if (typeof Actionable !== "undefined" && Actionable.referenceFor) {
                var reference = Actionable.referenceFor(obj);
                return reference.unique ? reference.noun : "";
            }
            if (typeof Actionable !== "undefined" && Actionable.commandNounFor) return Actionable.commandNounFor(obj);
        } catch (e) {}
        return obj && obj.name;
    },

    resolveAskAboutFormsForObject: function (objectId, payload) {
        var p = payload || (typeof WorldModel !== "undefined" && WorldModel.lastPayload);
        if (!p) return [];
        var pool = SemanticActions.payloadPoolFor(p);
        var clicked = pool.find(function (o) { return o && String(o.id) === String(objectId); });
        var attrs = clicked && clicked.attrs;
        if (!clicked || !attrs || !(attrs.animate || attrs.talkable)) return [];
        var playerId = (typeof ActionSynth !== "undefined" && ActionSynth.payloadPlayerId) ? ActionSynth.payloadPlayerId(p) : null;
        var npcNoun = SemanticActions.commandNounForObj(clicked);
        return pool.filter(function (o) {
            if (!o || String(o.id) === String(objectId)) return false;
            if (playerId != null && String(o.id) === String(playerId)) return false;
            return true;
        }).map(function (topic) {
            var topicNoun = SemanticActions.commandNounForObj(topic);
            return {
                verb: "ask about",
                noun: topicNoun,
                objectId: clicked.id,
                topicObjectId: topic.id,
                command: "ask " + npcNoun + " about " + topicNoun,
                confidence: 0.8,
                intent: SemanticActions.Intent.ASK_ABOUT,
                source: "migration-compat"
            };
        });
    },

    intentForVerb: function (verb) {
        if (verb == null) return null;
        if (SemanticActions.verbIntent.hasOwnProperty(verb)) return SemanticActions.verbIntent[verb];
        try {
            if (verb === SemanticActions.currentDefaultInspectVerb()) return SemanticActions.Intent.INSPECT;
        } catch (e) {}
        return null;
    },

    currentDefaultInspectVerb: function () {
        try {
            if (typeof ActionSynth !== "undefined" && ActionSynth.defaultInspectVerb) return ActionSynth.defaultInspectVerb();
        } catch (e) {}
        return "examine";
    },

    // --- Resolution-order steps (ARCHITECTURE_UML.md section 28) ---
    // Each returns a legacy-shaped command object (see ActionSynth.commandsForObject)
    // or null/[] when it has nothing. Steps 1-6 are real seams, currently
    // empty: no structural/confirmed/compiler evidence source exists before
    // stage 3-5 lands, so they must not invent one.

    // Step 1 is applied by the caller (reject stale/ambiguous targets)
    // before any provider runs -- see resolveForObject.

    // Step 2: explicit structural command already supplied by RAM (e.g. an
    // exit). Nothing in this codebase's payload shape carries that for
    // arbitrary objects yet; only Navigator-style exit commands do, and
    // those are out of ActionSynth's scope. Intentionally empty in stage 2.
    structuralCommandsFor: function (obj, context, containerName, payload) {
        return [];
    },

    // Step 3: D198 object/context forms come only from direct opcode evidence
    // correlated to one stable object id. Behavioral evidence and legacy
    // allowedVerbs never enter this path.
    confirmedObjectFormsFor: function (obj, context, containerName, payload) {
        var mode = SemanticActions.D198SemanticValve.mode();
        if (mode === "off") return [];
        var family = SemanticActions._d198FamilyDiagnostics();
        var familyValid = !!(family && family.classification === "confirmed-zil-family" && family.evidence === "validated");
        var forms = familyValid ? SemanticActions._d198ConfirmedForms(obj, context, family) : [];
        if (mode === "shadow") {
            SemanticActions._d198SemanticShadowSnapshot = SemanticActions._d198Clone({
                family: family,
                objectId: obj && obj.id,
                context: context,
                forms: forms
            });
            return [];
        }
        if (!familyValid || !SemanticActions.CutoverFlag.isEnabled()) return [];
        return forms;
    },

    // Step 4: confirmed game-build-wide semantic form. Same as step 3.
    confirmedBuildFormsFor: function (obj, context, containerName, payload) {
        return [];
    },

    // Step 5: decoded compiler grammar pattern. No dialect provider exists
    // yet (later stages / ARCHITECTURE_UML.md's InformZDialectProvider etc).
    compilerGrammarFormsFor: function (obj, context, containerName, payload) {
        return [];
    },

    // Step 6: capability-gated compiler-family profile. Same as step 5.
    compilerProfileFormsFor: function (obj, context, containerName, payload) {
        return [];
    },

    // Step 7: migration compatibility form -- the literal current
    // ActionSynth output, wrapped with stable intent/source/provenance but
    // byte-identical verb/noun/objectId/command fields. This is the only
    // step with real data in stage 2.
    migrationCompatFormsFor: function (obj, context, containerName) {
        if (typeof ActionSynth === "undefined") return [];
        var legacy = ActionSynth.commandsForObject(obj, context, containerName);
        return legacy.map(function (c) {
            var form = {
                verb: c.verb,
                noun: c.noun,
                objectId: c.objectId,
                command: c.command,
                confidence: c.confidence,
                intent: SemanticActions.intentForVerb(c.verb),
                source: "migration-compat",
                evidence: [],
                legacy: c
            };
            if (c.Enter === false || c.enter === false) { form.Enter = false; form.enter = false; }
            if (c.learnedWordScope) form.learnedWordScope = c.learnedWordScope;
            if (c.wornRemovalScope) form.wornRemovalScope = c.wornRemovalScope;
            if (c.qualifiedRemovalScope) form.qualifiedRemovalScope = c.qualifiedRemovalScope;
            if (c.identityWearScope) form.identityWearScope = c.identityWearScope;
            if (c.lightFormScope) form.lightFormScope = c.lightFormScope;
            if (c.revealedLocalGlobalScope) { form.revealedLocalGlobalScope = c.revealedLocalGlobalScope; form.context = c.context; }
            return form;
        });
    },

    // Runs the deterministic precedence ladder for one object and returns
    // ResolvedCommand-shaped entries (legacy DTO fields included additively,
    // per "Target contract and precedence" in PRODUCTION_PLAN.md). Order
    // matches the legacy array exactly in stage 2 since only step 7 has
    // data; earlier steps are consulted first and simply defer per-verb
    // when they have nothing, which cannot happen yet (they always return []).
    resolveForObject: function (obj, context, containerName, payload) {
        // The bounded local-global contribution owns its complete action domain.
        // Do not augment it with learned, grammar, or capability guesses.
        if (obj && obj.revealedLocalGlobal) return SemanticActions.migrationCompatFormsFor(obj, context, containerName);
        // Step 1: reject stale/ambiguous targets outright.
        if (!obj || !obj.name || obj.id == null) return [];

        var byVerb = {};
        var byRendered = {};
        var order = [];
        function apply(list) {
            (list || []).forEach(function (c) {
                if (typeof ActionSynth !== "undefined" && ActionSynth.normalizeQualifiedRemovalCandidate) c = ActionSynth.normalizeQualifiedRemovalCandidate(c, obj);
                if (!c || !c.verb) return;
                var rendered = [String(c.command || "").toLowerCase().replace(/\s+/g, " ").trim(),
                    context || "", String(c.objectId == null ? "" : c.objectId)].join("|");
                if (byRendered[rendered]) {
                    var winner = byRendered[rendered];
                    if (c.qualifiedRemovalScope && winner.command === c.command && String(winner.objectId) === String(c.objectId)) winner.qualifiedRemovalScope = c.qualifiedRemovalScope;
                    // Keep precedence/evidence while retaining the generated action's currency.
                    if (c.wornRemovalScope && winner.command === c.command && String(winner.objectId) === String(c.objectId)) {
                        winner.wornRemovalScope = c.wornRemovalScope;
                    }
                    if (c.identityWearScope && winner.command === c.command && String(winner.objectId) === String(c.objectId)) {
                        winner.identityWearScope = c.identityWearScope;
                    }
                    if (c.lightFormScope && winner.command === c.command && String(winner.objectId) === String(c.objectId)) {
                        winner.lightFormScope = c.lightFormScope;
                    }
                    winner.evidence = (winner.evidence || []).concat((c.evidence || []).map(SemanticActions._d198Clone));
                    winner.provenance = winner.provenance || [];
                    if (c.source && winner.provenance.indexOf(c.source) < 0) winner.provenance.push(c.source);
                    return;
                }
                if (byVerb.hasOwnProperty(c.verb)) return; // earlier step already won this verb
                byVerb[c.verb] = c;
                byRendered[rendered] = c;
                order.push(c.verb);
            });
        }

        apply(SemanticActions.structuralCommandsFor(obj, context, containerName, payload));
        apply(SemanticActions.confirmedObjectFormsFor(obj, context, containerName, payload));
        apply(SemanticActions.confirmedBuildFormsFor(obj, context, containerName, payload));
        apply(SemanticActions.compilerGrammarFormsFor(obj, context, containerName, payload));
        apply(SemanticActions.compilerProfileFormsFor(obj, context, containerName, payload));
        apply(SemanticActions.migrationCompatFormsFor(obj, context, containerName));
        // Step 8: no further fallback. Anything not covered above is simply
        // absent from the result -- never a speculative guess.

        return order.map(function (v) { return byVerb[v]; }).filter(function (entry) {
            return !ActionSynth.authoredCommandAllowed || ActionSynth.authoredCommandAllowed(obj.id,entry.verb,context);
        });
    },

    resolveForPayloadObjectId: function (objectId, context) {
        try {
            if (typeof WorldModel === "undefined") return [];
            var p = WorldModel && WorldModel.lastPayload;
            if (!p) return [];
            var pool = (p.discoveredObjects || []).concat(p.inventory || []);
            var obj = pool.find(function (o) { return o && String(o.id) === String(objectId); });
            if (!obj) return [];
            var inInventory = (p.inventory || []).some(function (o) { return o && String(o.id) === String(objectId); });
            var resolvedContext = context || (inInventory ? "inventory" : "room");
            var containerName = resolvedContext === "inventory" && typeof ActionSynth !== "undefined"
                ? ActionSynth.heldContainerName(obj, p) : null;
            return SemanticActions.resolveForObject(obj, resolvedContext, containerName, p);
        } catch (e) { return []; }
    },

    // --- Stage 3: role-aware multiword recognition ---
    //
    // Parses a normalized TYPED command line into {intent, formId, objectIds,
    // command} by matching known object ids/verified aliases against fixed
    // literal templates. This is deliberately NOT a general parser: every
    // template is a closed set of literal tokens plus one or two object
    // slots, and a slot only resolves when exactly one known object's
    // verified name fills it exactly (no substring/partial credit). Any
    // template that doesn't fully and unambiguously decompose the input
    // returns null -- "ambiguous or partial matches produce no observation"
    // (PRODUCTION_PLAN.md stage 3).

    multiwordTemplates: [
        { arity: 1, prefix: "look at ", intent: "INSPECT" },
        { arity: 1, prefix: "talk to ", intent: "TALK_TO" },
        { arity: 1, prefix: "switch on ", intent: "SWITCH_ON" },
        { arity: 1, prefix: "switch off ", intent: "SWITCH_OFF" },
        { arity: 1, prefix: "turn on ", intent: "SWITCH_ON" },
        { arity: 1, prefix: "turn off ", intent: "SWITCH_OFF" },
        { arity: 2, prefix: "give ", connector: " to ", intent: "GIVE_TO" },
        { arity: 2, prefix: "put ", connector: " in ", intent: "PUT_IN" },
        { arity: 2, prefix: "ask ", connector: " about ", intent: "ASK_ABOUT" }
    ],

    // One candidate per known object id: its currently-verified noun (or
    // structural obj.name when nothing has been verified yet), lowercased.
    // Same source Actionable/ActionSynth already use for rendered commands,
    // so recognition and rendering can never disagree about an object's name.
    nameCandidatesForPayload: function (p) {
        var out = [];
        if (!p) return out;
        var pool = (p.discoveredObjects || []).concat(p.inventory || []);
        pool.forEach(function (o) {
            if (!o || o.id == null) return;
            var raw = (typeof Actionable !== "undefined" && Actionable.commandNounFor) ? Actionable.commandNounFor(o) : o.name;
            if (!raw) return;
            out.push({ id: o.id, name: String(raw).toLowerCase().trim() });
        });
        return out;
    },

    // Exactly one candidate must have this exact name -- zero is "not a
    // known object", more than one is an unresolved same-name collision
    // (D47-style); both fail closed to "no unique match".
    uniqueCandidateNamed: function (candidates, name) {
        var matches = candidates.filter(function (c) { return c.name === name; });
        return matches.length === 1 ? matches[0] : null;
    },

    recognizeTypedCommand: function (rawText, payload) {
        if (rawText == null) return null;
        var norm = String(rawText).trim().toLowerCase().replace(/\s+/g, " ");
        if (!norm) return null;
        var candidates = SemanticActions.nameCandidatesForPayload(payload);
        if (!candidates.length) return null;

        for (var i = 0; i < SemanticActions.multiwordTemplates.length; i++) {
            var t = SemanticActions.multiwordTemplates[i];
            if (norm.indexOf(t.prefix) !== 0) continue;
            var rest = norm.slice(t.prefix.length);
            if (!rest) continue;

            if (t.arity === 1) {
                var obj = SemanticActions.uniqueCandidateNamed(candidates, rest);
                if (!obj) continue;
                return {
                    intent: t.intent,
                    formId: "typed:" + t.intent,
                    objectIds: [obj.id],
                    command: norm,
                    source: "typed-recognition"
                };
            }

            // arity 2: the connector must appear exactly once in the
            // remainder -- two or more occurrences means the split is
            // itself ambiguous (could be part of an object's own name, or a
            // genuinely ambiguous sentence), so no observation is produced.
            var firstIdx = rest.indexOf(t.connector);
            if (firstIdx < 0) continue;
            if (rest.indexOf(t.connector, firstIdx + 1) >= 0) continue;

            var directName = rest.slice(0, firstIdx);
            var indirectName = rest.slice(firstIdx + t.connector.length);
            if (!directName || !indirectName) continue;

            var direct = SemanticActions.uniqueCandidateNamed(candidates, directName);
            var indirect = SemanticActions.uniqueCandidateNamed(candidates, indirectName);
            if (!direct || !indirect) continue;

            return {
                intent: t.intent,
                formId: "typed:" + t.intent,
                objectIds: [direct.id, indirect.id],
                command: norm,
                source: "typed-recognition"
            };
        }
        return null;
    },

    resolveForPayload: function (p) {
        var out = [];
        if (!p || typeof ActionSynth === "undefined") return out;
        var seen = {};
        var inventoryIds = {};
        (p.inventory || []).forEach(function (o) { if (o) inventoryIds[String(o.id)] = true; });
        (p.inventory || []).concat(p.discoveredObjects || []).forEach(function (o) {
            if (!o || !o.name) return;
            if (o.id == null || seen[String(o.id)]) return;
            seen[String(o.id)] = true;
            var context = inventoryIds[String(o.id)] ? "inventory" : "room";
            var container = context === "inventory" ? ActionSynth.heldContainerName(o, p) : null;
            SemanticActions.resolveForObject(o, context, container, p).forEach(function (c) { out.push(c); });
        });
        return out;
    },

    // --- Stage 4: passive command-form evidence on the existing TurnRecorder substrate ---
    //
    // Shadow mode: observes real accepted submissions and records what
    // recognizeTypedCommand structurally matched, but NEVER marks anything
    // "confirmed". D88 invariant: "A behavioral response pattern may veto a
    // proven-bad form or create a provisional custom form, but semantic
    // promotion requires a compiler/engine adapter, a structural opcode/
    // state witness, or an explicit association. Random or repeated prose
    // alone is never semantic proof." No per-engine opcode witness is wired
    // yet (that is real per-compiler decoding work, out of this stage's
    // scope, same reasoning as resolveForObject's steps 2-6 staying empty
    // until later stages), so every entry this stage produces stays
    // `confirmed: false` unconditionally -- there is no code path here that
    // can set it true. Recording is a pure side observation: nothing in
    // resolveForObject/recognizeTypedCommand ever reads the Evidence store,
    // so it cannot influence command resolution (shadow mode).
    Evidence: {
        _entries: [],
        record: function (entry) { SemanticActions.Evidence._entries.push(entry); return entry; },
        all: function () { return SemanticActions.Evidence._entries.slice(); },
        clear: function () { SemanticActions.Evidence._entries = []; }
    },

    analyzeAcceptedSubmit: function (turn) {
        if (!turn) return null;
        var payload = typeof WorldModel !== "undefined" ? WorldModel.lastPayload : null;
        var recognized = SemanticActions.recognizeTypedCommand(turn.command, payload);
        if (!recognized) return null; // ambiguous/partial/unknown -- no observation, per Stage 3 contract
        var entry = {
            intent: recognized.intent,
            formId: recognized.formId,
            objectIds: recognized.objectIds,
            command: recognized.command,
            source: turn.source,
            confirmed: false,
            provisionalReason: "behavioral-only: no structural opcode/state witness wired for this build yet",
            observedAt: (typeof Date !== "undefined") ? Date.now() : null
        };
        SemanticActions.Evidence.record(entry);
        return entry;
    },

    // TurnRecorder analyzer contract (js/TurnRecorder.js): prepare() runs
    // once per turn and must stay cheap for the common case (most typed
    // commands are not one of the fixed multiword templates), so it does the
    // same recognizeTypedCommand check prepare-time to decide interest at
    // all; analyze() re-derives from the frozen `turn` only, never live
    // state, per that file's own contract.
    turnRecorderAnalyzer: {
        id: "semantic-evidence",
        prepare: function (turn) {
            try {
                var payload = typeof WorldModel !== "undefined" ? WorldModel.lastPayload : null;
                if (!SemanticActions.recognizeTypedCommand(turn.command, payload)) return null;
            } catch (e) { return null; }
            return { wantsOpcodes: false, wantsStatusBefore: false, hasWitness: function () { return true; } };
        },
        analyze: function (turn) { SemanticActions.analyzeAcceptedSubmit(turn); }
    },

    registerWithTurnRecorder: function () {
        try {
            if (typeof TurnRecorder !== "undefined" && TurnRecorder.registerAnalyzer) {
                TurnRecorder.registerAnalyzer(SemanticActions.turnRecorderAnalyzer);
            }
        } catch (e) {}
    },

    // --- Stage 5: sidecar persistence and migration ---
    //
    // A SEPARATE key namespace from PL_AttrCalib_* v2 (js/AttrCalibrator.js
    // hydrate/persist) -- that store is never read or rewritten by this
    // file, per the plan's "do not rewrite PL_AttrCalib_* v2" rule. Also
    // stricter than ZRamReader.gameIdentityKey (release+serial only): the
    // D88 plan requires release+serial+CHECKSUM+adapter+locale, because "two
    // binaries sharing release and serial but differing in checksum must not
    // share learning" -- release+serial alone cannot express that, so this
    // builds its own key instead of reusing the existing one.
    SIDECAR_VERSION: 1,
    ADAPTER_VERSION: "d88-stage5-v1",

    // Z-machine header: release word at 0x02, 6-byte serial at 0x12
    // (same fields ZRamReader.gameIdentityKey already reads), checksum word
    // at 0x1C (Z-machine spec 11.1.6, not currently read anywhere else in
    // this codebase). No fallback/guess when header bytes are unavailable --
    // returns null, and callers must treat that as "cannot key this build",
    // never as build identity zero.
    buildIdentityKey: function (mem, locale) {
        try {
            if (!mem || typeof ZRamReader === "undefined") return null;
            var release = ZRamReader.u16(mem, 0x02);
            var serial = "";
            for (var i = 0; i < 6; i++) serial += String.fromCharCode(ZRamReader.u8(mem, 0x12 + i));
            if (!release && !/[0-9]/.test(serial)) return null;
            var checksum = ZRamReader.u16(mem, 0x1c);
            return release + "-" + serial + "-" + checksum.toString(16) + "-" + SemanticActions.ADAPTER_VERSION + "-" + (locale || "en");
        } catch (e) { return null; }
    },

    // D13: exact key generator (inputs recorded by the persist above).
    learningKeyFor: function (i) {
        if (!i || typeof i.identityKey !== "string" || !i.identityKey || !/^[0-9a-f]+$/.test(String(i.checksum)) || typeof i.adapter !== "string" || typeof i.locale !== "string") return null;
        return "PL_SemanticActions_" + i.identityKey + "-" + i.checksum + "-" + i.adapter + "-" + i.locale;
    },

    sidecarStorageKey: function (mem, locale) {
        var key = SemanticActions.buildIdentityKey(mem, locale);
        return key ? "PL_SemanticActions_" + key : null;
    },

    hydratedForBuild: null,

    // Fails closed on anything not exactly this store's own shape for this
    // exact build: wrong version, missing/mismatched buildKey, or a JSON
    // parse error all leave Evidence empty rather than adopting foreign or
    // corrupt data. D85 substitute-verb data is imported at most once, as
    // provisional legacy evidence only (never marked confirmed) -- it is
    // real prior signal, but transcript-derived, so it gets no more trust
    // here than any other behavioral-only observation.
    hydrate: function (mem, locale) {
        var key = SemanticActions.buildIdentityKey(mem, locale);
        if (!key || SemanticActions.hydratedForBuild === key) return;
        SemanticActions.hydratedForBuild = key;
        SemanticActions.Evidence.clear();
        try {
            if (typeof localStorage === "undefined") return;
            var raw = typeof LearningStores !== "undefined" ? LearningStores.read("PL_SemanticActions_" + key) : localStorage.getItem("PL_SemanticActions_" + key);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && parsed.version === SemanticActions.SIDECAR_VERSION && parsed.buildKey === key && Array.isArray(parsed.entries)) {
                    parsed.entries.forEach(function (e) { SemanticActions.Evidence.record(e); });
                }
                // version/buildKey mismatch -> silently treated as absent (fail closed), not adopted.
            }
        } catch (e) { /* corrupt JSON -> fail closed, Evidence stays empty */ }

        try {
            if (typeof AttrCalibrator === "undefined" || !AttrCalibrator.table) return;
            var vb = AttrCalibrator.table.verbBehavior;
            var already = SemanticActions.Evidence.all().some(function (e) { return e.source === "d85-legacy-import"; });
            if (vb && vb.substituteVerb && vb.substituteVerb !== "examine" && !already) {
                SemanticActions.Evidence.record({
                    intent: SemanticActions.Intent.INSPECT,
                    formId: "legacy:d85-substitute",
                    objectIds: [],
                    command: vb.substituteVerb,
                    source: "d85-legacy-import",
                    confirmed: false,
                    provisionalReason: "imported once from D85/v2 verbBehavior data -- transcript-derived, not a structural witness",
                    observedAt: (typeof Date !== "undefined") ? Date.now() : null
                });
            }
        } catch (e2) {}
    },

    // Only entries an actual (future) structural witness confirmed are
    // build-stable facts worth persisting across a reload. Every entry this
    // codebase can currently produce has confirmed:false (no engine/compiler
    // opcode witness is wired yet -- see analyzeAcceptedSubmit), so this
    // persists an empty set today. That is intentional, not a bug: writing
    // unconfirmed behavioral guesses into durable storage is exactly what
    // "fails closed" is guarding against.
    // P13b R2: one persisted entry per (intent, formId, objectIds); the
    // latest observation of a triple wins. The entry cap waits for the
    // structural witnesses that will first produce confirmed entries.
    dedupeEntries: function (entries) {
        var at = Object.create(null), out = [];
        (entries || []).forEach(function (e) {
            var k = JSON.stringify([e && e.intent, e && e.formId, ((e && e.objectIds) || []).map(String)]);
            if (k in at) out[at[k]] = e; else { at[k] = out.length; out.push(e); }
        });
        return out;
    },
    persist: function (mem, locale) {
        var key = SemanticActions.buildIdentityKey(mem, locale);
        if (!key) return;
        try {
            if (typeof localStorage === "undefined") return;
            var confirmedOnly = SemanticActions.dedupeEntries(SemanticActions.Evidence.all().filter(function (e) { return e.confirmed; }));
            var json = JSON.stringify({
                version: SemanticActions.SIDECAR_VERSION,
                buildKey: key,
                entries: confirmedOnly
            });
            if (typeof LearningStores !== "undefined") {
                var head = key.slice(0, key.length - (SemanticActions.ADAPTER_VERSION.length + (locale || "en").length + 2));
                var cut = head.lastIndexOf("-");
                LearningStores.persist("semanticActions", { identityKey: head.slice(0, cut), checksum: head.slice(cut + 1), adapter: SemanticActions.ADAPTER_VERSION, locale: locale || "en" }, json,
                    function () { if (SemanticActions.hydratedForBuild === key) SemanticActions.Evidence.clear(); });
            } else localStorage.setItem("PL_SemanticActions_" + key, json);
        } catch (e) {}
    },

    // Called from UndoRestoreSync.resync() (real undo/restore/restart, after
    // the terp applied it). Clears pending/generation-bound observations --
    // today that is everything in Evidence, since nothing is confirmed yet.
    generationReset: function () {
        SemanticActions.Evidence.clear();
        try { delete SemanticActions._d198SemanticShadowSnapshot; } catch (e) { SemanticActions._d198SemanticShadowSnapshot = null; }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SemanticActions;
}
if (typeof LearningStores !== "undefined") LearningStores.register("semanticActions", "PL_SemanticActions_", SemanticActions.learningKeyFor);
