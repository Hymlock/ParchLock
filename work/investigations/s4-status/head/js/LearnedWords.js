/* LearnedWords: user overrides are a projection, never calibration evidence.
 * Recorder-owned revision witnesses promote manual forms; UI cannot manufacture them. */
var LearnedWords = {
    VERSION: 1,
    PREFIX: "PL_LearnedWordOverrides_",
    TUTORIAL_KEY: "PL_LearnedWordsTutorialSeen",
    _recorderSession: Date.now().toString(36) + Math.random().toString(36).slice(2),
    _projection: {},
    _key: null, _data: null, _undo: [], _open: false,
    generation: function () { return typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0; },
    identity: function () {
        try { var id=LearningStores.identity(AttributeSchema._getMem()); return id ? id.identityKey : null; } catch(e) { return null; }
    },
    load: function () {
        var key = LearnedWords.identity();
        if (key === LearnedWords._key && LearnedWords._data) return LearnedWords._data;
        LearnedWords._key = key; LearnedWords._undo = []; LearnedWords.clearProjection();
        var data = { version: 1, gameIdentityKey: key, rows: {} };
        try {
            if(!key) { LearnedWords._data=data; return data; }
            var identity=LearningStores.identity(AttributeSchema._getMem());
            var result=LearningStores.readOwned("learnedWords",identity);
            var parsed=JSON.parse(result.value);
            if (key && parsed && parsed.version === 1 && parsed.gameIdentityKey === key && parsed.rows && !Array.isArray(parsed.rows)) {
                var valid = Object.keys(parsed.rows).every(function (id) {
                    var r = parsed.rows[id];
                    return /^(exact|allowed|manual|behavior|provider|name|status):/.test(id) &&
                        r && typeof r.label === "string" && r.label.length > 0 && r.label.length <= 160 &&
                        typeof r.trigger === "string" && r.trigger.length <= 120 && typeof r.ignored === "boolean" &&
                        typeof r.revision === "string" && r.revision.length <= 120 &&
                        (!r.witnesses || (Array.isArray(r.witnesses) && r.witnesses.length <= 2 && r.witnesses.every(function (s) { return typeof s === "string"; })));
                });
                if (valid) {
                    Object.keys(parsed.rows).forEach(function(id){var r=parsed.rows[id];['knownBefore','inspectForm','classificationOnly'].forEach(function(k){if(r[k]!=null&&typeof r[k]!=='boolean')delete r[k];});});
                    data = parsed;
                }
            }
        } catch (e) {}
        LearnedWords._data = data;
        return data;
    },
    // P13b R2. Measured (grok2 p13b-measure): Zork I, 396 turns, 148 rows
    // (all classificationOnly), 62 KB. 1000 rows is ~7x that walk.
    MAX_ROWS: 1000,
    // Evicts, oldest first, classificationOnly rows, then recorder exact/
    // allowed rows that were never edited (revision 'classification',
    // trigger === original) and are not ignored. Never evicted: manual:*
    // rows, user-edited rows (committed: any other revision) and ignored rows.
    capRows: function (data, max) {
        if (!data || !data.rows) return data;
        max = max == null ? LearnedWords.MAX_ROWS : max;
        var ids = Object.keys(data.rows), over = ids.length - max;
        if (over <= 0) return data;
        function recorderUnedited(id) {
            var r = data.rows[id];
            return /^(exact|allowed):/.test(id) && r && !r.ignored && r.revision === "classification" && r.trigger === r.original;
        }
        var first = ids.filter(function (id) { return data.rows[id] && data.rows[id].classificationOnly && recorderUnedited(id); });
        var second = ids.filter(function (id) { return first.indexOf(id) < 0 && recorderUnedited(id); });
        first.concat(second).slice(0, over).forEach(function (id) { delete data.rows[id]; });
        return data;
    },
    write: function (next, history) {
        LearnedWords.load();
        if (!LearnedWords.identity() || next.gameIdentityKey !== LearnedWords.identity()) throw new Error("This story changed. Reopen the editor.");
        LearnedWords.capRows(next);
        if (typeof LearningStores !== "undefined") LearningStores.persist("learnedWords", { identityKey: next.gameIdentityKey }, JSON.stringify(next), LearnedWords.resetErasedFor(next.gameIdentityKey));
        else localStorage.setItem(LearnedWords.PREFIX + next.gameIdentityKey, JSON.stringify(next));
        if (history) LearnedWords._undo.push(JSON.stringify(LearnedWords.load()));
        if (LearnedWords._undo.length > 100) LearnedWords._undo.shift();
        LearnedWords._data = next;
    },
    // D13: exact key generator for the learning ownership index.
    learningKeyFor: function (inputs) { return inputs && typeof inputs.identityKey === "string" && inputs.identityKey ? LearnedWords.PREFIX + inputs.identityKey : null; },
    // D13: this key was erased (another tab) after hydration -- start fresh.
    // Bound to identity A: a later erase of A never touches story B's state.
    resetErasedFor: function (a) {
        return function () {
            if (LearnedWords._key !== a) return;
            LearnedWords._data = null; LearnedWords._key = null; LearnedWords._undo = [];
            LearnedWords.clearProjection();
        };
    },
    rowKey: function (type, objectId, form) { return type + ":" + String(objectId) + ":" + encodeURIComponent(form); },
    override: function (id) { var r = LearnedWords.load().rows[id]; return r && !r.classificationOnly ? r : null; },
    suppressed: function (type, objectId, form) {
        var r = LearnedWords.override(LearnedWords.rowKey(type, objectId, form));
        return !!(r && (r.ignored || r.trigger !== form));
    },
    inspectSuppressed: function (kind) { var r = LearnedWords.override("behavior:" + kind); return !!(r && r.ignored); },
    objects: function () {
        try { return Actionable.payloadPool().filter(function (o) { var ref = Actionable.referenceFor(o); return o.id != null && ref.unique && ref.verified && !o.examineOnly; }); } catch (e) { return []; }
    },
    eligible: function (objectId, form) {
        return AttrCalibrator.dictionaryForm(form) && LearnedWords.objects().some(function (o) { return String(o.id) === String(objectId); });
    },
    candidates: function (objectId) {
        var data = LearnedWords.load();
        return Object.keys(data.rows).filter(function (id) { return /^(manual|exact|allowed):/.test(id); }).map(function (id) {
            var r = data.rows[id];
            return { id: id, objectId: r.objectId, form: r.trigger, label: r.label, revision: r.revision,
                enter: (r.witnesses || []).length >= 2, ignored: r.ignored, original: r.original };
        }).filter(function (r) {
            return !r.ignored && (objectId == null || String(objectId) === String(r.objectId)) &&
                (r.id.indexOf("manual:") === 0 || r.form !== r.original) && LearnedWords.eligible(r.objectId, r.form);
        });
    },
    // Cheap membership only. Do not resolve objects/references for unrelated
    // actions; candidates() performs those full checks after a raw match.
    hasAuthoredFormRaw: function (objectId, form) {
        var rows=LearnedWords.load().rows;
        return Object.keys(rows).some(function (id) {
            var r=rows[id];
            return /^(manual|exact|allowed):/.test(id) && r && !r.ignored &&
                String(r.objectId)===String(objectId) && r.trigger===form &&
                (id.indexOf('manual:')===0 || r.trigger!==r.original);
        });
    },
    candidateForCommand: function (command) {
        var hits = LearnedWords.candidates().filter(function (r) {
            var obj = LearnedWords.objects().find(function (o) { return String(o.id) === String(r.objectId); });
            return obj && String(command).trim().toLowerCase() === r.form + " " + Actionable.referenceFor(obj).noun.toLowerCase();
        });
        if (hits.length !== 1) return null;
        var hit = hits[0]; hit.gameIdentityKey = LearnedWords.identity(); hit.generation = LearnedWords.generation(); hit.recorderSession = LearnedWords._recorderSession;
        return hit;
    },
    recordWitness: function (entry) {
        var c = entry.learnedWordCandidate;
        if (!c || c.gameIdentityKey !== LearnedWords.identity() || c.generation !== LearnedWords.generation() ||
            entry.rejected || entry.ambiguous || (!entry.success && !entry.behavioralAccept) || entry.submissionId == null ||
            !entry.d198Correlation || entry.d198Correlation.referenceVerified === false ||
            String(entry.d198Correlation.objectId) !== String(c.objectId) || String(entry.objectId) !== String(c.objectId)) return;
        var data = LearnedWords.load(), row = data.rows[c.id];
        if (!row || row.ignored || row.revision !== c.revision || row.trigger !== entry.exactForm) return;
        var next = JSON.parse(JSON.stringify(data)), r = next.rows[c.id];
        var witness = c.recorderSession + ":" + String(c.generation) + ":" + String(entry.submissionId);
        r.witnesses = r.witnesses || [];
        if (r.witnesses.indexOf(witness) >= 0 || r.witnesses.length >= 2) return;
        r.witnesses.push(witness);
        LearnedWords.write(next, false);
    },
    label: function (type, key, fallback) { var r = LearnedWords.override(type + ":" + key); return r ? r.label : fallback; },
    commandLabel: function (objectId, form, fallback) {
        var rows = LearnedWords.load().rows, found;
        Object.keys(rows).some(function (id) {
            var r = rows[id];
            if (!r.classificationOnly && /^(exact|allowed|manual|provider):/.test(id) && String(r.objectId) === String(objectId) && r.trigger === form && !r.ignored) { found = r.label; return true; }
            return false;
        });
        if (!found) {
            var behavior = (AttrCalibrator.table || {}).verbBehavior;
            var inspect = rows["behavior:substitute"];
            if (inspect && !inspect.ignored && behavior && form === behavior.substituteVerb) found = inspect.label;
        }
        return found || fallback;
    },
    commands: function (obj) {
        var ref = Actionable.referenceFor(obj);
        if (!ref.unique || !ref.verified) return [];
        return LearnedWords.candidates(obj.id).filter(function (c) {
            return !ActionSynth.authoredCommandAllowed || ActionSynth.authoredCommandAllowed(obj.id, c.form);
        }).map(function (c) {
            return { objectId: obj.id, verb: c.form, command: c.form + " " + ref.noun,
                Enter: c.enter, enter: c.enter, label: c.label, confidence: 0.5, source: "user-suggestion",
                learnedWordScope: { key: LearnedWords.identity(), generation: LearnedWords.generation(), id: c.id, revision: c.revision } };
        });
    },
    commandCurrent: function (command) {
        if (ActionSynth.authoredCommandAllowed && !ActionSynth.authoredCommandAllowed(command.objectId, command.verb)) return false;
        var scope = command.learnedWordScope;
        if (!scope || scope.key !== LearnedWords.identity() || scope.generation !== LearnedWords.generation()) return false;
        return LearnedWords.candidates(command.objectId).some(function (c) {
            var obj = LearnedWords.objects().find(function (o) { return String(o.id) === String(command.objectId); });
            return c.id === scope.id && c.revision === scope.revision && c.form === command.verb && (!command.Enter || c.enter) &&
                obj && command.command === c.form + " " + Actionable.referenceFor(obj).noun;
        });
    },
    clearProjection: function () { LearnedWords._projection = {}; },
    independentForms: function (obj) {
        var held = ((WorldModel.lastPayload || {}).inventory || []).some(function (o) { return String(o.id) === String(obj.id); });
        var context = held ? 'inventory' : 'room', attrs = ActionSynth.trustworthyAttrs ? ActionSynth.trustworthyAttrs(obj) : obj.attrs || {}, forms = [];
        Object.keys(ActionSynth.rules || {}).forEach(function (key) {
            if (key !== 'default' && attrs[key]) forms = forms.concat(ActionSynth.formsForAttribute
                ? ActionSynth.formsForAttribute(key, obj.id, context) : ActionSynth.rules[key]);
        });
        // D238: direct owner verbs can coexist with a mapped edible bit, even
        // when this object's bit is clear. Keep the menu's scope policy; the
        // nested branch below still replaces candidates with its own policy.
        if (!attrs.edible && typeof ActionSynth.edibleFormPolicy === 'function') {
            forms = forms.concat(ActionSynth.edibleFormPolicy(obj.id, context) || []);
        }
        // Use the same compiler/evidence policy as menu synthesis, not learned admission.
        if (ActionSynth.edibleDrinkAllowed(attrs, { directEvidenceOnly: !!obj.examineOnly })) forms.push('drink');
        var nested = held && ActionSynth.heldContainerName && ActionSynth.heldContainerName(obj,WorldModel.lastPayload);
        if (nested) forms = ['take'].concat(ActionSynth.nestedEdibleForms ? ActionSynth.nestedEdibleForms(obj.id,context) : []);
        else if (held) {
            forms = forms.filter(function (v) { return v !== 'take' && v !== 'remove'; });
            if (ActionSynth.isWorn && ActionSynth.isWorn(obj)) forms = [ActionSynth.wornRemovalScopeFor && ActionSynth.wornRemovalScopeFor(obj) ? 'drop' : 'remove'];
            else forms = forms.concat(['drop','give to','put in']);
        } else forms = forms.filter(function (v) { return v !== 'drop' && v !== 'remove' && v !== 'wear'; });
        if (typeof SemanticActions !== 'undefined') {
            ['structuralCommandsFor','confirmedObjectFormsFor'].forEach(function (method) {
                (typeof SemanticActions[method] === 'function' ? SemanticActions[method](obj,context,null,WorldModel.lastPayload) || [] : []).forEach(function (f) { if (f.verb) forms.push(f.verb); });
            });
        }
        return Array.from(new Set(forms)).filter(function (verb) {
            return !ActionSynth.authoredCommandAllowed || ActionSynth.authoredCommandAllowed(obj.id,verb,context);
        });
    },
    observeSubmit: function (event) {
        if (event.source === 'ambiguous-reference' || event.source === 'stat-probe') return;
        var data = LearnedWords.load(); if (!data.gameIdentityKey) return;
        var mem = AttributeSchema._getMem(); AttrCalibrator.hydrate(mem);
        var split = AttrCalibrator._splitAnyVerbNoun(event.command); if (!split) return;
        var obj = Actionable.payloadPool().find(function (o) { return String(o.id) === String(split.objectId); });
        if (!obj) return;
        var ref = Actionable.referenceFor(obj); if (!ref.unique || !ref.verified) return;
        var regex = AttrCalibrator.buildVerbRegex(), match = regex && regex.exec(event.command);
        var form = match ? match[1].toLowerCase().replace(/\s+/g,' ') : split.verb;
        if (!AttrCalibrator.dictionaryForm(form)) return;
        var known = LearnedWords.independentForms(obj).map(AttrCalibrator.normalizeVerb).indexOf(AttrCalibrator.normalizeVerb(form)) >= 0;
        var inspect = typeof ActionSynth.defaultInspectVerb === 'function' && form === ActionSynth.defaultInspectVerb();
        var next = JSON.parse(JSON.stringify(data)), changed = false;
        ['exact','allowed'].forEach(function (type) {
            var storedForm = type === 'allowed' ? AttrCalibrator.normalizeVerb(form) : form;
            var id = LearnedWords.rowKey(type,obj.id,storedForm), row = next.rows[id];
            var prior = ((AttrCalibrator.table.objects[String(obj.id)] || {})[type === 'exact' ? 'exactForms' : 'allowedVerbs'] || {})[storedForm];
            // Missing provenance on legacy evidence remains conservative forever.
            if (!prior && (!row || row.knownBefore == null)) {
                row = row || {trigger:storedForm,label:storedForm.charAt(0).toUpperCase()+storedForm.slice(1),ignored:false,objectId:String(obj.id),original:storedForm,revision:'classification',witnesses:[],classificationOnly:true};
                row.knownBefore = known; row.inspectForm = !!inspect; next.rows[id] = row; changed = true;
            }
        });
        if (changed) LearnedWords.write(next,false);
        var id = LearnedWords.rowKey('exact',obj.id,form);
        LearnedWords._projection[id] = {id:id,objectId:String(obj.id),form:form,key:data.gameIdentityKey,generation:LearnedWords.generation()};
    },
    itemDisplay: function (obj, pool) {
        if (!obj) return '';
        var label = LearnedWords.label('name',obj.id,obj.displayName||obj.name), seq = typeof EquipmentUI !== 'undefined' && EquipmentUI._seq[String(obj.id)];
        return label + (seq ? ' \u00b7 instance ' + seq : '');
    },
    records: function () {
        var data = LearnedWords.load(), list = [], table = AttrCalibrator.table || {}, pool;
        try { var mem = AttributeSchema._getMem(); if (mem) AttrCalibrator.hydrate(mem); table = AttrCalibrator.table; pool = Actionable.payloadPool(); } catch (e) { pool = []; }
        if (typeof EquipmentUI !== 'undefined' && EquipmentUI.registerInstances) EquipmentUI.registerInstances(pool);
        pool = Actionable.distinctObjects ? Actionable.distinctObjects(pool) : pool;
        Object.keys(table.objects || {}).forEach(function (objectId) {
            var obj = pool.find(function (o) { return String(o.id) === objectId; });
            ["exact", "allowed"].forEach(function (type) {
                var entries = table.objects[objectId][type === "exact" ? "exactForms" : "allowedVerbs"] || {};
                if (type === 'exact') {
                    var remembered = {};
                    Object.keys(table.objects[objectId].rememberedForms || {}).forEach(function (form) {
                        var e=table.objects[objectId].rememberedForms[form];
                        if (e.digest === AttrCalibrator._d198ExecutableDigest()) remembered[form]=Object.assign({},e,{confirmations:e.observations});
                    });
                    entries=Object.assign(remembered,entries);
                }
                Object.keys(entries).forEach(function (form) {
                    var e = entries[form], id = LearnedWords.rowKey(type, objectId, form), metadata = data.rows[id];
                    var session = LearnedWords._projection[LearnedWords.rowKey('exact',objectId,form)];
                    if (metadata && (metadata.knownBefore || metadata.inspectForm)) return;
                    var inspectForm = typeof ActionSynth.defaultInspectVerb === 'function' ? ActionSynth.defaultInspectVerb() : '';
                    if ((!metadata || metadata.knownBefore == null) && obj &&
                        (['take','open',inspectForm].indexOf(form) >= 0) &&
                        (form === inspectForm || LearnedWords.independentForms(obj).indexOf(form) >= 0)) return;
                    if (e.confirmations < 2 && !e.opcodeConfirmed && (!session || session.generation !== LearnedWords.generation())) return;
                    list.push({ id: id, type: type, objectId: objectId, trigger: form, original: form,
                        label: form.charAt(0).toUpperCase() + form.slice(1), destination: "Radial menu", section: "learned",
                        item: obj ? LearnedWords.itemDisplay(obj,pool) : "Object " + objectId + " (not in scope)",
                        state: (type === "allowed" && e.opcodeConfirmed) || e.confirmations >= 2 ? "Remembered" : "Not remembered yet",
                        evidence: JSON.stringify(e), editable: true });
                });
            });
        });
        Object.keys(LearnedWords._projection).forEach(function (id) {
            var p = LearnedWords._projection[id], metadata = data.rows[id];
            if (p.key !== data.gameIdentityKey || p.generation !== LearnedWords.generation() || (metadata && (metadata.knownBefore || metadata.inspectForm)) || list.some(function (r) { return r.id === id; })) return;
            var obj = pool.find(function (o) { return String(o.id) === p.objectId; });
            list.push({id:id,type:'exact',objectId:p.objectId,trigger:p.form,original:p.form,label:p.form.charAt(0).toUpperCase()+p.form.slice(1),destination:'Radial menu',section:'learned',state:'Not remembered yet',item:obj ? LearnedWords.itemDisplay(obj,pool) : 'Object '+p.objectId,evidence:'Submitted this session. No successful learning is implied.',editable:true});
        });
        var behavior = table.verbBehavior || {};
        Object.keys(behavior.disabled || {}).forEach(function (verb) {
            list.push({ id: "behavior:disabled:" + verb, type: "behavior", trigger: verb, label: "Inspect unavailable", destination: "Radial menu",
                section: "learned", state: behavior.disabled[verb].confirmed ? "Remembered" : "Not remembered yet", evidence: JSON.stringify(behavior.disabled[verb]) });
        });
        if (behavior.substituteVerb) list.push({ id: "behavior:substitute", type: "behavior", trigger: behavior.substituteVerb, label: "Inspect replacement", destination: "Radial menu", section: "learned", state: "Remembered", evidence: JSON.stringify(behavior.substituteCandidates || {}) });
        Object.keys(behavior.substituteCandidates || {}).forEach(function (verb) {
            // Retain an ignored candidate if it promoted while its row was focused.
            if (verb === behavior.substituteVerb && !LearnedWords.inspectSuppressed("candidate:" + verb)) return;
            list.push({ id: "behavior:candidate:" + verb, type: "behavior", trigger: verb, label: "Possible inspect replacement", destination: "Radial menu",
                section: "learned", state: verb === behavior.substituteVerb ? "Promotion suppressed" : "Not remembered yet", evidence: JSON.stringify(behavior.substituteCandidates[verb]) });
        });
        Object.keys(data.rows).filter(function (id) { return id.indexOf("manual:") === 0; }).forEach(function (id) {
            var r = data.rows[id]; list.push({ id: id, type: "manual", objectId: r.objectId, trigger: r.trigger, original: "", label: r.label,
                section: "learned", destination: "Radial menu", item: LearnedWords.itemDisplay(pool.find(function (o) { return String(o.id) === String(r.objectId); }),pool) || "Object " + r.objectId,
                state: (r.witnesses || []).length >= 2 ? "Remembered user suggestion" : "User suggestion · not remembered", evidence: "User supplied. Original game evidence is unchanged.", editable: true });
        });
        pool.forEach(function (obj) {
            list.push({ id: "name:" + obj.id, type: "name", trigger: obj.displayName||obj.name, label: obj.displayName||obj.name, objectId: obj.id, destination: "Items display", section: "names", item:LearnedWords.itemDisplay(obj,pool), evidence: "Item display text only. Parser name/aliases (read-only): " + JSON.stringify(obj.aliases || []) });
            try { ActionSynth.commandsForObject(obj, "room",null,{allowAmbiguousReference:true,directEvidenceOnly:!!obj.examineOnly}).forEach(function (c) {
                if (LearnedWords.independentForms(obj).indexOf(c.verb) < 0) return;
                list.push({ id: LearnedWords.rowKey("provider", obj.id, c.verb), type: "provider", objectId: obj.id, trigger: c.verb,
                    label: c.verb.charAt(0).toUpperCase() + c.verb.slice(1), destination: "Radial menu", section: "actions", item: LearnedWords.itemDisplay(obj,pool), evidence: "Provided story action; command and eligibility remain owned by the provider." });
            }); } catch (e) {}
        });
        if (typeof StatTracker !== "undefined") {
            var model = StatTracker.model();
            var visible = typeof StatTracker.visibleStats === 'function' ? StatTracker.visibleStats() : [];
            var stats = Object.assign({},model.stats || {}); visible.forEach(function(s){stats[s.key]=s;});
            Object.keys(stats).forEach(function(key){var v=stats[key],shown=visible.some(function(s){return s.key===key;});
                list.push({id:'status:'+key,type:'status',trigger:key,label:v.label||key,section:'status',destination:'Status display',state:shown?'confirmed':'unknown',diagnostic:(v.label||key)+': '+(shown&&v.value!=null ? String(v.value)+(v.unit&&v.unit!=='plain'?' '+v.unit:'') : 'Not shown. No current confirmed value.'),evidence:'Display text only. '+JSON.stringify(v)});
            });
            var conditions = typeof StatTracker.visibleConditions === 'function' ? StatTracker.visibleConditions() : [];
            Object.keys(model.conditions || {}).forEach(function(key){var c=model.conditions[key],current=conditions.some(function(v){return v.key===key;});
                list.push({id:'status:'+key,type:'status',trigger:key,label:c.label||key,section:'status',destination:'Status display',state:current?'confirmed':c.state==='confirmed'?'unknown':c.state||'unknown',diagnostic:(c.label||key)+': '+(current?'Shown in the status display.':'Not shown in the status display.'),evidence:'Display text only. '+JSON.stringify(c)});
            });
        }
        var seen = {};
        return list.filter(function (r) { if (seen[r.id]) return false; seen[r.id] = true; return true; }).map(function (r) {
            var o = data.rows[r.id];
            if (o && !o.classificationOnly) { r.trigger = o.trigger; r.label = o.label; r.ignored = o.ignored; if (r.editable && o.trigger !== r.original) r.state = (o.witnesses || []).length >= 2 ? "Remembered replacement" : "Replacement · not remembered"; }
            return r;
        });
    },
    commit: function (record, trigger, label, ignored, objectId) {
        var data = LearnedWords.load(), form = String(trigger).trim().toLowerCase().replace(/\s+/g, " "), text = String(label).trim();
        if (!text || text.length > 160) throw new Error("Enter a response of 1–160 characters.");
        if (record.editable) {
            if ((record.type === "manual" || form !== record.original) && !LearnedWords.eligible(objectId, form)) throw new Error("Choose a unique verified item and a command form in this story's dictionary.");
            if (LearnedWords.candidates(objectId).some(function (c) { return c.id !== record.id && c.form === form; })) throw new Error("That item already has this suggestion.");
        } else if (String(trigger) !== record.trigger) throw new Error("This trigger is read-only.");
        var next = JSON.parse(JSON.stringify(data)), prev = data.rows[record.id];
        var changed = !prev || prev.trigger !== form || String(prev.objectId) !== String(objectId);
        next.rows[record.id] = { trigger: record.editable ? form : String(trigger), label: text,
            ignored: /^(exact|allowed|manual|behavior)$/.test(record.type) ? !!ignored : false,
            objectId: objectId == null ? null : String(objectId), original: record.original || record.trigger,
            revision: changed ? Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) : prev.revision,
            witnesses: changed ? [] : (prev.witnesses || []).slice() };
        if (prev && typeof prev.knownBefore === 'boolean') { next.rows[record.id].knownBefore = prev.knownBefore; next.rows[record.id].inspectForm = prev.inspectForm; }
        if (prev && JSON.stringify(prev) === JSON.stringify(next.rows[record.id])) return;
        LearnedWords.write(next, true);
        LearnedWords.refreshLabels();
    },
    undo: function () {
        if (!LearnedWords._undo.length) return;
        var next = JSON.parse(LearnedWords._undo[LearnedWords._undo.length - 1]);
        var current = LearnedWords.load();
        Object.keys(current.rows).forEach(function (id) {
            var r = current.rows[id], old = next.rows[id];
            if (old && old.revision === r.revision && old.trigger === r.trigger && old.objectId === r.objectId) old.witnesses = Array.from(new Set((old.witnesses||[]).concat(r.witnesses||[]))).slice(0,2);
            if (typeof r.knownBefore !== 'boolean') return;
            if (!next.rows[id]) next.rows[id] = {trigger:r.original,label:r.original.charAt(0).toUpperCase()+r.original.slice(1),ignored:false,objectId:r.objectId,original:r.original,revision:'classification',witnesses:[],classificationOnly:true};
            next.rows[id].knownBefore = r.knownBefore; next.rows[id].inspectForm = r.inspectForm;
        });
        LearnedWords.write(next, false); LearnedWords._undo.pop();
        LearnedWords.refreshLabels();
    },
    refreshLabels: function () {
        try { if (typeof StatTracker !== "undefined" && StatTracker.Render) StatTracker.Render(); } catch (e) {}
        try { if (typeof EquipmentUI !== "undefined" && EquipmentUI.Render) EquipmentUI.Render(); } catch (e) {}
    },
    open: function () {
        if (LearnedWords._open) return;
        LearnedWords.load();
        if (!LearnedWords._key) { Message.Show("Edit Learned Words", "Learning is unavailable until a supported story has started.", true); return; }
        LearnedWords._scope = { key: LearnedWords._key, generation: LearnedWords.generation() };
        LearnedWords._input = document.querySelector("#windowport .Input.LineInput");
        LearnedWords._draft = LearnedWords._input ? LearnedWords._input.value : "";
        var session = {};
        LearnedWords._session = session;
        Message.Show("Edit Learned Words", '<div id="learned-words"><div class="lw-toolbar"><button data-action="add">Add word</button><button data-action="undo">Undo</button><button data-action="help">Help / Replay tutorial</button></div><p>Trigger is the command form. Response is its menu or display text. Valid edits save when you leave a field or close this screen. Incomplete drafts are discarded on close or story change.</p><p class="lw-feedback" role="status" aria-live="polite"></p><section data-section="learned"></section><details><summary>Story actions · labels only</summary><section data-section="actions"></section></details><details><summary>Names · display labels only</summary><section data-section="names"></section></details><details><summary>Status labels · display text only</summary><section data-section="status"></section></details><div class="lw-tour" hidden></div></div>', true, function () { if (LearnedWords._session === session) LearnedWords.cleanup(); });
        LearnedWords._open = true;
        LearnedWords._flush = new Map(); LearnedWords._signature = "";
        var root = document.getElementById("learned-words");
        LearnedWords.initAccordion(root);
        document.getElementById("message").classList.add("lw-dialog");
        root.querySelector('.lw-toolbar').classList.add('lw-icons');
        [['add','Add word','+'],['undo','Undo','\u21b6'],['help','Help / Replay tutorial','?']].forEach(function (a) {
            var b = root.querySelector('[data-action="'+a[0]+'"]'); b.setAttribute('aria-label',a[1]); b.title=a[1];
            var icon=document.createElement('span'); icon.className='lw-icon'; icon.textContent=a[2]; icon.setAttribute('aria-hidden','true');
            var text=document.createElement('span'); text.className='lw-button-text'; text.textContent=a[1]; b.replaceChildren(icon,text);
        });
        root.querySelector('[data-action="add"]').onclick = LearnedWords.addDraft;
        root.querySelector('[data-action="undo"]').onclick = function () {
            var draft = root.querySelector('[data-draft="true"]');
            if (draft) { LearnedWords._flush.delete(draft.dataset.id); draft.remove(); LearnedWords.feedback("Incomplete entry discarded"); LearnedWords.render(true); return; }
            try { LearnedWords.undo(); LearnedWords.render(true); LearnedWords.feedback("Last edit undone"); } catch (e) { LearnedWords.feedback(e.message); }
        };
        root.querySelector('[data-action="help"]').onclick = function () { try { localStorage.removeItem(LearnedWords.TUTORIAL_KEY); } catch (e) {} LearnedWords.startTour(); };
        LearnedWords._onKey = function (e) {
            if (!LearnedWords._open) return;
            if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); LearnedWords.close(); return; }
            if (document.getElementById("message").contains(e.target)) {
                e.stopImmediatePropagation();
                if (e.key === "Tab") {
                    var selector = LearnedWords._tourStep != null ? '#learned-words .lw-tour button' : '#message button,#message input,#message select,#message summary,#message [tabindex="0"]';
                    var focus = Array.from(document.querySelectorAll(selector)).filter(function (n) { return !n.disabled && !n.closest("[inert]") && n.getClientRects().length; });
                    var first = focus[0], last = focus[focus.length - 1];
                    if (e.shiftKey && e.target === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && e.target === last) { e.preventDefault(); first.focus(); }
                }
            }
        };
        document.addEventListener("keydown", LearnedWords._onKey, true);
        LearnedWords.render(true);
        LearnedWords._timer = setInterval(function () {
            if (!document.getElementById("learned-words") || !Message.IsOpen) { LearnedWords.cleanup(); return; }
            if (LearnedWords.identity() !== LearnedWords._scope.key || LearnedWords.generation() !== LearnedWords._scope.generation) { LearnedWords.close(false); return; }
            LearnedWords.render(false);
            if (LearnedWords._tourStep != null) LearnedWords.placeTour();
        }, 500);
        var seen = false; try { seen = localStorage.getItem(LearnedWords.TUTORIAL_KEY) === "1"; } catch (e) {}
        if (!seen) LearnedWords.startTour();
    },
    feedback: function (text) { var node = document.querySelector("#learned-words .lw-feedback"); if (node) node.textContent = text; },
    sectionEnabled: function (name) {
        var value = Global.Prefs['LearnedWordsShow_' + name];
        return value == null ? name === 'learned' || name === 'status' : value === true;
    },
    applyVisibility: function () {
        var root = document.getElementById('learned-words');
        if (!root || !LearnedWords._sections) return;
        var keys = Object.keys(LearnedWords._sections), active = LearnedWords._section;
        var enabled = keys.filter(LearnedWords.sectionEnabled);
        keys.forEach(function (key) {
            var section = LearnedWords._sections[key], on = LearnedWords.sectionEnabled(key);
            section.button.hidden = !on;
            if (!on) { section.panel.hidden = true; section.button.setAttribute('aria-expanded','false'); }
        });
        root.querySelector('[data-action="add"]').disabled = !LearnedWords.sectionEnabled('learned');
        if (!enabled.length) {
            LearnedWords._section = null;
            root.querySelector('.lw-center').hidden = true;
            return;
        }
        root.querySelector('.lw-center').hidden = false;
        if (active && LearnedWords._sections[active]) LearnedWords._sections[active].scroll = root.querySelector('.lw-center').scrollTop;
        var next = active || (enabled.indexOf('learned') >= 0 ? 'learned' : enabled[0]);
        if (!LearnedWords.sectionEnabled(next)) {
            var start = keys.indexOf(active);
            next = keys.slice(start + 1).concat(keys.slice(0,start + 1)).find(LearnedWords.sectionEnabled) || enabled[0];
        }
        LearnedWords._section = null;
        LearnedWords.selectSection(next || (enabled.indexOf('learned') >= 0 ? 'learned' : enabled[0]), true);
    },
    initAccordion: function (root) {
        var intro = root.querySelector(':scope > p'), feedback = root.querySelector('.lw-feedback');
        var center = document.createElement('div'); center.className = 'lw-center';
        var current = document.createElement('div'); current.className = 'lw-current-header';
        var bottom = document.createElement('div'); bottom.className = 'lw-bottom-headers';
        LearnedWords._sections = {}; LearnedWords._section = null;
        root.insertBefore(current, intro); root.insertBefore(center, intro); root.insertBefore(bottom, root.querySelector('.lw-tour'));
        center.append(intro, feedback);
        ['learned','actions','names','status'].forEach(function (name) {
            var section = root.querySelector('section[data-section="'+name+'"]'), outer = section.parentElement;
            var text = name === 'learned' ? 'Edit Learned Words' : outer.querySelector('summary').textContent;
            var button = document.createElement('button'); button.type = 'button'; button.className = 'lw-section-header'; button.dataset.section = name; button.textContent = text;
            button.id = 'lw-header-'+name; button.setAttribute('aria-controls','lw-panel-'+name);
            var panel = document.createElement('div'); panel.id = 'lw-panel-'+name; panel.className = 'lw-panel'; panel.setAttribute('role','region'); panel.setAttribute('aria-labelledby',button.id);
            panel.appendChild(section); center.appendChild(panel); if (outer !== root) outer.remove();
            LearnedWords._sections[name] = { button:button, panel:panel, scroll:0 };
            button.onclick = function () { LearnedWords.selectSection(name); };
        });
        LearnedWords.applyVisibility();
    },
    selectSection: function (name, tour) {
        var root = document.getElementById('learned-words'), center = root.querySelector('.lw-center'), sections = LearnedWords._sections;
        if (!sections[name] || (!tour && !LearnedWords.sectionEnabled(name)) || (!tour && name !== 'learned' && name !== 'status' && !sections[name].panel.querySelector('.lw-entry'))) return;
        if (LearnedWords._section === name) return; // Exactly one open; active header never closes it.
        if (LearnedWords._section) sections[LearnedWords._section].scroll = center.scrollTop;
        var keys = Object.keys(sections).filter(function(key){ return LearnedWords.sectionEnabled(key) || tour && LearnedWords._tourStep != null; }), selected = keys.indexOf(name);
        keys.forEach(function (key, index) {
            var s = sections[key], active = key === name;
            s.button.hidden = false; s.panel.hidden = !active; s.button.setAttribute('aria-expanded',String(active));
            (index <= selected ? root.querySelector('.lw-current-header') : root.querySelector('.lw-bottom-headers')).appendChild(s.button);
        });
        LearnedWords._section = name; center.scrollTop = sections[name].scroll;
    },
    render: function (force) {
        if (!LearnedWords._open) return;
        if (LearnedWords._tourStep != null) return; // Freeze editor nodes during the nonmutating guided tour.
        var records = LearnedWords.records(), signature = JSON.stringify(records);
        if (!force && signature === LearnedWords._signature) return;
        var root = document.getElementById("learned-words"); if (!root) return;
        var focused = document.activeElement && document.activeElement.closest(".lw-entry");
        // Refresh individual rows only. Never replace a focused or unsaved row.
        records.forEach(function (r) {
            var old = Array.from(root.querySelectorAll(".lw-entry")).find(function (n) { return n.dataset.id === r.id; });
            if (old && (!force && (old === focused || old.contains(document.activeElement) || old.dataset.dirty === "true"))) return;
            var expanded = old && old.open;
            var node = LearnedWords.makeRow(r); node.open = !!expanded;
            if (old) old.replaceWith(node); else root.querySelector('section[data-section="' + r.section + '"]').appendChild(node);
        });
        Array.from(root.querySelectorAll(".lw-entry")).forEach(function (n) { if (n.dataset.draft !== "true" && !records.some(function (r) { return r.id === n.dataset.id; }) && n !== focused) { LearnedWords._flush.delete(n.dataset.id); n.remove(); } });
        var section = root.querySelector('section[data-section="learned"]');
        var empty = section.querySelector(".lw-empty"); if (empty) empty.remove();
        if (!section.querySelector('.lw-entry:not(.lw-demo)')) { var p = document.createElement("p"); p.className = "lw-empty"; p.textContent = "No words learned yet. Use commands while playing, or add a suggestion."; section.appendChild(p); }
        var status = root.querySelector('section[data-section="status"]');
        var statusEmpty = status.querySelector('.lw-empty'); if(statusEmpty) statusEmpty.remove();
        if (!status.querySelector('.lw-entry')) { var p=document.createElement('p');p.className='lw-empty';p.textContent='No status observations are available for this story yet.';status.appendChild(p); }
        root.querySelector('[data-action="undo"]').disabled = !LearnedWords._undo.length && !root.querySelector('[data-draft="true"]');
        LearnedWords._signature = signature;
        if (LearnedWords._tourStep == null) LearnedWords.applyVisibility();
        Object.keys(LearnedWords._sections || {}).forEach(function (key) {
            var s = LearnedWords._sections[key]; s.button.setAttribute('aria-disabled',String(key !== 'learned' && key !== 'status' && !s.panel.querySelector('.lw-entry')));
        });
    },
    makeRow: function (r, draft) {
        var node = document.createElement("details"); node.className = "lw-entry"; node.dataset.id = r.id; if (draft) node.dataset.draft = "true";
        var summary = document.createElement("summary"), left = document.createElement("span"), meta = document.createElement("span");
        left.className = "lw-summary"; meta.className = "lw-meta";
        var title = document.createElement("span"), response = document.createElement("span");
        function updateSummary(trigger, label, ignored) { title.textContent = "Trigger: " + (trigger || "New word"); response.textContent = "Response: " + (label || "Enter display text"); var item = r.type === 'name' ? ((String(r.item||'').match(/instance \d+$/)||[])[0]||'') : r.item; meta.textContent = (item ? item + ' \u00b7 ' : '') + r.destination + (ignored ? " · Ignored" : "") + (r.state ? " · " + r.state : ""); }
        updateSummary(r.trigger, r.label, r.ignored); left.append(title, response); summary.append(left, meta); node.appendChild(summary);
        if (r.diagnostic) { var diagnostic=document.createElement('p');diagnostic.className='lw-diagnostic';diagnostic.textContent=r.diagnostic;node.appendChild(diagnostic); }
        var fields = document.createElement("div"); fields.className = "lw-fields"; node.appendChild(fields);
        function field(label, value, readonly) { var wrap = document.createElement("label"), input = document.createElement("input"); wrap.textContent = label; input.value = value || ""; input.readOnly = !!readonly; input.maxLength = label === "Response" ? 160 : 120; wrap.appendChild(input); fields.appendChild(wrap); return input; }
        var trigger = field("Trigger", r.trigger, !r.editable), label = field("Response", r.label, false);
        var ignored = document.createElement("input"); ignored.type = "checkbox"; ignored.checked = !!r.ignored;
        if (/^(exact|allowed|manual|behavior)$/.test(r.type)) { var ignoreLabel = document.createElement("label"); ignoreLabel.className = "lw-ignore"; ignoreLabel.append(ignored, document.createTextNode(r.type === "behavior" ? "Ignore this learned inspect decision" : "Ignore this learned entry")); node.appendChild(ignoreLabel); }
        var advanced = document.createElement("details"); advanced.className = "lw-advanced"; advanced.innerHTML = '<summary>Advanced settings</summary>'; node.appendChild(advanced);
        var destLabel = document.createElement("label"); destLabel.textContent = "Used in"; var select = document.createElement("select"); var option = document.createElement("option"); option.textContent = r.destination; option.value = r.destination; select.appendChild(option); destLabel.appendChild(select); advanced.appendChild(destLabel);
        var itemSelect;
        if (draft) {
            var itemLabel = document.createElement("label"); itemLabel.textContent = "Item"; itemSelect = document.createElement("select");
            var placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "Choose a verified item"; itemSelect.appendChild(placeholder);
            LearnedWords.objects().forEach(function (o) { var opt = document.createElement("option"); opt.value = String(o.id); opt.textContent = o.name; itemSelect.appendChild(opt); });
            itemLabel.appendChild(itemSelect); fields.prepend(itemLabel);
        }
        var info = document.createElement("p"); info.textContent = "Story: " + LearnedWords._key + (r.item ? " · Item: " + r.item : "") + ". Only compatible destinations are available."; advanced.appendChild(info);
        var evidence = document.createElement("details"), es = document.createElement("summary"), pre = document.createElement("pre"); es.textContent = "Original learning (read-only)"; pre.textContent = r.evidence || "User suggestion — no game confirmations yet."; evidence.append(es, pre); advanced.appendChild(evidence);
        var testLabel = document.createElement("label"); testLabel.textContent = "Try a phrase (local comparison)"; var phrase = document.createElement("input"); testLabel.appendChild(phrase); advanced.appendChild(testLabel);
        var check = document.createElement("button"), result = document.createElement("p"); check.textContent = "Check"; check.type = "button"; result.setAttribute("role", "status"); check.onclick = function () { result.textContent = phrase.value.trim().toLowerCase() === trigger.value.trim().toLowerCase() ? "Exact match. No game command was run." : "No exact match. No game command was run."; }; advanced.append(check, result);
        var error = document.createElement("p"); error.className = "lw-error"; error.setAttribute("role", "status"); node.appendChild(error);
        function flush() {
            if (node.dataset.dirty !== "true") return true;
            if (LearnedWords.identity() !== LearnedWords._scope.key || LearnedWords.generation() !== LearnedWords._scope.generation) return false;
            try {
                LearnedWords.commit(r, trigger.value, label.value, ignored.checked, itemSelect ? itemSelect.value : r.objectId);
                node.dataset.dirty = "false"; node.dataset.draft = "false"; error.textContent = "";
                updateSummary(trigger.value.trim(), label.value.trim(), ignored.checked); LearnedWords.feedback("Saved");
                document.querySelector('#learned-words [data-action="undo"]').disabled = false; return true;
            } catch (e) { error.textContent = e.message; LearnedWords.feedback("This draft has not been saved."); return false; }
        }
        [trigger, label, ignored, itemSelect].filter(Boolean).forEach(function (input) {
            input.oninput = function () { node.dataset.dirty = "true"; LearnedWords.feedback("Editing · saves when you leave the field"); };
            input.onchange = function () { node.dataset.dirty = "true"; if (input === ignored || input === itemSelect) flush(); };
            input.onblur = flush;
        });
        select.onchange = function () { if (select.value !== r.destination) { select.value = r.destination; error.textContent = "This entry cannot be used there."; } };
        LearnedWords._flush.set(r.id, flush); return node;
    },
    addDraft: function () {
        if (!LearnedWords.sectionEnabled("learned")) return;
        var root = document.querySelector('#learned-words section[data-section="learned"]');
        var old = root.querySelector('[data-draft="true"]'); if (old) { old.open = true; old.querySelector("input").focus(); return; }
        var id = "manual:" + Date.now().toString(36) + Math.random().toString(36).slice(2);
        LearnedWords.selectSection('learned',true);
        var node = LearnedWords.makeRow({ id: id, type: "manual", trigger: "", label: "", original: "", editable: true, destination: "Radial menu", state: "User suggestion", section: "learned" }, true);
        node.open = true; root.prepend(node); document.querySelector('#learned-words [data-action="undo"]').disabled = false; node.querySelector("select").focus();
    },
    close: function (save) {
        if (save !== false && LearnedWords._scope && LearnedWords.identity() === LearnedWords._scope.key && LearnedWords.generation() === LearnedWords._scope.generation) LearnedWords._flush.forEach(function (flush) { flush(); });
        LearnedWords._discard = save === false;
        Message.Hide(); LearnedWords.cleanup();
    },
    beforeHide: function () {
        if (!LearnedWords._discard && LearnedWords._scope && LearnedWords.identity() === LearnedWords._scope.key && LearnedWords.generation() === LearnedWords._scope.generation) LearnedWords._flush.forEach(function (flush) { flush(); });
    },
    cleanup: function () {
        if (!LearnedWords._open) return;
        LearnedWords.stopTourSpeech();
        var dialog = document.getElementById('message'); if (dialog) dialog.classList.remove('lw-dialog');
        var demo = document.querySelector('#learned-words .lw-demo'); if (demo) demo.remove();
        LearnedWords._open = false; clearInterval(LearnedWords._timer); document.removeEventListener("keydown", LearnedWords._onKey, true);
        if (LearnedWords._input && LearnedWords._input.isConnected && LearnedWords._scope.key === LearnedWords.identity() && LearnedWords._scope.generation === LearnedWords.generation()) LearnedWords._input.value = LearnedWords._draft;
        LearnedWords._flush.clear(); LearnedWords._tourStep = null; LearnedWords._discard = false;
    },
    TOUR: [
        ["Your learned words", "The learned list shows commands the system did not already provide for that item. New spellings tried twice without a recognised refusal are remembered as item preferences, not proof that every command works. Remembered actions take priority over usage suggestions for that item and survive leaving without saving or restoring an older save. Current game conditions still apply. User suggestions and learned inspect decisions remain here."],
        ["Trigger and Response", "Trigger is a command verb or form, such as wield. The item supplies its verified name. Response is the text shown on the menu, such as Wield. You are editing ParchLock's behavior and labels, never the game's written reply. Some triggers are read-only because the story owns them."],
        ["Where it appears", "Edit Learned Words opens first when enabled. Game options lets you show or hide each section. Story actions and Names start hidden. Visible banners keep their original order. The label on the right tells you where an entry is used. Used in lists only compatible destinations. A status label cannot become a command. Names change display text only, never parser aliases or command references."],
        ["Saving and Undo", "Valid edits save when you leave a field or close this screen. Errors keep the last valid record intact. Undo restores the last valid edit. Incomplete drafts are discarded when you close, go Back, or change stories. Original learning stays read-only."],
        ["Ignore and replacements", "Ignore hides that one learned contribution without deleting its evidence. An independently valid story action may still appear. Ignoring a learned inspect decision reverses that decision only. Changing a command creates a new suggestion; it needs two subsequent successful commands before automatic submission."],
        ["Add a word", "Choose a unique verified item in scope, enter a command form from this story's dictionary, and give it a response label. New entries fill the command prompt for you to review; they do not execute during editing. Ambiguous items and unsupported forms cannot be saved."],
        ["Advanced settings", "Expand Advanced settings to see Used in, story and item context, original evidence, and Try a phrase. Check compares the exact form locally and never runs a game command. Unsupported matching settings are absent. Learning refreshes without replacing your active field."],
        ["Ready to edit", "Changes belong to this story build. New learning can appear as you play. Finish or Skip marks this tutorial complete once for the app. Help / Replay tutorial brings it back whenever you want, without changing the main tutorial."]
    ],
    startTour: function () {
        LearnedWords._tourFocus = document.activeElement;
        var root = document.getElementById("learned-words"); LearnedWords._tourScroll = root.querySelector('.lw-center').scrollTop;
        LearnedWords._tourSection = LearnedWords._section;
        LearnedWords._tourDetails = Array.from(root.querySelectorAll('details')).map(function (node) { return {node:node,open:node.open}; });
        LearnedWords._tourIcons = root.querySelector('.lw-toolbar').classList.contains('lw-icons');
        root.querySelector('.lw-toolbar').classList.remove('lw-icons');
        root.classList.add("lw-touring");
        LearnedWords._tourHiddenRows = [];
        Object.keys(LearnedWords._sections).forEach(function(key) {
            if (!LearnedWords.sectionEnabled(key)) LearnedWords._sections[key].panel.querySelectorAll('.lw-entry').forEach(function(row) {
                LearnedWords._tourHiddenRows.push({node:row,hidden:row.hidden}); row.hidden=true;
            });
        });
        LearnedWords._tourStep = 0; LearnedWords.renderTour();
    },
    renderTour: function () {
        var root = document.getElementById("learned-words"), tour = root.querySelector(".lw-tour"); tour.hidden = false; tour.replaceChildren();
        LearnedWords.stopTourSpeech();
        Array.from(root.children).forEach(function (node) { if (node !== tour) node.inert = true; });
        var step = LearnedWords.TOUR[LearnedWords._tourStep], heading = document.createElement("h3"), body = document.createElement("p"), progress = document.createElement("p");
        tour.setAttribute("role", "dialog"); tour.setAttribute("aria-modal", "true"); tour.setAttribute("aria-label", step[0]);
        body.className = 'lw-tour-body';
        heading.textContent = step[0]; body.textContent = step[1]; progress.textContent = "Step " + (LearnedWords._tourStep + 1) + " of " + LearnedWords.TOUR.length; tour.append(progress, heading, body);
        var controls = document.createElement('div'); controls.className = 'lw-tour-controls'; tour.appendChild(controls);
        function button(text, action) { var b = document.createElement("button"); b.textContent = text; b.onclick = action; controls.appendChild(b); return b; }
        var back = button("Back", function () { LearnedWords._tourStep--; LearnedWords.renderTour(); }); back.disabled = LearnedWords._tourStep === 0;
        var next = button(LearnedWords._tourStep === LearnedWords.TOUR.length - 1 ? "Finish" : "Next", function () {
            if (LearnedWords._tourStep === LearnedWords.TOUR.length - 1) LearnedWords.finishTour(); else { LearnedWords._tourStep++; LearnedWords.renderTour(); }
        });
        button("Skip", LearnedWords.finishTour); next.focus();
        LearnedWords.prepareTourTarget(); LearnedWords.placeTour(); LearnedWords.speakTour(step);
    },
    stopTourSpeech: function () {
        try { if (typeof ReadAloud !== 'undefined' && ReadAloud.stop) ReadAloud.stop(); } catch (e) {}
    },
    speakTour: function (step) {
        try { if (typeof ReadAloud !== 'undefined' && ReadAloud.speak) ReadAloud.speak(step[0]+'. '+step[1]); } catch (e) {}
    },
    prepareTourTarget: function () {
        var root = document.getElementById('learned-words'), index = LearnedWords._tourStep;
        root.querySelector('.lw-center').hidden = false;
        LearnedWords.selectSection('learned',true);
        var row = root.querySelector('section[data-section="learned"] .lw-entry');
        if ((!row || !LearnedWords.sectionEnabled('learned')) && [1,4,6].indexOf(index) >= 0) {
            row = root.querySelector('.lw-demo');
            if (!row) {
                row = document.createElement('details'); row.className = 'lw-entry lw-demo';
                row.innerHTML = '<summary>Example only · not a learned record</summary><div class="lw-fields"><label>Trigger<input value="wield" readonly></label><label>Response<input value="Wield" readonly></label></div><label class="lw-ignore"><input type="checkbox" disabled>Ignore this learned entry</label><details class="lw-advanced"><summary>Advanced settings</summary><p>Used in: Radial menu · Original learning is read-only · Check compares locally.</p></details>';
                root.querySelector('section[data-section="learned"]').appendChild(row);
            }
        }
        if (row) { row.open = [1,4,6].indexOf(index) >= 0; var advanced = row.querySelector('.lw-advanced'); if (advanced) advanced.open = index === 6; }
        var selectors = ['.lw-current-header', '.lw-fields', '.lw-bottom-headers', '.lw-feedback', '.lw-ignore', '[data-action="add"]', '.lw-advanced', '[data-action="help"]'];
        var target = [1,4,6].indexOf(index) >= 0 && row ? row.querySelector(selectors[index]) : root.querySelector(selectors[index]);
        root.querySelectorAll('.lw-target').forEach(function(n){n.classList.remove('lw-target');});
        LearnedWords._tourTarget = target;
        if (target) { target.classList.add('lw-target'); target.scrollIntoView({block:'nearest'}); }
    },
    placeTour: function () {
        var root = document.getElementById('learned-words'); if (!root || LearnedWords._tourStep == null) return;
        var card = root.querySelector('.lw-tour'), target = LearnedWords._tourTarget;
        var style = getComputedStyle(document.documentElement);
        var height = parseFloat(style.getPropertyValue('--pl-layout-height')) || document.documentElement.clientHeight;
        var inset = parseFloat(style.getPropertyValue('--pl-kb-inset')) || 0;
        var bottom = Math.max(80,height-inset), width = document.documentElement.clientWidth;
        var rect = target && target.getBoundingClientRect(), above = rect ? Math.max(0,rect.top-16) : 0, below = rect ? Math.max(0,bottom-rect.bottom-16) : bottom-16;
        var useBelow = below >= above, band = useBelow ? below : above;
        card.style.width = Math.min(420,width-24)+'px'; card.style.left = Math.max(12,(width-Math.min(420,width-24))/2)+'px';
        card.style.maxHeight = Math.max(40,band-8)+'px'; card.style.overflowY = 'auto';
        var natural = card.scrollHeight, h = Math.min(natural,Math.max(40,band-8));
        card.style.top = (rect ? (useBelow ? Math.min(bottom-h-8,rect.bottom+8) : Math.max(8,rect.top-h-8)) : 8)+'px';
        card.style.bottom = 'auto';
    },
    finishTour: function () {
        LearnedWords.stopTourSpeech();
        try { localStorage.setItem(LearnedWords.TUTORIAL_KEY, "1"); } catch (e) { LearnedWords.feedback("Tutorial completion could not be stored."); }
        var root = document.getElementById("learned-words"); root.querySelector(".lw-tour").hidden = true;
        root.classList.remove("lw-touring");
        root.querySelector('.lw-toolbar').classList.toggle('lw-icons',!!LearnedWords._tourIcons);
        root.querySelectorAll('.lw-target').forEach(function(n){n.classList.remove('lw-target');});
        var demo = root.querySelector('.lw-demo'); if (demo) demo.remove();
        (LearnedWords._tourHiddenRows || []).forEach(function(r){if(r.node.isConnected)r.node.hidden=r.hidden;});
        (LearnedWords._tourDetails || []).forEach(function(r){if(r.node.isConnected)r.node.open=r.open;});
        LearnedWords.selectSection(LearnedWords._tourSection || 'learned',true);
        root.querySelector('.lw-center').scrollTop = LearnedWords._tourScroll || 0;
        Array.from(root.children).forEach(function (node) { node.inert = false; }); LearnedWords._tourStep = null;
        LearnedWords._section = LearnedWords._tourSection; LearnedWords.applyVisibility();
        if (LearnedWords._tourFocus && LearnedWords._tourFocus.isConnected) LearnedWords._tourFocus.focus();
    }
};
if (typeof LearningStores !== "undefined") LearningStores.register("learnedWords", LearnedWords.PREFIX, LearnedWords.learningKeyFor, {
    compact: function (value) { return JSON.stringify(LearnedWords.capRows(JSON.parse(value))); }
});
