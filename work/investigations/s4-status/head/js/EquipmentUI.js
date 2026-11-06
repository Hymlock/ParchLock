/* EquipmentUI (D122) -- categorised, sortable, filterable equipment sheet.
 *
 * The inventory payload has always been structural: WorldModel.lastPayload
 * .inventory is a FLAT array of { id, name, parentId, attrs } (D31) plus
 * payload.playerId, the "self" container that owns worn/carried gear.
 * js/Actionable.js RenderInventory already builds a parentId->children index
 * from it (:706) and then throws the structure away, flattening everything
 * into text suffixes -- "towel (in trenchcoat)", "key to the house (in
 * keyring)". That is why containment was unreadable and unusable: the nesting
 * was computed and then discarded.
 *
 * This module keeps the tree. Containment is recursive to ARBITRARY depth --
 * the operator's own save has trenchcoat (worn) > keyring > key to the house,
 * three levels, and a sub-container is just a container whose parent happens
 * to be another container. Nothing here may assume one level.
 *
 * The game stays the authority. A drag-and-drop does not move anything
 * locally; it submits the real command ("put X in Y") and lets the next
 * payload re-render, exactly like every other action in this app.
 */
var EquipmentUI = {

    Prefs: { containerView: true, sort: "alpha", filter: "", categories: { worn: true, carried: true, containers: true, spells: true } },

    _seq: {},
    _seqNext: 1,
    _seqKey: null,
    _bound: false,
    _drag: null,
    _press: null,
    _scrollRaf: null,
    _renderPending: false,
    YourselfDwellMs: 750,
    _holdPointerId: null,
    _holdClickUntil: 0,

    interactionReady: function (generation, moduleKey) {
        if (!EquipmentUI.IsOpen() || generation !== (typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0) || moduleKey !== EquipmentUI.seqKey()) return false;
        var input = document.querySelector(".Input.LineInput");
        return !!input && !input.value && !(typeof Message !== "undefined" && Message.IsOpen) && !document.getElementById("dialog") &&
            !(typeof StatTracker !== "undefined" && (StatTracker._probeActive || StatTracker._hideCarryProbe));
    },
    yourselfCommands: function (obj, model) {
        if (!obj || obj.examineOnly || typeof AttrCalibrator === "undefined" || typeof ActionSynth === "undefined") return [];
        var ref = Actionable.referenceFor(obj);
        // Ordinary interaction uses a unique scoped reference. Custom
        // parse_name alone is not ambiguity; learning owns its stricter gate.
        if (!ref.unique) return [];
        var nested = ActionSynth.heldContainerName(obj, WorldModel.lastPayload);
        var scopedRemoval = !nested && ActionSynth.wornRemovalScopeFor ? ActionSynth.wornRemovalScopeFor(obj) : null;
        var forms = {}, candidates = [];
        function allowed(form) {
            if (!AttrCalibrator.dictionaryForm(form)) return false;
            if (!ActionSynth.learnedFormAllowed(obj.id, form, 'inventory')) return false;
            if (form === ActionSynth.defaultInspectVerb() && ActionSynth.inspectVerbDisabled()) return false;
            if (nested) return form === "take" || form.indexOf("take out of ") === 0;
            if (EquipmentUI.isWorn(obj)) return form === (scopedRemoval ? "drop" : ((obj.attrs || {}).equipmentToggleVerb || "remove")) || form === ActionSynth.defaultInspectVerb();
            return form !== "remove" && form !== "take";
        }
        function add(form, enter, descriptor) {
            if (form === "remove" && ActionSynth.normalizeQualifiedRemovalCandidate) {
                descriptor = ActionSynth.normalizeQualifiedRemovalCandidate(descriptor || { objectId: obj.id, verb: form, command: form + " " + ref.noun, Enter: enter, enter: enter }, obj);
                if (!descriptor) return;
            }
            if (!allowed(form)) return;
            // Identity Wear (R3) carries its own scope; keep it like the E5 worn-removal scope.
            var scoped = descriptor && (descriptor.qualifiedRemovalScope || descriptor.wornRemovalScope || descriptor.identityWearScope || descriptor.lightFormScope) ? descriptor : null;
            if (scoped && !Actionable.radialCommandCurrent(scoped)) return;
            if (forms[form]) {
                if (scoped) { forms[form].ScopedCommand = scoped; forms[form].Enter = scoped.qualifiedRemovalScope ? enter !== false && scoped.Enter !== false && scoped.enter !== false : true; }
                else if (enter && !forms[form].ScopedCommand) forms[form].Enter = true;
                return;
            }
            var item = { Label: form.charAt(0).toUpperCase() + form.slice(1), Form: form, Enter: enter };
            if (scoped) item.ScopedCommand = scoped;
            forms[form] = item;
            candidates.push(item);
        }
        var commands = [];
        try {
            if (typeof SemanticActions !== "undefined" && SemanticActions.CutoverFlag && SemanticActions.CutoverFlag.isEnabled()) {
                commands = (SemanticActions.resolveForPayloadObjectId(obj.id, "inventory") || []).filter(function (command) {
                    if (!command || command.objectId == null || String(command.objectId) !== String(obj.id)) return false;
                    var direct = command.verb && command.command === command.verb + " " + ref.noun;
                    var nestedTake = nested && command.verb === "take out of " + nested && command.command === "take " + ref.noun;
                    return direct || nestedTake || !!(command.qualifiedRemovalScope && Actionable.radialCommandCurrent(command));
                });
            }
        } catch (eSemantic) {}
        commands = commands.concat(ActionSynth.commandsForObject(obj, "inventory", nested));
        commands.forEach(function (command) {
            if (!command || ((command.Enter === false || command.enter === false) && !command.qualifiedRemovalScope) ||
                (command.objectId != null && String(command.objectId) !== String(obj.id)) ||
                command.targetObjectId != null || command.topicObjectId != null ||
                (command.arity != null && command.arity !== 1) ||
                (command.objectIds && (command.objectIds.length !== 1 || String(command.objectIds[0]) !== String(obj.id)))) return;
            // The nested TAKE label is context only; preserve its actual provider command.
            var suffix = " " + ref.noun;
            if (command.qualifiedRemovalScope) { add("remove", command.Enter !== false && command.enter !== false, command); return; }
            if (command.command && command.command.endsWith(suffix)) add(command.command.slice(0, -suffix.length), true, command);
        });
        AttrCalibrator.learnedFormsFor(obj.id).forEach(function (form) { add(form, true); });
        if (typeof LearnedWords !== "undefined") LearnedWords.candidates(obj.id).forEach(function (c) { add(c.form, c.enter); });
        AttrCalibrator.RPG_VERBS.forEach(function (form) { add(form, false); });
        // D214 U5: wider editable lane, still dictionary-gated by allowed().
        (AttrCalibrator.ITEM_SUGGESTION_VERBS || []).forEach(function (form) { add(form, false); });
        if (typeof LearnedWords !== "undefined") candidates.forEach(function (c) { c.Label = LearnedWords.commandLabel(obj.id, c.Form, c.Label); });
        if (scopedRemoval) candidates = candidates.filter(function (c) { return c.Form !== "drop" || !!(c.ScopedCommand && c.ScopedCommand.wornRemovalScope); });
        candidates.forEach(function (c) {
            if (!c.ScopedCommand) return;
            if (c.ScopedCommand.qualifiedRemovalScope) c.Label = "Remove";
            else if (c.ScopedCommand.wornRemovalScope) c.Label = "Drop";
            else if (c.ScopedCommand.identityWearScope) c.Label = "Wear";
            else if (c.ScopedCommand.lightFormScope) c.Label = c.ScopedCommand.lightFormScope.verb.charAt(0).toUpperCase() + c.ScopedCommand.lightFormScope.verb.slice(1);
        });
        return candidates;
    },
    selectYourselfAction: function (id, form, enter, generation, moduleKey, selectedDescriptor) {
        if (!EquipmentUI.interactionReady(generation, moduleKey)) return;
        var model = EquipmentUI.model(), obj = model.byId[String(id)];
        if (!obj) return;
        if (form === "remove" && ActionSynth.qualifiedRemovalPolicyFor && ActionSynth.qualifiedRemovalPolicyFor(obj).status !== "unowned" &&
            (!selectedDescriptor || !selectedDescriptor.qualifiedRemovalScope)) return;
        if (selectedDescriptor && !Actionable.radialCommandCurrent(selectedDescriptor)) return;
        var candidate = EquipmentUI.yourselfCommands(obj, model).find(function (item) { return item.Form === form; });
        if (!candidate || (enter && !candidate.Enter)) return;
        if (selectedDescriptor) {
            var current = candidate.ScopedCommand;
            var kind = selectedDescriptor.qualifiedRemovalScope ? "qualifiedRemovalScope" : selectedDescriptor.wornRemovalScope ? "wornRemovalScope" : selectedDescriptor.identityWearScope ? "identityWearScope" : selectedDescriptor.lightFormScope ? "lightFormScope" : null;
            var prior = kind && selectedDescriptor[kind];
            if (!current || !prior || !current[kind] || !Actionable.radialCommandCurrent(current) ||
                current.command !== selectedDescriptor.command || current.objectId !== selectedDescriptor.objectId ||
                current[kind].digest !== prior.digest || current[kind].noun !== prior.noun ||
                ((kind === "identityWearScope" || kind === "lightFormScope" || kind === "qualifiedRemovalScope") && (current[kind].id !== prior.id || current[kind].generation !== prior.generation)) ||
                (kind === "qualifiedRemovalScope" && ["kind", "verb", "command"].some(function (key) { return current[kind][key] !== prior[key]; })) ||
                (kind === "lightFormScope" && (current[kind].side !== prior.side || current[kind].command !== prior.command || current[kind].context !== prior.context))) return;
            Actionable.runChosenCommand(current.command); return;
        }
        // Every Yourself form is a complete one-object command ("wield
        // gauche"), so it runs at once like the object radial; Enter only
        // records provenance. Shared decision: Actionable.runChosenCommand.
        Actionable.runChosenCommand(form + " " + Actionable.referenceFor(obj).noun);
    },
    cleanupDrag: function (d) {
        EquipmentUI._drag = null;
        EquipmentUI.stopAutoScroll();
        EquipmentUI.killGhost();
        if (d && d.el) d.el.classList.remove("equip-dragging");
        document.body.classList.remove("equip-dragging-active");
        EquipmentUI.clearHover();
        if (EquipmentUI._renderPending) { EquipmentUI._renderPending = false; EquipmentUI.Render(); }
    },
    openYourselfRadial: function (d) {
        if (!EquipmentUI.interactionReady(d.generation, d.moduleKey)) return;
        var model = EquipmentUI.model(), obj = model.byId[d.id];
        var candidates = EquipmentUI.yourselfCommands(obj, model);
        if (!candidates.length) return;
        EquipmentUI._holdPointerId = d.pointerId;
        EquipmentUI.cleanupDrag(d);
        candidates.forEach(function (item) {
            var descriptor = item.ScopedCommand || { objectId: obj.id, verb: item.Form, command: item.Form + ' ' + Actionable.referenceFor(obj).noun };
            item.LearnedCommand = Object.assign({}, descriptor, { learnedItemScope: Actionable.learnedItemScopeFor(descriptor, 'inventory') });
            item.Action = function () {
                if (item.LearnedCommand.learnedItemScope && !Actionable.radialCommandCurrent(item.LearnedCommand)) return;
                EquipmentUI.selectYourselfAction(d.id, item.Form, item.Enter, d.generation, d.moduleKey, item.ScopedCommand);
            };
            item.Command = item.ScopedCommand ? item.ScopedCommand.command : item.Form + " " + Actionable.referenceFor(obj).noun;
            item.Usage = Actionable.usageCount ? Actionable.usageCount(item.Command) : 0;
        });
        ParchLockQol.OpenRadial(d.lastX, d.lastY, candidates, { source: "inventory", noun: obj.name, objectId: obj.id, objectStatusStamp: ParchLockQol.ObjectStatusStamp ? ParchLockQol.ObjectStatusStamp() : null });
    },

    // ---- persistence of first-seen order (there are no timestamps in the
    // payload, so "most recent" has to be observed rather than read) --------
    seqKey: function () {
        var g = "";
        try { g = (typeof ParchLock !== "undefined" && ParchLock.GameFilename) || ""; } catch (e) {}
        return "PL_EquipSeq_" + g;
    },

    loadSeq: function () {
        var key = EquipmentUI.seqKey();
        if (EquipmentUI._seqKey === key) return;
        EquipmentUI._seqKey = key;
        EquipmentUI._seq = {};
        EquipmentUI._seqNext = 1;
        try {
            var raw = localStorage.getItem(key);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object" && parsed.seq) {
                    EquipmentUI._seq = parsed.seq;
                    EquipmentUI._seqNext = parsed.next || 1;
                }
            }
        } catch (e) {}
    },

    saveSeq: function () {
        try {
            localStorage.setItem(EquipmentUI._seqKey, JSON.stringify({ seq: EquipmentUI._seq, next: EquipmentUI._seqNext }));
        } catch (e) {}
    },

    registerInstances: function (items) {
        EquipmentUI.loadSeq();
        if (EquipmentUI._seqKey === 'PL_EquipSeq_') return;
        var dirty = false;
        (items || []).forEach(function (o) {
            if (!o || o.id == null || o.demo) return;
            var id = String(o.id);
            if (!EquipmentUI._seq[id]) { EquipmentUI._seq[id] = EquipmentUI._seqNext++; dirty = true; }
        });
        if (dirty) EquipmentUI.saveSeq();
    },

    // ---- model ----------------------------------------------------------
    isWorn: function (obj) {
        var a = obj && obj.attrs;
        if (!a) return false;
        // Same structural gate Actionable.RenderInventory uses (D58/D68) --
        // deliberately not a second opinion on what "worn" means.
        if (typeof AttributeSchema !== "undefined" && AttributeSchema.isTrulyWorn) return AttributeSchema.isTrulyWorn(a);
        if (!(a.worn || a.isWorn)) return false;
        if (a.scenery && !(a.clothing || a.wearable)) return false;
        return true;
    },

    // State labels need the same compiler/calibration authority as the RAM walk.
    // Raw Inform bits on another compiler cannot prove a spell is "closed".
    containerStateKnown: function (obj) {
        if (obj && obj.demo) return true;
        try {
            var mem = ZRamProvider.getMem();
            if (typeof ZRamReader !== 'undefined' && ZRamReader.attrInsideTrusted && ZRamReader.attrInsideTrusted(mem)) return true;
            // Codex #3466 / grok2 #3463: a verified ZIL digest fact owns the container bit (2e1455e path).
            return EquipmentUI.measuredOwner(mem, 'container');
        } catch (e) { return false; }
    },
    containerStateTags: function (obj) {
        var a = obj && obj.attrs || {}, tags = [];
        var containerKnown = EquipmentUI.containerStateKnown(obj);
        if (((a.container && containerKnown) || (a.openable && EquipmentUI.flagStateKnown(obj, 'openable')))
            && EquipmentUI.flagStateKnown(obj, 'open')) tags.push(a.open ? 'open' : 'closed');
        if (a.supporter && containerKnown) tags.push('surface');
        return tags;
    },

    measuredOwner: function (mem, flag, objectId) {
        try {
            return !!(mem && typeof AttributeSchema !== 'undefined' && AttributeSchema.measuredFlagOwner
                && AttributeSchema.measuredFlagOwner(mem, flag, objectId));
        } catch (e) { return false; }
    },

    flagStateKnown: function (obj, flag) {
        if (obj && obj.demo) return true;
        try {
            var mem = ZRamProvider.getMem();
            if (!mem) return false;
            if ((flag === "open" || flag === "openable") && AttributeSchema.containerStateAuthority) {
                var authority = AttributeSchema.containerStateAuthority(mem, obj && obj.id);
                if (authority.status === "valid") return true;
                if (authority.status === "claimed-invalid") return false;
            }
            if (ZRamReader.isInformCompiled(mem)) return AttributeSchema.bitFor(flag, mem) !== null;
            if (typeof AttrCalibrator !== 'undefined' && AttrCalibrator.hasConfirmedFlag(mem, flag)) return true;
            // Non-Inform: also accept the bounded digest ownership path (verified ZIL facts). Capability and state stay
            // separate checks, so 'on' alone never implies 'switchable' (Codex #3466, #3380).
            return EquipmentUI.measuredOwner(mem, flag, obj && obj.id);
        } catch (e) { return false; }
    },
    illuminationStateTags: function (obj) {
        try {
            if (!obj || obj.demo || typeof AttributeSchema === 'undefined' || !AttributeSchema.illuminationState) return [];
            return AttributeSchema.illuminationState(AttributeSchema._getMem(), obj.id) === true ? ['providing light'] : [];
        } catch (eIlluminationTag) { return []; }
    },
    activationStateTags: function (obj) {
        var a = obj && obj.attrs || {};
        try {
            if (!(obj && obj.demo) && typeof AttributeSchema !== 'undefined' && AttributeSchema.activationStateAllows &&
                !AttributeSchema.activationStateAllows(AttributeSchema._getMem(), obj && obj.id)) return [];
        } catch (eActivationState) { return []; }
        return a.switchable && EquipmentUI.flagStateKnown(obj, 'switchable')
            && EquipmentUI.flagStateKnown(obj, 'on') ? [a.on ? 'active' : 'inactive'] : [];
    },

    isContainer: function (obj) {
        var a = (obj && obj.attrs) || {};
        return !!(a.container || a.supporter);
    },

    // Can `target` actually receive `item` right now? Structural only.
    canAccept: function (target, item) {
        if (!target || !item) return false;
        if (String(target.id) === String(item.id)) return false;
        var a = target.attrs || {};
        if (target.self) return true;                 // "take X" -- always legal
        if (a.supporter) return true;                 // put on
        if (!a.container) return false;
        return !!a.open;                              // a closed container cannot receive
    },

    // D128: example ("ghost") items for the tutorial.
    //
    // The tour explains the live system over a real module, and plenty of
    // modules start you with nothing at all -- Anchorhead happens to hand you
    // a trenchcoat, but many games open empty-handed. Pointing at a blank
    // panel and describing a container tree teaches nothing, so when the tour
    // reaches the equipment steps with an empty inventory it borrows this
    // sample instead. It is deliberately three levels deep, because
    // sub-containers are the part that is hardest to describe in words.
    //
    // These are inert: not draggable, no action menu, and clearly labelled as
    // examples, so they can never be mistaken for the player's real gear or
    // submit a command to the game.
    // Shaped to mirror the real case: a WORN container, holding a container,
    // holding items -- three levels under Yourself, which is exactly the
    // arrangement that is impossible to explain in prose. The sealed jar is
    // included on purpose so the "a closed container refuses a drop" rule has
    // something to point at.
    DEMO_ITEMS: [
        { id: "demo-1", name: "travelling cloak", parentId: "demo-self", attrs: { worn: true, container: true, open: true }, demo: true },
        { id: "demo-2", name: "satchel", parentId: "demo-1", attrs: { container: true, open: true }, demo: true },
        { id: "demo-3", name: "brass coin", parentId: "demo-2", attrs: {}, demo: true },
        { id: "demo-4", name: "iron key", parentId: "demo-2", attrs: {}, demo: true },
        { id: "demo-5", name: "tin lantern", parentId: "demo-1", attrs: {}, demo: true },
        { id: "demo-6", name: "sealed jar", parentId: "demo-1", attrs: { container: true, open: false }, demo: true },
        { id: "demo-7", name: "walking stick", parentId: "demo-self", attrs: {}, demo: true }
    ],
    _demo: false,

    SetDemo: function (on) {
        EquipmentUI._demo = !!on;
        EquipmentUI.Render();
    },

    // True only when the tour asked for examples AND the player really has
    // nothing -- a module that does start you with gear always shows the
    // player's own items, never the sample.
    demoActive: function () {
        if (!EquipmentUI._demo) return false;
        try {
            var payload = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) || null;
            var real = ((payload && payload.inventory) || []).filter(function (o) { return o && o.id != null && o.name && o.labelSuppressed !== true; });
            return real.length === 0;
        } catch (e) { return true; }
    },

    // D16 P16: label projection only. labelSuppressed rows (NDESC, still in parser
    // scope) are not drawn; a drawn row whose parent is suppressed hangs under the
    // nearest drawn ancestor, else top level. That display parent goes in a
    // separate labelParentId used ONLY by tree/hierarchy/topLevel rendering;
    // parentId/pid stay physical so every command path (heldContainerName,
    // scoped commands, Actionable, ActionSynth) reads real custody. Only a
    // strict labelSuppressed === true hides a row.
    labelRows: function (rows) {
        var hidden = {};
        rows.forEach(function (o) { if (o.labelSuppressed === true) hidden[String(o.id)] = o; });
        if (!Object.keys(hidden).length) return rows;
        return rows.filter(function (o) { return o.labelSuppressed !== true; }).map(function (o) {
            var pid = o.parentId, guard = 0;
            while (pid != null && hidden[String(pid)] && guard++ < 64) pid = hidden[String(pid)].parentId;
            return pid === o.parentId ? o : Object.assign({}, o, { labelParentId: pid });
        });
    },
    // Display-only parent for tree rendering; never for commands.
    displayParentId: function (o) {
        return Object.prototype.hasOwnProperty.call(o, "labelParentId") ? o.labelParentId : o.parentId;
    },

    model: function () {
        EquipmentUI.loadSeq();
        if (EquipmentUI.demoActive()) {
            var demo = EquipmentUI.DEMO_ITEMS;
            var dById = {}, dByParent = {};
            demo.forEach(function (o) {
                dById[String(o.id)] = o;
                (dByParent[String(o.parentId)] = dByParent[String(o.parentId)] || []).push(o);
                if (!EquipmentUI._seq[String(o.id)]) EquipmentUI._seq[String(o.id)] = EquipmentUI._seqNext++;
            });
            return { items: demo, byId: dById, byParent: dByParent, itemIds: dById,
                     playerId: "demo-self", topLevel: dByParent["demo-self"] || [], demo: true };
        }
        var payload = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) || null;
        var items = [];
        try {
            items = EquipmentUI.labelRows(((payload && payload.inventory) || []).filter(function (o) { return o && o.id != null && o.name; }));
        } catch (e) {}

        var playerId = payload && (payload.playerId != null && payload.playerId !== ""
            ? payload.playerId
            : (payload.probe && payload.probe.playerId));
        // The inventory walker owns its holder, which can differ from a
        // parser-only pseudo-player. Use that same structural authority.
        if (payload && payload.probe && payload.probe.inventoryRootId > 0) playerId = payload.probe.inventoryRootId;

        var byId = {}, byParent = {}, itemIds = {};
        EquipmentUI.registerInstances(items);
        items.forEach(function (o) {
            var id = String(o.id);
            itemIds[id] = true;
            byId[id] = o;
            var key = String(EquipmentUI.displayParentId(o));
            (byParent[key] = byParent[key] || []).push(o);
        });

        // Top level, matching Actionable.RenderInventory's rule exactly.
        var topLevel = items.filter(function (o) {
            var dp = EquipmentUI.displayParentId(o);
            if (dp == null || dp === "") return true;
            if (playerId != null && String(dp) === String(playerId)) return true;
            if (!itemIds[String(dp)]) return true;
            return false;
        });

        return { items: items, byId: byId, byParent: byParent, itemIds: itemIds, playerId: playerId, topLevel: topLevel };
    },

    childrenOf: function (m, obj) {
        var kids = m.byParent[String(obj.id)] || [];
        // Guard against a malformed payload claiming an object is its own
        // parent, which would otherwise recurse forever.
        return kids.filter(function (k) { return String(k.id) !== String(obj.id); });
    },

    // ---- sorting --------------------------------------------------------
    comparator: function (mode) {
        var name = function (o) { return String(o.name || "").toLowerCase(); };
        var seq = function (o) { return EquipmentUI._seq[String(o.id)] || 0; };
        switch (mode) {
            case "za": return function (a, b) { return name(b) < name(a) ? -1 : name(b) > name(a) ? 1 : 0; };
            case "recent": return function (a, b) { return seq(b) - seq(a); };
            case "oldest": return function (a, b) { return seq(a) - seq(b); };
            case "container": return function (a, b) {
                var ac = EquipmentUI.isContainer(a) ? 0 : 1, bc = EquipmentUI.isContainer(b) ? 0 : 1;
                if (ac !== bc) return ac - bc;
                return name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0;
            };
            case "worn": return function (a, b) {
                var aw = EquipmentUI.isWorn(a) ? 0 : 1, bw = EquipmentUI.isWorn(b) ? 0 : 1;
                if (aw !== bw) return aw - bw;
                return name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0;
            };
            default: return function (a, b) { return name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0; };
        }
    },

    // ---- filtering ------------------------------------------------------
    // D149: a spell is only a meaningful category in a game that can cast at
    // all, so the gate is the same dictionary-verified one D147 uses for the
    // Cast launcher -- `cast` present in THIS story's own dictionary. That
    // alone excludes almost the whole catalog (measured absent from Zork 1,
    // Planetfall, Anchorhead and Advent; present in Enchanter, Sorcerer,
    // Spellbreaker and Balances).
    //
    // Within such a game an item counts as a spell when its printed name
    // carries a qualifying dictionary word that is not its head noun -- which
    // is exactly the shape every spell in the Enchanter family has ("rezrov
    // spell", head noun "spell", qualifier "rezrov"), and is the same evidence
    // D147 already relies on to make those commands unambiguous.
    //
    // Honest about the limit: this can over-include an ordinary two-word object
    // in a spellcasting game. The cost is that one item joins an optional
    // filter group; no command changes and nothing is hidden by it, because the
    // Spells box starts checked like every other category.
    isSpell: function (obj) {
        try {
            if (typeof Actionable === "undefined" || !Actionable.isGameWord) return false;
            if (!Actionable.isGameWord("cast")) return false;
            var head = Actionable.headNounOf ? Actionable.headNounOf(obj) : "";
            var tokens = String((obj && obj.name) || "").toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
            if (tokens.length < 2) return false;
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i] !== head && tokens[i].length > 2 && Actionable.isGameWord(tokens[i])) return true;
            }
            return false;
        } catch (e) { return false; }
    },

    categoryOf: function (obj) {
        if (EquipmentUI.isSpell(obj)) return "spells";
        if (EquipmentUI.isWorn(obj)) return "worn";
        if (EquipmentUI.isContainer(obj)) return "containers";
        return "carried";
    },

    categoryAllows: function (obj) {
        var c = EquipmentUI.Prefs.categories;
        var cat = EquipmentUI.categoryOf(obj);
        // An unknown category defaults to visible rather than silently hiding
        // items, so adding a category can never make inventory disappear.
        return c[cat] === undefined ? true : !!c[cat];
    },

    // D149: which categories actually occur in this module right now. A filter
    // for something the game does not have is noise, so its control is hidden
    // -- the same "only show what is relevant" rule the stat tracker follows.
    categoryCounts: function (m) {
        var counts = { worn: 0, carried: 0, containers: 0, spells: 0 };
        ((m && m.items) || []).forEach(function (o) {
            var cat = EquipmentUI.categoryOf(o);
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    },

    matchesText: function (obj) {
        var f = String(EquipmentUI.Prefs.filter || "").trim().toLowerCase();
        if (!f) return true;
        return String(obj.name || "").toLowerCase().indexOf(f) !== -1;
    },

    // A node survives when it matches itself, or when any DESCENDANT at any
    // depth matches -- otherwise filtering would sever a match from its own
    // container path and a sub-container's contents could never be found.
    subtreeMatches: function (m, obj, seen) {
        seen = seen || {};
        var id = String(obj.id);
        if (seen[id]) return false;
        seen[id] = true;
        if (EquipmentUI.matchesText(obj) && EquipmentUI.categoryAllows(obj)) return true;
        var kids = EquipmentUI.childrenOf(m, obj);
        for (var i = 0; i < kids.length; i++) {
            if (EquipmentUI.subtreeMatches(m, kids[i], seen)) return true;
        }
        return false;
    },

    // ---- flattening for render -----------------------------------------
    // Produces [{ obj, depth, self }] in display order. Recurses to
    // arbitrary depth so sub-containers nest exactly like containers, with
    // the chosen comparator applied independently at EVERY level.
    rows: function (m) {
        var cmp = EquipmentUI.comparator(EquipmentUI.Prefs.sort);
        var out = [];

        if (!EquipmentUI.Prefs.containerView) {
            var flat = m.items.filter(function (o) {
                return EquipmentUI.matchesText(o) && EquipmentUI.categoryAllows(o);
            }).slice().sort(cmp);
            flat.forEach(function (o) { out.push({ obj: o, depth: 0 }); });
            return out;
        }

        var seen = {};
        var walk = function (obj, depth) {
            var id = String(obj.id);
            if (seen[id]) return;                     // cycle guard
            seen[id] = true;
            out.push({ obj: obj, depth: depth });
            var kids = EquipmentUI.childrenOf(m, obj)
                .filter(function (k) { return EquipmentUI.subtreeMatches(m, k); })
                .slice().sort(cmp);
            kids.forEach(function (k) { walk(k, depth + 1); });
        };

        // The self container is a real base-level node, so worn gear reads as
        // "on you" instead of as a name suffix.
        var worn = m.topLevel.filter(EquipmentUI.isWorn).filter(function (o) { return EquipmentUI.subtreeMatches(m, o); }).slice().sort(cmp);
        var carried = m.topLevel.filter(function (o) { return !EquipmentUI.isWorn(o); }).filter(function (o) { return EquipmentUI.subtreeMatches(m, o); }).slice().sort(cmp);

        // Yourself is the character container, not a wearable-item category.
        // Keep the prior worn-row fallback when identity is unavailable.
        if ((m.playerId != null && m.playerId !== '' && String(m.playerId) !== '0') || worn.length) {
            var selfNode = { id: m.playerId != null ? m.playerId : "__self__", name: "Yourself", self: true, attrs: {} };
            out.push({ obj: selfNode, depth: 0, self: true });
            worn.forEach(function (o) { walk(o, 1); });
        }
        carried.forEach(function (o) { walk(o, 0); });
        return out;
    },

    // Is `candidateParent` inside `obj`'s own subtree? Prevents dropping a
    // container into itself or into one of its own descendants.
    isDescendant: function (m, obj, candidateId, seen) {
        seen = seen || {};
        var id = String(obj.id);
        if (seen[id]) return false;
        seen[id] = true;
        var kids = EquipmentUI.childrenOf(m, obj);
        for (var i = 0; i < kids.length; i++) {
            if (String(kids[i].id) === String(candidateId)) return true;
            if (EquipmentUI.isDescendant(m, kids[i], candidateId, seen)) return true;
        }
        return false;
    },

    dropCommand: function (m, item, target) {
        if (!EquipmentUI.canAccept(target, item)) return null;
        if (EquipmentUI.isDescendant(m, item, target.id)) return null;  // no cycles
        var sourceRef = typeof Actionable !== "undefined" && Actionable.referenceFor ? Actionable.referenceFor(item) : { noun: item.name, unique: true };
        var targetRef = target.self ? null : (typeof Actionable !== "undefined" && Actionable.referenceFor ? Actionable.referenceFor(target) : { noun: target.name, unique: true });
        if (!sourceRef.unique || (targetRef && !targetRef.unique)) return null;
        if (target.self) return "take " + sourceRef.noun;
        var a = target.attrs || {};
        if (a.container && a.open) return "put " + sourceRef.noun + " in " + targetRef.noun;
        if (a.supporter) return "put " + sourceRef.noun + " on " + targetRef.noun;
        return null;
    },

    // ---- rendering ------------------------------------------------------
    // The equipment sheet scrolls via SimpleBar, so the element that actually
    // moves is a wrapper, not #equipment-list. Find whichever ancestor really
    // has overflow rather than assuming which one it is.
    scrollerFor: function (el) {
        try {
            var n = el;
            while (n && n !== document.body) {
                if (n.scrollHeight > n.clientHeight + 1) return n;
                n = n.parentElement;
            }
        } catch (e) {}
        return null;
    },

    // D168: the options row is collapsed by default, so a filter left switched
    // on is invisible while it is still shortening the list. Counting the
    // non-default settings onto the summary keeps the disclosure honest --
    // without it, "Container view off plus Worn unticked" looks exactly like
    // "the game is not reporting those items", which is the wrong conclusion
    // to hand a player who is trying to find something they are carrying.
    syncOptionsLabel: function () {
        var label = document.getElementById("equipment-options-label");
        if (!label) return;
        var p = EquipmentUI.Prefs, n = 0;
        if (p.sort && p.sort !== "alpha") n++;
        if (!p.containerView) n++;
        if (p.filter) n++;
        ["worn", "carried", "containers", "spells"].forEach(function (cat) {
            // Only count a category the module actually offers: the spells
            // checkbox is hidden outside a game that can cast (D149), and a
            // hidden control must never be reported as an active filter.
            var box = document.getElementById("equipment-cat-" + cat);
            if (!box || box.offsetParent === null) return;
            if (p.categories && p.categories[cat] === false) n++;
        });
        if (n) label.setAttribute("data-active", String(n));
        else label.removeAttribute("data-active");
    },

    Render: function () {
        var host = document.getElementById("equipment-list");
        if (!host) return;

        EquipmentUI.syncOptionsLabel();

        // D127: never rebuild the list mid-drag. Render() is called from
        // Actionable.RenderInventory on every inventory refresh, and wiping
        // the list removes the row whose grip holds the pointer capture --
        // the browser then fires pointercancel and the player's drag is
        // aborted under their finger, mid-gesture, for no visible reason.
        // Defer to the drop instead; the payload is unchanged by a drag that
        // has not been released yet.
        if (EquipmentUI._drag || EquipmentUI._press) {
            EquipmentUI._renderPending = true;
            return;
        }
        EquipmentUI._renderPending = false;
        var m = EquipmentUI.model();
        var rows = EquipmentUI.rows(m);

        // D167 (operator-reported: "the screen snaps around instead of staying
        // in place where you place the item"). Render runs from
        // Actionable.RenderInventory on every inventory refresh, so a drop is
        // immediately followed by a rebuild -- and wiping the list resets the
        // scroll offset of whatever is scrolling it, which reads as the sheet
        // jumping under the finger. D127 already deferred a rebuild landing
        // MID-drag; this is the one that lands just after.
        var scroller = EquipmentUI.scrollerFor(host);
        var keepTop = scroller ? scroller.scrollTop : 0;

        host.innerHTML = "";
        var count = document.getElementById("equipment-count");
        if (count) count.textContent = String(m.items.length);
        var countLabel = document.getElementById("equipment-count-label");
        if (countLabel) countLabel.textContent = m.items.length === 1 ? "item" : "items";
        var listHead = document.getElementById("equipment-listhead");
        // Nothing to count reads worse than no line at all; the empty-state
        // message below already says there is no inventory.
        if (listHead) listHead.hidden = !m.items.length;

        // D149: a filter for a category this module does not have is noise, so
        // its control is hidden -- the same "only show what is relevant" rule
        // the stat tracker follows. The checkbox keeps its checked state, so a
        // category that appears later (the first container picked up, the first
        // spell learned) comes back already enabled and nothing is hidden by a
        // control the player never saw.
        try {
            var counts = EquipmentUI.categoryCounts(m);
            ["worn", "carried", "containers", "spells"].forEach(function (cat) {
                var box = document.getElementById("equipment-cat-" + cat);
                if (!box) return;
                var label = document.getElementById("equipment-cat-" + cat + "-label")
                    || (box.closest ? box.closest("label") : null);
                if (label) label.hidden = !counts[cat];
            });
        } catch (eCat) {}

        // Dynamic indent. Nesting is unbounded (a container in a container in
        // a container), so a fixed per-level step walks the deepest rows off
        // the right edge -- on a phone that happens at about four levels. The
        // step is instead derived from how deep this particular tree actually
        // goes and how much width there is, so the whole chain stays on
        // screen: generous indent for shallow trees, progressively tighter
        // for deep ones, never below a level that is still readable as a
        // step. Row names ellipsize rather than overflow, so even past the
        // floor nothing escapes the panel.
        var maxDepth = 0;
        rows.forEach(function (r) { if (r.depth > maxDepth) maxDepth = r.depth; });
        var avail = host.clientWidth || 320;
        var step = 18;
        if (maxDepth > 0) {
            // Never let the deepest row's indent eat more than ~45% of the
            // panel, so there is always room for the name itself.
            step = Math.floor((avail * 0.45) / maxDepth);
            step = Math.max(8, Math.min(18, step));
        }
        host.style.setProperty("--equip-indent", step + "px");
        host.setAttribute("data-max-depth", String(maxDepth));

        if (!rows.length) {
            var empty = document.createElement("div");
            empty.className = "equip-empty";
            empty.textContent = m.items.length ? "Nothing matches this filter." : "No inventory recorded yet. Use Refresh.";
            host.appendChild(empty);
            return;
        }

        if (m.demo) {
            var note = document.createElement("p");
            note.className = "equip-demo-note";
            note.textContent = "Example items — this story has not given you anything yet. Your own belongings will appear here.";
            host.appendChild(note);
        }

        var displayText = typeof Actionable !== "undefined" ? Actionable.Scope.lastLookText + "\n" + Actionable.Scope.lastInventoryText + "\n" + (Actionable.Scope.lastReplyText || "") : "";
        var displayLabels = {};
        m.items.forEach(function (item) {
            var name = typeof Actionable !== "undefined" && Actionable.displayNameFor ? Actionable.displayNameFor(item, m.items, displayText) : item.name;
            if (typeof LearnedWords !== "undefined") name = LearnedWords.label("name", item.id, name);
            displayLabels[String(item.id)] = name;
        });
        rows.forEach(function (row) {
            var o = row.obj;
            var el = document.createElement("div");
            el.className = "equip-row" + (row.self ? " equip-self" : "");
            el.setAttribute("data-object-id", String(o.id));
            el.style.setProperty("--equip-depth", String(row.depth));
            if ((EquipmentUI.isContainer(o) && EquipmentUI.containerStateKnown(o)) || EquipmentUI.childrenOf(m,o).length || row.self) el.classList.add("equip-container");
            if (EquipmentUI.isWorn(o)) el.classList.add("equip-worn");

            var label = document.createElement("span");
            label.className = "equip-name";
            label.textContent = row.self ? o.name : displayLabels[String(o.id)];
            el.appendChild(label);
            if (!row.self && !o.demo && typeof StatTracker !== "undefined" && StatTracker.itemMetricsFor) {
                StatTracker.itemMetricsFor(o.id).forEach(function (metric) {
                    var quantity = document.createElement("span");
                    quantity.className = "equip-state";
                    quantity.title = metric.field;
                    quantity.textContent = metric.field + ": " + metric.value + (metric.unit ? " " + metric.unit : "");
                    el.appendChild(quantity);
                });
            }
            var siblings = m.items.filter(function (other) { return String(displayLabels[String(other.id)]).toLowerCase() === String(displayLabels[String(o.id)]).toLowerCase(); });
            if (!row.self && siblings.length > 1) {
                var badge = document.createElement("small");
                badge.className = "equip-instance";
                badge.setAttribute("aria-hidden", "true");
                badge.textContent = "instance " + EquipmentUI._seq[String(o.id)];
                el.appendChild(badge);
            }

            var tags = [];
            if (row.self) tags.push("you");
            else {
                if (EquipmentUI.isWorn(o)) tags.push("worn");
                var a = o.attrs || {};
                tags = tags.concat(EquipmentUI.containerStateTags(o));
                tags = tags.concat(EquipmentUI.activationStateTags(o));
                tags = tags.concat(EquipmentUI.illuminationStateTags(o));
                var kidCount = EquipmentUI.childrenOf(m, o).length;
                if (kidCount) tags.push(kidCount + " inside");
            }
            if (tags.length) {
                var tag = document.createElement("span");
                tag.className = "equip-tags";
                tags.forEach(function (state) {
                    var label = document.createElement("span");
                    label.className = "equip-state";
                    label.textContent = state;
                    tag.appendChild(label);
                });
                el.appendChild(tag);
            }

            if (o.demo) el.classList.add("equip-demo");

            if (!row.self && !o.demo) {
                el.addEventListener("contextmenu", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (Date.now() < (el._holdContextUntil || 0)) return;
                    if (typeof Actionable !== "undefined") Actionable.Open(String(o.name).toLowerCase(), "inventory", e.clientX, e.clientY, o.id);
                });
                EquipmentUI.bindHold(el, o);

                // D125 (operator-reported): dragging used to start anywhere on
                // the row, which meant the row needed touch-action:none and
                // the sheet became very hard to scroll -- every swipe that
                // began on an item was claimed as a drag. A dedicated grab
                // handle is the standard fix: only the handle opts out of
                // touch scrolling, so a swipe anywhere else on the row pans
                // the list normally, and a deliberate drag still works.
                var grip = document.createElement("span");
                grip.className = "equip-grip";
                grip.setAttribute("aria-label", "Drag " + o.name);
                grip.setAttribute("title", "Drag to move " + o.name);
                grip.innerHTML = '<svg viewBox="0 0 10 16" aria-hidden="true" focusable="false">' +
                    '<circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/>' +
                    '<circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/>' +
                    '<circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/></svg>';
                el.appendChild(grip);
                EquipmentUI.bindDrag(grip, o, m, el);
            }
            if (!o.demo) EquipmentUI.markDropTarget(el, o);
            host.appendChild(el);
        });

        // Put the scroll position back after the rebuild (see the note where
        // keepTop is captured). Clamped, because the list can be shorter now
        // -- dropping the last item out of a container removes a row.
        if (scroller && keepTop) {
            var maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
            scroller.scrollTop = Math.min(keepTop, maxTop);
        }
    },

    // ---- drag and drop --------------------------------------------------
    bindHold: function (row, obj) {
        var cancel = function (e) {
            var press = EquipmentUI._press;
            if (!press || press.row !== row) return;
            clearTimeout(press.timer);
            Actionable.endHoldSelection(press);
            EquipmentUI._press = null;
            if (press.fired && e && e.cancelable) e.preventDefault();
            if (EquipmentUI._renderPending && !EquipmentUI._drag) EquipmentUI.Render();
        };
        row.addEventListener('touchstart', function (e) {
            if (e.target.closest('.equip-grip') || e.touches.length !== 1) return;
            cancel();
            var t = e.touches[0];
            var press = { el: row, row: row, x: t.clientX, y: t.clientY, fired: false, touchId: t.identifier };
            EquipmentUI._press = press;
            Actionable.beginHoldSelection(press);
            press.timer = setTimeout(function () {
                if (EquipmentUI._press !== press || !row.isConnected || !EquipmentUI.IsOpen()
                    || Message.IsOpen || document.getElementById('dialog')) return;
                press.fired = true;
                Actionable.fireHoldSelection(press);
                row._holdContextUntil = Date.now() + 1000;
                Actionable.Open(String(obj.name).toLowerCase(), 'inventory', press.x, press.y, obj.id);
            }, Actionable.LongPressMs);
        }, { passive: true });
        row.addEventListener('touchmove', function (e) {
            var press = EquipmentUI._press, t = e.touches[0];
            if (!press || press.row !== row || !t) return;
            var dx = t.clientX - press.x, dy = t.clientY - press.y;
            if (!press.fired && dx * dx + dy * dy > Actionable.LongPressMoveCancelPx * Actionable.LongPressMoveCancelPx) cancel(e);
        }, { passive: false });
        row.addEventListener('touchend', cancel, { passive: false });
        row.addEventListener('touchcancel', cancel, { passive: false });
    },

    // Pointer Events, not HTML5 drag-and-drop: the latter does not fire on
    // touch at all, and this has to work identically on phone and desktop.
    // A drag only begins past a movement threshold, so a plain tap still
    // reaches the action radial and the existing long-press is unaffected.
    // `handle` is what you press to start a drag; `row` is what gets the
    // dragging style and is excluded as its own drop target. They are
    // deliberately different elements -- see the grip comment in Render().
    bindDrag: function (handle, obj, m, row) {
        if (obj.self) return;
        handle.addEventListener("pointerdown", function (e) {
            if (e.button != null && e.button !== 0) return;
            // Claim the gesture: without this the sheet's scroller can still
            // steal it on some engines even with touch-action set.
            try { handle.setPointerCapture(e.pointerId); } catch (eC) {}
            e.preventDefault();
            e.stopPropagation();
            EquipmentUI._drag = { id: String(obj.id), obj: obj, x: e.clientX, y: e.clientY, active: false, el: row, model: m,
                pointerId: e.pointerId, generation: typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0, moduleKey: EquipmentUI.seqKey() };
        });
    },

    markDropTarget: function (el, obj) {
        el._equipObj = obj;
    },

    clearHover: function () {
        var prev = document.querySelectorAll(".equip-drop-ok, .equip-drop-no");
        for (var i = 0; i < prev.length; i++) prev[i].classList.remove("equip-drop-ok", "equip-drop-no");
    },

    // Mark whatever sits under the pointer right now. Factored out because it
    // has to run both on pointermove AND on every auto-scroll frame -- during
    // an edge hold the pointer is stationary but the list is moving, so the
    // row underneath changes with no pointer event to trigger a refresh.
    updateHover: function (d, x, y) {
        EquipmentUI.clearHover();
        var under = EquipmentUI.rowAt(x, y);
        var self = under && under._equipObj && under._equipObj.self;
        if (!self || !EquipmentUI.interactionReady(d.generation, d.moduleKey)) d.dwellStart = null;
        else {
            if (d.dwellStart == null) d.dwellStart = Date.now();
            if (Date.now() - d.dwellStart >= EquipmentUI.YourselfDwellMs) { EquipmentUI.openYourselfRadial(d); return; }
        }
        if (under && under !== d.el && under._equipObj) {
            var cmd = EquipmentUI.dropCommand(d.model, d.obj, under._equipObj);
            under.classList.add(cmd ? "equip-drop-ok" : "equip-drop-no");
        }
    },

    // D127 (operator): edge auto-scroll. Without it you can only drop onto
    // rows that already happen to be visible -- a deep tree is taller than
    // the sheet, so the top of the list (Yourself, i.e. "take it out of its
    // container") is routinely off screen exactly when you need it. Holding
    // the dragged line near either edge of the sheet scrolls it, so every row
    // is reachable. Speed ramps with how far into the edge zone you are,
    // which is the standard feel: brush the edge and it creeps, push into it
    // and it moves.
    EDGE: 64,          // px of the sheet counted as an auto-scroll zone
    EDGE_MAX: 22,      // px per frame at the very edge

    scroller: function () {
        return document.getElementById("equipment");
    },

    // Pure, so it is testable without a browser: given the scroller's rect and
    // the pointer's y, how many px should this frame scroll? Negative is up.
    edgeDelta: function (r, y) {
        if (!r) return 0;
        if (y < r.top + EquipmentUI.EDGE) {
            return -EquipmentUI.EDGE_MAX * Math.min(1, (r.top + EquipmentUI.EDGE - y) / EquipmentUI.EDGE);
        }
        if (y > r.bottom - EquipmentUI.EDGE) {
            return EquipmentUI.EDGE_MAX * Math.min(1, (y - (r.bottom - EquipmentUI.EDGE)) / EquipmentUI.EDGE);
        }
        return 0;
    },

    autoScrollTick: function () {
        var d = EquipmentUI._drag;
        if (!d || !d.active) { EquipmentUI._scrollRaf = null; return; }
        if (!EquipmentUI.IsOpen() || d.generation !== (typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0) || d.moduleKey !== EquipmentUI.seqKey()) {
            EquipmentUI.cleanupDrag(d); return;
        }
        var box = EquipmentUI.scroller();
        if (box) {
            var dy = EquipmentUI.edgeDelta(box.getBoundingClientRect(), d.lastY);
            if (dy) {
                var before = box.scrollTop;
                box.scrollTop = before + dy;
                // The list moved under a stationary pointer, so re-resolve
                // what is now beneath it.
                if (box.scrollTop !== before) EquipmentUI.updateHover(d, d.lastX, d.lastY);
            }
        }
        EquipmentUI.updateHover(d, d.lastX, d.lastY);
        if (EquipmentUI._drag !== d) return;
        EquipmentUI._scrollRaf = requestAnimationFrame(EquipmentUI.autoScrollTick);
    },

    startAutoScroll: function () {
        if (EquipmentUI._scrollRaf) return;
        EquipmentUI._scrollRaf = requestAnimationFrame(EquipmentUI.autoScrollTick);
    },

    stopAutoScroll: function () {
        if (EquipmentUI._scrollRaf) cancelAnimationFrame(EquipmentUI._scrollRaf);
        EquipmentUI._scrollRaf = null;
    },

    bindGlobalDrag: function () {
        document.addEventListener("pointerup", function (e) {
            if (EquipmentUI._holdPointerId == null || e.pointerId !== EquipmentUI._holdPointerId) return;
            EquipmentUI._holdPointerId = null;
            EquipmentUI._holdClickUntil = Date.now() + 150;
            e.preventDefault();
            e.stopImmediatePropagation();
        }, true);
        document.addEventListener("click", function (e) {
            if (Date.now() < EquipmentUI._holdClickUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
        }, true);
        document.addEventListener("lostpointercapture", function (e) {
            var d = EquipmentUI._drag;
            if (d && e.pointerId === d.pointerId) EquipmentUI.cleanupDrag(d);
        });
        document.addEventListener("pointermove", function (e) {
            var d = EquipmentUI._drag;
            if (!d) return;
            if (e.pointerId !== d.pointerId) return;
            d.lastX = e.clientX;
            d.lastY = e.clientY;
            if (!d.active) {
                if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 8) return;
                d.active = true;
                d.el.classList.add("equip-dragging");
                document.body.classList.add("equip-dragging-active");
                EquipmentUI.makeGhost(d, e);
                EquipmentUI.startAutoScroll();
            }
            e.preventDefault();
            EquipmentUI.moveGhost(d, e);
            EquipmentUI.updateHover(d, e.clientX, e.clientY);
        }, { passive: false });

        var finish = function (e) {
            var d = EquipmentUI._drag;
            if (d && e.pointerId !== d.pointerId) return;
            var under = d && d.active ? EquipmentUI.rowAt(e.clientX, e.clientY) : null;
            var targetId = under && under !== d.el && under._equipObj ? under._equipObj.id : null;
            EquipmentUI._drag = null;
            EquipmentUI.stopAutoScroll();
            if (!d) return;
            EquipmentUI.killGhost();
            d.el.classList.remove("equip-dragging");
            document.body.classList.remove("equip-dragging-active");
            EquipmentUI.clearHover();
            if (EquipmentUI._renderPending) {
                EquipmentUI._renderPending = false;
                try { EquipmentUI.Render(); } catch (eR) {}
            }
            if (!d.active) return;                     // was a tap, not a drag
            if (targetId != null) EquipmentUI.submitDrop(d.id, targetId);
        };
        document.addEventListener("pointerup", finish);
        document.addEventListener("pointercancel", function () {
            EquipmentUI._holdPointerId = null;
            var d = EquipmentUI._drag;
            EquipmentUI._drag = null;
            EquipmentUI.stopAutoScroll();
            EquipmentUI.killGhost();
            if (d) { d.el.classList.remove("equip-dragging"); document.body.classList.remove("equip-dragging-active"); }
            EquipmentUI.clearHover();
            if (EquipmentUI._renderPending && !EquipmentUI._press) {
                EquipmentUI._renderPending = false;
                try { EquipmentUI.Render(); } catch (eR) {}
            }
        });
    },

    submitDrop: function (itemId, targetId) {
        var generation = typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0;
        var started = Date.now();
        clearTimeout(EquipmentUI._dropTimer);
        var attempt = function () {
            if (!EquipmentUI.IsOpen() || Date.now() - started > 5000
                || (typeof UndoRestoreSync !== "undefined" && UndoRestoreSync.generation !== generation)) return;
            var input = document.querySelector('.Input.LineInput');
            if (!input || (typeof StatTracker !== "undefined" && (StatTracker._probeActive || StatTracker._hideCarryProbe))) {
                EquipmentUI._dropTimer = setTimeout(attempt, 100);
                return;
            }
            // Never overwrite a draft or submit through a modal. Resolve the
            // physical rows again after any probe, not from a stale drag model.
            if (input.value || Message.IsOpen || document.getElementById('dialog')) return;
            var m = EquipmentUI.model();
            var item = m.byId[String(itemId)], target = m.byId[String(targetId)];
            if (!target && String(m.playerId) === String(targetId)) target = { id: m.playerId, self: true };
            if (!item || !target) return;
            var command = EquipmentUI.dropCommand(m, item, target);
            if (command) Actionable.Submit(command);
        };
        attempt();
    },

    // D126: a translucent replica of the line you picked up, following the
    // pointer. Without it the only feedback was an outline on the row you
    // were dragging TOWARDS, so nothing was visibly in your hand and the
    // gesture read as jarring. The ghost answers "what am I carrying?" while
    // the drop outline keeps answering "where will it land?" -- both, not one
    // instead of the other.
    makeGhost: function (d, e) {
        EquipmentUI.killGhost();
        try {
            var rect = d.el.getBoundingClientRect();
            var ghost = d.el.cloneNode(true);
            ghost.classList.add("equip-ghost");
            ghost.classList.remove("equip-dragging", "equip-drop-ok", "equip-drop-no");
            ghost.removeAttribute("id");
            // The clone keeps the row's own indent margin, which would offset
            // it away from the pointer -- it is positioned absolutely now, so
            // the margin has to go.
            ghost.style.marginLeft = "0";
            ghost.style.width = rect.width + "px";
            ghost.style.height = rect.height + "px";
            document.body.appendChild(ghost);
            // Grab offset, so the line stays exactly where it was picked up
            // relative to the finger instead of jumping to be centred on it.
            d.ghost = ghost;
            d.gdx = e.clientX - rect.left;
            d.gdy = e.clientY - rect.top;
            EquipmentUI.moveGhost(d, e);
        } catch (err) {}
    },

    moveGhost: function (d, e) {
        if (!d || !d.ghost) return;
        d.ghost.style.left = Math.round(e.clientX - d.gdx) + "px";
        d.ghost.style.top = Math.round(e.clientY - d.gdy) + "px";
    },

    killGhost: function () {
        var g = document.querySelectorAll(".equip-ghost");
        for (var i = 0; i < g.length; i++) {
            if (g[i].parentNode) g[i].parentNode.removeChild(g[i]);
        }
    },

    rowAt: function (x, y) {
        var stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
        for (var i = 0; i < stack.length; i++) {
            var el = stack[i];
            while (el && el !== document.body) {
                if (el.classList && el.classList.contains("equip-row")) return el;
                el = el.parentNode;
            }
        }
        return null;
    },

    // ---- sheet + tab ----------------------------------------------------
    IsOpen: function () {
        return document.body.classList.contains("equip-open");
    },

    Show: function () {
        // Operator-reported (Treasures, phone): switching from the Map sheet
        // straight to Equipment played the Map's 0.28s slide-out, and the
        // whole map (rooms, controls, game info) visibly streamed past through
        // the input strip below the Equipment sheet. A sheet that is being
        // REPLACED closes instantly; an ordinary Map close keeps its slide.
        if (document.body.classList.contains("map-open")) {
            document.body.classList.add("pl-sheet-swap");
            requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.remove("pl-sheet-swap"); }); });
        }
        document.body.classList.remove("map-open");
        document.body.classList.add("equip-open");
        // Read current structure on every open, including in-place vocabulary
        // changes. This refresh submits no game command.
        try {
            if (typeof Actionable !== "undefined" && Actionable.Refresh) {
                Actionable.Signature = "";
                Actionable.Refresh();
            } else if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
        } catch (eRefresh) {}
        EquipmentUI.Render();
        try {
            if (typeof StatTracker !== "undefined" && StatTracker.requestStatusFulfillment) {
                StatTracker.requestStatusFulfillment(false);
            }
        } catch (eBoot) {}
    },

    Hide: function () {
        Actionable.endHoldSelection(EquipmentUI._press);
        if (EquipmentUI._press) clearTimeout(EquipmentUI._press.timer);
        EquipmentUI._press = null;
        clearTimeout(EquipmentUI._dropTimer);
        EquipmentUI._dropTimer = null;
        document.body.classList.remove("equip-open");
        // A pending stat-check retry belongs to this open sheet; drop it now.
        try { if (window.StatTracker && StatTracker.cancelFulfillmentRetry) StatTracker.cancelFulfillmentRetry(); } catch (eRetry) {}
    },

    // The operator's navigation contract: the equipment tab is only reachable
    // while a sheet is open. From the map it swaps the map out for equipment;
    // from equipment it returns to the MAIN SCREEN, not back to the map.
    Toggle: function () {
        if (EquipmentUI.IsOpen()) EquipmentUI.Hide();
        else EquipmentUI.Show();
    },

    Init: function () {
        if (EquipmentUI._bound) return;
        EquipmentUI._bound = true;

        var tab = document.getElementById("pl-equip-tab");
        if (tab) {
            tab.addEventListener("click", function (e) { e.preventDefault(); EquipmentUI.Toggle(); });
        }

        var sort = document.getElementById("equipment-sort");
        if (sort) sort.addEventListener("change", function () { EquipmentUI.Prefs.sort = sort.value; EquipmentUI.Render(); });

        var cv = document.getElementById("equipment-container-view");
        if (cv) cv.addEventListener("change", function () { EquipmentUI.Prefs.containerView = !!cv.checked; EquipmentUI.Render(); });

        var filter = document.getElementById("equipment-filter");
        if (filter) filter.addEventListener("input", function () { EquipmentUI.Prefs.filter = filter.value; EquipmentUI.Render(); });

        ["worn", "carried", "containers", "spells"].forEach(function (cat) {
            var box = document.getElementById("equipment-cat-" + cat);
            if (!box) return;
            box.addEventListener("change", function () { EquipmentUI.Prefs.categories[cat] = !!box.checked; EquipmentUI.Render(); });
        });

        var refresh = document.getElementById("equipment-refresh");
        if (refresh) refresh.addEventListener("click", function () {
            if (typeof StatTracker !== "undefined" && StatTracker.requestStatusFulfillment) {
                StatTracker.requestStatusFulfillment(true);
            } else if (typeof Actionable !== "undefined") Actionable.Submit("inventory");
        });

        var close = document.getElementById("equipment-close");
        if (close) close.addEventListener("click", function () { EquipmentUI.Hide(); });

        EquipmentUI.bindGlobalDrag();

        // The indent step is derived from the panel's width, so it has to be
        // recomputed when the panel resizes (rotation, keyboard, desktop
        // window drag) -- otherwise a tree laid out for a wide panel would
        // overflow a narrow one.
        try {
            var host = document.getElementById("equipment-list");
            if (host && typeof ResizeObserver !== "undefined") {
                var q = false;
                new ResizeObserver(function () {
                    if (q || !EquipmentUI.IsOpen()) return;
                    q = true;
                    requestAnimationFrame(function () { q = false; EquipmentUI.Render(); });
                }).observe(host);
            }
        } catch (e) {}

        EquipmentUI.Render();
    }
};

try {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", EquipmentUI.Init);
    else EquipmentUI.Init();
} catch (e) {}
