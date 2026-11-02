/* AttrCalibrator (D73, Phase B)
 *
 * D34/D58 both accepted "attribute-approximation is a ceiling" for verb
 * prediction, reasoning the only alternative -- watching a compiled game's
 * own precondition/action routines actually run -- was infeasible ("out of
 * bar, not a RAM read"). That reasoning was wrong: `lib/zvm.js` is a
 * pure-JS, JIT-compiling Z-machine interpreter. It translates opcodes into
 * JS source that calls real, named, prototype methods (`test_attr`,
 * `set_attr`, `clear_attr`, `get_prop`, `insert_obj`, `remove_obj`) via
 * ordinary property lookup at call time, not baked into closures --
 * `js/ZvmCapture.js` already patches this same prototype for
 * prepare/start/resume and now also forwards every call to these six
 * methods here (see ZvmCapture.js's own comment for the hook detail).
 *
 * Proof (wump2ka.z5.js, "take canteen"): test_attr(canteen, 5/32/33/34/35/
 * 22/24) all false, then remove_obj(canteen)+insert_obj(canteen, 171)+
 * set_attr(canteen, 17) -- a complete, real trace proving the compiled
 * game's own TAKE precondition never even tests bit 19 ("static" in
 * AttributeSchema.PROFILE, which `takeable = !static && !scenery` assumes).
 *
 * THIS FILE (Phase B): observation and correlation ONLY. It builds a
 * verb->object trace for each submitted command and classifies it
 * success/fail from the opcodes actually executed -- but does not persist
 * anything and does not feed AttributeSchema.applyTo() yet (see the plan's
 * Phase C/D). Loading this file changes nothing about any live prediction;
 * every game behaves identically with or without it.
 */
var AttrCalibrator = {
    _wrapped: false,
    _verbRegex: null,
    RPG_VERBS: ["wield", "equip", "wear", "remove", "eat", "drink", "apply", "use", "take", "drop", "examine"],
    // D214 U5: editable-only (Enter:false) Yourself suggestions beyond the RPG
    // set -- things one commonly does to a held item. Each still passes
    // dictionaryForm (every token must be this story's own vocabulary). That
    // licenses a lexical (Enter:false) SUGGESTION only; it is not proof the game
    // accepts the command for this object (arity/semantics). Operator rule
    // 2026-10-25: a chosen complete form still runs at once
    // (Actionable.runChosenCommand); the game's own parser reply is the
    // fail-closed backstop. Not used by D205 learning, which keeps RPG_VERBS.
    // "polish" is omitted deliberately: in the Inform library it is a synonym
    // of rub/clean, both already offered, so it would only duplicate them.
    ITEM_SUGGESTION_VERBS: ["light", "extinguish", "turn on", "turn off", "switch on", "switch off", "hold", "wave",
        "throw", "read", "open", "close", "search", "look in", "clean", "rub", "shake", "squeeze", "push", "smell", "taste"],
    extraVerbRefusal: function (text) {
        // D205 only: prerequisite/inability wording cannot prove a successful
        // no-mutation action. Conservatively retain the editable suggestion.
        // Legacy calibration and incidental embedded mentions stay unchanged.
        return /(?:^|[.!?]\s+|\n)\s*(?:you (?:must|need to|have to)\b|first[ ,]+you (?:must|need to|have to)\b|you (?:are |were )?unable to\b)/i.test(String(text || ""));
    },
    dictionaryForm: function (form) {
        var tokens = String(form || "").trim().toLowerCase().split(/\s+/);
        return !!tokens[0] && typeof Actionable !== "undefined" && Actionable.isGameWord &&
            tokens.every(function (token) { return /^[a-z]+$/.test(token) && Actionable.isGameWord(token); });
    },
    exactFormsFor: function (objectId) {
        try {
            var mem = typeof AttributeSchema !== "undefined" ? AttributeSchema._getMem() : null;
            if (!mem) return [];
            AttrCalibrator.hydrate(mem);
            var rec = AttrCalibrator.table.objects[String(objectId)];
            return Object.keys(rec && rec.exactForms || {}).filter(function (form) {
                var e = rec.exactForms[form];
                return e.confirmations >= AttrCalibrator.ALLOWED_VERB_THRESHOLD && AttrCalibrator.dictionaryForm(form) &&
                    !(typeof LearnedWords !== "undefined" && LearnedWords.suppressed("exact", objectId, form));
            });
        } catch (e) { return []; }
    },
    // Remembered spellings are item preferences, NOT inferred capabilities or
    // semantic success. Keep them separate from opcode/allowedVerb evidence.
    rememberedFormsFor: function (objectId) {
        try {
            var mem = AttributeSchema._getMem();
            if (!mem) return [];
            AttrCalibrator.hydrate(mem);
            var rec = AttrCalibrator.table.objects[String(objectId)];
            var digest = AttrCalibrator._d198ExecutableDigest();
            return Object.keys(rec && rec.rememberedForms || {}).filter(function (form) {
                var e = rec.rememberedForms[form];
                return digest && e.digest === digest && e.observations >= 2 && AttrCalibrator.dictionaryForm(form) &&
                    !(typeof LearnedWords !== 'undefined' && LearnedWords.suppressed('exact', objectId, form));
            });
        } catch (e) { return []; }
    },
    learnedFormsFor: function (objectId) {
        return AttrCalibrator.exactFormsFor(objectId).concat(AttrCalibrator.rememberedFormsFor(objectId))
            .filter(function (v, i, all) { return all.indexOf(v) === i; });
    },
    recordRememberedForm: function (entry) {
        if (!entry || !entry.rememberedOnly || entry.rejected || entry.ambiguous || !entry.responseObserved ||
            !entry.digest || entry.digest !== AttrCalibrator._d198ExecutableDigest() ||
            entry.generation !== (typeof UndoRestoreSync !== 'undefined' ? UndoRestoreSync.generation : 0) ||
            !entry.d198Correlation || entry.d198Correlation.referenceVerified === false ||
            String(entry.d198Correlation.objectId) !== String(entry.objectId) || !AttrCalibrator.dictionaryForm(entry.exactForm)) return false;
        var rec = AttrCalibrator.table.objects[String(entry.objectId)] || (AttrCalibrator.table.objects[String(entry.objectId)] = {});
        var forms = rec.rememberedForms || (rec.rememberedForms = {}), form = entry.exactForm;
        var slot = forms[form];
        if (!slot || slot.digest !== entry.digest) slot = forms[form] = { digest: entry.digest, observations: 0, source: 'remembered-item-preference' };
        var key = entry.pageEpoch + ':' + entry.submissionId;
        if (slot.submissionId === key) return false;
        slot.submissionId = key;
        slot.observations = Math.min(2, slot.observations + 1);
        slot.outcome = 'response-observed';
        return true;
    },
    recordExactForm: function (entry) {
        if (!entry || entry.rejected || entry.ambiguous || !entry.exactForm ||
            !entry.d198Correlation || String(entry.d198Correlation.objectId) !== String(entry.objectId) ||
            entry.d198Correlation.referenceVerified === false || !AttrCalibrator.dictionaryForm(entry.exactForm)) return false;
        if (!entry.success && !entry.behavioralAccept) return false;
        var rec = AttrCalibrator.table.objects[String(entry.objectId)] || (AttrCalibrator.table.objects[String(entry.objectId)] = {});
        var forms = rec.exactForms || (rec.exactForms = {});
        var form = entry.exactForm;
        var e = forms[form] || (forms[form] = { confirmations: 0, objectId: entry.objectId, form: form });
        var submissionKey = entry.pageEpoch ? entry.pageEpoch + ':' + entry.submissionId : entry.submissionId;
        if (e.submissionId === submissionKey) return false;
        e.submissionId = submissionKey;
        e.confirmations++;
        e.source = entry.success ? "opcode-state" : "behavioral-transcript";
        return true;
    },

    // D73 Phase C/D: which real AttributeSchema flag a verb's SUCCESS
    // mutates. open/wear/lock/switch each flip exactly one semantic bit on
    // success (per the standard library's own design) -- learning that
    // real bit, per game, from confirmed opcode evidence is what actually
    // corrects a wrong static-profile assumption (e.g. a swapped/shifted
    // attribute numbering) generically, for every object in that game, not
    // just the one that happened to be tested.
    VERB_FLAG: { open: "open", close: "open", wear: "worn", remove: "worn", "switch on": "on", "switch off": "on", lock: "locked", unlock: "locked" },

    // Fixed multiword synonyms → canonical ActionSynth verb forms.
    // Deterministic grammar aliases (same class as n/north), not story text.
    VERB_SYNONYMS: {
        "turn on": "switch on",
        "turn off": "switch off",
        "switch on": "switch on",
        "switch off": "switch off"
    },

    // take/drop have no such single mutated bit -- takeable is the library's
    // own derived precondition (!static && !scenery), not a flag flipped by
    // a successful take, so it can never be learned the same way. A
    // confirmed real take/refusal is still 100% real ground truth for that
    // SPECIFIC object, though, so it's remembered per-object instead (see
    // `table.objects`) rather than generalized into a per-game bit.
    CONFIRM_THRESHOLD: 3,
    // Per-object allowedVerbs (functionable affordances without bit flip,
    // e.g. wump2ka Glow Bar): opcode success confirms immediately;
    // accepted-no-reject needs this many hits on the same object id.
    ALLOWED_VERB_THRESHOLD: 2,

    table: { version: 2, verbs: {}, objects: {} },
    hydratedForGame: null,
    _d198GenerationEvidence: {},

    _d198ExecutableDigest: function () {
        try {
            if (typeof ModuleLibrary === "undefined" || !ModuleLibrary.currentExecutableIdentity) return null;
            var identity = ModuleLibrary.currentExecutableIdentity();
            return identity && identity.digest ? String(identity.digest) : null;
        } catch (e) { return null; }
    },

    _d198ScopedCorrelation: function (noun) {
        try {
            if (typeof WorldModel === "undefined" || !WorldModel.lastPayload) return null;
            var p = WorldModel.lastPayload;
            var wanted = String(noun || "").toLowerCase().trim();
            var byId = {};
            (p.discoveredObjects || []).concat(p.inventory || []).forEach(function (obj) {
                if (!obj || obj.id == null) return;
                if (typeof Actionable !== "undefined" && Actionable.referenceFor && !Actionable.referenceFor(obj).unique) return;
                var rendered = obj.name;
                try {
                    if (typeof Actionable !== "undefined" && Actionable.referenceFor) rendered = Actionable.referenceFor(obj).noun;
                    else if (typeof Actionable !== "undefined" && Actionable.commandNounFor) rendered = Actionable.commandNounFor(obj);
                } catch (e) {}
                if (String(rendered || "").toLowerCase().trim() !== wanted) return;
                byId[String(obj.id)] = obj.id;
            });
            var ids = Object.keys(byId);
            if (ids.length !== 1) return null;
            var id = byId[ids[0]];
            var inInventory = (p.inventory || []).some(function (obj) { return obj && String(obj.id) === String(id); });
            var obj = (p.discoveredObjects || []).concat(p.inventory || []).find(function (o) { return String(o.id) === String(id); });
            var verified = typeof Actionable === "undefined" || !Actionable.referenceFor || Actionable.referenceFor(obj).verified;
            var correlation = { objectId: id, context: inInventory ? "inventory" : "room" };
            if (!verified) correlation.referenceVerified = false;
            return correlation;
        } catch (e) { return null; }
    },

    _recordD198Provenance: function (entry) {
        if (!entry || !entry.d198Correlation || entry.ambiguous || entry.rejected) return false;
        // Legacy learning may still observe custom parsers. New object-specific
        // provenance requires an opcode-state witness when the reference is unverified.
        if (entry.d198Correlation.referenceVerified === false && !entry.success) return false;
        if (String(entry.d198Correlation.objectId) !== String(entry.objectId)) return false;
        var verb = AttrCalibrator.normalizeVerb(entry.verb);
        var digest = AttrCalibrator._d198ExecutableDigest();
        if (!digest) return false;
        var actionId = "opcode:" + verb;
        var key = digest + "|" + actionId + "|" + String(entry.objectId) + "|" + String(entry.d198Correlation.context || "unknown");
        var record = {
            verb: verb,
            actionId: actionId,
            executableDigest: digest,
            objectId: entry.objectId,
            context: entry.d198Correlation.context,
            provenance: entry.success ? "opcode-state" : "behavioral-transcript",
            confirmed: !!entry.success,
            direct: true,
            at: entry.at || null
        };
        if (!(entry.success || entry.behavioralAccept)) return false;
        AttrCalibrator._d198GenerationEvidence[key] = record;
        return true;
    },

    d198ProvenanceForObject: function (objectId, context) {
        var out = [];
        try {
            var digest = AttrCalibrator._d198ExecutableDigest();
            if (!digest) return out;
            Object.keys(AttrCalibrator._d198GenerationEvidence || {}).sort().forEach(function (key) {
                var record = AttrCalibrator._d198GenerationEvidence[key];
                if (!record || record.executableDigest !== digest) return;
                if (String(record.objectId) !== String(objectId)) return;
                if (context && record.context !== context) return;
                out.push(JSON.parse(JSON.stringify(record)));
            });
        } catch (e) {}
        return out;
    },

    clearD198GenerationEvidence: function () {
        AttrCalibrator._d198GenerationEvidence = {};
    },

    // Map player phrasing to the canonical verb ActionSynth/rules use.
    normalizeVerb: function (verb) {
        var v = String(verb || "").toLowerCase().replace(/\s+/g, " ").trim();
        if (!v) return v;
        if (AttrCalibrator.VERB_SYNONYMS[v]) return AttrCalibrator.VERB_SYNONYMS[v];
        return v;
    },

    // Built once from ActionSynth.rules' own verb list (generic -- not a
    // second hardcoded verb table) plus "drop"/"remove", which ActionSynth
    // synthesizes ad-hoc for inventory context rather than declaring in
    // `rules`, plus fixed multiword synonyms (turn on → switch on).
    // Longest phrases first so "switch on"/"turn on" match before a
    // shorter accidental prefix would.
    buildVerbRegex: function () {
        var verbs = {};
        try {
            if (typeof ActionSynth !== "undefined" && ActionSynth.rules) {
                Object.keys(ActionSynth.rules).forEach(function (key) {
                    if (key === "default") return;
                    (ActionSynth.rules[key] || []).forEach(function (v) { verbs[v] = true; });
                });
            }
        } catch (e) {}
        verbs.drop = true;
        Object.keys(AttrCalibrator.VERB_SYNONYMS).forEach(function (syn) { verbs[syn] = true; });
        var list = Object.keys(verbs).sort(function (a, b) { return b.length - a.length; });
        if (!list.length) return null;
        var escaped = list.map(function (v) { return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
        return new RegExp("^(" + escaped.join("|") + ")\\s+(.+)$", "i");
    },

    // Which real opcode(s) count as "this verb actually succeeded",
    // observed directly rather than inferred from transcript text.
    successOps: function (verb) {
        verb = AttrCalibrator.normalizeVerb(verb);
        if (verb === "take" || verb === "drop") return ["insert_obj", "remove_obj"];
        if (verb === "wear" || verb === "remove") return ["set_attr", "clear_attr"];
        if (verb === "switch on" || verb === "switch off") return ["set_attr", "clear_attr"];
        if (verb === "lock" || verb === "unlock") return ["set_attr", "clear_attr"];
        if (verb === "open" || verb === "close") return ["set_attr", "clear_attr"];
        return null;
    },

    _isActionSynthVerb: function (verb) {
        verb = AttrCalibrator.normalizeVerb(verb);
        if (!verb || verb === "examine") return false;
        try {
            if (typeof ActionSynth === "undefined" || !ActionSynth.rules) return false;
            var keys = Object.keys(ActionSynth.rules);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] === "default") continue;
                var list = ActionSynth.rules[keys[i]] || [];
                if (list.indexOf(verb) >= 0) return true;
            }
        } catch (e) {}
        return false;
    },

    // Pair complementary switch verbs so learning "switch on" also offers off.
    _pairedVerbs: function (verb) {
        verb = AttrCalibrator.normalizeVerb(verb);
        if (verb === "switch on") return ["switch on", "switch off"];
        if (verb === "switch off") return ["switch off", "switch on"];
        if (verb === "open") return ["open", "close"];
        if (verb === "close") return ["close", "open"];
        if (verb === "lock") return ["lock", "unlock"];
        if (verb === "unlock") return ["unlock", "lock"];
        if (verb === "wear") return ["wear", "remove"];
        return [verb];
    },

    // Per-object allowed verbs for ActionSynth radials when the game accepts
    // a command without setting the standard I6 flag bit (Glow Bar).
    allowedVerbsFor: function (objectId) {
        try {
            if (objectId == null) return [];
            var mem = (typeof AttributeSchema !== "undefined") ? AttributeSchema._getMem() : null;
            if (mem) AttrCalibrator.hydrate(mem);
            var rec = AttrCalibrator.table.objects && AttrCalibrator.table.objects[String(objectId)];
            if (!rec || !rec.allowedVerbs) return [];
            var thr = AttrCalibrator.ALLOWED_VERB_THRESHOLD;
            var out = [];
            Object.keys(rec.allowedVerbs).forEach(function (v) {
                var e = rec.allowedVerbs[v];
                if (!e) return;
                if (typeof LearnedWords !== "undefined" && LearnedWords.suppressed("allowed", objectId, v)) return;
                if (e.opcodeConfirmed) out.push(v);
                else if ((e.confirmations || 0) >= thr) out.push(v);
            });
            return out;
        } catch (e) { return []; }
    },

    _recordAllowedVerb: function (entry) {
        if (!entry || entry.objectId == null || !entry.verb) return false;
        if (entry.rejected || entry.ambiguous) return false;
        if (!(entry.success || entry.behavioralAccept)) return false;
        // Never learn the default inspect verb as a special affordance.
        if (entry.verb === "examine" || entry.verb === "look") return false;
        if (!AttrCalibrator._isActionSynthVerb(entry.verb) && entry.verb !== "take" && entry.verb !== "drop") {
            return false;
        }
        var key = String(entry.objectId);
        AttrCalibrator.table.objects[key] = AttrCalibrator.table.objects[key] || {};
        var rec = AttrCalibrator.table.objects[key];
        rec.allowedVerbs = rec.allowedVerbs || {};
        var pair = AttrCalibrator._pairedVerbs(entry.verb);
        var changed = false;
        pair.forEach(function (v) {
            var slot = rec.allowedVerbs[v] || (rec.allowedVerbs[v] = { confirmations: 0, opcodeConfirmed: false });
            if (entry.success) {
                // Structural opcode witness: confirm immediately (same class
                // as per-object takeable ground truth).
                if (!slot.opcodeConfirmed || slot.confirmations < AttrCalibrator.ALLOWED_VERB_THRESHOLD) {
                    slot.opcodeConfirmed = true;
                    slot.confirmations = Math.max(slot.confirmations || 0, AttrCalibrator.ALLOWED_VERB_THRESHOLD);
                    slot.form = v;
                    slot.at = entry.at;
                    changed = true;
                }
            } else if (entry.behavioralAccept) {
                // Accepted-no-reject: require repeated evidence on this id.
                slot.confirmations = (slot.confirmations || 0) + 1;
                slot.form = v;
                slot.at = entry.at;
                changed = true;
            }
        });
        return changed;
    },

    // Called by ZvmCapture's patched opcode methods for EVERY call, live,
    // while the game runs. Cheap no-op unless a correlation window is open.
    onOpcode: function (op, vmInstance, args, result) {
        var p = AttrCalibrator._pending;
        if (!p || !p.open) return;
        var objId = args && args[0];
        if (objId == null || String(objId) !== String(p.id)) return;
        p.trace.push({ op: op, args: args.slice(), result: result });
    },

    // D86 CUTOVER, 2026-09-14: this analyzer (D73-75's ported
    // `_pending`/observeCommand/_resolvePending) is now the SOLE real writer
    // -- the legacy _pending/_locWindow/_verbBehaviorWindow windows and
    // their observeCommand/observeLocation/observeVerbBehavior triggers are
    // removed from both entry-point hooks, see installKeypressCapture and
    // js/Input.js. Each analyzer's own live A/B equivalence proof
    // (tools/d86-verbsuccess-ab-proof.js, d86-locationglobal-ab-proof.js,
    // d86-verbbehavior-ab-proof.js) already established byte-for-byte
    // convergence with the legacy path before this cutover; the diagnostic
    // deep-clone/persist-swap machinery is removed here since these are no
    // longer shadow observers -- they write the real table and call the
    // real persist() directly, exactly as the legacy windows did.
    analyzers: {
        verbSuccess: {
            id: "diag-verbSuccess",
            prepare: function (turn) {
                if (turn.source === "ambiguous-reference" || turn.source === "stat-probe") return null;
                try {
                    if (!AttrCalibrator._verbRegex) AttrCalibrator._verbRegex = AttrCalibrator.buildVerbRegex();
                    if (!AttrCalibrator._verbRegex) return null;
                    var s = String(turn.command || "").trim();
                    var manual = typeof LearnedWords !== "undefined" ? LearnedWords.candidateForCommand(s) : null;
                    var m = AttrCalibrator._verbRegex.exec(s);
                    var extra = !m ? AttrCalibrator._splitAnyVerbNoun(s) : null;
                    if (manual) {
                        m = null;
                        extra = { verb: manual.form, noun: s.slice(manual.form.length).trim(), objectId: manual.objectId };
                    }
                    var rememberedOnly = !manual && !m && extra && AttrCalibrator.RPG_VERBS.indexOf(extra.verb) < 0;
                    if (!m && (!extra || !AttrCalibrator.dictionaryForm(extra.verb))) return null;
                    if (rememberedOnly && (!/^(typed|user-action|user-send|user-voice|user-autocomplete)$/.test(turn.source) ||
                        !/^[a-z]+$/.test(extra.verb) || !AttrCalibrator._d198ExecutableDigest())) return null;
                    var exactForm = m ? m[1].toLowerCase().replace(/\s+/g, " ") : extra.verb;
                    var verb = AttrCalibrator.normalizeVerb(exactForm);
                    var noun = m ? m[2].replace(/^(the|a|an)\s+/i, "").trim() : extra.noun;
                    // Learnability: known mutating verbs, take/drop, or any
                    // ActionSynth rule verb (so switch on is always eligible
                    // even when successOps later sees no bit flip).
                    var ops = AttrCalibrator.successOps(verb);
                    var learnable = !!(ops || verb === "take" || verb === "drop"
                        || AttrCalibrator.VERB_FLAG[verb]
                        || AttrCalibrator._isActionSynthVerb(verb) || extra);
                    if (!learnable) return null;
                    if (typeof AttributeSchema === "undefined" || typeof ZRamReader === "undefined") return null;
                    var mem = AttributeSchema._getMem();
                    if (!mem) return null;
                    var id = extra ? extra.objectId : AttributeSchema._findIdByName(mem, noun);
                    if (!id) return null;
                    var d198Correlation = AttrCalibrator._d198ScopedCorrelation(noun);
                    if (typeof Actionable !== "undefined" && Actionable.payloadPool && Actionable.payloadPool().length && (!d198Correlation || String(d198Correlation.objectId) !== String(id))) return null;
                    if (extra && (!d198Correlation || d198Correlation.referenceVerified === false)) return null;
                    turn.__diagVerbSuccessCtx = { verb: verb, exactForm: exactForm, extra: !!extra, noun: noun, id: id, ops: ops || [], trace: [], d198Correlation: d198Correlation };
                    if (rememberedOnly) {
                        turn.__diagVerbSuccessCtx.rememberedOnly = true;
                        turn.__diagVerbSuccessCtx.ops = [];
                        turn.__diagVerbSuccessCtx.digest = AttrCalibrator._d198ExecutableDigest();
                        turn.__diagVerbSuccessCtx.generation = typeof UndoRestoreSync !== 'undefined' ? UndoRestoreSync.generation : 0;
                    }
                    try { var links = ZRamReader.objectLinks(mem,id); if (links) turn.__diagVerbSuccessCtx.beforeParent = links.parent; } catch (eParent) {}
                    turn.__diagVerbSuccessCtx.beforeRoomId = typeof WorldModel !== 'undefined' && WorldModel.lastPayload && WorldModel.lastPayload.roomId;

                    if (manual) {
                        if (String(manual.objectId) !== String(id)) return null;
                        turn.__diagVerbSuccessCtx.learnedWordCandidate = manual;
                        turn.__diagVerbSuccessCtx.extra = true;
                    }
                    // codex #455/#456: analyze() must never read live DOM --
                    // captureAfter freezes the transcript slice at the SAME
                    // moment endLine itself is frozen (boundary-stamp or
                    // natural close, whichever first), matching the v13
                    // frozen-post-turn-signal contract (js/TurnRecorder.js's
                    // own header comment) that D84's real bug (#412-414)
                    // already established this exact requirement for.
                    return {
                        wantsOpcodes: true,
                        hasWitness: function () { return true; },
                        captureAfter: function (t) {
                            var text = "";
                            try {
                                if (typeof $ !== "undefined") {
                                    var lines = $("#windowport .BufferWindow .BufferLine").toArray();
                                    var end = (t.endLine != null) ? t.endLine : lines.length;
                                    var ownedLines = lines.slice(t.startLine || 0, end);
                                    if (t.__diagVerbSuccessCtx.rememberedOnly) ownedLines = ownedLines.filter(function (line) {
                                        if (line.classList && (line.classList.contains('pl-stat-probe') || line.classList.contains('pl-carry-probe'))) return false;
                                        var value = String(line.textContent || '').replace(/\u00a0/g, ' ').trim().replace(/^>\s*/, '').trim();
                                        return value && value.toLowerCase() !== t.command.trim().toLowerCase();
                                    });
                                    text = ownedLines.map(function (l) { return l.textContent || ""; }).join(t.__diagVerbSuccessCtx.rememberedOnly ? "\n" : " ");
                                }
                            } catch (eT) {}

                            try {
                                var parentMem = AttributeSchema._getMem(), parentLinks = parentMem && ZRamReader.objectLinks(parentMem,id);
                                if (parentLinks) t.__diagVerbSuccessCtx.afterParent = parentLinks.parent;
                            } catch (eParent) {}
                            return text;
                        }
                    };
                } catch (e) { return null; }
            },
            observeOpcode: function (turn, op, vmInstance, args, result) {
                var ctx = turn.__diagVerbSuccessCtx;
                if (!ctx) return;
                var objId = args && args[0];
                if (objId == null || String(objId) !== String(ctx.id)) return;
                ctx.trace.push({ op: op, args: args.slice(), result: result });
            },
            analyze: function (turn) {
                try {
                    var ctx = turn.__diagVerbSuccessCtx;
                    if (!ctx) return;
                    var opsList = ctx.ops || [];
                    var mutated = opsList.length > 0 && ctx.trace.some(function (t) { return opsList.indexOf(t.op) >= 0; });

                    var noTransfer = (ctx.verb === 'take' || ctx.verb === 'drop') &&
                        ctx.beforeParent != null && ctx.afterParent != null &&
                        String(ctx.beforeParent) === String(ctx.afterParent);
                    if (noTransfer) mutated = false;
                    // Frozen at boundary-stamp/natural-close time by
                    // captureAfter above -- never read live here.
                    var text = turn.analyzerSnapshots["diag-verbSuccess"] || "";
                    // Parser/game refusal patterns already used by this file
                    // (comparison signal, not phrase-mining of success prose).
                    var failedText = /\b(can'?t|cannot|already|don't|dont|do not|not open|not close|nothing happens|that's not a verb|i don't know|i do not know|you can't|you cannot)\b/i.test(text);
                    if (ctx.extra && /\?|\b(?:not|unknown|understood|which do you mean|no such|not here|not important|not holding)\b/i.test(text)) failedText = true;
                    if (ctx.extra && AttrCalibrator.extraVerbRefusal(text)) failedText = true;
                    if (ctx.rememberedOnly && /\?|\b(?:press (?:any|a) key|do you (?:want|wish)|what do you|which|first you|you (?:must|need|have to)|please (?:answer|specify)|only understood|not a verb|no effect)\b/i.test(text)) failedText = true;
                    if (ctx.rememberedOnly && /\b(?:isn't|aren't|doesn't|didn't|won't|unrecognized|unrecognised|understand|nothing)\b/i.test(text)) failedText = true;
                    // Opcode mutation = structural success. No mutation + no
                    // refusal = accepted behavioral success (Glow Bar turn-on
                    // without I6 switchable bit). Ambiguous only when both
                    // mutation and refusal text appear together.
                    var entry = {
                        verb: ctx.verb, noun: ctx.noun, objectId: ctx.id, command: turn.command,
                        trace: ctx.trace, beforeRoomId:ctx.beforeRoomId, beforeParent:ctx.beforeParent, afterParent:ctx.afterParent,
                        success: !!(mutated && !failedText),
                        behavioralAccept: !!(!noTransfer && !mutated && !failedText && text && String(text).trim().length > 0),
                        rejected: !!failedText,
                        ambiguous: !!(mutated && failedText),
                        d198Correlation: ctx.d198Correlation,
                        exactForm: ctx.exactForm,
                        learnedWordCandidate: ctx.learnedWordCandidate,
                        submissionId: turn.id != null ? turn.id : turn.submissionId,
                        pageEpoch: turn.pageEpoch,
                        at: Date.now()
                    };
                    if (ctx.rememberedOnly) {
                        entry.rememberedOnly = true;
                        entry.digest = ctx.digest;
                        entry.generation = ctx.generation;
                        entry.responseObserved = !!String(text).split(/\n/).filter(function (line) {
                            var value = line.replace(/\u00a0/g, ' ').trim().replace(/^>\s*/, '').trim();
                            return value && value.toLowerCase() !== turn.command.trim().toLowerCase();
                        }).length;
                        entry.success = false;
                        entry.behavioralAccept = false;
                    }
                    // Preserved byte-for-byte (existing diagnostic surface,
                    // unaffected by cutover -- same entry shape the legacy
                    // _resolvePending always wrote here).
                    if (!window.__PARCHLOCK_ATTR_TRACE__) window.__PARCHLOCK_ATTR_TRACE__ = [];
                    window.__PARCHLOCK_ATTR_TRACE__.push(entry);
                    if (window.__PARCHLOCK_ATTR_TRACE__.length > 200) window.__PARCHLOCK_ATTR_TRACE__.shift();
                    if (!entry.ambiguous) {
                        AttrCalibrator.record(entry); // real table, real persist() -- this analyzer is now the sole writer
                    }
                } catch (e) {}
            }
        },

        // D84's `_locWindow`/observeLocation/`_resolveLocationWindow`,
        // ported as a TurnRecorder analyzer in TRUE deep-clone DIAGNOSTIC
        // MODE ONLY (not a real writer). Unlike verbSuccess, the ENTIRE
        // read-RAM-and-correlate step happens inside `captureAfter` itself
        // (not split between observeOpcode/analyze), because the legacy
        // logic was always a single, synchronous "read current state once,
        // correlate, maybe persist" operation with no accumulation phase --
        // moving that whole operation to run at the correct FROZEN moment
        // (boundary-stamp or natural close, exactly like `_resolveLocationWindow`
        // was always meant to, before D86 stage 1/v13 found the underlying
        // live-read timing bug that also affects the REAL window, see
        // PRODUCTION_PLAN.md D86's v13 entry) fixes the timing class of bug
        // without needing a separate analyze() step. `textBefore` is
        // captured in `prepare()` (safe at open time -- nothing else can
        // have mutated state before this turn's own command is accepted).
        locationGlobal: {
            id: "diag-locationGlobal",
            prepare: function (turn) {
                try {
                    if (typeof AttributeSchema === "undefined" || typeof ZRamReader === "undefined") return null;
                    var mem = AttributeSchema._getMem();
                    if (!mem) return null;
                    var h = ZRamReader.header(mem);
                    if (!h) return null;
                    var textBefore = AttrCalibrator._currentRoomStatusText();
                    var before = AttrCalibrator.locationSnapshot(mem);
                    return {
                        hasWitness: function () { return true; },
                        captureAfter: function (t) {
                            var textAfter = AttrCalibrator._currentRoomStatusText();
                            var mem2 = AttributeSchema._getMem();
                            if (mem2) AttrCalibrator._correlateLocation(mem2, textBefore, textAfter, before);
                            return { textBefore: textBefore, textAfter: textAfter };
                        }
                    };
                } catch (e) { return null; }
            },
            analyze: function () {}
        },

        // D85's `_verbBehaviorWindow`/observeVerbBehavior/`_resolveVerbBehavior`,
        // ported as a TurnRecorder analyzer in TRUE deep-clone DIAGNOSTIC
        // MODE ONLY (not a real writer). Same shape as locationGlobal above:
        // the whole read-transcript-and-correlate step happens inside
        // `captureAfter`, frozen at the correct boundary-stamp/natural-close
        // moment, using `_correlateVerbBehavior` (shared with the real
        // window, never duplicated) with `table`/`persist` swapped to a
        // clone baselined ONCE in `prepare()` (before either window's timer
        // could fire) -- the exact discipline codex's #455/#456 (frozen
        // reads) and this file's own proactively-found double-count bug
        // (early baseline) both established for the other two analyzers.
        verbBehavior: {
            id: "diag-verbBehavior",
            prepare: function (turn) {
                if (turn.source === "ambiguous-reference") return null;
                try {
                    var split = AttrCalibrator._splitAnyVerbNoun(turn.command);
                    if (!split) return null;
                    return {
                        hasWitness: function () { return true; },
                        captureAfter: function (t) {
                            var text = "";
                            try {
                                if (typeof $ !== "undefined") {
                                    var lines = $("#windowport .BufferWindow .BufferLine").toArray();
                                    var end = (t.endLine != null) ? t.endLine : lines.length;
                                    text = lines.slice(t.startLine || 0, end).map(function (l) { return (l.textContent || "").trim(); }).filter(Boolean).join(" ");
                                }
                            } catch (eT) {}
                            try {
                                if (typeof AttributeSchema !== "undefined") {
                                    var mem = AttributeSchema._getMem();
                                    if (mem) AttrCalibrator._correlateVerbBehavior(mem, split.verb, split.noun, split.objectId, text); // real table, real persist()
                                }
                            } catch (eC) {}
                            return { verb: split.verb, noun: split.noun, objectId: split.objectId, text: text };
                        }
                    };
                } catch (e) { return null; }
            },
            analyze: function () {}
        }
    },

    // D84: `parent(playerId)` is not universal (D79: wump2ka's player has no
    // real parent; confirmed live on Bronze.zblorb.js: parent is object 1,
    // real compiled shortName "Class", a metaclass placeholder, not a room).
    // `ZRamReader.findLocationGlobal`'s scoring scan is the existing fallback
    // for that case, but it is still a heuristic guess. A fixed universal
    // global slot is NOT a safe replacement either -- directly disproven
    // live: Bronze's real "location" tracker is global slot 0, but
    // Anchorhead's global 0 never changes at all (Anchorhead instead relies
    // on real parent(player), so it never needed this path) -- the position
    // varies per compiled game/library revision, so it must be LEARNED per
    // game from real, repeated, confirmed evidence, exactly like every other
    // calibrated fact in this file, not assumed from one game's behavior.
    //
    // The confirmation signal is a REAL room-name-text CHANGE in the story's
    // own status display (`.GridWindow.reverse`, via `WorldModel.
    // refineRoomDisplayName` -- the same already-reviewed, non-text-mining
    // carve-out D54/D80 already establish for reading a story's own display
    // text, reused here rather than re-implemented). The text itself is
    // NEVER used as an identity source (D24/D47 -- identity is the RAM
    // ObjectId only); it is only the TRIGGER that says "a real transition
    // just happened," the same way MapTopology already uses a status-line
    // change as a structural signal, not a text-mined one.
    //
    // A global slot is confirmed only once ALL of the following hold across
    // CONFIRM_THRESHOLD independent observations, with zero contradictions:
    // (a) its value is a real, non-meta object id every time, (b) revisiting
    // the SAME room-name text later reproduces the SAME value (the strongest
    // available proof -- a coincidental one-off match cannot survive a
    // revisit), (c) any single contradicting observation (same text,
    // different value) permanently disqualifies that slot for this game,
    // matching this file's existing "a fluke never contaminates a confirmed
    // answer, a genuine inconsistency never settles on a wrong one" rule for
    // verb-bit learning above.
    LOCATION_CONFIRM_THRESHOLD: 3,

    // Reuses WorldModel's own already-reviewed column-selection logic
    // (D80) via a throwaway payload -- never re-implements status-text
    // parsing here. Returns "" (falsy) if WorldModel/jQuery aren't
    // available, which safely short-circuits every caller below.
    _currentRoomStatusText: function () {
        try {
            if (typeof WorldModel === "undefined" || !WorldModel.refineRoomDisplayName) return "";
            // `refineRoomDisplayName` short-circuits on a falsy `roomName`
            // (its own guard for "no payload yet") before ever reading the
            // DOM -- a non-empty placeholder is required so it actually
            // proceeds to read `.GridWindow.reverse`.
            return String(WorldModel.refineRoomDisplayName({ roomName: "?" }) || "");
        } catch (e) { return ""; }
    },

    // Investigated and rejected first: hooking the interpreter's `variable`
    // opcode to catch the WRITE that sets a room's global tracker. Direct
    // inspection of `lib/zvm.js`'s own JIT code-generator proved this
    // insufficient -- the compiled path for "store into a global" is
    // `e.ram.setUint16(...)`, a direct per-instance memory-view write that
    // bypasses `variable()` entirely (confirmed live: watching `variable`
    // during a real, confirmed room transition on Bronze.zblorb.js captured
    // only the OLD room's id, never the new one). Patching the memory-view
    // write method itself would mean hooking every single RAM write in the
    // whole VM -- a far hotter, far less semantically-scoped patch than the
    // six opcodes ZvmCapture.js already patches (each of which DOES route
    // through its own named method for every call that matters), and
    // explicitly out of scope for that file's sanctioned, narrow patch
    // surface. Reading already-settled RAM directly instead (`ZRamReader.u16`,
    // the exact same primitive `findLocationGlobal` already uses for its own
    // scoring scan) needs no new patch surface at all, adds no per-call
    // overhead to the VM's hot path, and is equally a real RAM fact, not a
    // guess.
    _isMetaLocationName: function (nm) {
        nm = String(nm || "");
        return /^(class|object|routine|string|kind|nothing|compass|compassdirection|direction|directions)$/i.test(nm);
    },

    locationSnapshot: function (mem) {
        var h = ZRamReader.header(mem), out = [];
        if (!h) return out;
        for (var g = 0; g < 240 && h.globals + g * 2 + 1 < mem.byteLength; g++) {
            out.push(ZRamReader.u16(mem, h.globals + g * 2));
        }
        return out;
    },

    // Reads the FULL globals table directly from already-settled RAM (a
    // pure read, the same primitive `findLocationGlobal` itself uses) and
    // correlates every valid, non-meta candidate slot's CURRENT value
    // against the confirmed room-name-text trigger. No opcode/write hook
    // involved at all -- see the comment above `_isMetaLocationName` for why
    // that approach was tried first and rejected.
    //
    // Reads/writes `AttrCalibrator.table.locationGlobal` and calls
    // `AttrCalibrator.persist` directly -- this analyzer (D86 CUTOVER) is
    // the sole real writer. Takes `textBefore`/`textAfter` as explicit
    // parameters (captured by the caller at the correct frozen moment)
    // rather than reading any shared window state.
    _correlateLocation: function (mem, textBefore, textAfter, before) {
        try {
            AttrCalibrator.hydrate(mem);
            var loc = AttrCalibrator.table.locationGlobal;
            if (!loc) loc = AttrCalibrator.table.locationGlobal = { candidates: {}, confirmedSlot: null, confirmedSlots: [] };
            var after = AttrCalibrator.locationSnapshot(mem);
            before = before || [];
            var player = ZRamReader.findPlayerId(mem);
            var enclosing = player ? ZRamReader.enclosingRoom(mem, player) : 0;
            var groups = {};
            for (var g = 0; g < after.length; g++) {
                var val = after[g], prev = before[g];
                if (!ZRamReader.isLocationObject(mem, val, player) || (enclosing && val !== enclosing)) {
                    delete loc.candidates[g];
                    continue;
                }
                // P13b: a slot dropped once the cohort was stable is not re-learned
                // while that cohort stays confirmed.
                if (loc.dropped && loc.dropped.indexOf(g) >= 0) continue;
                var c = loc.candidates[g];
                if (!c) c = loc.candidates[g] = { transitions: 0, returns: 0, seen: {}, history: [] };
                if (val !== prev && ZRamReader.isLocationObject(mem, prev, player)) {
                    // A changed descriptor, known containment, or an already learned
                    // cohort supplies evidence; a label is never an identity key.
                    if (enclosing || (textAfter && textAfter !== textBefore) || loc.confirmedSlots.indexOf(g) >= 0) {
                        if (c.seen) {
                            c.seen[prev] = true;
                            if (c.seen[val]) c.returns++;
                            c.seen[val] = true;
                        } else c.returns++; // P13b compacted confirmed slot: seen{} became seenCount
                        c.transitions++;
                        c.history.push(prev + ">" + val);
                        if (c.history.length > 12) c.history.shift();
                    }
                }
                if (c.transitions < AttrCalibrator.LOCATION_CONFIRM_THRESHOLD || !c.returns) continue;
                var key = c.history.join(",") + ":" + val;
                (groups[key] || (groups[key] = [])).push(g);
            }
            var ranked = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.length - a.length; });
            // Mirrored globals are one hypothesis. Divergent equal-support
            // hypotheses remain unresolved, rather than winning by slot order.
            var winner = ranked.length && (!ranked[1] || ranked[0].length > ranked[1].length) ? ranked[0] : [];
            var same = winner.length && JSON.stringify(winner) === JSON.stringify(loc.confirmedSlots || []);
            loc.stableFor = same ? (loc.stableFor || 0) + 1 : 0;
            if (!winner.length) delete loc.dropped; // cohort lost: every slot may be learned again
            loc.confirmedSlots = winner;
            loc.confirmedSlot = winner.length ? winner[0] : null;
            AttrCalibrator.persist(mem);
            return !!winner.length;
        } catch (e) { return false; }
    },

    // Consulted by `ZRamReader.findLocationGlobal` ahead of its own scoring
    // scan. Returns null until CONFIRM_THRESHOLD consistent, uncontradicted
    // observations exist for this exact game (gameIdentityKey-scoped,
    // hydrated fresh here so a caller need not hydrate separately).
    confirmedLocationGlobal: function (mem) {
        try {
            if (mem) AttrCalibrator.hydrate(mem);
            var loc = AttrCalibrator.table.locationGlobal;
            return loc && loc.confirmedSlot != null ? loc.confirmedSlot : null;
        } catch (e) { return null; }
    },

    // D85: some games keep a verb as real, valid parser grammar (D34's
    // dictionary-word check correctly says it exists) while the compiled
    // ACTION routine for it is a permanent, game-wide stub -- confirmed
    // live on AOTYRZ.z5.js: "examine"/"x" are genuine dictionary words, but
    // examining ANY object prints the identical static line ("...have not
    // been implemented..."), regardless of which object, because the
    // author overrode the action but left the grammar line in place.
    // `ActionSynth.verbsForAttrs` unconditionally offers "examine" for
    // every single object (it is `ActionSynth.rules.default`), so a
    // game-wide stub floods the radial with an action that can never
    // succeed. Grammar validity and action-routine behavior are genuinely
    // different facts; D34 answers the first correctly and was never wrong
    // -- this closes the second, separate gap.
    //
    // No RAM signal exists to observe this the way take/open/wear do:
    // examine (successful or stubbed) mutates no attribute and moves no
    // object, so there is nothing for the six patched opcodes to see
    // either way. The only real, structural, non-guessed signal available
    // is the printed response text ITSELF, compared across MULTIPLE
    // different real objects -- not read for what it says (never matching
    // a phrase like "not implemented", which would be fragile and
    // English-specific), only compared for byte-identical equality. If the
    // exact same response text appears for `VERB_DISABLE_CONFIRM_THRESHOLD`
    // different real object nouns, that is objective proof the verb is not
    // doing per-object work in this game, independent of what the text
    // means. This is the same class of already-accepted precedent as this
    // file's own `failedText` corroboration (AttrCalibrator's `_resolvePending`
    // above) and D54/D80's "read the story's own display text, never as an
    // identity source" carve-out -- text used as a comparison signal, never
    // as a guessed meaning.
    VERB_DISABLE_CONFIRM_THRESHOLD: 3,

    // Generic "verb noun" split for THIS mechanism only: `_verbRegex`
    // (shared with `observeCommand`) is built ONLY from verbs already known
    // to `ActionSynth.rules` -- by definition it can never recognize a verb
    // we do not yet know is meaningful (e.g. "look" as a substitute for a
    // disabled "examine", which is not an ActionSynth rule verb at all).
    // This instead accepts ANY leading word whose remainder matches a REAL,
    // currently-visible object noun, cross-referenced against the live
    // payload's own discoveredObjects/inventory -- never guessed, never a
    // second hardcoded verb list.
    _splitAnyVerbNoun: function (command) {
        if (typeof Actionable !== "undefined" && Actionable.withResolutionPool && !Actionable._resolutionPool && !Actionable._lazyPoolScope) {
            return Actionable.withResolutionPool(function () { return AttrCalibrator._splitAnyVerbNoun(command); });
        }
        try {
            var s = String(command || "").trim();
            if (!s) return null;
            // Prefer multiword canonical verbs (turn on / switch on) so
            // "turn on glow bar" does not split as verb=turn, noun=on glow bar.
            var verb = null;
            var noun = null;
            var low = s.toLowerCase();
            var synKeys = Object.keys(AttrCalibrator.VERB_SYNONYMS || {}).sort(function (a, b) { return b.length - a.length; });
            for (var si = 0; si < synKeys.length; si++) {
                var sk = synKeys[si];
                if (low.indexOf(sk + " ") === 0) {
                    verb = AttrCalibrator.normalizeVerb(sk);
                    noun = s.slice(sk.length).replace(/^(the|a|an)\s+/i, "").trim().toLowerCase();
                    break;
                }
            }
            if (!verb) {
                var sp = s.indexOf(" ");
                if (sp < 0) return null;
                verb = AttrCalibrator.normalizeVerb(s.slice(0, sp));
                noun = s.slice(sp + 1).replace(/^(the|a|an)\s+/i, "").trim().toLowerCase();
            }
            if (!verb || !noun) return null;
            if (typeof WorldModel === "undefined" || !WorldModel.lastPayload) return null;
            var p = WorldModel.lastPayload;
            var pool = (p.discoveredObjects || []).concat(p.inventory || []);
            // codex #441: ActionSynth.commandsForObject submits
            // Actionable.commandNounFor(obj) -- a verified real-text ALIAS,
            // not always obj.name (D64). A radial/click command built from
            // that alias reaches the VM fine (D86 stage 1), but would
            // silently fail to match here if only obj.name were checked,
            // leaving this mechanism blind to alias-driven commands. Match
            // either the structural name or the verified alias, never a
            // guess -- both are already-established, non-text-mined nouns.
            var matches = pool.filter(function (o) {
                if (!o) return false;
                if (typeof Actionable !== "undefined" && Actionable.referenceFor) {
                    var reference = Actionable.referenceFor(o);
                    if (!reference.unique) return false;
                    if (String(reference.noun).toLowerCase() === noun) return true;
                }
                if (String(o.name).toLowerCase() === noun) return true;
                var alias = (typeof Actionable !== "undefined" && Actionable.commandNounFor) ? Actionable.commandNounFor(o) : null;
                return alias && String(alias).toLowerCase() === noun;
            });
            // A parser-owned alias can still be shared by several objects.
            // The story may ask the player to disambiguate, but calibration
            // must not attribute that response to whichever payload entry
            // happened to come first. Collapse duplicate payload records by
            // object id and proceed only when the target is structurally unique.
            var byId = {};
            matches.forEach(function (o) {
                if (o && o.id != null) byId[String(o.id)] = o;
            });
            var ids = Object.keys(byId);
            if (ids.length !== 1) return null;
            var match = byId[ids[0]];
            return { verb: verb, noun: noun, objectId: match.id };
        } catch (e) { return null; }
    },

    // Runs two independent, cheap checks: (1) if this command targets the
    // game's CURRENT default inspect verb, correlate its response text
    // against other objects already tried with that same verb, to detect a
    // global stub; (2) if the default inspect verb is ALREADY confirmed
    // disabled, and this command uses a DIFFERENT verb, watch whether that
    // verb's response text varies per-object (proof of real, working,
    // per-object behavior) to learn it as the replacement.
    //
    // Reads/writes `AttrCalibrator.table.verbBehavior` and calls
    // `AttrCalibrator.persist` directly -- this analyzer (D86 CUTOVER) is
    // the sole real writer. Takes verb/noun/objectId/text as explicit
    // parameters (captured by the caller at the correct frozen moment)
    // rather than reading any shared window state.
    _correlateVerbBehavior: function (mem, verb, noun, objectId, text) {
        try {
            if (!text) return false;
            AttrCalibrator.hydrate(mem);
            var t = AttrCalibrator.table;
            if (!t.verbBehavior) t.verbBehavior = { disabled: {}, substituteVerb: null };
            var vb = t.verbBehavior;
            var currentDefault = vb.substituteVerb || "examine";
            var changed = false;

            // codex #444: keyed by stable objectId, not noun text -- a
            // single real object examined under both its structural name
            // and a verified alias (codex #441's fix) must count as ONE
            // distinct object, never two. Noun text is kept alongside purely
            // as debug metadata, never as the distinctness key.
            var objKey = (objectId != null) ? String(objectId) : ("noun:" + noun);
            if (verb === currentDefault && !(vb.disabled[verb] && vb.disabled[verb].confirmed)) {
                var d = vb.disabled[verb] || (vb.disabled[verb] = { responsesByObject: {}, confirmed: false });
                d.responsesByObject[objKey] = { noun: noun, text: text };
                var objIds = Object.keys(d.responsesByObject);
                if (objIds.length >= AttrCalibrator.VERB_DISABLE_CONFIRM_THRESHOLD) {
                    var texts = objIds.map(function (k) { return d.responsesByObject[k].text; });
                    if (texts.every(function (tx) { return tx === texts[0]; })) {
                        d.confirmed = true;
                        changed = true;
                    }
                } else {
                    changed = true;
                }
            } else if (vb.disabled[currentDefault] && vb.disabled[currentDefault].confirmed && verb !== currentDefault && !vb.substituteVerb) {
                // The current default is already confirmed disabled, and this
                // is a DIFFERENT verb the player actually typed. Track its
                // responses per-object; confirm it as the substitute only
                // once it demonstrably varies across different real objects
                // (proof of real per-object work, not another stub).
                var s = vb.substituteCandidates || (vb.substituteCandidates = {});
                var c = s[verb] || (s[verb] = { responsesByObject: {} });
                c.responsesByObject[objKey] = { noun: noun, text: text };
                changed = true; // Persist provisional observations even while promotion is ignored.
                var cObjIds = Object.keys(c.responsesByObject);
                if (cObjIds.length >= AttrCalibrator.VERB_DISABLE_CONFIRM_THRESHOLD) {
                    var cTexts = cObjIds.map(function (k) { return c.responsesByObject[k].text; });
                    var allDistinct = cTexts.every(function (tx, i) { return cTexts.indexOf(tx) === i; });
                    if (allDistinct && !(typeof LearnedWords !== "undefined" && LearnedWords.inspectSuppressed("candidate:" + verb))) {
                        vb.substituteVerb = verb;
                        changed = true;
                    }
                }
            }
            if (changed) AttrCalibrator.persist(mem);
            return changed;
        } catch (e) { return false; }
    },

    // Consulted by `ActionSynth.verbsForAttrs`. Returns the verb that should
    // be offered as the default "inspect this object" action: the learned
    // substitute once confirmed, otherwise plain "examine" (unchanged
    // behavior for every game that has not confirmed a stub -- additive).
    defaultInspectVerb: function () {
        try {
            var vb = AttrCalibrator.table.verbBehavior;
            if (typeof LearnedWords !== "undefined" && LearnedWords.inspectSuppressed("substitute")) return "examine";
            if (typeof LearnedWords !== "undefined" && vb && vb.substituteVerb && LearnedWords.inspectSuppressed("candidate:" + vb.substituteVerb)) return "examine";
            return (vb && vb.substituteVerb) || "examine";
        } catch (e) { return "examine"; }
    },

    // True once the CURRENT default inspect verb (examine, or an already-
    // confirmed substitute) is itself confirmed disabled with no
    // replacement learned yet -- callers should omit it entirely rather
    // than offer a command known to always fail, per this project's
    // honest-absence-over-guessing discipline (D24).
    inspectVerbCurrentlyDisabled: function () {
        try {
            var vb = AttrCalibrator.table.verbBehavior;
            if (!vb) return false;
            var current = vb.substituteVerb || "examine";
            if (typeof LearnedWords !== "undefined") {
                current = AttrCalibrator.defaultInspectVerb();
                if (LearnedWords.inspectSuppressed("disabled:" + current)) return false;
            }
            return !!(vb.disabled[current] && vb.disabled[current].confirmed);
        } catch (e) { return false; }
    },

    // D73 Phase C: mirrors ZRamReader's diagonal-exit calibration pattern
    // exactly (gameIdentityKey from the header release+serial, one JSON
    // blob in localStorage, hydrate-once-per-game guard) -- reused, not
    // reinvented.
    gameIdentityKey: function (mem) {
        if (typeof LearningStores !== 'undefined' && LearningStores.identity) {
            var id = LearningStores.identity(mem); return id && id.identityKey;
        }
        return null;
    },
    hydrate: function (mem) {
        var key = AttrCalibrator.gameIdentityKey(mem);
        if (!key) { AttrCalibrator.hydratedForGame = null; AttrCalibrator._loadingKey = null; AttrCalibrator.table = { version: 2, verbs: {}, objects: {} }; return; }
        if (AttrCalibrator.hydratedForGame === key) return;
        if (AttrCalibrator._loadingKey !== key) {
            AttrCalibrator._loadingKey = key;
            AttrCalibrator.hydratedForGame = null;
            AttrCalibrator.table = { version: 2, verbs: {}, objects: {} };
        }
        var owned = LearningStores.readOwned('attrCalib', LearningStores.identity(mem));
        AttrCalibrator.hydratedForGame = key;
        AttrCalibrator.table = { version: 2, verbs: {}, objects: {} };
        try {
            if (typeof localStorage === "undefined") return;
            var raw = owned.value;
            var parsed = raw ? JSON.parse(raw) : null;
            if (parsed && parsed.version === 2) AttrCalibrator.table = parsed;
        } catch (e) {}
    },
    // P13b R2: compaction only (no object LRU). Drops evidence that can no
    // longer change any learned answer:
    //  - a flag whose mutatedBit is set keeps only that bit as candidate;
    //  - once confirmedSlots has been stable for LOCATION_STABLE_TURNS, the
    //    non-confirmed locationGlobal slots are dropped (and not re-learned
    //    while that cohort stays confirmed), and each confirmed slot's seen{}
    //    map becomes a seenCount; never while a slot is still confirming;
    //  - exactForms keep every form with confirmations > 0.
    LOCATION_STABLE_TURNS: 8,
    compactTable: function (t) {
        if (!t || typeof t !== "object") return t;
        Object.keys(t.verbs || {}).forEach(function (f) {
            var v = t.verbs[f];
            if (v && typeof v.mutatedBit === "number" && v.candidates && v.candidates[v.mutatedBit]) {
                var keep = {}; keep[v.mutatedBit] = v.candidates[v.mutatedBit]; v.candidates = keep;
            }
        });
        var loc = t.locationGlobal;
        if (loc && loc.candidates && Array.isArray(loc.confirmedSlots) && loc.confirmedSlots.length &&
            (loc.stableFor || 0) >= AttrCalibrator.LOCATION_STABLE_TURNS) {
            Object.keys(loc.candidates).forEach(function (g) {
                var n = Number(g);
                if (loc.confirmedSlots.indexOf(n) < 0) {
                    delete loc.candidates[g];
                    loc.dropped = loc.dropped || [];
                    if (loc.dropped.indexOf(n) < 0) loc.dropped.push(n);
                } else {
                    var c = loc.candidates[g];
                    if (c && c.seen && c.returns > 0) { c.seenCount = Object.keys(c.seen).length; delete c.seen; }
                }
            });
        }
        Object.keys(t.objects || {}).forEach(function (id) {
            var ef = t.objects[id] && t.objects[id].exactForms;
            if (ef) Object.keys(ef).forEach(function (form) { if (!(ef[form] && ef[form].confirmations > 0)) delete ef[form]; });
        });
        return t;
    },
    learningKeyFor: function (inputs) { return inputs && typeof inputs.identityKey === "string" && inputs.identityKey ? "PL_AttrCalib_" + inputs.identityKey : null; },
    persist: function (mem) {
        var key = AttrCalibrator.gameIdentityKey(mem);
        if (!key || AttrCalibrator.hydratedForGame !== key) return;
        try {
            if (typeof localStorage === "undefined") return;
            AttrCalibrator.compactTable(AttrCalibrator.table);
            if (typeof LearningStores !== "undefined") LearningStores.persist("attrCalib", { identityKey: key }, JSON.stringify(AttrCalibrator.table), function () { if (AttrCalibrator.hydratedForGame === key) AttrCalibrator.table = { version: 2, verbs: {}, objects: {} }; });
            else localStorage.setItem("PL_AttrCalib_" + key, JSON.stringify(AttrCalibrator.table));
        } catch (e) {}
    },

    // Turns one resolved, non-ambiguous observation into learned evidence.
    // Bit-level learning (open/wear/lock/switch) only finalizes a flag's
    // override once the SAME bit has been the consistent success-mutation
    // across CONFIRM_THRESHOLD observations, with any disagreeing bit
    // resetting that flag's candidate tally rather than being averaged
    // away -- a single fluke never contaminates an already-confirmed flag,
    // and a genuinely inconsistent signal never settles on a wrong answer.
    record: function (entry) {
        try {
            if (entry && entry.learnedWordCandidate && typeof LearnedWords !== "undefined") {
                LearnedWords.recordWitness(entry);
                return; // Revision evidence is separate; never overwrite original calibration.
            }
            var mem = AttributeSchema._getMem();
            if (!mem) return;
            AttrCalibrator.hydrate(mem);
            if (entry && entry.rememberedOnly) {
                if (AttrCalibrator.recordRememberedForm(entry)) AttrCalibrator.persist(mem);
                return; // Never promote remembered preferences into flags or capabilities.
            }
            if (entry && entry.verb) entry.verb = AttrCalibrator.normalizeVerb(entry.verb);
            var flag = AttrCalibrator.VERB_FLAG[entry.verb];
            var changed = false;
            if (flag) {
                if (entry.success) {
                    var positive = /^(open|wear|switch on|lock)$/.test(entry.verb);
                    var operation = positive ? "set_attr" : "clear_attr";
                    var bits = {};
                    entry.trace.forEach(function (t) {
                        if (t.op === operation && t.args && String(t.args[0]) === String(entry.objectId)) bits[t.args[1]] = true;
                    });
                    var v = AttrCalibrator.table.verbs[flag];
                    if (!v) v = AttrCalibrator.table.verbs[flag] = { candidates: bits, mutatedBit: null, confirmations: 0, polarities: {} };
                    Object.keys(v.candidates).forEach(function (bit) { if (!bits[bit]) delete v.candidates[bit]; });
                    v.polarities = v.polarities || {};
                    v.polarities[operation] = true;
                    v.confirmations++;
                    var remaining = Object.keys(v.candidates);
                    // Complementary actions must agree on one bit; incidental
                    // bookkeeping mutations must not win by trace order.
                    v.mutatedBit = remaining.length === 1 && v.confirmations >= AttrCalibrator.CONFIRM_THRESHOLD &&
                        v.polarities.set_attr && v.polarities.clear_attr ? Number(remaining[0]) : null;
                    changed = true;
                }
            } else if (entry.verb === "take" && entry.success) {
                var key = String(entry.objectId);
                AttrCalibrator.table.objects[key] = AttrCalibrator.table.objects[key] || {};
                AttrCalibrator.table.objects[key].takeable = entry.success;
                AttrCalibrator.table.objects[key].confirmedAt = entry.at;
                changed = true;

                // D75: a successful take's `insert_obj(itemId, holderId)`
                // call names the REAL object the item just became a child
                // of. A transfer is not sufficient carrying evidence: custom TAKE
                // can consume the object into a detached bucket. Found live:
                // wump2ka.z5.js's `resolveInventoryRootId` (ZRamProvider.js)
                // gates its fallback candidate on the `animate` bit, which
                // this exact game randomizes per session (D58) -- when that
                // bit happens to read false on the true holder (an unnamed
                // "(CustomPlayer)"-style prop object), the fallback never
                // even considers it and inventory silently reads empty
                // despite the player genuinely holding real items. This
                // single real observation is strictly better evidence than
                // any attribute-bit heuristic, so it's recorded once and
                // reused as the confirmed inventory root from then on.
                // A room reinsertion is not carrying: never admit a known
                // room or the turn's frozen original room as that holder.
                if (entry.success) {
                    var insertCall = entry.trace.slice().reverse().find(function (t) { return t.op === "insert_obj" && t.args && String(t.args[0]) === String(entry.objectId); });
                    var holderId = insertCall && insertCall.args && insertCall.args[1];
                    if (holderId != null && String(holderId) !== String(entry.beforeRoomId) && !AttrCalibrator.inventoryRootIsRoom(mem,holderId) && AttrCalibrator.inventoryHolderInWorld(mem,holderId,entry.beforeRoomId) && AttrCalibrator.table.inventoryRootId !== holderId) {
                        AttrCalibrator.table.inventoryRootId = holderId;
                        changed = true;
                    }
                }
            }
            // Per-object functionable verbs (opcode or accepted-no-reject).
            if (AttrCalibrator._recordAllowedVerb(entry)) changed = true;
            if (AttrCalibrator.recordExactForm(entry)) changed = true;
            AttrCalibrator._recordD198Provenance(entry);
            if (changed) AttrCalibrator.persist(mem);
        } catch (e) {}
    },

    // Consulted by AttributeSchema.applyTo(): per-game, per-flag bit
    // overrides that disagree with the static PROFILE and have reached
    // CONFIRM_THRESHOLD -- only flags with confirmed, consistent evidence
    // are returned, so a game/flag with no observation yet is untouched.
    // D145: has a real bit been CONFIRMED for this flag, in this game?
    // ActionSynth asks before trusting a semantic attribute on a non-Inform
    // game, where the Inform bit profile does not apply (D73). A flag with no
    // confirmed observation returns false, so the verb stays suppressed until
    // the game's own opcodes prove the bit -- at which point it comes back
    // automatically, with no per-title branching.
    // Worn fallback (operator 2026-10-07; Codex #1666): a ZIL story's worn
    // attribute learned from ITS OWN inventory routine. On a player-issued
    // INVENTORY turn, the routine test_attr's each listed object; a bit is
    // the worn bit only if, for every listed held object, it tested true
    // exactly on the objects the reply marks "(being worn)"/"(worn)".
    // Exactly one such bit is recorded; zero or several record nothing
    // (a wearable bit can match when everything wearable is worn).
    learnedWornBit: function (mem) {
        try {
            if (mem) AttrCalibrator.hydrate(mem);
            var w = AttrCalibrator.table && AttrCalibrator.table.wornBit;
            return w && Number.isInteger(w.bit) ? w.bit : null;
        } catch (e) { return null; }
    },
    wornCandidate: function (held, tests, wornIds) {
        // held: [{id}], tests: {bit: {objId: bool}}, wornIds: {objId: true}
        if (!held.length || !Object.keys(wornIds).length || Object.keys(wornIds).length === held.length) return null;
        var found = Object.keys(tests).filter(function (b) {
            return held.every(function (o) {
                var r = tests[b][String(o.id)];
                return typeof r === "boolean" && r === !!wornIds[String(o.id)];
            });
        });
        return found.length === 1 ? parseInt(found[0], 10) : null;
    },

    hasConfirmedFlag: function (mem, flag) {
        try {
            if (mem) AttrCalibrator.hydrate(mem);
            var v = AttrCalibrator.table && AttrCalibrator.table.verbs && AttrCalibrator.table.verbs[flag];
            return !!(v && typeof v.mutatedBit === "number" && v.confirmations >= AttrCalibrator.CONFIRM_THRESHOLD);
        } catch (e) { return false; }
    },

    overrideFor: function () {
        var out = {};
        try {
            var verbs = AttrCalibrator.table.verbs || {};
            Object.keys(verbs).forEach(function (flag) {
                var v = verbs[flag];
                if (!v || typeof v.mutatedBit !== "number") return;
                var staticBit = (typeof AttributeSchema !== "undefined") ? AttributeSchema.bitFor(flag) : null;
                if (staticBit === v.mutatedBit) return; // already correct, nothing to override
                out[flag] = { bit: v.mutatedBit, confirmations: v.confirmations };
            });
        } catch (e) {}
        return out;
    },

    // Per-object direct override (currently only ever populated for
    // "takeable", the one flag with no single learnable bit -- see the
    // VERB_FLAG comment above). A single real, non-ambiguous opcode-level
    // observation is decisive ground truth for THAT object, so no
    // confirmation threshold is required here the way bit-learning needs.
    objectOverrideFor: function (objectId) {
        try {
            var rec = AttrCalibrator.table.objects && AttrCalibrator.table.objects[String(objectId)];
            return rec || null;
        } catch (e) { return null; }
    },

    // D75: the real, observed holder id from a confirmed successful take
    // (see `record` above) -- consulted by `ZRamProvider.resolveInventoryRootId`
    // ahead of its own attribute-bit-based fallback, since this is direct
    // ground truth rather than a heuristic guess. `mem` is required so the
    // caller's own game gets hydrated first (consistent with every other
    // AttrCalibrator consumer); returns null until at least one real take
    // has been observed and resolved for this game.
    inventoryHolderInWorld: function (mem, id, frozenRoom) {
        try {
            var payload = typeof WorldModel !== 'undefined' && WorldModel.lastPayload;
            var rooms = {};
            if(frozenRoom != null)rooms[String(frozenRoom)]=true;
            if(payload && payload.roomId != null)rooms[String(payload.roomId)]=true;
            if(typeof ParchLockMap !== 'undefined') (ParchLockMap.Rooms || []).forEach(function(r){if(r && r.HasRealId && r.ObjectId != null)rooms[String(r.ObjectId)]=true;});
            // Unsupported readers with no containment evidence keep their
            // original behavior. A real detached node is decisive negative evidence.
            if(!Object.keys(rooms).length || !mem || !ZRamReader.objectLinks)return true;
            var first=ZRamReader.objectLinks(mem,id);
            if(!first)return true;
            var seen={}, node=first;
            for(var i=0;i<32 && node && !seen[id];i++) {
                seen[id]=true;
                if(rooms[String(node.parent)])return true;
                if(!node.parent)return false;
                id=node.parent; node=ZRamReader.objectLinks(mem,id);
            }
            return false;
        } catch(e) { return false; }
    },
    inventoryRootIsRoom: function (mem, id) {
        if (id == null) return false;
        var payload = typeof WorldModel !== 'undefined' && WorldModel.lastPayload;
        if (payload && String(payload.roomId) === String(id)) return true;
        try {
            var index = mem && ZRamReader.compiledRoomIndex && ZRamReader.compiledRoomIndex(mem);
            if (index && Object.keys(index.table || {}).some(function(k){return String(index.table[k]) === String(id);})) return true;
        } catch (e) {}
        return false;
    },
    confirmedInventoryRootId: function (mem) {
        try {
            if (mem) AttrCalibrator.hydrate(mem);
            var id = AttrCalibrator.table.inventoryRootId;
            return id != null && !AttrCalibrator.inventoryRootIsRoom(mem,id) && AttrCalibrator.inventoryHolderInWorld(mem,id) ? id : null;
        } catch (e) { return null; }
    },

    // D73/Phase B follow-up fix (found live): `Actionable.Submit` only ever
    // fires for radial/mark-click-driven commands -- a player typing a
    // command directly into the visible input and pressing Enter (the most
    // common real interaction) never calls Submit at all, exactly the same
    // gap `MapTopology.readLastTypedCommand`'s own header comment already
    // documents for its unrelated purpose ("a player typing directly...
    // never goes through Inject at all"). Confirmed live: submitting "take
    // canteen" by typing it produced an empty trace under the Submit-only
    // hook. A document-level CAPTURE-phase listener on Enter/keypress is
    // added below specifically to also catch that path: capture-phase
    // listeners on an ancestor (`document`) always run before any listener
    // on the target element itself (bubble or capture), so this correctly
    // opens the correlation window BEFORE the interpreter's own keypress
    // handling can run the turn's opcodes synchronously afterward in the
    // same event dispatch. This is one of exactly two real entry points
    // (D86 stage 1) -- the other is `Input.Inject`'s own in-place hook
    // (js/Input.js), which covers every non-typed submission path
    // (click/radial/map/menu-driven commands, all funneled through
    // `Actionable.Submit` -> `Input.Inject`). `Actionable.Submit` is
    // deliberately NOT wrapped separately here anymore -- see `installHooks`
    // below for why a second, earlier, wrong-value wrap on `Submit` used to
    // silently negate this listener's correctly-valued observation for the
    // most common command path.
    installKeypressCapture: function () {
        if (AttrCalibrator._keypressCaptureInstalled) return;
        if (typeof document === "undefined" || !document.addEventListener) return;
        document.addEventListener("keypress", function (e) {
            try {
                if (e.which !== 13 && e.keyCode !== 13) return;
                var el = e.target;
                if (!el || !el.classList || !el.classList.contains("Input") || !el.classList.contains("LineInput")) return;
                if (e.defaultPrevented || (typeof Message !== "undefined" && Message.IsOpen)) return;
                if (typeof $ !== "undefined" && ($("#dialog").length || !$(el).is(":visible"))) return;
                // D86 CUTOVER: observeCommand/observeLocation/observeVerbBehavior
                // (the legacy windows) are no longer called here -- the three
                // TurnRecorder analyzers above are now the sole real writers,
                // proven byte-for-byte equivalent via live A/B proofs before
                // this cutover (tools/d86-verbsuccess-ab-proof.js,
                // d86-locationglobal-ab-proof.js, d86-verbbehavior-ab-proof.js).
                if (typeof TurnRecorder !== "undefined" && TurnRecorder.onAcceptedSubmit) {
                    TurnRecorder.onAcceptedSubmit(el.value || "", "typed");
                }
            } catch (eK) {}
        }, true);
        AttrCalibrator._keypressCaptureInstalled = true;
    },

    // D86 stage 1: `Actionable.Submit` is no longer a separate observation
    // entry point. It always calls `Input.Inject(command, true)` internally
    // (js/Actionable.js) AFTER its own accept guard passes -- wrapping it here
    // used to call observeCommand/observeLocation/observeVerbBehavior with the
    // RAW, pre-guard, pre-append command string, which could win each window's
    // "already open" guard and silently block the correct, later, in-place
    // Input.Inject call from ever running for the single most common command
    // path. The two real entry points are now: a genuine native keypress
    // (installKeypressCapture below) and Input.Inject's own in-place hook
    // (js/Input.js), which covers every other real submission path uniformly.
    // D75 extension (operator 2026-10-07, Suspect): the inventory holder
    // learned from the game's OWN inventory routine. During an INVENTORY
    // turn the routine test_attr's each object it lists; the objects it
    // tested whose names the reply prints are the held items, and their
    // shared parent is the real holder. Feeds the same table.inventoryRootId
    // a confirmed take already writes (resolveInventoryRootId step 1).
    // Requires 2+ listed objects under one non-room parent that clearly
    // outnumbers any other parent; otherwise nothing is learned.
    inventoryRootAnalyzer: {
        id: "inventory-root",
        prepare: function (turn) {
            try {
                if (turn.source === "ambiguous-reference") return null;
                if (!/^(?:i|inv|inventory|take inventory)$/i.test(String(turn.command || "").trim())) return null;
                if (typeof AttributeSchema === "undefined" || typeof ZRamReader === "undefined") return null;
                var mem = AttributeSchema._getMem();
                if (!mem || AttrCalibrator.confirmedInventoryRootId(mem) != null) return null;
                // A digest-pinned measured player (playerObject / playerGlobal) already owns the holder (D226): do not
                // learn and persist a competing root (Sherlock stored its coat pocket).
                try { var lfp = ZRamReader.executableLayoutFacts(mem); if (lfp && (Number.isInteger(lfp.playerObject) || Number.isInteger(lfp.playerGlobal))) return null; } catch (eLf) {}
                turn.__invRootCtx = { tested: {}, mem: mem };
                return {
                    wantsOpcodes: true,
                    hasWitness: function () { return true; },
                    captureAfter: function (t) {
                        var out = { lines: [], objs: [] };
                        try {
                            if (typeof $ !== "undefined") {
                                var lines = $("#windowport .BufferWindow .BufferLine").toArray();
                                var end = (t.endLine != null) ? t.endLine : lines.length;
                                out.lines = lines.slice(t.startLine || 0, end).map(function (l) { return String(l.textContent || "").toLowerCase(); });
                            }
                            Object.keys(t.__invRootCtx.tested).forEach(function (id) {
                                var links = ZRamReader.objectLinks(mem, +id);
                                var nm = String(ZRamReader.shortName(mem, +id) || "").toLowerCase();
                                if (links && nm && nm.charAt(0) !== "(") out.objs.push({ id: +id, parent: links.parent, name: nm });
                            });
                            out.rooms = {};
                            out.objs.forEach(function (o) { out.rooms[o.parent] = AttrCalibrator.inventoryRootIsRoom(mem, o.parent); });
                        } catch (e) {}
                        return out;
                    }
                };
            } catch (e) { return null; }
        },
        observeOpcode: function (turn, op, vmInstance, args) {
            var ctx = turn.__invRootCtx;
            if (ctx && op === "test_attr" && args && args[0] > 0) ctx.tested[args[0]] = true;
        },
        analyze: function (turn) {
            try {
                var ctx = turn.__invRootCtx;
                var snap = turn.analyzerSnapshots && turn.analyzerSnapshots["inventory-root"];
                if (!ctx || !snap || !snap.objs) return;
                var text = snap.lines.join("\n");
                // Animate objects named in the reply are holders or bystanders, not listed items: cabal's PC is literally
                // named "you" (matched by "You are carrying") and the vagrant is mentioned in the same reply. Counting
                // them hid the PalmPilot (its parent looked "listed") and let a room parent compete.
                // Occurrence provenance (Codex #3552/#3566): an object is listed only when its name occurs in a genuine
                // listing row of this reply (Actionable.listingRows), never in the header ("You are carrying:" naming a PC
                // called "you") or in prose (the vagrant). A carried animal in a row stays listed, so its own children
                // do not vote for it as the holder.
                var rowsText = text;
                try {
                    if (typeof Actionable !== "undefined" && Actionable.listingRows) {
                        var rws = Actionable.listingRows(text, snap.objs.map(function (o) { return { name: o.name }; }));
                        rowsText = rws.length ? rws.join("\n").toLowerCase() : "";
                    }
                } catch (eRows) {}
                var listed = snap.objs.filter(function (o) {
                    return new RegExp("(^|[^a-z])" + o.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)").test(rowsText);
                });
                var listedIds = {}; listed.forEach(function (o) { listedIds[o.id] = true; });
                var counts = {};
                // Only holders placed in the world compete (medusa prints "your costume"; an offstage "(medus_t)" also
                // holds an object named costume).
                listed.forEach(function (o) {
                    if (!o.parent || listedIds[o.parent] || snap.rooms[o.parent]) return;
                    try { if (!AttrCalibrator.inventoryHolderInWorld(ctx.mem, o.parent)) return; } catch (eW) {}
                    counts[o.parent] = (counts[o.parent] || 0) + 1;
                });
                var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
                if (!keys.length) return;
                var top = keys[0], n = counts[top], next = keys[1] ? counts[keys[1]] : 0;
                // One listed item is enough when nothing competes and its parent is an animate, non-room actor: the
                // game's own inventory routine tested and printed it (cabal "your PalmPilot" held by "you" 221;
                // medusa "your costume" held by the unnamed PC 65), while the probe player is an unplaced self object.
                var single = n === 1 && next === 0 && !snap.rooms[top] && (function () { try { return !!ZRamReader.attrsFromObject(ctx.mem, +top).animate; } catch (eA) { return false; } })();
                if (!single && (n < 2 || n <= next * 2 || snap.rooms[top])) return;
                AttrCalibrator.hydrate(ctx.mem);
                AttrCalibrator.table.inventoryRootId = +top;
                AttrCalibrator.persist(ctx.mem);
            } catch (e) {}
        }
    },

    // Worn learner. Works from what the game ITSELF did on the INVENTORY
    // turn, never from the app's current inventory guess (which may be wrong
    // until the holder is learned, as in Suspect): the objects its inventory
    // routine test_attr'd whose names it printed are the listed items.
    wornInventoryAnalyzer: {
        id: "worn-inventory",
        prepare: function (turn) {
            try {
                if (turn.source === "ambiguous-reference") return null;
                if (!/^(?:i|inv|inventory|take inventory)$/i.test(String(turn.command || "").trim())) return null;
                if (typeof AttributeSchema === "undefined" || typeof ZRamReader === "undefined") return null;
                var mem = AttributeSchema._getMem();
                // Fallback only: never when a stronger worn source exists.
                if (!mem || AttributeSchema.wornOwnedAboveCalibration(mem) || AttrCalibrator.learnedWornBit(mem) != null) return null;
                turn.__wornCtx = { tests: {}, mem: mem };
                return {
                    wantsOpcodes: true,
                    hasWitness: function () { return true; },
                    captureAfter: function (t) {
                        var out = { lines: [], names: {} };
                        try {
                            if (typeof $ !== "undefined") {
                                var lines = $("#windowport .BufferWindow .BufferLine").toArray();
                                var end = (t.endLine != null) ? t.endLine : lines.length;
                                out.lines = lines.slice(t.startLine || 0, end).map(function (l) { return String(l.textContent || "").toLowerCase(); });
                            }
                            var ids = {};
                            Object.keys(t.__wornCtx.tests).forEach(function (b) { Object.keys(t.__wornCtx.tests[b]).forEach(function (id) { ids[id] = true; }); });
                            Object.keys(ids).forEach(function (id) {
                                var nm = String(ZRamReader.shortName(mem, +id) || "").toLowerCase();
                                if (nm && nm.charAt(0) !== "(") out.names[id] = nm;
                            });
                        } catch (e) {}
                        return out;
                    }
                };
            } catch (e) { return null; }
        },
        observeOpcode: function (turn, op, vmInstance, args, result) {
            var ctx = turn.__wornCtx;
            if (!ctx || op !== "test_attr" || !args || !(args[0] > 0)) return;
            var id = String(args[0]), bit = args[1];
            var row = ctx.tests[bit] || (ctx.tests[bit] = {});
            if (!(id in row)) row[id] = !!result;
        },
        analyze: function (turn) {
            try {
                var ctx = turn.__wornCtx;
                var snap = turn.analyzerSnapshots && turn.analyzerSnapshots["worn-inventory"];
                if (!ctx || !snap) return;
                var names = snap.names || {};
                var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
                // Each reply line must name EXACTLY one tested object
                // (Codex #1676: several names on one line aborts).
                var listed = {}, worn = {}, ambiguous = false;
                snap.lines.forEach(function (line) {
                    var hits = Object.keys(names).filter(function (id) {
                        return new RegExp("(^|[^a-z])" + esc(names[id]) + "([^a-z]|$)").test(line);
                    });
                    if (hits.length > 1) { ambiguous = true; return; }
                    if (hits.length !== 1) return;
                    listed[hits[0]] = true;
                    if (/\((?:being )?worn\)/.test(line)) worn[hits[0]] = true;
                });
                if (ambiguous) return;
                var held = Object.keys(listed).map(function (id) { return { id: id }; });
                if (held.length < 2) return;
                var bit = AttrCalibrator.wornCandidate(held, ctx.tests, worn);
                if (bit == null) return;
                AttrCalibrator.hydrate(ctx.mem);
                AttrCalibrator.table.wornBit = { bit: bit, source: "inventory-opcode", at: Date.now() };
                AttrCalibrator.persist(ctx.mem);
            } catch (e) {}
        }
    },

    installHooks: function () {
        try { AttrCalibrator.installKeypressCapture(); } catch (e1) {}
        // D86 migration, stage 2: register the diagnostic-mode analyzer
        // above with TurnRecorder. Additive only -- the legacy window
        // (observeCommand/_resolvePending) remains the sole real writer.
        try {
            if (typeof TurnRecorder !== "undefined" && TurnRecorder.registerAnalyzer) {
                TurnRecorder.registerAnalyzer(AttrCalibrator.analyzers.verbSuccess);
                TurnRecorder.registerAnalyzer(AttrCalibrator.analyzers.locationGlobal);
                TurnRecorder.registerAnalyzer(AttrCalibrator.analyzers.verbBehavior);
                TurnRecorder.registerAnalyzer(AttrCalibrator.inventoryRootAnalyzer);
                TurnRecorder.registerAnalyzer(AttrCalibrator.wornInventoryAnalyzer);
            }
        } catch (e2) {}
    }
};

AttrCalibrator.installHooks();
if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function () { AttrCalibrator.installHooks(); });
}
if (typeof setTimeout === "function") {
    setTimeout(function () { AttrCalibrator.installHooks(); }, 0);
    setTimeout(function () { AttrCalibrator.installHooks(); }, 50);
}
if (typeof LearningStores !== "undefined") LearningStores.register("attrCalib", "PL_AttrCalib_", AttrCalibrator.learningKeyFor, {
    compact: function (value) { return JSON.stringify(AttrCalibrator.compactTable(JSON.parse(value))); }
});
