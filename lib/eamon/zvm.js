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
        return {files: r[0], launch: r[1] ? r[1].launch : null, revision: r[1] ? r[1].revision : 0};
      });
    });
  }
  function store(data, base) {
    return db().then(function (d) {
      var tx = d.transaction(["files", "meta"], "readwrite", {durability: "strict"});
      data.puts.forEach(function (file) { tx.objectStore("files").put(file); });
      data.deletes.forEach(function (path) { tx.objectStore("files").put({path: path, deleted: true}); });
      tx.objectStore("meta").put({key: "state", launch: data.launch, revision: base + data.revision, time: Date.now()});
      return new Promise(function (resolve, reject) { tx.oncomplete = resolve; tx.onerror = tx.onabort = function () { reject(tx.error); }; });
    });
  }

  function EamonVM() {
    var vm = this, Glk = null, mainwin = null, event = null, worker = null;
    var screen = "", emitted = 0, expectEcho = null, linebuf = null;
    var pending = null, answers = {}, commit = Promise.resolve(), baseRevision = 0, ended = false, failed = false;
    var state = vm.state = {phase: null, restored: null, commits: 0, pendingCommits: 0, prompts: 0, safePrompts: 0, commitError: null, turns: [], events: [], lastSent: 0};
    vm.isEamon = true;

    function controller() { return navigator.serviceWorker && navigator.serviceWorker.controller; }
    function post(id) {
      var answer = answers[String(id)];
      if (answer && controller()) controller().postMessage({kind: "eamon-answer", id: id, value: answer.value, cancel: answer.cancel});
    }
    function answer(value, cancel) {
      if (!pending) return;
      var id = pending.id;
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
      if (text) Glk.glk_put_jstring(text.replace(/\r\n/g, "\n"));
    }
    function wait() { event = new Glk.RefStruct(); Glk.glk_select(event); Glk.update(); }
    function request(read) {
      pending = read;
      state.prompts++; if (read.safePoint) state.safePrompts++;
      if (state.lastSent) { state.turns.push(Math.round(performance.now() - state.lastSent)); state.lastSent = 0; }
      flush();
      // Single-key prompts (menus, yes/no, "press any key") stay single-key, as in the original.
      if (read.type === "key" || read.size <= 1) Glk.glk_request_char_event_uni(mainwin);
      else { linebuf = new Array(Math.min(read.size, 255)).fill(0); Glk.glk_request_line_event_uni(mainwin, linebuf, 0); }
      wait();
    }
    function fail(message) {
      if (failed) return;
      failed = true;
      ended = true;
      pending = null;
      answers = {};
      if (worker) worker.terminate();
      try { flush(); } catch (e) {}
      Glk.fatal_error("Eamon: " + message);
    }

    function onWorker(message) {
      if (ended) return;
      var data = message.data;
      if (data.kind === "hello") {
        loadSaved().then(function (saved) {
          state.restored = {files: saved.files.length, launch: saved.launch, revision: saved.revision};
          baseRevision = saved.revision;
          worker.postMessage({kind: "boot", files: saved.files, launch: saved.launch});
        }, function (error) { fail("saved progress could not be read (" + error + ")."); });
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
        answers = {};
        request(data);
      } else if (data.kind === "phase") {
        state.phase = data.detail;
      } else if (data.kind === "result") {
        flush();
        ended = true;
        state.events.push(data.value);
        if (String(data.value).indexOf("error") === 0) Glk.fatal_error("Eamon: " + data.value);
        else { Glk.glk_put_jstring("\n[You have left the universe. Reopen the module to return to the Main Hall.]\n"); Glk.update(); }
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
        worker = new Worker(BASE + "host-worker.js", {type: "module"});
        worker.onmessage = onWorker;
        worker.onerror = function (e) { fail(e.message || "the engine could not start."); };
      });
    };
    vm.init = function () { vm.start(); }; // the vendor Glk starts an engine through init
    vm.resume = function () {
      if (ended) return;
      var type = event.get_field(0);
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
