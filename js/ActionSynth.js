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
        // D239: bare "climb X" only; the game picks the direction (CLIMB OBJECT -> V-CLIMB-FOO).
        climbable: ["climb"],
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
        // D239: Climb only when the story's dictionary has the verb.
        if (key === "climbable") return ActionSynth.literalAvailable("climb") ? ["climb"] : [];
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
    // Per-title light owner verbs (AttributeSchema.lightForms); [] when absent or not offered.
    lightFormsFor: (objectId, context) => {
        try {
            var id = Number(objectId);
            if (objectId == null || typeof AttributeSchema === "undefined" || !AttributeSchema.lightForms || !Number.isInteger(id)) return [];
            var forms = AttributeSchema.lightForms(AttributeSchema._getMem(), id, context);
            return (forms || []).filter(ActionSynth.literalAvailable);
        } catch (eLight) { return []; }
    },
    // The title's measured enter verb (fact enterForms.enter), or null.
    enterFormFor: (mem) => {
        try {
            // Stable-header ownership (executableLayoutFacts) is required; no digest-only fallback.
            var fact = mem && ZRamReader.executableLayoutFacts(mem);
            var form = fact && fact.enterForms && fact.enterForms.enter;
            return typeof form === "string" && form ? form : null;
        } catch (e) { return null; }
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
            if (verb === "close" && AttributeSchema.closeRuleAllows && AttributeSchema.closeRuleAllows(mem, objectId) === false) return false;
            var forms = AttributeSchema.containerForms && AttributeSchema.containerForms(mem, objectId, context);
            if (forms != null && forms.indexOf(verb) < 0) return false;
            if ((verb === "open" || verb === "close") && AttributeSchema.containerStateAuthority) {
                var authority = AttributeSchema.containerStateAuthority(mem, objectId);
                if (authority.status === "claimed-invalid") return false;
                if (authority.status === "valid") return verb === "open" ? !authority.logicalOpen : authority.logicalOpen;
            }
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
    learnedFormAllowed: function (objectId, form, context) {
        if (!ActionSynth.authoredCommandAllowed(objectId,form,context)) return false;
        if (ActionSynth.inspectVerbDisabled() && form === ActionSynth.defaultInspectVerb()) return false;
        var behavior=typeof AttrCalibrator !== 'undefined' && AttrCalibrator.table && AttrCalibrator.table.verbBehavior;
        var disabled=behavior && behavior.disabled && behavior.disabled[form];
        if (disabled && disabled.confirmed && !(typeof LearnedWords !== 'undefined' && LearnedWords.inspectSuppressed && LearnedWords.inspectSuppressed('disabled:'+form))) return false;
        if (/^(switch|turn) (on|off)$/.test(form)) {
            var activation=ActionSynth.activationFormPolicy(objectId,context);
            if (activation !== null && activation.indexOf(form)<0) return false;
        }
        // A learned spelling never overrides a validated light owner's live side.
        try {
            var digest=ModuleLibrary.currentExecutableDigest(), fact=ModuleStatFactsClaude[digest], lf=fact && fact.lightForms;
            if (lf && Array.isArray(lf.objects) && lf.objects.indexOf(Number(objectId))>=0) {
                var owned=['on','off'].map(function(side) { var m=lf[side]; return m && (m[String(objectId)] || m.default); });
                if (owned.indexOf(form)>=0) {
                    var current=AttributeSchema.lightForms(AttributeSchema._getMem(),Number(objectId),context);
                    if (current !== null && current.indexOf(form)<0) return false;
                }
            }
        } catch(e) {}
        return true;
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
        // D238: an authored owner that is not a FOODBIT carrier (drinkable water in a
        // title that maps edible) still gets its rule's verbs as candidates; the
        // owner policy and authoredCommandAllowed remain the gate.
        if (!a.edible && objectId != null) {
            var ownerVerbs = null;
            try { ownerVerbs = ActionSynth.edibleFormPolicy(objectId, options.context); } catch (eOwner) { ownerVerbs = null; }
            (ownerVerbs || []).forEach(function (v) { if (verbs.indexOf(v) < 0) verbs.push(v); });
        }
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
    SEMANTIC_FLAGS: ["lockable", "switchable", "edible", "wearable", "enterable", "animate", "talkable", "climbable"],

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

    // Exact action-owned reference. Unowned modules leave the legacy path untouched.
    qualifiedRemovalPolicyFor: function (obj) {
        var unowned = { status: "unowned" }, blocked = { status: "blocked" };
        var own = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
        var digest, fact, rule, id = obj && Number(obj.id);
        try {
            digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest ? ModuleLibrary.currentExecutableDigest() : null;
            fact = digest && typeof ModuleStatFactsClaude !== "undefined" && ModuleStatFactsClaude[digest];
            if (!fact || !own(fact, "removalReferences")) return unowned;
            rule = fact.removalReferences;
            if (!Number.isInteger(id) || !own(rule, "objects") || !Array.isArray(rule.objects) ||
                !rule.objects.some(function (v) { return Number.isInteger(v) && v === id; })) return unowned;
        } catch (eOwner) { return unowned; }
        try {
            var plain = function (o) { if (!o || typeof o !== "object" || Array.isArray(o)) return false; var p = Object.getPrototypeOf(o); return p === null || Object.getPrototypeOf(p) === null; };
            var keys = function (o) { return Object.getOwnPropertyNames(o).sort().join(","); };
            if (!plain(rule) || keys(rule) !== "nouns,objects,scope,verb" ||
                (Object.getOwnPropertySymbols && Object.getOwnPropertySymbols(rule).length) || rule.verb !== "remove" || rule.scope !== "worn-direct" ||
                !plain(rule.nouns) || (Object.getOwnPropertySymbols && Object.getOwnPropertySymbols(rule.nouns).length)) return blocked;
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            if (!mem || typeof ZRamReader === "undefined" || ZRamReader.executableLayoutFacts(mem) !== fact ||
                (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem))) return blocked;
            var grammar = typeof GrammarProvider !== "undefined" && GrammarProvider.decodeD198(mem), h = ZRamReader.header(mem);
            if (!h || h.version < 3 || h.version > 5 || !grammar || grammar.classification !== "confirmed-zil-family" || grammar.evidence !== "validated" ||
                !(grammar.templates || []).some(function (t) { return t.verb === "remove" && t.objectCount === 1 && !(t.prepositions || []).length; })) return blocked;
            var first = ZRamReader.objectBase(h, 1), propertyStart = ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12));
            var count = (propertyStart - first) / h.entrySize, bits = h.version <= 3 ? 32 : 48;
            if (propertyStart >= h.staticMem || !Number.isInteger(count) || count < 2 || !rule.objects.length || !rule.objects.every(function (v, i, all) {
                return Number.isInteger(v) && v >= 1 && v <= count && all.indexOf(v) === i;
            }) || Object.getOwnPropertyNames(rule.nouns).sort().join(",") !== rule.objects.map(String).sort().join(",")) return blocked;
            if (!rule.objects.every(function (v) { var n = rule.nouns[String(v)]; return typeof n === "string" && /^[a-z]+(?: [a-z]+)*$/.test(n) &&
                n.split(" ").every(function (word) { return !!ZRamReader.hasDictionaryWord(mem, word); }); }) || !ActionSynth.literalAvailable("remove")) return blocked;
            var wornBit = fact.wornAttribute, links = ZRamReader.objectLinks(mem, id), player = ZRamReader.resolvePlayer(mem);
            if (!Number.isInteger(wornBit) || wornBit < 0 || wornBit >= bits || !links || !player || player.ambiguous ||
                ["measured-player-object", "measured-player-global"].indexOf(player.source) < 0 || !Number.isInteger(player.id) || player.id < 2 || player.id > count ||
                id === player.id || links.parent !== player.id || !ZRamReader.attr(links, wornBit)) return blocked;
            var payload = typeof WorldModel !== "undefined" && WorldModel.lastPayload, inventory = payload && payload.inventory || [];
            var owners = inventory.filter(function (o) { return o && String(o.id) === String(id); });
            if (owners.length !== 1) return blocked;
            var owner = owners[0], rows = (payload.discoveredObjects || []).filter(function (o) { return o && String(o.id) === String(id); }).concat(owners);
            if (obj.examineOnly || obj.sharedMembers || obj.revealedLocalGlobal || !rows.every(function (o) { return !o.examineOnly && !o.sharedMembers && !o.revealedLocalGlobal &&
                Number.isInteger(o.id) && o.id === id && Number(o.parentId) === links.parent; })) return blocked;
            var ref = typeof Actionable !== "undefined" && Actionable.referenceFor && Actionable.referenceFor(owner);
            if (!ref || !ref.unique || !ref.verified || typeof ref.noun !== "string" || !ref.noun) return blocked;
            var noun = rule.nouns[String(id)];
            return { status: "scoped", scope: { kind: "qualified-worn-remove", digest: digest, id: id,
                generation: ActionSynth.currentGeneration(), verb: "remove", noun: noun, command: "remove " + noun } };
        } catch (ePolicy) { return blocked; }
    },
    normalizeQualifiedRemovalCandidate: function (command, obj) {
        if (!command || command.verb !== "remove") return command;
        var policy = ActionSynth.qualifiedRemovalPolicyFor(obj || { id: command.objectId });
        if (policy.status === "unowned") return command;
        if (policy.status !== "scoped" || command.sharedMembers || command.actorAddressing || command.examineOnly ||
            command.targetObjectId != null || command.topicObjectId != null || command.requiresTarget ||
            (command.arity != null && command.arity !== 1) || command.wornRemovalScope || command.identityWearScope || command.lightFormScope || command.revealedLocalGlobalScope ||
            (command.objectIds && (command.objectIds.length !== 1 || String(command.objectIds[0]) !== String(policy.scope.id)))) return null;
        if (command.objectId != null && String(command.objectId) !== String(policy.scope.id)) return null;
        var owner = ((WorldModel.lastPayload || {}).inventory || []).find(function (o) { return String(o.id) === String(policy.scope.id); });
        var ref = owner && Actionable.referenceFor(owner);
        if (!ref || (command.command !== "remove " + ref.noun && command.command !== policy.scope.command)) return null;
        return Object.assign({}, command, { objectId: policy.scope.id, noun: policy.scope.noun, command: policy.scope.command,
            label: "Remove", qualifiedRemovalScope: policy.scope });
    },
    qualifiedRemovalCommandCurrent: function (command) {
        if (!command || command.verb !== "remove" || !command.qualifiedRemovalScope || command.sharedMembers || command.actorAddressing ||
            command.targetObjectId != null || command.topicObjectId != null || command.requiresTarget || command.wornRemovalScope || command.identityWearScope ||
            command.lightFormScope || command.revealedLocalGlobalScope || (command.arity != null && command.arity !== 1) ||
            (command.objectIds && (command.objectIds.length !== 1 || String(command.objectIds[0]) !== String(command.objectId)))) return false;
        var policy = ActionSynth.qualifiedRemovalPolicyFor({ id: command.objectId }), scope = command.qualifiedRemovalScope;
        return policy.status === "scoped" && Object.getOwnPropertyNames(scope).length === 7 &&
            ["kind", "digest", "id", "generation", "verb", "noun", "command"].every(function (k) { return scope[k] === policy.scope[k]; }) &&
            String(command.objectId) === String(policy.scope.id) && command.command === policy.scope.command &&
            (command.noun == null || command.noun === policy.scope.noun) &&
            ActionSynth.authoredCommandAllowed(policy.scope.id, "remove", "inventory") && ActionSynth.learnedFormAllowed(policy.scope.id, "remove", "inventory");
    },

    wornRemovalScopeFor: function (obj) {
        try {
            if (!obj || obj.examineOnly || !Number.isInteger(obj.id) ||
                typeof AttributeSchema === "undefined" || !AttributeSchema.wornRemovalForm ||
                typeof Actionable === "undefined" || !Actionable.referenceFor ||
                typeof ZRamProvider === "undefined" || !ZRamProvider.getMem) return null;
            var inventory = (WorldModel.lastPayload || {}).inventory || [];
            var matches = inventory.filter(function (item) { return item && String(item.id) === String(obj.id); });
            if (matches.length !== 1 || matches[0].examineOnly) return null;
            var mem = ZRamProvider.getMem();
            if (AttributeSchema.wornRemovalForm(mem, obj.id) !== "drop" || !ActionSynth.literalAvailable("drop")) return null;
            var grammar = GrammarProvider.decodeD198(mem);
            if (!grammar || grammar.classification !== "confirmed-zil-family" || grammar.evidence !== "validated" ||
                !(grammar.templates || []).some(function (t) { return t.verb === "drop" && t.objectCount === 1 && !t.prepositions.length; })) return null;
            var ref = Actionable.referenceFor(matches[0]);
            if (!ref || !ref.unique || !ref.verified || typeof ref.noun !== "string" || !ref.noun) return null;
            var digest = ModuleLibrary.currentExecutableDigest();
            if (!digest || !ActionSynth.authoredCommandAllowed(obj.id, "drop", "inventory")) return null;
            return { kind: "wearable-direct-player-drop", digest: digest, id: obj.id, noun: ref.noun, command: "drop " + ref.noun };
        } catch (eWornScope) { return null; }
    },
    wornRemovalCommandCurrent: function (command) {
        if (!command || command.sharedMembers || !command.wornRemovalScope || command.verb !== "drop") return false;
        var scope = command.wornRemovalScope, obj = { id: Number(command.objectId) };
        var current = ActionSynth.wornRemovalScopeFor(obj);
        return !!(current && scope.kind === current.kind && scope.digest === current.digest &&
            scope.id === current.id && scope.noun === current.noun && scope.command === current.command &&
            command.command === current.command && command.objectId === current.id);
    },

    // Identity Wear R3 (four-seat ACCEPTED, PROPOSAL-identity-wear-r3 sha 4a1e90a7): per-title fact
    // wearForms {objects, verb:"wear", scope:"held-direct"} names the exact owners whose bare WEAR is
    // native-proven although no wearable capability bit is asserted. Offered only for the exact
    // executable fact of a validated confirmed-zil-family title, an owner inside the true object
    // frontier, held directly by the player (never on the ground or nested), not worn by the measured
    // wornAttribute, with bare one-object WEAR grammar and the current unique verified noun. Capability
    // is never inferred from worn state. Anything malformed or drifted -> null (no Wear).
    identityWearScopeFor: function (obj, name) {
        try {
            if (!obj || obj.examineOnly || !Number.isInteger(Number(obj.id)) || typeof ZRamReader === "undefined" ||
                typeof ModuleStatFactsClaude === "undefined" || typeof ModuleLibrary === "undefined" ||
                typeof ZRamProvider === "undefined" || !ZRamProvider.getMem || typeof Actionable === "undefined" || !Actionable.referenceFor) return null;
            var id = Number(obj.id), mem = ZRamProvider.getMem();
            var digest = ModuleLibrary.currentExecutableDigest && ModuleLibrary.currentExecutableDigest();
            var fact = mem && ZRamReader.executableLayoutFacts(mem);
            if (!digest || !fact || ModuleStatFactsClaude[digest] !== fact) return null;
            var spec = fact.wearForms, plain = function (o) { return !!o && typeof o === "object" && Object.getPrototypeOf(o) === Object.prototype; };
            if (!plain(spec) || Object.keys(spec).sort().join() !== "objects,scope,verb" || spec.verb !== "wear" ||
                spec.scope !== "held-direct" || !Array.isArray(spec.objects) || !spec.objects.length ||
                !spec.objects.every(function (n) { return Number.isInteger(n) && n >= 2; }) || spec.objects.indexOf(id) < 0) return null;
            var family = GrammarProvider.decodeD198(mem);
            if (!family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated" ||
                !(family.templates || []).some(function (t) { return t.verb === "wear" && t.objectCount === 1 && !(t.prepositions || []).length; }) ||
                !ActionSynth.literalAvailable("wear")) return null;
            var h = ZRamReader.header(mem), first = ZRamReader.objectBase(h, 1);
            var frontier = (ZRamReader.u16(mem, first + (h.version <= 3 ? 7 : 12)) - first) / h.entrySize;
            if (!Number.isInteger(frontier) || frontier < 2 || id > frontier) return null;
            var worn = fact.wornAttribute, limit = h.version <= 3 ? 32 : 48;
            if (!Number.isInteger(worn) || worn < 0 || worn >= limit) return null;
            var player = ZRamReader.resolvePlayer(mem), links = ZRamReader.objectLinks(mem, id);
            if (!player || !player.id || !links || links.parent !== player.id || ZRamReader.attr(links, worn)) return null;
            var ref = Actionable.referenceFor(obj);
            if (!ref || !ref.unique || !ref.verified || typeof ref.noun !== "string" || !ref.noun || (name != null && ref.noun !== name)) return null;
            return { kind: "identity-wear-held-direct", digest: digest, generation: ActionSynth.currentGeneration(),
                id: id, noun: ref.noun, command: "wear " + ref.noun };
        } catch (eWear) { return null; }
    },
    // Tap revalidation must resolve the noun from the same live payload object the row was built
    // from: a bare {id,name} stub loses its vocabulary, so "tattered suit" decays to the shared
    // head "suit" and the scoped Wear silently refuses (Starcross 176 vs space suit 144).
    scopedLiveObject: function (command, scope) {
        // Fail closed (codex c3df REVISE 1): an owner no longer in the live payload cannot be revalidated,
        // so the old tap is refused instead of falling back to a stub. The pool concatenates discovered
        // objects and inventory without dedupe, so identical-id rows with the same parent are one owner
        // (grok 1745); rows that disagree on parent are ambiguous and refused.
        var id = Number(command.objectId), rows = [];
        try {
            rows = (typeof Actionable !== "undefined" && Actionable.payloadPool ? Actionable.payloadPool() : [])
                .filter(function (o) { return o && Number(o.id) === id; });
        } catch (eLive) { rows = []; }
        if (!rows.length) return null;
        var parent = String(rows[0].parentId);
        return rows.every(function (o) { return String(o.parentId) === parent; }) ? rows[0] : null;
    },
    currentGeneration: function () { return typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0; },
    identityWearCommandCurrent: function (command) {
        if (!command || command.sharedMembers || !command.identityWearScope || command.verb !== "wear") return false;
        var scope = command.identityWearScope, current = ActionSynth.identityWearScopeFor(ActionSynth.scopedLiveObject(command, scope), scope.noun);
        return !!(current && scope.kind === current.kind && scope.digest === current.digest && scope.generation === current.generation &&
            scope.id === current.id && scope.noun === current.noun && scope.command === current.command && command.command === current.command);
    },
    // lightForms tap currency (codex 1107, identity-Wear pattern): the exact fact, generation, owner,
    // custody context, live state side and unique verified noun the light verb was built from.
    lightFormScopeFor: function (obj, name, context) {
        try {
            if (!obj || obj.examineOnly || !Number.isInteger(Number(obj.id)) || (context !== "inventory" && context !== "room") ||
                typeof AttributeSchema === "undefined" || !AttributeSchema.lightForms || typeof ZRamReader === "undefined" ||
                typeof ModuleStatFactsClaude === "undefined" || typeof ModuleLibrary === "undefined" ||
                typeof Actionable === "undefined" || !Actionable.referenceFor) return null;
            var id = Number(obj.id), mem = AttributeSchema._getMem();
            var digest = ModuleLibrary.currentExecutableDigest && ModuleLibrary.currentExecutableDigest();
            var fact = mem && ZRamReader.executableLayoutFacts(mem);
            if (!digest || !fact || ModuleStatFactsClaude[digest] !== fact || !fact.lightForms) return null;
            var forms = AttributeSchema.lightForms(mem, id, context);
            if (!Array.isArray(forms) || forms.length !== 1 || !ActionSynth.literalAvailable(forms[0])) return null;
            var lf = fact.lightForms, h = ZRamReader.header(mem), base = ZRamReader.objectBase(h, id);
            var lit = !!(mem.getUint8(base + (lf.stateBit >> 3)) & (0x80 >> (lf.stateBit & 7)));
            var ref = Actionable.referenceFor(obj);
            if (!ref || !ref.unique || !ref.verified || typeof ref.noun !== "string" || !ref.noun || (name != null && ref.noun !== name)) return null;
            return { kind: "lightForms", digest: digest, generation: ActionSynth.currentGeneration(), id: id,
                noun: ref.noun, verb: forms[0], command: forms[0] + " " + ref.noun, side: lit ? "off" : "on",
                stateBit: lf.stateBit, context: context };
        } catch (eLightScope) { return null; }
    },
    lightFormCommandCurrent: function (command) {
        if (!command || command.sharedMembers || !command.lightFormScope) return false;
        var scope = command.lightFormScope;
        var current = ActionSynth.lightFormScopeFor(ActionSynth.scopedLiveObject(command, scope), scope.noun, scope.context);
        return !!(current && scope.kind === current.kind && scope.digest === current.digest && scope.generation === current.generation &&
            scope.id === current.id && scope.noun === current.noun && scope.verb === current.verb && scope.side === current.side &&
            scope.stateBit === current.stateBit && scope.command === current.command && command.verb === current.verb &&
            command.command === current.command);
    },
    revealedLocalGlobalCommand: function (obj, context, containerName, options) {
        try {
            if (!obj || !obj.revealedLocalGlobal || ActionSynth.inspectVerbDisabled() || context !== "room" || containerName || (options && options.allowAmbiguousReference) ||
                typeof ZRamReader === "undefined" || typeof AttributeSchema === "undefined" || typeof Actionable === "undefined") return null;
            var mem = AttributeSchema._getMem(), player = ZRamReader.resolvePlayer(mem).id;
            var room = ZRamReader.enclosingRoom(mem, player);
            var current = ZRamReader.revealedLocalGlobalObjects(mem, room, player);
            if (current.length !== 1 || Number(obj.id) !== current[0].id || obj.name !== current[0].name ||
                obj.parentId !== current[0].parentId || obj.scopeRoomId !== room) return null;
            var ref = Actionable.referenceFor(obj);
            if (!ref || !ref.unique || !ref.verified || typeof ref.noun !== "string" || !ref.noun || !ActionSynth.literalAvailable("examine")) return null;
            var command = "examine " + ref.noun;
            return { verb: "examine", noun: ref.noun, objectId: current[0].id, context: "room", command: command,
                confidence: 0.85, revealedLocalGlobalScope: { digest: ModuleLibrary.currentExecutableDigest(),
                    generation: ActionSynth.currentGeneration(), id: current[0].id, room: room,
                    parent: current[0].parentId, name: current[0].name, noun: ref.noun, command: command } };
        } catch (eRevealedCommand) { return null; }
    },
    revealedLocalGlobalCommandCurrent: function (command) {
        if (!command || command.sharedMembers || !command.revealedLocalGlobalScope || command.verb !== "examine" || command.context !== "room") return false;
        var scope = command.revealedLocalGlobalScope;
        var current = null;
        try {
            var mem = AttributeSchema._getMem(), player = ZRamReader.resolvePlayer(mem).id;
            var room = ZRamReader.enclosingRoom(mem, player);
            var owner = ZRamReader.revealedLocalGlobalObjects(mem, room, player).find(function (o) { return o.id === Number(command.objectId); });
            if (owner) current = ActionSynth.revealedLocalGlobalCommand(owner, "room");
        } catch (eCurrentRevealed) { return false; }
        return !!(current && ["digest", "generation", "id", "room", "parent", "name", "noun", "command"].every(function (key) {
            return scope[key] === current.revealedLocalGlobalScope[key];
        }) && command.command === current.command && command.noun === current.noun);
    },
    commandsForObject: (obj, context, containerName, options) => {
        if (obj && obj.revealedLocalGlobal) {
            var revealed = ActionSynth.revealedLocalGlobalCommand(obj, context, containerName, options);
            return revealed ? [revealed] : [];
        }
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
        // A text/room presentation of the configured held owner uses actual custody.
        // Do not change any unowned module or ambiguous/shared resolution path.
        if (context === "room" && !containerName && !(options && options.allowAmbiguousReference) &&
            ActionSynth.qualifiedRemovalPolicyFor(obj).status === "scoped") context = "inventory";
        var attrs = ActionSynth.trustworthyAttrs(obj);
        var wornRemoval = context === "inventory" && !containerName && !(options && options.allowAmbiguousReference)
            ? ActionSynth.wornRemovalScopeFor(obj) : null;
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
        if (!(options && options.allowAmbiguousReference) && typeof AttrCalibrator !== 'undefined' && AttrCalibrator.learnedFormsFor) {
            AttrCalibrator.learnedFormsFor(obj.id).forEach(function (v) {
                if (!ActionSynth.learnedFormAllowed(obj.id,v,context)) return;
                if (verbs.indexOf(v) < 0) verbs.push(v);
            });
        }
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
            // D237: a worn switchable light (Stationfall headlamp, Starcross tape
            // library) keeps its on/off verbs; wearing it is its normal state.
            var switchVerbs = verbs.filter(function (v) { return /^(switch|turn) (on|off)$/.test(v); });
            var removal = wornRemoval ? "drop" : "remove";
            verbs = (ActionSynth.inspectVerbDisabled() ? [removal] : [ActionSynth.defaultInspectVerb(), removal]).concat(containerVerbs, switchVerbs);
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
        // Identity Wear R3 (after kind filtering): the room branch keeps stripping Wear for ground and
        // out-of-scope objects, but an identity-qualified owner the player actually holds directly keeps
        // its Wear whatever the caller kind (codex correction, policy 6). Nested rows never; the helper itself
        // requires the current unique verified reference, and shared rows exclude the scoped command.
        var identityWear = !containerName && !ActionSynth.isWorn(obj)
            ? ActionSynth.identityWearScopeFor(obj, name) : null;
        if (identityWear && verbs.indexOf("wear") < 0) verbs.push("wear");
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
        var memE = null, zilE = false;
        try {
            memE = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            zilE = !!memE && !(ZRamReader.isInformCompiled && ZRamReader.isInformCompiled(memE));
        } catch (eMemE) { zilE = false; }
        if ((verbs.indexOf("enter") >= 0 || verbs.indexOf("exit") >= 0) && zilE) {
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
            // Per-title enter form (enter-form R2): some ZIL titles refuse ENTER on every
            // carrier but accept another verb (The Witness: SIT ON). Applied after the
            // D236 filter so inside/outside still decides; no fact leaves "enter" as is.
            var enterForm = ActionSynth.enterFormFor(memE);
            if (enterForm) {
                verbs = verbs.map(function (v) { return v === "enter" ? enterForm : v; })
                    .filter(function (v) { return v !== enterForm || ActionSynth.literalAvailable(enterForm); });
            }
        }
        // lightForms (four-seat ACCEPT): a listed light owner, held or in the player's room, gets its
        // own on or off verb chosen by the live state bit. Additive; no fact leaves verbs unchanged.
        // Each light verb carries a lightFormScope re-validated at tap (codex 1107); no scope -> no verb.
        var lightScopes = {};
        if (!containerName) ActionSynth.lightFormsFor(obj.id, context).forEach(function (v) {
            var scope = ActionSynth.lightFormScopeFor(obj, name, context);
            if (!scope || scope.verb !== v) return;
            // Register the scope even when a learned verb already holds the same form (codex c3df REVISE 2),
            // so the owner form stays scoped and the authoritative filter below still runs.
            lightScopes[v] = scope;
            if (verbs.indexOf(v) < 0) verbs.push(v);
        });
        // The owner fact reads the live state bit, so its one form is authoritative: a learned
        // AttrCalibrator switch on/off pair (added after a successful turn-on) would otherwise offer
        // "switch on" on a lit lamp beside the scoped "turn off" (Sherlock 166, browser-touch 1031).
        if (Object.keys(lightScopes).length) verbs = verbs.filter(function (v) {
            return !/^(switch|turn) (on|off)$/.test(v) || lightScopes[v];
        });
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
        if (wornRemoval) result.forEach(function (entry) {
            if (entry.verb === "drop" && entry.command === wornRemoval.command) { entry.wornRemovalScope = wornRemoval; entry.label = "Drop"; }
        });
        if (identityWear) result.forEach(function (entry) {
            if (entry.verb === "wear" && entry.command === identityWear.command) entry.identityWearScope = identityWear;
        });
        result.forEach(function (entry) {
            var ls = lightScopes.hasOwnProperty(entry.verb) ? lightScopes[entry.verb] : null;
            if (ls && entry.command === ls.command) entry.lightFormScope = ls;
        });
        if (typeof LearnedWords !== "undefined") LearnedWords.commands(obj).forEach(function (c) {
            if (!result.some(function (existing) { return existing.command === c.command; })) result.push(c);
        });
        var allowed = result.map(function (entry) { return ActionSynth.normalizeQualifiedRemovalCandidate(entry, obj); }).filter(function (entry) { return entry && ActionSynth.authoredCommandAllowed(obj.id, entry.verb, context); });
        if (typeof Actionable !== 'undefined' && Actionable.learnedItemScopeFor && !(options && options.allowAmbiguousReference)) {
            allowed.forEach(function (entry) { var scope = Actionable.learnedItemScopeFor(entry, context); if (scope) entry.learnedItemScope = scope; });
        }
        if (context === "inventory" || containerName || (options && (options.allowAmbiguousReference || options.directEvidenceOnly))) return allowed;
        return allowed.concat(ActionSynth.addressedFormsFor(obj, allowed));
    },

    // D8 P8: per-title fact actorAddressing {robots, form, nameTable:{global,address}, linkedGlobal, roomsHolder}.
    // Only for the exact executable fact of a validated confirmed-zil-family title. The robot domain is
    // the game's own actor table, re-read live: the named global must still point at the audited table
    // and the table must list exactly these ids in this order. Each robot's name is its short name,
    // which must be one of its own parser words and a dictionary word. Anything malformed or drifted
    // makes the whole fact absent (no addressed forms; everything else unchanged).
    actorAddressingDomain: (mem) => {
        try {
            if (!mem || typeof ZRamReader === "undefined" || typeof ModuleStatFactsClaude === "undefined") return null;
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest && ModuleLibrary.currentExecutableDigest();
            var fact = ZRamReader.executableLayoutFacts(mem);
            if (!digest || !fact || ModuleStatFactsClaude[digest] !== fact) return null;
            var family = typeof GrammarProvider !== "undefined" && GrammarProvider.decodeD198 ? GrammarProvider.decodeD198(mem) : null;
            if (!family || family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return null;
            var spec = fact.actorAddressing, plain = function (o) { return !!o && typeof o === "object" && Object.getPrototypeOf(o) === Object.prototype; };
            if (!plain(spec) || Object.keys(spec).sort().join() !== "form,linkedGlobal,nameTable,robots,roomsHolder") return null;
            if (spec.form !== "<name>, <command>" || !plain(spec.nameTable) || Object.keys(spec.nameTable).sort().join() !== "address,global") return null;
            var count = ZRamReader.objectCount(mem), h = ZRamReader.header(mem), robots = spec.robots;
            var gslot = function (n) { return Number.isInteger(n) && n >= 0 && n < 240 && h.globals + 2 * n + 2 <= mem.byteLength; };
            if (!Array.isArray(robots) || !robots.length || !gslot(spec.nameTable.global) || !gslot(spec.linkedGlobal)) return null;
            if (!Number.isInteger(spec.roomsHolder) || spec.roomsHolder < 1 || spec.roomsHolder > count || robots.indexOf(spec.roomsHolder) >= 0) return null;
            var address = spec.nameTable.address;
            if (!Number.isInteger(address) || address < 64 || address + 2 * robots.length > mem.byteLength) return null;
            if (ZRamReader.u16(mem, h.globals + 2 * spec.nameTable.global) !== address) return null;
            var out = [], seen = {};
            for (var i = 0; i < robots.length; i++) {
                var id = robots[i];
                if (!Number.isInteger(id) || id < 1 || id > count || seen[id] || ZRamReader.u16(mem, address + 2 * i) !== id) return null;
                seen[id] = true;
                var shortName = String(ZRamReader.shortName(mem, id) || "").trim(), word = shortName.toLowerCase();
                if (!/^[a-z]+$/.test(word) || (ZRamReader.parserWordsAny(mem, id) || []).indexOf(word) < 0 ||
                    !ZRamReader.hasDictionaryWord(mem, word)) return null;
                out.push({ id: id, word: word, name: word.charAt(0).toUpperCase() + word.slice(1) });
            }
            var linked = ZRamReader.u16(mem, h.globals + 2 * spec.linkedGlobal);
            return { digest: digest, robots: out, linked: seen[linked] ? linked : null, roomsHolder: spec.roomsHolder };
        } catch (eDomain) { return null; }
    },
    // The robot's room: the first object on its live parent chain whose parent is the game's ROOMS holder.
    actorRoom: (mem, id, holder) => {
        try {
            var count = ZRamReader.objectCount(mem), raw = ZRamReader.objectLinks(mem, id), seen = {};
            for (var depth = 0; raw && depth < count; depth++) {
                var parent = raw.parent;
                if (!Number.isInteger(parent) || parent < 1 || parent > count || seen[parent]) return null;
                seen[parent] = true;
                raw = ZRamReader.objectLinks(mem, parent);
                if (raw && raw.parent === holder) return parent;
            }
        } catch (eRoom) {}
        return null;
    },
    // Live RAM: the object's parent chain reaches the robot's room through supporters and open or
    // transparent containers only; another actor's possessions never qualify.
    reachesActorRoom: (mem, objectId, room, actors) => {
        try {
            var count = ZRamReader.objectCount(mem), raw = ZRamReader.objectLinks(mem, objectId), seen = {};
            for (var depth = 0; raw && depth < count; depth++) {
                var parent = raw.parent;
                if (parent === room) return true;
                if (!Number.isInteger(parent) || parent < 1 || parent > count || seen[parent]) return false;
                seen[parent] = true;
                if (actors && actors[parent]) return false;
                raw = ZRamReader.objectLinks(mem, parent);
                if (!raw) return false;
                var a = AttributeSchema.applyTo({}, raw, mem);
                if (a.animate) return false;
                if (!(a.supporter || a.transparent || (a.container && (a.isOpen || a.open)))) return false;
            }
        } catch (eReach) {}
        return false;
    },
    // A line input that is answering a question (setup, QUIT/RESTART confirm, the parser's
    // missing-noun or which-one prompt) is not a command prompt: no addressed story command goes there.
    nonCommandPrompt: () => {
        try {
            if (typeof StatTracker !== "undefined" && StatTracker.hasQuestionPrompt && StatTracker.hasQuestionPrompt()) return true;
            if (typeof document === "undefined") return false;
            var input = document.querySelector(".Input.LineInput"), line = input && input.closest && input.closest(".BufferLine");
            for (var n = 0; line && n < 4; n++, line = line.previousElementSibling) {
                var text = String(line.textContent || "").replace(/ /g, " ").trim().replace(/\s*>+\s*$/, "");
                if (!text || /^(?:>|=>|>>)$/.test(text)) continue;
                return /\(Y is affirmative\):?$/i.test(text) || /^(?:[A-Z]+:\s*)?What do you want to [^?]{1,60}\?$/.test(text) ||
                    /^(?:[A-Z]+:\s*)?Which\b[^?]{0,160}\?$/.test(text);
            }
        } catch (ePrompt) {}
        return false;
    },
    addressedFormsFor: (obj, bare) => {
        try {
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            var id = Number(obj && obj.id);
            if (!mem || !Number.isInteger(id) || id < 1 || !(bare || []).length || ActionSynth.nonCommandPrompt()) return [];
            var domain = ActionSynth.actorAddressingDomain(mem);
            if (!domain || domain.robots.some(function (r) { return r.id === id; })) return [];
            var actors = {};
            domain.robots.forEach(function (r) { actors[r.id] = true; });
            var eligible = domain.robots.filter(function (r) {
                var room = ActionSynth.actorRoom(mem, r.id, domain.roomsHolder);
                return room !== null && room !== id && ActionSynth.reachesActorRoom(mem, id, room, actors);
            });
            // The game's own linked-robot global orders first; nobody is ever chosen silently.
            eligible.sort(function (a, b) { return (b.id === domain.linked) - (a.id === domain.linked); });
            var out = [];
            eligible.forEach(function (r) {
                bare.forEach(function (c) {
                    if (!c || typeof c.command !== "string" || /\s$/.test(c.command) || c.wornRemovalScope || c.qualifiedRemovalScope || c.learnedWordScope) return;
                    out.push({ verb: c.verb, noun: c.noun, objectId: c.objectId, command: r.word + ", " + c.command,
                        label: r.name + ": " + String(c.verb || "").charAt(0).toUpperCase() + String(c.verb || "").slice(1),
                        confidence: c.confidence,
                        actorAddressing: { digest: domain.digest, actor: r.id, objectId: id, command: r.word + ", " + c.command } });
                });
            });
            return out;
        } catch (eAddr) { return []; }
    },
    // Re-checked at radial tap: same digest, same actor still co-located, still offered, command prompt.
    addressedCommandCurrent: (command) => {
        var scope = command && command.actorAddressing;
        if (!scope || command.command !== scope.command) return false;
        var obj = { id: scope.objectId, name: command.noun || "x" };
        var fresh = ActionSynth.addressedFormsFor(obj, [{ verb: command.verb, noun: command.noun, objectId: command.objectId,
            command: scope.command.slice(scope.command.indexOf(", ") + 2), confidence: command.confidence }]);
        return fresh.some(function (f) { return f.actorAddressing.digest === scope.digest && f.actorAddressing.actor === scope.actor &&
            f.command === scope.command; });
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
