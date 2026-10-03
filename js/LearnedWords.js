/* LearnedWords: user overrides are a projection, never calibration evidence.
 * Recorder-owned revision witnesses promote manual forms; UI cannot manufacture them. */
var LearnedWords = {
    VERSION: 1,
    PREFIX: "PL_LearnedWordOverrides_",
    TUTORIAL_KEY: "PL_LearnedWordsTutorialSeen",
    _recorderSession: Date.now().toString(36) + Math.random().toString(36).slice(2),
    _key: null, _data: null, _undo: [], _open: false,
    generation: function () { return typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0; },
    identity: function () {
        try { var mem = AttributeSchema._getMem(); return mem ? AttrCalibrator.gameIdentityKey(mem) : null; } catch (e) { return null; }
    },
    load: function () {
        var key = LearnedWords.identity();
        if (key === LearnedWords._key && LearnedWords._data) return LearnedWords._data;
        LearnedWords._key = key; LearnedWords._undo = [];
        var data = { version: 1, gameIdentityKey: key, rows: {} };
        try {
            var parsed = JSON.parse(localStorage.getItem(LearnedWords.PREFIX + key));
            if (key && parsed && parsed.version === 1 && parsed.gameIdentityKey === key && parsed.rows && !Array.isArray(parsed.rows)) {
                var valid = Object.keys(parsed.rows).every(function (id) {
                    var r = parsed.rows[id];
                    return /^(exact|allowed|manual|behavior|provider|name|status):/.test(id) &&
                        r && typeof r.label === "string" && r.label.length > 0 && r.label.length <= 160 &&
                        typeof r.trigger === "string" && r.trigger.length <= 120 && typeof r.ignored === "boolean" &&
                        typeof r.revision === "string" && r.revision.length <= 120 &&
                        (!r.witnesses || (Array.isArray(r.witnesses) && r.witnesses.length <= 2 && r.witnesses.every(function (s) { return typeof s === "string"; })));
                });
                if (valid) data = parsed;
            }
        } catch (e) {}
        LearnedWords._data = data;
        return data;
    },
    write: function (next, history) {
        if (!LearnedWords.identity() || next.gameIdentityKey !== LearnedWords.identity()) throw new Error("This story changed. Reopen the editor.");
        localStorage.setItem(LearnedWords.PREFIX + next.gameIdentityKey, JSON.stringify(next));
        if (history) LearnedWords._undo.push(JSON.stringify(LearnedWords.load()));
        if (LearnedWords._undo.length > 100) LearnedWords._undo.shift();
        LearnedWords._data = next;
    },
    rowKey: function (type, objectId, form) { return type + ":" + String(objectId) + ":" + encodeURIComponent(form); },
    override: function (id) { return LearnedWords.load().rows[id]; },
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
            if (/^(exact|allowed|manual|provider):/.test(id) && String(r.objectId) === String(objectId) && r.trigger === form && !r.ignored) { found = r.label; return true; }
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
        return LearnedWords.candidates(obj.id).map(function (c) {
            return { objectId: obj.id, verb: c.form, command: c.form + " " + ref.noun,
                Enter: c.enter, enter: c.enter, label: c.label, confidence: 0.5, source: "user-suggestion",
                learnedWordScope: { key: LearnedWords.identity(), generation: LearnedWords.generation(), id: c.id, revision: c.revision } };
        });
    },
    commandCurrent: function (command) {
        var scope = command.learnedWordScope;
        if (!scope || scope.key !== LearnedWords.identity() || scope.generation !== LearnedWords.generation()) return false;
        return LearnedWords.candidates(command.objectId).some(function (c) {
            var obj = LearnedWords.objects().find(function (o) { return String(o.id) === String(command.objectId); });
            return c.id === scope.id && c.revision === scope.revision && c.form === command.verb && (!command.Enter || c.enter) &&
                obj && command.command === c.form + " " + Actionable.referenceFor(obj).noun;
        });
    },
    records: function () {
        var data = LearnedWords.load(), list = [], table = AttrCalibrator.table || {}, pool;
        try { var mem = AttributeSchema._getMem(); if (mem) AttrCalibrator.hydrate(mem); table = AttrCalibrator.table; pool = Actionable.payloadPool(); } catch (e) { pool = []; }
        Object.keys(table.objects || {}).forEach(function (objectId) {
            var obj = pool.find(function (o) { return String(o.id) === objectId; });
            ["exact", "allowed"].forEach(function (type) {
                var entries = table.objects[objectId][type === "exact" ? "exactForms" : "allowedVerbs"] || {};
                Object.keys(entries).forEach(function (form) {
                    var e = entries[form], id = LearnedWords.rowKey(type, objectId, form);
                    list.push({ id: id, type: type, objectId: objectId, trigger: form, original: form,
                        label: form.charAt(0).toUpperCase() + form.slice(1), destination: "Radial menu", section: "learned",
                        item: obj ? obj.name : "Object " + objectId + " (not in scope)",
                        state: (type === "allowed" && e.opcodeConfirmed) || e.confirmations >= 2 ? "Remembered" : "Not remembered yet",
                        evidence: JSON.stringify(e), editable: true });
                });
            });
        });
        var behavior = table.verbBehavior || {};
        Object.keys(behavior.disabled || {}).forEach(function (verb) {
            list.push({ id: "behavior:disabled:" + verb, type: "behavior", trigger: verb, label: "Inspect unavailable", destination: "Radial menu",
                section: "learned", state: behavior.disabled[verb].confirmed ? "Remembered" : "Not remembered yet", evidence: JSON.stringify(behavior.disabled[verb]) });
        });
        if (behavior.substituteVerb) list.push({ id: "behavior:substitute", type: "behavior", trigger: behavior.substituteVerb, label: "Inspect replacement", destination: "Radial menu", section: "learned", state: "Remembered", evidence: JSON.stringify(behavior.substituteCandidates || {}) });
        Object.keys(data.rows).filter(function (id) { return id.indexOf("manual:") === 0; }).forEach(function (id) {
            var r = data.rows[id]; list.push({ id: id, type: "manual", objectId: r.objectId, trigger: r.trigger, original: "", label: r.label,
                section: "learned", destination: "Radial menu", item: (pool.find(function (o) { return String(o.id) === String(r.objectId); }) || {}).name || "Object " + r.objectId,
                state: (r.witnesses || []).length >= 2 ? "Remembered user suggestion" : "User suggestion · not remembered", evidence: "User supplied. Original game evidence is unchanged.", editable: true });
        });
        pool.forEach(function (obj) {
            list.push({ id: "name:" + obj.id, type: "name", trigger: obj.name, label: obj.name, objectId: obj.id, destination: "Items display", section: "names", evidence: "Item display text only. Parser name/aliases (read-only): " + JSON.stringify(obj.aliases || []) });
            try { ActionSynth.commandsForObject(obj, "room").forEach(function (c) {
                if (list.some(function (r) { return r.objectId === String(obj.id) && r.original === c.verb; })) return;
                list.push({ id: LearnedWords.rowKey("provider", obj.id, c.verb), type: "provider", objectId: obj.id, trigger: c.verb,
                    label: c.verb.charAt(0).toUpperCase() + c.verb.slice(1), destination: "Radial menu", section: "actions", item: obj.name, evidence: "Provided story action; command and eligibility remain owned by the provider." });
            }); } catch (e) {}
        });
        if (typeof StatTracker !== "undefined") {
            var model = StatTracker.model();
            var stats = typeof StatTracker.visibleStats === "function" ? StatTracker.visibleStats() : [];
            (stats || []).forEach(function (s) { list.push({ id: "status:" + s.key, type: "status", trigger: s.key, label: s.label || s.key, section: "status", destination: "Status display", evidence: "Display text only. Values and evidence are not editable." }); });
            Object.keys(model.conditions || {}).forEach(function (key) { list.push({ id: "status:" + key, type: "status", trigger: key, label: model.conditions[key].label, section: "status", destination: "Status display", evidence: "Current condition observation; display text only." }); });
        }
        var seen = {};
        return list.filter(function (r) { if (seen[r.id]) return false; seen[r.id] = true; return true; }).map(function (r) {
            var o = data.rows[r.id];
            if (o) { r.trigger = o.trigger; r.label = o.label; r.ignored = o.ignored; if (r.editable && o.trigger !== r.original) r.state = (o.witnesses || []).length >= 2 ? "Remembered replacement" : "Replacement · not remembered"; }
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
        if (prev && JSON.stringify(prev) === JSON.stringify(next.rows[record.id])) return;
        LearnedWords.write(next, true);
        LearnedWords.refreshLabels();
    },
    undo: function () {
        if (!LearnedWords._undo.length) return;
        var next = JSON.parse(LearnedWords._undo[LearnedWords._undo.length - 1]);
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
                    var focus = Array.from(document.querySelectorAll('#message button,#message input,#message select,#message summary,#message [tabindex="0"]')).filter(function (n) { return !n.disabled && !n.closest("[inert]") && n.getClientRects().length; });
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
        }, 500);
        var seen = false; try { seen = localStorage.getItem(LearnedWords.TUTORIAL_KEY) === "1"; } catch (e) {}
        if (!seen) LearnedWords.startTour();
    },
    feedback: function (text) { var node = document.querySelector("#learned-words .lw-feedback"); if (node) node.textContent = text; },
    render: function (force) {
        if (!LearnedWords._open) return;
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
            if (old) old.replaceWith(node); else root.querySelector('[data-section="' + r.section + '"]').appendChild(node);
        });
        Array.from(root.querySelectorAll(".lw-entry")).forEach(function (n) { if (n.dataset.draft !== "true" && !records.some(function (r) { return r.id === n.dataset.id; }) && n !== focused) { LearnedWords._flush.delete(n.dataset.id); n.remove(); } });
        var section = root.querySelector('[data-section="learned"]');
        var empty = section.querySelector(".lw-empty"); if (empty) empty.remove();
        if (!section.children.length) { var p = document.createElement("p"); p.className = "lw-empty"; p.textContent = "No words learned yet. Use commands while playing, or add a suggestion."; section.appendChild(p); }
        root.querySelector('[data-action="undo"]').disabled = !LearnedWords._undo.length && !root.querySelector('[data-draft="true"]');
        LearnedWords._signature = signature;
    },
    makeRow: function (r, draft) {
        var node = document.createElement("details"); node.className = "lw-entry"; node.dataset.id = r.id; if (draft) node.dataset.draft = "true";
        var summary = document.createElement("summary"), left = document.createElement("span"), meta = document.createElement("span");
        left.className = "lw-summary"; meta.className = "lw-meta";
        var title = document.createElement("span"), response = document.createElement("span");
        function updateSummary(trigger, label, ignored) { title.textContent = "Trigger: " + (trigger || "New word"); response.textContent = "Response: " + (label || "Enter display text"); meta.textContent = r.destination + (ignored ? " · Ignored" : "") + (r.state ? " · " + r.state : ""); }
        updateSummary(r.trigger, r.label, r.ignored); left.append(title, response); summary.append(left, meta); node.appendChild(summary);
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
        var root = document.querySelector('#learned-words [data-section="learned"]');
        var old = root.querySelector('[data-draft="true"]'); if (old) { old.open = true; old.querySelector("input").focus(); return; }
        var id = "manual:" + Date.now().toString(36) + Math.random().toString(36).slice(2);
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
        LearnedWords._open = false; clearInterval(LearnedWords._timer); document.removeEventListener("keydown", LearnedWords._onKey, true);
        if (LearnedWords._input && LearnedWords._input.isConnected && LearnedWords._scope.key === LearnedWords.identity() && LearnedWords._scope.generation === LearnedWords.generation()) LearnedWords._input.value = LearnedWords._draft;
        LearnedWords._flush.clear(); LearnedWords._tourStep = null; LearnedWords._discard = false;
    },
    TOUR: [
        ["Your learned words", "This list reflects this story's actual learning. Remembered commands have evidence; not-remembered entries and user suggestions still need successful gameplay. Story actions, names, and status labels are separate optional sections."],
        ["Trigger and Response", "Trigger is a command verb or form, such as wield. The item supplies its verified name. Response is the text shown on the menu, such as Wield. You are editing ParchLock's behavior and labels, never the game's written reply. Some triggers are read-only because the story owns them."],
        ["Where it appears", "The label on the right tells you where an entry is used. Used in lists only compatible destinations. A status label cannot become a command. Names change display text only, never parser aliases or command references."],
        ["Saving and Undo", "Valid edits save when you leave a field or close this screen. Errors keep the last valid record intact. Undo restores the last valid edit. Incomplete drafts are discarded when you close, go Back, or change stories. Original learning stays read-only."],
        ["Ignore and replacements", "Ignore hides that one learned contribution without deleting its evidence. An independently valid story action may still appear. Ignoring a learned inspect decision reverses that decision only. Changing a command creates a new suggestion; it needs two subsequent successful commands before automatic submission."],
        ["Add a word", "Choose a unique verified item in scope, enter a command form from this story's dictionary, and give it a response label. New entries fill the command prompt for you to review; they do not execute during editing. Ambiguous items and unsupported forms cannot be saved."],
        ["Advanced settings", "Expand Advanced settings to see Used in, story and item context, original evidence, and Try a phrase. Check compares the exact form locally and never runs a game command. Unsupported matching settings are absent. Learning refreshes without replacing your active field."],
        ["Ready to edit", "Changes belong to this story build. New learning can appear as you play. Finish or Skip marks this tutorial complete once for the app. Help / Replay tutorial brings it back whenever you want, without changing the main tutorial."]
    ],
    startTour: function () {
        LearnedWords._tourFocus = document.activeElement;
        var root = document.getElementById("learned-words"); LearnedWords._tourScroll = root.parentElement.scrollTop;
        root.classList.add("lw-touring"); root.parentElement.scrollTop = 0;
        LearnedWords._tourStep = 0; LearnedWords.renderTour();
    },
    renderTour: function () {
        var root = document.getElementById("learned-words"), tour = root.querySelector(".lw-tour"); tour.hidden = false; tour.replaceChildren();
        Array.from(root.children).forEach(function (node) { if (node !== tour) node.inert = true; });
        var step = LearnedWords.TOUR[LearnedWords._tourStep], heading = document.createElement("h3"), body = document.createElement("p"), progress = document.createElement("p");
        tour.setAttribute("role", "dialog"); tour.setAttribute("aria-modal", "true"); tour.setAttribute("aria-label", step[0]);
        heading.textContent = step[0]; body.textContent = step[1]; progress.textContent = "Step " + (LearnedWords._tourStep + 1) + " of " + LearnedWords.TOUR.length; tour.append(progress, heading, body);
        function button(text, action) { var b = document.createElement("button"); b.textContent = text; b.onclick = action; tour.appendChild(b); return b; }
        var back = button("Back", function () { LearnedWords._tourStep--; LearnedWords.renderTour(); }); back.disabled = LearnedWords._tourStep === 0;
        var next = button(LearnedWords._tourStep === LearnedWords.TOUR.length - 1 ? "Finish" : "Next", function () {
            if (LearnedWords._tourStep === LearnedWords.TOUR.length - 1) LearnedWords.finishTour(); else { LearnedWords._tourStep++; LearnedWords.renderTour(); }
        });
        button("Skip", LearnedWords.finishTour); next.focus();
    },
    finishTour: function () {
        try { localStorage.setItem(LearnedWords.TUTORIAL_KEY, "1"); } catch (e) { LearnedWords.feedback("Tutorial completion could not be stored."); }
        var root = document.getElementById("learned-words"); root.querySelector(".lw-tour").hidden = true;
        root.classList.remove("lw-touring"); root.parentElement.scrollTop = LearnedWords._tourScroll || 0;
        Array.from(root.children).forEach(function (node) { node.inert = false; }); LearnedWords._tourStep = null;
        if (LearnedWords._tourFocus && LearnedWords._tourFocus.isConnected) LearnedWords._tourFocus.focus();
    }
};
