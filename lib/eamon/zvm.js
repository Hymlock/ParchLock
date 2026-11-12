/* ParchLock Eamon host, page side.
 *
 * ParchLock's vendor loader (lib/main.js) starts a story by loading "<lib_path>zvm.js" and constructing
 * window.ZVM against its own Glk. For an Eamon story js/Consts.js points lib_path here, so this file
 * supplies an engine with the same start/resume contract. The Eamon CS engine itself runs unmodified in
 * a worker (host-worker.js); this adapter only moves its text and input through ParchLock's ordinary
 * story window, and keeps its files in durable storage. No vendor code is patched.
 */
(function () {
  "use strict";
  var BASE = (function () {
    try { if (document.currentScript && document.currentScript.src) return document.currentScript.src.replace(/[^\/]*$/, ""); } catch (e) {}
    return new URL("lib/eamon/", location.href).href;
  })();

  /* ---- durable storage: one transaction per engine safe point ---- */
  var database = null;
  // The installed package this campaign's files were last written under (its digest), recorded with every commit so
  // a later release can tell which saved files belong to which package (plan 9a, Grok #3451). Recorded only for now.
  var packageStamp = null, packageFingerprints = null;
  // The campaign's save format. It changes only by hand, when a new engine or host cannot read older campaign files;
  // a different value refuses the campaign (C), never a package digest alone (Grok #3454 B1). Not bumped before the
  // owner's review (B2).
  var SCHEMA = 1;
  function db() {
    if (!database) database = new Promise(function (resolve, reject) {
      var request = indexedDB.open("parchlock-eamon", 1);
      request.onupgradeneeded = function () {
        request.result.createObjectStore("files", {keyPath: "path"});
        request.result.createObjectStore("meta", {keyPath: "key"});
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
    return database;
  }
  function loadSaved() {
    return db().then(function (d) {
      var tx = d.transaction(["files", "meta"]);
      function get(request) { return new Promise(function (resolve, reject) { request.onsuccess = function () { resolve(request.result); }; request.onerror = function () { reject(request.error); }; }); }
      return Promise.all([get(tx.objectStore("files").getAll()), get(tx.objectStore("meta").get("state"))]).then(function (r) {
        return {files: r[0], launch: r[1] ? r[1].launch : null, revision: r[1] ? r[1].revision : 0, stamp: r[1] && r[1].stamp ? r[1].stamp : null,
          schema: r[1] && r[1].schema != null ? r[1].schema : null, fingerprints: r[1] && r[1].fingerprints ? r[1].fingerprints : null};
      });
    });
  }
  function store(data, base) {
    return db().then(function (d) {
      var tx = d.transaction(["files", "meta"], "readwrite", {durability: "strict"});
      data.puts.forEach(function (file) { tx.objectStore("files").put(file); });
      data.deletes.forEach(function (path) { tx.objectStore("files").put({path: path, deleted: true}); });
      tx.objectStore("meta").put({key: "state", launch: data.launch, revision: base + data.revision, stamp: packageStamp, schema: SCHEMA, fingerprints: packageFingerprints, time: Date.now()});
      return new Promise(function (resolve, reject) { tx.oncomplete = resolve; tx.onerror = tx.onabort = function () { reject(tx.error); }; });
    });
  }

  /* A new Showcase package with the same save format carries the campaign over (plan 9a, B; Grok #3451/#3454).
     The saved files are an overlay on the package, so only campaign-owned files survive a change of package: the
     rosters, ParchLock's own records and each adventure's game state and save slots. Everything else (a package path,
     a deletion marker, a file type not on the list) follows the new package. An adventure the package changed is
     not resumed: its character is recalled to the Main Hall by the host (UpdateRecall.cs), which needs that
     adventure's FRESHMEAT/FRESHGEAR and deletes its old game state and slots itself (A1). One transaction. */
  var CAMPAIGN_OWNED = /^(System\/Bin\/(CHARACTERS|INVENTORY|PL[A-Z0-9_]*)\.DAT|Adventures\/[A-Za-z0-9_-]{1,64}\/(PLRUN(_\d+)?|SAVEGAME|FRESHMEAT|FRESHGEAR|EAMONCFG|[A-Z]+_\d+)\.DAT)$/i;
  var ROSTERS = /^System\/Bin\/(CHARACTERS|INVENTORY)\.DAT$/i;
  function carryOver(saved, fingerprints, packaged) {
    packageFingerprints = fingerprints || null;
    saved.update = null;
    if (!saved.files.length) return Promise.resolve(saved);
    if (saved.schema != null && saved.schema !== SCHEMA) {
      var refused = new Error("This Eamon campaign was saved in a format this Showcase cannot read. Nothing on this device was changed; you can keep a copy with Download Package in the save manager.");
      refused.campaignRefused = true;
      return Promise.reject(refused);
    }
    if (saved.stamp && saved.stamp === packageStamp) return Promise.resolve(saved);
    var old = saved.fingerprints || {}, now = fingerprints || {}, changed = {}, shipped = {};
    Object.keys(now).forEach(function (dir) { if (old[dir] !== now[dir]) changed[dir] = true; });
    Object.keys(old).forEach(function (dir) { if (!(dir in now)) changed[dir] = true; });
    (packaged || []).forEach(function (path) { shipped[String(path).toLowerCase()] = true; });
    var keep = [], drop = [], recall = {};
    saved.files.forEach(function (f) {
      var path = String(f.path), folder = /^Adventures\/([^/]+)\//.exec(path);
      // An adventure the package did not change keeps every saved entry as it is, so a character there resumes into
      // exactly the world it left (Grok #3456 F1); the allow-list applies to changed folders and to System/Bin.
      if (folder && !changed[folder[1]]) { keep.push(f); return; }
      var owned = !f.deleted && CAMPAIGN_OWNED.test(path) && (!shipped[path.toLowerCase()] || ROSTERS.test(path));
      if (!owned) { drop.push(path); return; }
      keep.push(f);
      var m = /^Adventures\/([^/]+)\//.exec(path);
      if (m && changed[m[1]]) recall[m[1]] = true;
    });
    var dirs = Object.keys(recall).sort();
    var launch = saved.launch, wd = launch ? launch.indexOf("-wd") : -1;
    var resumed = wd >= 0 && /^\.\.\/\.\.\/Adventures\/(.+)$/.exec(String(launch[wd + 1] || ""));
    if (resumed && changed[resumed[1]]) launch = null;
    if (dirs.length) keep.push({path: "System/Bin/PLRECALL.DAT", bytes: new TextEncoder().encode(JSON.stringify(dirs))});
    return db().then(function (d) {
      var tx = d.transaction(["files", "meta"], "readwrite", {durability: "strict"});
      drop.forEach(function (path) { tx.objectStore("files").delete(path); });
      if (dirs.length) tx.objectStore("files").put(keep[keep.length - 1]);
      tx.objectStore("meta").put({key: "state", launch: launch, revision: saved.revision, stamp: packageStamp, schema: SCHEMA, fingerprints: packageFingerprints, time: Date.now()});
      return new Promise(function (resolve, reject) { tx.oncomplete = resolve; tx.onerror = tx.onabort = function () { reject(tx.error); }; });
    }).then(function () {
      saved.files = keep; saved.launch = launch;
      saved.update = {from: saved.stamp, dropped: drop.length, changed: Object.keys(changed).length, recalled: dirs.length};
      return saved;
    });
  }

  function EamonVM() {
    var vm = this, Glk = null, mainwin = null, event = null, worker = null;
    var screen = "", emitted = 0, expectEcho = null, linebuf = null;
    var pending = null, answers = {}, commit = Promise.resolve(), baseRevision = 0, ended = false, failed = false;
    var state = vm.state = {phase: null, restored: null, world: null, worldGeneration: 0, commits: 0, pendingCommits: 0, prompts: 0, safePrompts: 0, commitError: null, turns: [], events: [], lastSent: 0};
    vm.isEamon = true;

    // Opt-in diagnostic trail (localStorage PL_EamonDebug = "1"); off for players.
    var debug = false;
    try { debug = localStorage.getItem("PL_EamonDebug") === "1"; } catch (e) {}
    function trace(what) { if (!debug) return; (state.trace = state.trace || []).push(Math.round(performance.now()) + " " + what); if (state.trace.length > 80) state.trace.shift(); }
    function controller() { return navigator.serviceWorker && navigator.serviceWorker.controller; }
    function post(id) {
      var answer = answers[String(id)];
      trace("post " + id + (answer ? "" : " (no answer yet)") + (controller() ? "" : " (no controller)"));
      if (answer && controller()) controller().postMessage({kind: "eamon-answer", id: id, value: answer.value, cancel: answer.cancel});
    }
    function answer(value, cancel) {
      if (!pending) return;
      var id = pending.id;
      trace("answer " + id + " " + JSON.stringify(value));
      pending = null;
      state.lastSent = performance.now();
      // The engine does not move on until the safe point it is waiting at is durably stored.
      commit.then(function () { if (!ended) { answers[String(id)] = {value: value, cancel: !!cancel}; post(id); } }, function () { /* The commit failure handler stops this worker. */ });
    }

    // Text is final only once the engine stops to ask for input (it rewrites the tail of its screen
    // while working), so the story window is fed at each prompt.
    function flush() {
      var text = screen.slice(emitted);
      emitted = screen.length;
      if (expectEcho !== null) {
        // The story window already shows what the player typed; drop the engine's own echo of it.
        if (text.indexOf(expectEcho) === 0) {
          text = text.slice(expectEcho.length);
          if (text.charAt(0) === "\r") text = text.slice(1);
          if (text.charAt(0) === "\n") text = text.slice(1);
        }
        expectEcho = null;
      }
      if (text) Glk.glk_put_jstring(reflow(text.replace(/\r\n/g, "\n")));
    }

    // Presentation only; the engine's own output is untouched. Eamon lays its text out for a fixed
    // 80-column screen. In ParchLock's story window, which wraps to any width, that shows as broken
    // lines, so: a line the engine broke only because the next word would not fit is rejoined;
    // centring and indent padding is dropped; full-width rules are shortened to fit a phone.
    var MARGIN = 78;
    function reflow(text) {
      var lines = text.split("\n"), out = [], i, line, next, word;
      for (i = 0; i < lines.length; i++) {
        line = lines[i];
        if (/^-{20,}$/.test(line)) { out.push("------------------------"); continue; }
        if (/^\|.*\|$/.test(line) && line.length > 40) line = line.replace(/^\|\s*/, "").replace(/\s*\|$/, "");
        line = line.replace(/^ {3,}/, "");
        while (i + 1 < lines.length) {
          next = lines[i + 1];
          // The engine always starts these on their own line: never join them to the text above.
          if (!next || /^\s/.test(next) || /^-{20,}$/.test(next) || !line || /^(?:Obvious (?:exits|paths):|\[[^\]]+\]$)/.test(next)) break;
          word = next.split(" ")[0];
          if (lines[i].length + 1 + word.length <= MARGIN) break;
          line += " " + next;
          i++;
        }
        out.push(line);
      }
      return out.join("\n");
    }

    function wait() {
      trace("wait"); event = new Glk.RefStruct(); Glk.glk_select(event); Glk.update(); }
    function request(read) {
      trace("request " + read.id + " " + read.type + (read.safePoint ? " safe" : ""));
      pending = read;
      state.prompts++; if (read.safePoint) state.safePrompts++;
      // A top-level prompt (the adventure's own command prompt or a Main Hall menu) is the only place ParchLock's own
      // commands (fast travel, radials, Equipment) may be typed; a nested one (a save name, a shop step) is the player's.
      state.atTopLevel = !!read.safePoint;
      if (state.lastSent) { state.turns.push(Math.round(performance.now() - state.lastSent)); state.lastSent = 0; }
      flush();
      // Single-key prompts (menus, yes/no, "press any key") stay single-key, as in the original.
      if (read.type === "key" || (read.size <= 1 && read.type !== "line")) Glk.glk_request_char_event_uni(mainwin);
      else { linebuf = new Array(Math.min(Math.max(read.size, read.type === "line" ? 80 : 1), 255)).fill(0); Glk.glk_request_line_event_uni(mainwin, linebuf, 0); }
      wait();
    }
    function fail(message) {
      if (failed) return;
      failed = true;
      ended = true;
      pending = null;
      answers = {};
      if (worker) worker.terminate();
      // Do not display success text buffered for a revision whose storage commit failed.
      if (!state.commitError) { try { flush(); } catch (e) {} }
      Glk.fatal_error("Eamon: " + message);
    }

    function onWorker(message) {
      if (ended) return;
      var data = message.data;
      if (data.kind === "hello") {
        loadSaved().then(function (saved) {
          var stampChanged = saved.files.length > 0 && saved.stamp !== packageStamp;
          return carryOver(saved, data.fingerprints, data.packaged).then(function (s) { s.stampChanged = stampChanged; return s; });
        }).then(function (saved) {
          state.restored = {files: saved.files.length, launch: saved.launch, revision: saved.revision, stamp: saved.stamp,
            stampChanged: saved.stampChanged, update: saved.update};
          if (saved.update && !saved.update.recalled && typeof Message !== "undefined") {
            // One notice per package change (Grok #3451); a recalled character gets its own message from the Hall.
            try { Message.Show("Eamon Showcase Updated", "Your characters and progress were kept in the new version of the Eamon Showcase."); } catch (e) {}
          }
          baseRevision = saved.revision;
          // Records of earlier Showcase builds that no save is attached to (owner rule 8; ModuleLibrary.cleanShowcaseOrphans).
          try { if (typeof ModuleLibrary !== "undefined" && ModuleLibrary.cleanShowcaseOrphans) state.orphansRemoved = ModuleLibrary.cleanShowcaseOrphans(); } catch (e) {}
          worker.postMessage({kind: "boot", files: saved.files, launch: saved.launch});
        }, function (error) {
          fail(error && error.campaignRefused ? error.message : "saved progress could not be read (" + error + ").");
          if (error && error.campaignRefused) offerFreshCampaign();
        });
      } else if (data.kind === "commit") {
        state.pendingCommits++;
        commit = commit.then(function () { return store(data, baseRevision); }).then(function () { state.commits++; state.pendingCommits--; }, function (error) { state.pendingCommits--; throw error; });
        commit.catch(function (error) { state.commitError = String(error); fail("progress could not be saved (" + error + ")."); });
      } else if (data.kind === "output") {
        screen = screen.slice(0, data.keep) + data.text;
        if (emitted > screen.length) emitted = screen.length;
      } else if (data.kind === "trim") {
        screen = screen.slice(data.dropped);
        emitted = Math.max(0, emitted - data.dropped);
      } else if (data.kind === "read") {
        trace("read-msg " + data.id);
        answers = {};
        commit.then(function () { if (!ended) request(data); }, function () { /* Commit handler fails visibly. */ });
      } else if (data.kind === "lifecycle") {
        // The game's own SAVE/RESTORE completed: the same entry points ParchLock's Glk save-dialog hook calls,
        // so the transcript marker, per-save map/labels and playthrough history follow it (plan section 7).
        commit.then(function () {
          try {
            if (data.event === "save" && typeof Transcript !== "undefined" && Transcript.commitSave) Transcript.commitSave(data.name);
            if (data.event === "restore" && typeof Transcript !== "undefined" && Transcript.commitRestore) {
              Transcript._choice = { usage: "restore", name: data.name, at: Date.now() };
              Transcript.commitRestore();
              if (typeof UndoRestoreSync !== "undefined" && UndoRestoreSync.onStateRestored) UndoRestoreSync.onStateRestored("restore_file", vm);
            }
            // A new game of one adventure (entered from the Hall): archive and clear only that adventure's map,
            // in its own scope; transcript, playthrough history and labels continue (Grok #3388 N1/N2).
            if (data.event === "adventure-fresh" && data.name && typeof ParchLockMap !== "undefined" && ParchLockMap.SetScope) {
              ParchLockMap.SetScope(data.name);
              if ((ParchLockMap.Rooms || []).length && typeof SaveState !== "undefined" && SaveState.archiveWorkingMap("new adventure") !== false) {
                ParchLockMap.Clear({ seed: false });
                // The new run's starting room goes straight back on the map (the world it reports is this adventure's).
                var w = state.world;
                if (w && w.room && w.adventure === data.name && typeof MapTopology !== "undefined" && MapTopology.ensureRoom) {
                  var start = MapTopology.ensureRoom(w.room.name, w.room.id, { roomId: w.room.id, roomName: w.room.name, probe: { roomSource: "eamon-native", roomId: w.room.id } });
                  if (start && ParchLockMap.SetCurrentRoom) ParchLockMap.SetCurrentRoom(start);
                }
                ParchLockMap.Save();
                try { ParchLockMap.RefreshMapPanels(); } catch (e) {}
              }
            }
            // The engine deleted every save slot of this adventure (Hall return, finish, Start Over): its saves leave
            // ParchLock the way a deleted Glk save does, transcript lines and per-save snapshots with them (Grok #3391 N3).
            // The debriefing after an adventure (plan section 6): ParchLock's own dialog, never the story text.
            // A character returned from an adventure the new package changed (UpdateRecall.cs): the plain message.
            if (data.event === "package-recall" && data.name && typeof Message !== "undefined") {
              try {
                var lines = JSON.parse(data.name), escape = function (t) { return typeof ParchLockQol !== "undefined" ? ParchLockQol.EscapeHtml(String(t)) : String(t); };
                Message.Show("Eamon Showcase Updated", lines.map(function (l) { return "<p>" + escape(l) + "</p>"; }).join(""));
              } catch (e) {}
            }
            if (data.event === "debrief" && data.name && typeof Message !== "undefined") {
              try {
                var d = JSON.parse(data.name), esc = function (t) { return typeof ParchLockQol !== "undefined" ? ParchLockQol.EscapeHtml(String(t)) : String(t); };
                var newCycle = d.credit === "credited, new game plus offered";
                var why = d.credit === "credited" || newCycle ? "Cleared, and credited to " + d.character + "."
                  : d.credit === "already cleared" ? "Cleared, but " + d.character + " already has the credit for this adventure in this cycle (each adventure counts once per cycle)."
                  : d.credit === "already credited" ? "Cleared, but this play-through was already credited."
                  : d.credit === "unbound run" ? "Cleared, but this play-through came from a save ParchLock cannot trace, so it earns no credit."
                  : d.die === 1 ? "Not a clear: " + d.character + " died."
                  : d.exitType === "StartOver" ? "Not a clear: the adventure was started over."
                  : d.exitType === "GoToMainHall" ? "Not a clear: the adventure was abandoned."
                  : d.exitType === "FinishAdventure" && d.quest === "false" ? "Not a clear: you returned, but the adventure was not completed."
                  : "Not a clear.";
                var lines = ["<b>" + esc(d.adventure) + "</b>", esc(why)];
                if (!d.character) lines.push(esc("(Another character is signed in now, so that adventurer's gold and rank are not shown.)"));
                if (d.bankBefore != null && d.bankAfter != null && d.bankBefore !== d.bankAfter) lines.push(esc("Bank: " + d.bankBefore + " before, " + d.bankAfter + " now."));
                if (d.goldBefore != null) {
                  var gained = d.goldAfter - d.goldBefore;
                  lines.push(esc("Gold: " + d.goldBefore + " before, " + d.goldAfter + " now (" + (gained >= 0 ? "+" : "") + gained + ")."));
                }
                if (d.rank) lines.push(esc("Guild rank: " + d.rank + "."));
                var then = d.replay ? " (at the time)" : "";
                if (newCycle) lines.push(esc("Every Showcase adventure is complete" + then + ". New Game+ is now offered on the Quest Board: accept it there to begin a new cycle in which each adventure can earn credit again. " + d.character + " keeps everything."));
                if (d.tierOpened) lines.push(esc("A new tier of adventures is open" + then + ": tier " + d.tierOpened + ", " + d.rank + "."));
                Message.Show("Debriefing", lines.join("<br>"));
              } catch (eDebrief) {}
            }
            if (data.event === "saves-deleted" && data.name && typeof Transcript !== "undefined" && Transcript.forgetSaves) {
              var prefix = data.name + ", slot ", names = Object.keys((Transcript.meta && Transcript.meta.saves) || {});
              var stateKey = typeof SaveState !== "undefined" ? SaveState.keyFor(SaveState.storyId(), "") : null;
              if (stateKey) for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(stateKey) === 0) names.push(k.slice(stateKey.length)); }
              names = names.filter(function (n, at) { return n.indexOf(prefix) === 0 && names.indexOf(n) === at; });
              if (names.length) Transcript.forgetSaves(names);
            }
            state.saves = (state.saves || []).concat(data.event + " " + data.name).slice(-20);
          } catch (e) {}
        });
      } else if (data.kind === "world") {
        try { state.world = data.json ? JSON.parse(data.json) : null; } catch (e) { state.world = null; }
        state.worldGeneration++;
      } else if (data.kind === "phase") {
        state.phase = data.detail;
      } else if (data.kind === "result") {
        if (String(data.value).indexOf("error") === 0) { state.events.push(data.value); fail(data.value); return; }
        commit.then(function () {
          if (ended) return;
          flush();
          ended = true;
          state.events.push(data.value);
          Glk.glk_put_jstring("\n[You have left the universe. Reopen the module to return to the Main Hall.]\n"); Glk.update();
        }, function () { /* Commit handler fails visibly, never reports a successful exit. */ });
      } else if (data.kind === "error") {
        fail(data.value);
      } else if (data.kind === "ready") state.ready = data;
    }

    vm.prepare = function (data, options) { vm.options = options; Glk = options.Glk; };
    vm.start = function () {
      mainwin = Glk.glk_window_open(0, 0, 0, 3, 201);
      Glk.glk_set_window(mainwin);
      if (!window.isSecureContext || !navigator.serviceWorker) { Glk.fatal_error("Eamon needs ParchLock opened from the app, the launcher or an https address."); return; }
      // The vendor Glk accepts one screen update per input event, so nothing is drawn until the
      // engine reaches its first prompt (request() below), and again only at each later prompt.
      var relayReady = null;
      navigator.serviceWorker.addEventListener("message", function (e) {
        if (!e.data) return;
        if (e.data.kind === "eamon-poll") post(e.data.id);
        if (e.data.kind === "eamon-pong" && relayReady) relayReady();
      });
      // The worker's input requests are answered by ParchLock's service worker, so a service worker that
      // carries the relay must control this page. Just after an app update the previous one may still be
      // in control for a moment; keep asking until the current one answers.
      new Promise(function (resolve) {
        relayReady = resolve;
        (function ping() {
          if (!relayReady) return;
          if (controller()) controller().postMessage({kind: "eamon-ping"});
          setTimeout(ping, 250);
        })();
      }).then(function () {
        relayReady = null;
        // An imported Showcase (story "local/<sha256>.eamon.js") runs from its installed package.
        var story = (typeof Global !== "undefined" && Global.GetUrlParameter) ? Global.GetUrlParameter("story") : null;
        var packageId = typeof EamonPackage !== "undefined" ? EamonPackage.idFromStory(story) : null;
        packageStamp = packageId || null;
        if (!packageId) return "";
        return EamonPackage.isInstalled(packageId).then(function (installed) {
          if (!installed) throw new Error("The Eamon Showcase is not installed on this device. Import it again from Modules.");
          return EamonPackage.baseUrl(packageId);
        });
      }).then(function (payloadBase) {
        worker = new Worker(BASE + "host-worker.js", {type: "module"});
        worker.onmessage = onWorker;
        worker.onerror = function (e) { fail(e.message || "the engine could not start."); };
        worker.postMessage({kind: "payload", base: payloadBase});
      }).catch(function (error) { fail(error && error.message ? error.message : String(error)); });
    };
    vm.init = function () { vm.start(); }; // the vendor Glk starts an engine through init

    // A refused campaign (a save format this Showcase cannot read): the player may keep a copy, then start a new campaign
    // (owner 2026-11-12, #3471 item 6). Export is offered first, in the same place; starting again permanently deletes the
    // old campaign and its characters, so it asks once more in plain words. Nothing is deleted without that answer.
    function offerFreshCampaign() {
      if (typeof Message === "undefined") return;
      var body = "<p>This Eamon campaign was saved in a format this version of the Showcase cannot read. Nothing on this device was changed.</p>"
        + "<p>You can keep a copy of it first, then start a new campaign.</p>"
        + "<p><button id='eamon-keep-copy'>Download Package</button> <button id='eamon-new-campaign'>Start a new campaign</button></p>"
        + "<p id='eamon-keep-result' role='status'></p>";
      try { Message.Show("Eamon Campaign", body, true); } catch (e) { return; }
      var keep = document.getElementById("eamon-keep-copy"), fresh = document.getElementById("eamon-new-campaign");
      var note = function (text) { var el = document.getElementById("eamon-keep-result"); if (el) el.textContent = text; };
      if (keep) keep.onclick = function () {
        // Never silent: a player must not believe a copy was kept when it was not (Grok #3479 F1).
        var failed = function (e) { note("The copy could not be made (" + (e && e.message || e) + "). Nothing was changed."); };
        try {
          var name = ParchLockQol.ExportFilename("Save package", undefined, "json");
          ParchLockQol.PackageWithTranscripts(ParchLock.GetSaveData()).then(function (data) {
            ParchLockQol.DownloadText(name, data);
            note("Copy saved as " + name + ".");
          }).catch(failed);
        } catch (e) { failed(e); }
      };
      if (fresh) fresh.onclick = function () {
        if (!window.confirm("Start a new Eamon campaign?\n\nThis permanently deletes the old campaign on this device: all its characters, their progress and their saved games. This cannot be undone. If you want a copy, choose Cancel and use Download Package first.")) return;
        db().then(function (d) {
          var tx = d.transaction(["files", "meta"], "readwrite", {durability: "strict"});
          tx.objectStore("files").clear();
          tx.objectStore("meta").clear();
          return new Promise(function (resolve, reject) { tx.oncomplete = resolve; tx.onerror = tx.onabort = function () { reject(tx.error); }; });
        }).then(function () {
          // The deleted saves take their transcripts and map snapshots with them (owner rule 8, Grok #3479 F2).
          var names = [];
          try {
            if (typeof Transcript !== "undefined" && Transcript.meta) names = Object.keys(Transcript.meta.saves || {});
            var prefix = typeof SaveState !== "undefined" ? SaveState.keyFor(SaveState.storyId(), "") : null;
            if (prefix) for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(prefix) === 0) names.push(k.slice(prefix.length)); }
          } catch (e) {}
          names = names.filter(function (n, at) { return names.indexOf(n) === at; });
          var forget = names.length && typeof Transcript !== "undefined" && Transcript.forgetSaves ? Transcript.forgetSaves(names) : null;
          return Promise.resolve(forget).catch(function () {});
        }).then(function () { location.reload(); }, function (e) { try { Message.Show("Eamon Campaign", "The old campaign could not be removed (" + String(e) + "); nothing was changed.", true); } catch (e2) {} });
      };
    }
    vm.resume = function () {
      if (ended) return;
      var type = event.get_field(0);
      trace("resume type " + type + " pending " + (pending ? pending.id : "none"));
      if (type === 2 && pending) {
        var code = event.get_field(2);
        answer(code === 0xfffffffa ? "\n" : code > 0xffffff00 ? " " : String.fromCodePoint(code));
      } else if (type === 3 && pending) {
        var text = String.fromCharCode.apply(null, linebuf.slice(0, event.get_field(2)));
        expectEcho = text;
        answer(text);
      } else wait();
    };
    vm.get_signature = function () { return "eamon-cs-3.1.0"; };
    vm.campaignSchema = SCHEMA;

    /* The whole campaign (every saved engine file: characters, adventure save slots, config) travels with
       ParchLock's save packages, as one unit: Eamon's slots are tied to its own fileset table, so single
       slots are never exported or deleted on their own (Grok #3388, option b). */
    function toBase64(bytes) { var s = ""; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
    function fromBase64(text) { var s = atob(text), out = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
    vm.exportCampaign = function () {
      return commit.then(loadSaved).then(function (saved) {
        return { version: 1, launch: saved.launch, revision: saved.revision, stamp: saved.stamp, schema: saved.schema, fingerprints: saved.fingerprints,
          files: saved.files.map(function (f) { return f.deleted ? { path: f.path, deleted: true } : { path: f.path, data: toBase64(new Uint8Array(f.bytes)) }; }) };
      });
    };
    // Only the shape of file the engine itself writes: a .DAT data file directly in an adventure folder or in
    // System/Bin (characters, configs, save slots). No other path, separator, dot segment or drive (Grok #3392 V1).
    var CAMPAIGN_PATH = /^(Adventures\/[A-Za-z0-9_-]{1,64}|System\/Bin)\/[A-Za-z0-9_-]{1,64}\.DAT$/i;
    // The engine's own command-line options (upstream Program.cs / transfer protocol); -wd names the Main Hall
    // folder (".") or an adventure folder, so the engine never works outside the campaign file set (Grok #3394 R2).
    var LAUNCH_OPTIONS = ["-pfn", "-wd", "-fp", "-cfgfn", "-chrnm", "-im", "-dv", "-esrm", "-dgs", "-fsfn", "-chrfn", "-cafn",
      "-efn", "-afn", "-hfn", "-gsfn", "-modfn", "-monfn", "-rfn", "-rge"];
    vm.validCampaignLaunch = function (launch) {
      if (launch == null) return true;
      if (!Array.isArray(launch) || launch.length < 2 || launch.length > 24 || launch[0] !== "-pfn" || !/^[A-Za-z0-9_.]{1,64}\.dll$/i.test(String(launch[1]))) return false;
      return launch.every(function (a, i) {
        if (typeof a !== "string" || a.length > 260 || /[\u0000-\u001f]/.test(a)) return false;
        var option = i > 0 && launch[i - 1];
        if (option === "-wd") return /^(\.|\.\.\/\.\.\/Adventures\/[A-Za-z0-9_-]{1,64})$/.test(a);
        if (option === "-chrnm") return true;          // a character name is free text
        return a.charAt(0) !== "-" || LAUNCH_OPTIONS.indexOf(a.toLowerCase()) >= 0;
      });
    };
    vm.validCampaign = function (c) {
      return !!c && c.version === 1 && Array.isArray(c.files) && c.files.length <= 4096 && vm.validCampaignLaunch(c.launch)
        && (c.revision == null || (Number.isSafeInteger(c.revision) && c.revision >= 0))
        && (c.stamp == null || (typeof c.stamp === "string" && /^[0-9a-f]{64}$/.test(c.stamp)))
        && (c.schema == null || Number.isSafeInteger(c.schema))
        && (c.fingerprints == null || (typeof c.fingerprints === "object" && !Array.isArray(c.fingerprints) && Object.keys(c.fingerprints).length <= 256
          && Object.keys(c.fingerprints).every(function (k) { return /^[A-Za-z0-9_-]{1,64}$/.test(k) && /^[0-9a-f]{64}$/.test(String(c.fingerprints[k])); })))
        && c.files.every(function (f) {
          return f && typeof f.path === "string" && CAMPAIGN_PATH.test(f.path) && (f.deleted === true || (typeof f.data === "string" && f.data.length < 64 * 1024 * 1024));
        });
    };
    vm.campaignFileCount = function (c) { return c && Array.isArray(c.files) ? c.files.filter(function (f) { return !f.deleted; }).length : 0; };
    vm.importCampaign = function (c) {
      if (!vm.validCampaign(c)) return Promise.reject(new Error("The package's Eamon campaign is not valid."));
      // The running engine stops first: no later safe-point commit may land over the imported files.
      ended = true; pending = null; answers = {};
      if (worker) worker.terminate();
      return commit.catch(function () {}).then(db).then(function (d) {
        var tx = d.transaction(["files", "meta"], "readwrite", {durability: "strict"});
        tx.objectStore("files").clear();
        c.files.forEach(function (f) { tx.objectStore("files").put(f.deleted ? { path: f.path, deleted: true } : { path: f.path, bytes: fromBase64(f.data) }); });
        tx.objectStore("meta").put({ key: "state", launch: Array.isArray(c.launch) ? c.launch.slice() : null, revision: Number(c.revision) || 0, stamp: c.stamp || null, schema: c.schema != null ? c.schema : null, fingerprints: c.fingerprints || null, time: Date.now() });
        return new Promise(function (resolve, reject) { tx.oncomplete = resolve; tx.onerror = tx.onabort = function () { reject(tx.error); }; });
      });
    };
    try { window.__PARCHLOCK_EAMON__ = vm; } catch (e) {}
  }

  /* The registry the vendor Glk expects from an engine's dispatch layer. */
  function EamonDispatch() {
    this.class_map = {fileref: {}, stream: {}, window: {}};
    this.last_used_id = 101;
  }
  EamonDispatch.prototype = {
    check_autosave: function () { return false; },
    class_obj_from_id: function (clas, id) { return this.class_map[clas][id]; },
    class_obj_to_id: function (clas, obj) { return obj ? obj.disprock : 0; },
    class_register: function (clas, obj, usedisprock) {
      if (usedisprock) {
        if (obj.disprock !== usedisprock) throw new Error("class_register: object is not already registered");
        if (this.last_used_id <= usedisprock) this.last_used_id = usedisprock + 1;
      } else {
        if (obj.disprock) throw new Error("class_register: object is already registered");
        obj.disprock = this.last_used_id++;
      }
      this.class_map[clas][obj.disprock] = obj;
    },
    class_unregister: function (clas, obj) {
      if (!obj.disprock || this.class_map[clas][obj.disprock] == null) throw new Error("class_unregister: object is not registered");
      delete this.class_map[clas][obj.disprock];
      obj.disprock = null;
    },
    get_retained_array: function (arr) { return {arg: null, arr: arr.slice(), len: arr.length}; },
    prepare_resume: function () {},
    retain_array: function () {},
    set_vm: function (vm) { this.vm = vm; },
    unretain_array: function () {}
  };

  window.ZVM = EamonVM;
  window.ZVMDispatch = EamonDispatch;
})();
