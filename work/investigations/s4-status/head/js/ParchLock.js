var ParchLock = {

    GameFilename: "",
    StoryPath: "",
    GameId: "",
    LoopReference: null,
    ContentHeight: 0,
    ContentLength: 0,
    ScrollInit: false,
    MapAutoHidden: false,
    DialogWasOpen: false,
    // Story-ended detection (glk_exit / disable with no further LineInput).
    _everHadGlkInput: false,
    _noInputStreak: 0,
    _storyEndedOffered: false,

    Init: () => {

        Global.LoadPrefs();
        // D117 audit fix (codex): DirectionalRadial.Init() self-invokes at
        // DOMContentLoaded and calls ApplyEnabledState() at THAT point --
        // which can run before Global.LoadPrefs() above has overlaid the
        // real saved Prefs (script-load/event-timing race, not guaranteed
        // ordering). A disabled preference could then be silently ignored
        // until some later, unrelated refresh happened to call
        // ApplyEnabledState() again. Re-applying it here, immediately after
        // LoadPrefs() is guaranteed to have run, closes that race for good
        // regardless of script/event ordering elsewhere.
        try { if (typeof DirectionalRadial !== "undefined") DirectionalRadial.ApplyEnabledState(); } catch (e) {}
        ProductInfo.applyDocumentIdentity();
        ModuleLibrary.init();
        ParchLock.SetTitle();
        ParchLock.GameId = localStorage.getItem("PL_GameId_" + ParchLock.GameFilename) || "";
        ParchLock.ResolveSaveIdentity();
        Message.Init();
        Input.BindKeyboard();
        Input.BindInputRow();
        // Remember last story for APK/cold-start resume (no story in URL).
        try {
            if (ParchLock.StoryPath && ModuleLibrary.find(ParchLock.StoryPath)) {
                localStorage.setItem(ModuleLibrary.legacy.lastStory, ParchLock.StoryPath);
            }
        } catch (eLS) {}
        ParchLock.EnsureStoryOrRecover();

        setTimeout(() => {

            ParchLock.SetupUI();
            if (typeof WorldModel !== "undefined") WorldModel.tick();
		if (typeof TranslatorUI !== "undefined") TranslatorUI.tick();
		if (typeof GraphicsDock !== "undefined") { try { GraphicsDock.detect(); } catch (e) {} }
		if (typeof MapBeautify !== "undefined") { try { MapBeautify.tick(); } catch (e) {} } // init-payload
            if (Global.GetUrlParameter("story")) {
                // Clear any leftover no-story recovery from a prior bad session
                // so a second open of the same story is not blocked.
                try {
                    document.body.classList.remove("no-story");
                    var ss = document.getElementById("start-screen");
                    if (ss) { ss.hidden = true; }
                    // D96: the first-launch Help popup is opened synchronously by Message.Init, before this
                    // timer; clearing app-dialog-open under it left Menu/mic/submit live behind an open dialog.
                    if (!(typeof Message !== "undefined" && Message.IsOpen)) $("body").removeClass("radial-open app-dialog-open");
                    else $("body").removeClass("radial-open");
                    $("#radial-menu").removeClass("show pl-tools-list");
                } catch (eClr) {}
                ParchLock.Loop();
            }

        }, 100);

        $(window).on("resize", function () { if (typeof WorkspaceUI !== "undefined") WorkspaceUI.UpdateGrid(); });

        /*
        var saveHash = localStorage.getItem("PL_Save_" + ParchLock.GameFilename);
        if (saveHash) location.hash = saveHash;
        */

        /*
        window.onerror = function(error, url, line) {

            Message.Show("A wild error has appeared!", "Looks like something went wrong, here is what we know:<br><br>" + error);
        };
        */
    },

    // Match the bundled interpreters' save namespaces from the immutable
    // executable image, before any native save dialog has been opened.
    ResolveSaveIdentity: () => {
        if (!ParchLock.StoryPath || typeof ModuleLibrary === "undefined") return;
        var path = ParchLock.StoryPath;
        function apply(identity) {
            if (ParchLock.StoryPath !== path || !identity || !identity.header) return;
            var h = identity.header, length = 0;
            if (h[0] >= 1 && h[0] <= 8) length = 30; // ZVM origram[0..29]
            else if (h[0] === 71 && h[1] === 108 && h[2] === 117 && h[3] === 108) length = 64; // Quixe image[0..63]
            if (!length || h.length < length) return;
            var id = h.slice(0, length).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
            ParchLock.GameId = id;
            ParchLock._saveIdentityPath = path;
            try { localStorage.setItem("PL_GameId_" + ParchLock.GameFilename, id); } catch (e) {}
        }
        if (ModuleLibrary.currentExecutableIdentity) apply(ModuleLibrary.currentExecutableIdentity(path));
        if (ModuleLibrary.whenExecutableIdentityReady) {
            ModuleLibrary.whenExecutableIdentityReady(path).then(apply).catch(function () {});
        }
    },

    // Cached by BufferRevision; falls back to a direct read if it is absent.
    BufferText: (key) => typeof BufferRevision !== "undefined" ? BufferRevision.text(key) : $(key).text(),

    Loop: () => {
        // Init can precede the engine's AJAX request; retry until the image
        // actually exists, including when an old persisted ID was present.
        if (ParchLock._saveIdentityPath !== ParchLock.StoryPath) ParchLock.ResolveSaveIdentity();

        clearTimeout(ParchLock.LoopReference);

        if (!ParchLock.ScrollInit && ParchLock.BufferText("#windowport .BufferWindow").length > 0) {

            ParchLock.ScrollInit = true;
            
            // new SimpleBar($('#windowport .BufferWindow')[0]);
        }

        Input.Process();
        ParchLock.AutoScrollOnOutput();
        ParchLock.CheckNativeDialog();
        // D93: line vs char prompts are different Glk modes. LineInput is
        // free-text (keyboard OK when user focuses it). CharInput is
        // "press any key" / Y-N -- soft keyboard should stay closed; the
        // host submit arrow completes the prompt (Input.SubmitPrompt).
        var lineReady = $(".Input.LineInput:visible").length > 0;
        var charReady = $(".Input.CharInput:visible").length > 0;
        $("body").toggleClass("has-line-input", lineReady);
        $("body").toggleClass("has-char-input", charReady);
        try {
            if (typeof Input !== "undefined" && Input.SyncMobilePromptFocus) {
                Input.SyncMobilePromptFocus(lineReady, charReady);
            }
        } catch (eFocus) {}
        try { ParchLock.CheckStoryEnded(lineReady, charReady); } catch (eEnded) {}
        // Opening the map resizes the story window. Wait until any startup
        // question is answered: a resize there can make a game withdraw its
        // prompt for good (CosmoServe's opening Y/N question does).
        var startupQuestion = typeof StatTracker !== "undefined" && StatTracker.hasQuestionPrompt && StatTracker.hasQuestionPrompt();
        if (lineReady && ParchLockMap.AutoOpenPending && !Message.IsOpen && !startupQuestion) { ParchLockMap.AutoOpenPending = false; ParchLockMap.Show(); }
        ParchLock.ScrollToBottom();

        // if (Global.Prefs.MapAnimation) ParchLockMap.Draw(ParchLockMap.DisplayedRoom);

        var contentLength = ParchLock.BufferText("#windowport .BufferWindow").length;
        if (contentLength != ParchLock.ContentLength) {

            ParchLock.ContentLength = contentLength;
            Autocomplete.UpdateWords();
            ParchLock.GetRoom();
        }
        Actionable.Refresh();
        WorkspaceUI.UpdateGrid();
        if (typeof WorldModel !== "undefined") WorldModel.tick();
        if (typeof TranslatorUI !== "undefined" && TranslatorUI.tick) TranslatorUI.tick();
        if (typeof UndoRestoreSync !== "undefined") UndoRestoreSync.tick();

        ParchLock.LoopReference = setTimeout(ParchLock.Loop, 200);
    },

    // Detect sustained Glk end-of-story (no enabled Line/Char input after the
    // player had been prompting). Does not intercept RESTART/RESTORE/QUIT text;
    // those still go to the story. Once Glk has exited and cleared input, offer
    // WorkspaceUI.OfferStoryEnded once.
    CheckStoryEnded: (lineReady, charReady) => {
        try {
            if (typeof WorkspaceUI === "undefined" || !WorkspaceUI.HasStory || !WorkspaceUI.HasStory()) return;
            // Disabled inputs (Glk disable / specialinput) are not playable prompts.
            var liveLine = $(".Input.LineInput:visible:not(:disabled)").length > 0;
            var liveChar = $(".Input.CharInput:visible:not(:disabled)").length > 0;
            if (liveLine || liveChar) {
                ParchLock._everHadGlkInput = true;
                ParchLock._noInputStreak = 0;
                return;
            }
            // No enabled prompt. A visible-but-disabled husk (Glk disable) is still
            // "ended" once specialinput dialogs are ruled out below -- do not treat
            // lineReady/charReady (which count disabled fields) as still playing.
            if (!ParchLock._everHadGlkInput || ParchLock._storyEndedOffered) return;
            // Only a real Glk exit ends the story. A game can withdraw its
            // input without exiting (CosmoServe cancels its opening Y/N
            // request when the window is resized); that is not an ending.
            if (typeof RemGlkTapProvider !== "undefined" && RemGlkTapProvider.installed && !RemGlkTapProvider.exited) {
                ParchLock._noInputStreak = 0;
                return;
            }
            if (typeof Message !== "undefined" && Message.IsOpen) {
                ParchLock._noInputStreak = 0;
                return;
            }
            if ($("#dialog, #dialog_screen, #dialog_frame").length) {
                ParchLock._noInputStreak = 0;
                return;
            }
            if (document.body.classList.contains("no-story")) return;
            if (document.documentElement.classList.contains("parchlock-splash-pending")) return;
            var loading = document.getElementById("loadingpane");
            if (loading && $(loading).is(":visible")) {
                ParchLock._noInputStreak = 0;
                return;
            }
            ParchLock._noInputStreak = (ParchLock._noInputStreak || 0) + 1;
            // ~800ms at the 200ms Loop cadence -- long enough to skip mid-update flicker.
            if (ParchLock._noInputStreak < 4) return;
            ParchLock._storyEndedOffered = true;
            if (WorkspaceUI.OfferStoryEnded) WorkspaceUI.OfferStoryEnded();
        } catch (e) {}
    },

    CheckNativeDialog: () => {

        var dialogOpen = $("#dialog, #dialog_screen, #dialog_frame").length > 0;
        $("body").toggleClass("native-dialog-open", dialogOpen);
        if (dialogOpen) $("#dialog_display").text("Preview Data").attr("title", "Preview the stored file contents");
        if (dialogOpen && ParchLock.GameId) localStorage.setItem("PL_GameId_" + ParchLock.GameFilename, ParchLock.GameId);

        if (dialogOpen && !ParchLock.DialogWasOpen) ParchLock.HandleOverlayOpened();
        if (!dialogOpen && ParchLock.DialogWasOpen) ParchLock.HandleOverlayClosed();

        ParchLock.DialogWasOpen = dialogOpen;
    },

    HandleOverlayOpened: () => {

        try { if (typeof CharKeys !== "undefined") CharKeys.onOverlay(); } catch (eCk) {}

        if ($("body").hasClass("map-open")) {

            ParchLock.MapAutoHidden = true;
            ParchLockMap.Hide();
        }
    },

    HandleOverlayClosed: () => {

        setTimeout(() => {

            var overlayOpen = Message.IsOpen || $("#dialog, #dialog_screen, #dialog_frame").length > 0;
            if (!overlayOpen && ParchLock.MapAutoHidden) {

                ParchLock.MapAutoHidden = false;
                ParchLockMap.Show();
            }
        }, 50);
    },

    SetupUI: () => {

        $("#map footer").text(ProductInfo.buildLabel(BUILD));
        $("#map #info-hide").click(ParchLock.HideInfo);
        $("#toggle-crt").click(ParchLock.ToggleCRT);
        $("#toggle-map-anim").click(ParchLock.ToggleMapAnim);
        $("#toggle-show-info").click(ParchLock.ToggleShowInfo);
        $("#control-panel .inject").click(ParchLock.InjectButtonClicked);
        $("#import-export").click(ParchLockQol.ShowSaveManager);
        $("#start-modules").off("click.plModules").on("click.plModules", ModuleLibrary.openManager);

        ParchLockMap.Build();
        ParchLockMap.Load();
        ParchLockQol.Init();
        Actionable.Init();
        WorkspaceUI.Init();
        new MutationObserver(ParchLock.CheckNativeDialog).observe(document.getElementById("windowport"), { childList: true });
    },

    ToggleMapAnim: (e) => {

        if (e) Global.Prefs.MapAnimation = !Global.Prefs.MapAnimation;

        if (Global.Prefs.MapAnimation) 
            $("#toggle-map-anim").addClass("on");
        else
            $("#toggle-map-anim").removeClass("on");

        Global.SavePrefs();
    },

    ToggleShowInfo: (e) => {

        if (e) Global.Prefs.ShowInfoOnStart = !Global.Prefs.ShowInfoOnStart;

        if (Global.Prefs.ShowInfoOnStart) 
            $("#toggle-show-info").addClass("on");
        else
            $("#toggle-show-info").removeClass("on");

        Global.SavePrefs();
    },

    SetTitle: () => {

        var story = new URLSearchParams(window.location.search).get("story");
        ParchLock.StoryPath = story ? ModuleLibrary.normalizePath(story) : "";
        ParchLock.GameFilename = "";
        if (ParchLock.StoryPath) ParchLock.GameFilename = ParchLock.StoryPath.indexOf("games/") === 0
            ? ParchLock.StoryPath.slice(6)
            : ParchLock.StoryPath;
        var game = ModuleLibrary.find(ParchLock.StoryPath);

        if (game) {
            
            $("#map h1").text(game.Title);

            $("#loadingpane > div").text("Loading " + game.Title + "...");

            if (game.Subtitle) $("#map h2").text(game.Subtitle);
            if (game.Author) $("#map h3").text("By " + game.Author);

            $("title").text(game.Title + " - " + ProductInfo.displayName);
        }
        else {
            
            $("#map h1").text(ProductInfo.displayName);
        }
    },

    // play.html with no ?story= used to show Tools/Menu on a black pane
    // (APK cold start / bad resume). Show recovery UI and optional last story.
    EnsureStoryOrRecover: () => {
        try {
            var story = new URLSearchParams(window.location.search).get("story");
            var installed = story && ModuleLibrary.find(story);
            if (installed) {
                document.body.classList.remove("no-story");
                var ss = document.getElementById("start-screen");
                if (ss) ss.hidden = true;
                return;
            }
            // Desktop cold start belongs in the existing library, not a
            // second chooser. Direct story links and native recovery stay put.
            var nativeApp = window.Capacitor && window.Capacitor.isNativePlatform
                && window.Capacitor.isNativePlatform();
            if (!story && !nativeApp && typeof MobileLayout !== "undefined" && !MobileLayout.isCompact()) {
                location.replace("index.html");
                return;
            }
            document.body.classList.add("no-story");
            var el = document.getElementById("start-screen");
            if (!el) return;
            el.hidden = false;
            var last = "";
            try { last = localStorage.getItem("PL_LastStory") || ""; } catch (e) {}
            var html = "<h1>" + ProductInfo.displayName + "</h1>";
            var lastModule = last ? ModuleLibrary.find(last) : null;
            // codex audit (bus #786, blocker 1): these were real <a href>
            // anchors, which Global.BindNavigationGuard unconditionally
            // blocks (every relative-anchor click, everywhere, by design --
            // D113). That guard's own comment already documents the
            // established exemption: this app's two intentional whole-app
            // exits (Choose story / Exit game in js/WorkspaceUI.js) are
            // real <button>s doing a programmatic `location.href` assignment,
            // never an <a> click. Continue/Choose-a-story here now follow
            // that exact same convention instead of diverging from it or
            // adding a second, parallel exemption mechanism to the guard.
            if (lastModule) {
                html += "<p>Continue " + $("<div>").text(lastModule.Title || "your last story").html() + "?</p>";
                html += "<button id='start-continue' class='pl-primary' type='button'>Continue</button>";
            } else {
                html += story ? "<p>That module is no longer installed.</p>" : "<p>No story is loaded.</p>";
            }
            html += "<button id='start-modules' class='pl-secondary' type='button'>Manage modules</button>";
            html += "<button id='start-choose' class='pl-secondary' type='button'>Choose a story</button>";
            el.innerHTML = html;
            $("#start-modules").off("click.plModules").on("click.plModules", ModuleLibrary.openManager);
            if (lastModule) {
                $("#start-continue").off("click.plContinue").on("click.plContinue", function () {
                    location.href = "play.html?story=" + encodeURIComponent(lastModule.Path);
                });
            }
            $("#start-choose").off("click.plChoose").on("click.plChoose", function () {
                location.href = "index.html";
            });
        } catch (e) {}
    },

    // Intentionally a no-op. The timed "Story did not load" overlay false-
    // positivized on live Anchorhead after exit/re-enter (operator). Cold
    // start without ?story= still uses EnsureStoryOrRecover only.
    CheckStoryLoadHealth: () => {},

    // D167 (operator request): scroll to new output as it arrives, and where
    // possible put the START of that output at the top of the view rather than
    // its end -- a long room description should be read from its first line,
    // not joined halfway down.
    //
    // The trick is that the height of the buffer BEFORE the new text arrived is
    // exactly the offset at which that text begins. Scrolling there puts the
    // first new line at the top. When the addition is short the target clamps
    // to the bottom, so a one-line reply still behaves like an ordinary scroll.
    _lastBufferHeight: 0,
    // D167: the story's scrolling element is the Glk buffer window itself
    // (`.BufferWindow`), NOT "#parchment .simplebar-content-wrapper" -- that
    // selector matches nothing in the current layout, which is why
    // ScrollToBottom below has quietly been a no-op. Resolved once, here, so
    // both callers agree, with the old selector kept as a fallback in case a
    // layout that does use SimpleBar comes back.
    StoryScroller: () => {
        try {
            var w = document.querySelector("#windowport .BufferWindow");
            if (w && w.scrollHeight > w.clientHeight) return w;
            var sb = document.querySelector("#parchment .simplebar-content-wrapper");
            if (sb) return sb;
            return w || null;
        } catch (e) { return null; }
    },

    AutoScrollOnOutput: () => {
        try {
            if (typeof Global !== "undefined" && Global.Prefs
                && Global.Prefs.AutoScrollOnOutput === false) {
                // Still track the height so turning the option back on does not
                // treat the whole backlog as newly arrived.
                var w0 = ParchLock.StoryScroller();
                if (w0) ParchLock._lastBufferHeight = w0.scrollHeight;
                return;
            }
            var w = ParchLock.StoryScroller();
            if (!w) return;
            var prev = ParchLock._lastBufferHeight || 0;
            var now = w.scrollHeight;
            if (now <= prev) { ParchLock._lastBufferHeight = now; return; }
            ParchLock._lastBufferHeight = now;
            if (!prev) return;                       // first paint: nothing to follow
            var maxTop = Math.max(0, now - w.clientHeight);
            // A few pixels of the previous line are left showing so the break
            // between turns is visible rather than flush against the band.
            var startOfNew = Math.max(0, prev - 24);
            w.scrollTop = Math.min(startOfNew, maxTop);
        } catch (e) {}
    },

    ScrollToBottom: () => {

        // D167: resolved through StoryScroller now -- the hardcoded SimpleBar
        // selector matches nothing in the current layout, so this had stopped
        // doing anything at all (including after a restore, where
        // UndoRestoreSync calls it precisely to bring the restored room into
        // view).
        var p = ParchLock.StoryScroller();

        if (p) {

            if (p.scrollHeight != ParchLock.ContentHeight) {

                ParchLock.ContentHeight = p.scrollHeight;
                p.scrollTop = p.scrollHeight;
            }
        }
    },

    GetRoom: () => {

        if (!$(".Input.LineInput").is(":visible")) return;

        try {
            if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
            var p = WorldModel && WorldModel.lastPayload;
            var structural = p && p.probe && p.probe.status === "z-ram-live" && p.roomName;
            /* D24: identity only. Room-graph entry is MapTopology.tick(payload) via TranslatorUI.tick. */
            if (structural && typeof ParchLockMap !== "undefined") {
                var roomName = ParchLock.CleanRoomName(p.roomName);
                // D74: resolve through MapTopology's real-id-first identity
                // before setting CurrentRoom, same as every other write
                // site -- a raw cleaned name can still be a fresh,
                // re-randomized reading for a game like wump2ka.z5.js.
                if (roomName) {
                    var cleanedPayload = Object.assign({}, p, { roomName: roomName });
                    ParchLockMap.CurrentRoom = (typeof MapTopology !== "undefined" && MapTopology.resolveCurrentRoomName)
                        ? MapTopology.resolveCurrentRoomName(cleanedPayload)
                        : roomName;
                }
            }
        } catch (e) {}
    },

    CleanRoomName: (roomName) => {

        roomName = (roomName || "").replace(/\u00a0/g, " ").trim();
        roomName = roomName.replace(/[.,;:\s]+$/g, "").trim();

        if (!roomName || roomName.length < 2 || roomName.length > 80) return "";
        if (!/[a-z0-9]/i.test(roomName)) return "";
        if (/^[.\-_* ]+$/.test(roomName)) return "";
        if (roomName.toLowerCase() == APPNAME.toLowerCase()) return "";

        return roomName;
    },

    InjectButtonClicked: function() {

        var inject = $(this).data("inject");
        if (inject) {
         
            Input.Clear();
            Input.Inject(inject, true);
        }
    },

    ImportExport: () => {

        if (!ParchLock.GameId) {

            Input.Clear();
            Input.Inject("restore", true);

            $("#dialog_buttonrow #dialog_cancel").trigger("click");

            ParchLock.ImportExport();
            return;
        }

        var title = "Import\\Export";

        var body = "On this screen you'll be able to grab your saved game and map data and transfer them by e-mail to be later imported on another computer, and you'll be able to import saved game and map data previously exported.";
        body += "<h3>What would you like to do today?</h3>";
        
        body += "<button id='button-import' class='large-button' style='margin-right: 20px'>Import</button>";
        body += "<button id='button-export' class='large-button'>Export</button>";

        Message.Show(title, body);

        $("#button-import").unbind().click(ParchLock.Import);
        $("#button-export").unbind().click(ParchLock.Export);
    },

    Import: () => {

        var title = "Import";

        body = "<h3>How to Import</h3>"

        body += "<ol><li>Paste the entire text you've copied in a previous export operation into the box below.</li>";
        body += "<li>Click <span class='code'>Import</span>.</li>";
        body += "<li>The restore game screen will automatically display.</li>";
        body += "<li>Select your newly imported saved game, the map will also be updated.</li></ol>";

        body += "<textarea id='the-box'></textarea>";

        body += "<button id='button-import' class='large-button'>Import</button>";

        Message.Show(title, body, true);

        $("#button-import").unbind().click(ParchLock.ImportData);

    },

    ImportData: () => {

        ParchLockQol.ImportPackageData($("#the-box").val());
    },

    Export: () => {

        var title = "Export";

        body = "<h3>How to Export</h3>"

        body += "<ol><li>Click inside the box below to automatically select all text.</li>";
        body += "<li>Press <span class='code'>CTRL+C</span> to copy the text to your clipboard.</li>";
        body += "<li>Paste the text in an e-mail message or any other way you can think of to transfer text.</li>";
        body += "<li>Click <span class='code'>Import\\Export</span> in the PC you wish to import to and follow the instructions.</li></ol>";

        body += "<textarea id='the-box' onclick='this.focus();this.select()'></textarea>";

        setTimeout(() => {

            $("#the-box").val(ParchLock.GetSaveData());

        }, 100);

        Message.Show(title, body, true);
    },

    GetSaveData: () => {

        var s = [];

        Object.keys(localStorage).forEach(k => {

            if (ParchLock.GameId && /^(dirent|content):/.test(k) && k.split(":")[2] === ParchLock.GameId) {

                s.push({Key: k, Data: localStorage.getItem(k)});
            }

        });

        var o = {

            Story: ParchLock.GameFilename,
            Map: ParchLockMap.Rooms,
            Save: s
        };

        return JSON.stringify(o);
    }
}

$(document).ready(ParchLock.Init);

