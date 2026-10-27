/* Tutorial (D124) -- the LIVE tour, restored.
 *
 * D120 replaced the original live tour with a separate, non-live route
 * (tutorial.html) that rebuilt imitation versions of the library, the play
 * screen and the map and asked the player to perform tasks against those
 * fakes. The operator rejected it outright. This is the full conversion back
 * to the D103 style -- cards drawn over the REAL running app, explaining the
 * real screens -- with three deliberate changes:
 *
 *   1. No interactivity whatsoever. The old tour still asked for gestures.
 *      This one is information only: Back / Next / Skip. While it runs the
 *      app underneath is inert (body.pl-tutorial), so a highlighted control
 *      is explained but cannot be operated, and the player cannot wander
 *      off-script.
 *   2. Every step is read aloud through the existing ReadAloud.speak().
 *   3. It opens by saying what ParchLock actually is, by name.
 *
 * It covers everything added since D103: the D121 top exits band, the D122
 * equipment sheet, the D123 text-size default, notes/search, read-aloud and
 * real file export.
 *
 * Because it explains the live system, it needs a real module loaded -- so it
 * runs on play.html after the player picks a story from the normal library,
 * not as a route that pre-empts the library (js/MainMenu.js no longer
 * redirects). On finish the module is restarted so play begins fresh.
 */
var Tutorial = {

    _step: 0,
    _active: false,
    _bound: false,
    _prevSheet: null,
    _page: null,

    // target: a selector for a REAL element to spotlight, or null for a
    // centred card. sheet: open this real sheet first ("map"/"equipment").
    // Any step whose target is absent at runtime degrades to a centred card
    // rather than spotlighting empty space.
    // D130 (operator): the tour used to start on play.html only, which meant
    // the player met the module library with no explanation at all -- the
    // starring, the finished/unfinished filters and Manage modules were never
    // introduced. The tour is now two phases: this one runs ON the real
    // library screen (index.html) before a module is chosen, and the play
    // phase runs once a story is actually up. Both are information-only.
    LIBRARY_KEY: "PL_TutorialLibrarySeen",

    LIBRARY_STEPS: [
        {
            title: "Welcome to ParchLock",
            body: "ParchLock gives text based interactive fiction a real graphical interface. " +
                  "Supported stories gain an automatic map, tappable objects, " +
                  "an equipment screen, notes, voice input and narration — wrapped around the original " +
                  "story, unchanged. First, this is where you choose what to play."
        },
        {
            title: "Your module library",
            body: "Choose a story from this library to start playing. Maps, notes and other local tools are kept separately for each story. Save your game before switching stories so you can return to your progress.",
            target: ["#games-list", "#windowport"]
        },
        {
            title: "Starred and finished",
            body: "These three controls filter the list: show only the stories you have starred, only the ones " +
                  "you have not finished yet, or only the ones you have. Star a story to keep it at hand, and " +
                  "mark one finished when you are done with it.",
            target: ["#filter-options", "#toolbar"]
        },
        {
            title: "Finding a story",
            body: "Search by title or author when the list gets long.",
            target: ["#filter", "#toolbar"]
        },
        {
            title: "Adding your own",
            body: "Modules lets you add compatible Z-machine and Glulx story files. Imported files stay on this device. Z-machine stories support the enhanced maps and object actions; Glulx stories currently play without those layers. Add only stories you have permission to use.",
            target: ["#modules", "#toolbar"]
        },
        {
            title: "Choose a story to begin",
            body: "Pick any story from the list and the tour will carry on over the real play screen, " +
                  "pointing out the map, your equipment and everything else as you go."
        }
    ],

    STEPS: [
        {
            title: "Welcome to ParchLock",
            body: "ParchLock gives text based interactive fiction a real graphical interface. " +
                  "Supported stories gain an automatic map, tappable objects, " +
                  "an equipment screen, notes, voice input and narration — wrapped around the original story, " +
                  "unchanged. This short tour points at the real screen and explains each part. " +
                  "Some panels show guide examples when the story has not provided data yet."
        },
        {
            title: "The story window",
            body: "This is the story as the module wrote it. ParchLock adds tools around it without rewriting the author's story text. The available enhancements depend on the story and its format.",
            target: "#windowport .BufferWindow"
        },
        {
            title: "Words you can act on",
            body: "Objects the module actually knows about are underlined. Tap one for its most likely action, " +
                  "or press and hold to see its other actions. On a computer, click for the primary action and " +
                  "right click for the rest. Not everything you can interact with will be underlined, and the " +
                  "list of actions is not exhaustive — some are left out so the story keeps its secrets. " +
                  "You can always type anything you want instead.",
            target: [".pl-act", "#windowport .BufferWindow"]
        },
        {
            title: "The action radial",
            body: "Press and hold an underlined word — or right click it on a computer — and a ring of "
                  + "actions opens around it, drawn from what the story itself understands about that object. "
                  + "Hold the command line or the Send button instead and you get the game's own radial, whose "
                  + "Tools entry reaches every menu in ParchLock.",
            target: [".pl-act", ".Input.LineInput", "#pl-input-submit"]
        },
        {
            title: "The command line",
            body: "You can always type. Anything the tour shows you is a shortcut for a command you could " +
                  "have typed yourself, so nothing here takes the parser away from you.",
            target: [".Input.LineInput", ".Input.CharInput", "#pl-input-submit"]
        },
        {
            title: "Send and speak",
            body: "Send submits your command. Tap Send on an empty line to repeat your last command; hold it " +
                  "to pick from your recent commands. The microphone lets you speak a command instead — useful " +
                  "when your hands are busy, and it can be set to hold to talk or tap to toggle in Options.",
            target: ["#pl-input-mic", "#pl-input-submit"]
        },
        {
            title: "Exits, above the story",
            body: "Known exits appear around the story: compass directions above the text, and other ways along the edges. Some destinations are hints you have not visited yet. Selecting an exit sends the real game command, so the story can still block it. The exits band makes room for its labels above the text.",
            target: ["#exits .row.horizontal.top", "#windowport .GridWindow.reverse", "#windowport .BufferWindow"]
        },
        {
            title: "The map tab",
            body: "The Map tab opens your local room view. The globe above it opens the wider World map of discovered rooms. Supported stories build these maps as you explore; some also reveal faded destination hints before you visit them.",
            target: "#pl-map-tab"
        },
        {
            title: "Your automatic map",
            body: "The map keeps explored rooms and their known connections. A faded room or dotted link can be an unvisited hint, not a route for automatic travel. Tap a room in the local map to browse it; use Go for a known route. A faded Back or Go button takes one touch to reveal and another to act.",
            target: ["#rooms-shell", "#map"],
            sheet: "map",
            isEmpty: function () { return Tutorial.mapIsEmpty(); },
            emptyBody: "Right now this is nearly empty, because you have only just started. Every room you walk into is added here automatically, with the connections between them, and your current position stays highlighted."
        },
        {
            title: "Known rooms and search",
            body: "Every room you have found, listed and searchable. The search line stays pinned while the " +
                  "list scrolls, so you can always change what you are looking for.",
            target: ["#rooms-list", "#map"],
            sheet: "map",
            isEmpty: function () { return Tutorial.mapIsEmpty(); },
            emptyBody: "As you explore, every room you find is listed here and can be searched by name. The search line stays pinned while the list scrolls, so you can always change what you are looking for."
        },
        {
            title: "Notes",
            body: "You can attach your own notes to any room — a locked door, a code, something to come back " +
                  "for. To make one, press and hold a room in this list (right click on a desktop) and choose " +
                  "to add a note. If you would rather have a visible button on every room, turn that on in " +
                  "Options. Notes are searchable alongside the rooms themselves.",
            target: ["#rooms-list", "#map"],
            sheet: "map"
        },
        {
            title: "The equipment tab",
            body: "Underneath the map tab is your equipment. It appears whenever a screen is open. " +
                  "Press it and the map folds away and your equipment folds out.",
            target: "#pl-equip-tab",
            sheet: "map"
        },
        {
            // D149: the tracker is legitimately absent in a module that tracks
            // nothing, so this step must not describe a panel that is not there
            // -- same reason the map steps carry an emptyBody.
            title: "Your character at a glance",
            body: "The status card shows current information this story reveals: perhaps score, health, turns or a progress description. Fields vary by story, and unavailable readings stay hidden. Recognizable death and win endings are counted for this playthrough, with tiles appearing above zero. Counts persist for each playthrough through quitting and older saves. A new game or accepted restart starts separate history; restoring a saved playthrough returns to its accumulated count.",
            emptyBody: "This story has not supplied current status information yet. Identify stats can ask the story for more where supported. Inventory and status requests may use turns, including automatic checks when you open Equipment. ParchLock shows a one-time warning for each installed module.",
            isEmpty: function () {
                try {
                    return !(typeof StatTracker !== "undefined" && StatTracker.visibleStats
                        && StatTracker.visibleStats().length);
                } catch (e) { return true; }
            },
            target: ["#pl-stats", "#equipment-controls", "#equipment"],
            sheet: "equipment"
        },
        {
            title: "What you are carrying",
            body: "Your belongings follow the story's known container hierarchy. Yourself represents the character carrying them when that holder is identified, whether or not there is wearable equipment. Worn items sit beneath Yourself; known open, closed, active or inactive states appear beside their items.",
            target: ["#equipment-list", "#equipment"],
            sheet: "equipment"
        },
        {
            title: "Actions on anything you carry",
            body: "Touch and hold an item line, or right-click it, for its available actions. These use the same story-derived choices as underlined words. The game still decides whether the command succeeds.",
            target: ["#equipment-list", "#equipment"],
            sheet: "equipment"
        },
        {
            title: "Sort, search and flatten",
            body: "Sort alphabetically, by what you picked up most or least recently, by container, or by what " +
                  "you are wearing. Search narrows the list while keeping each result's container path. " +
                  "Turn container view off for one plain list.",
            target: ["#equipment-controls", "#equipment"],
            sheet: "equipment"
        },
        {
            // D147/D149: the Cast launcher and the Spells filter both appear
            // only when the loaded story's own dictionary contains "cast", so
            // this step is written to be true either way rather than promising
            // a control that will not be there.
            title: "Only what this story has",
            body: "Filters and actions follow information supported by this story. Spell-related controls appear where the story supports them. Some commands or states remain unknown, and a plausible command can still be rejected by the game's rules. You can always type a command yourself.",
            target: ["#equipment-controls", "#equipment"],
            sheet: "equipment"
        },
        {
            title: "Move things by dragging",
            body: "Drag an item onto an open container to put it in, or drop it on Yourself to take it back out. " +
                  "Hold it on Yourself a moment longer to see any available choices. " +
                  "If a menu opens, lift your finger, then tap the entry you want. Letting go while the menu is open does not choose one. " +
                  "A short drop, without that hold, still takes the item. " +
                  "The menu uses this story's vocabulary. Some entries fill the command line for you to review and edit before sending. " +
                  "Closed containers refuse the drop. Each drag sends the real game command for you, " +
                  "so the story always stays in charge.",
            target: ["#equipment-list", "#equipment"],
            sheet: "equipment"
        },
        {
            title: "The directional pad",
            body: "The handle near the bottom opens a ring of available directions. Hold it, slide onto a direction and release to send the game command. The story can still block travel. You can configure or switch the control off in Options.",
            target: ["#pl-dirpad-handle", "#pl-dirpad-ring", "#pl-input-submit"]
        },
        {
            title: "Narration and text size",
            body: "Read aloud can speak new story text through your device or browser's voice service. Tools > Display changes text size and spacing. Tools > Options contains narration and voice-input settings."
        },
        {
            title: "Saving and taking your game with you",
            body: "Save inside the story as usual. Tools can export a transcript, your map or a save package as files you can keep, move or share. Transcript portions become permanent when saved and follow the save you restore; export important files before removing a module or clearing app data."
        },
        {
            title: "That is everything",
            body: "You will not see this tour again — you can replay it any time from Options. " +
                  "Your module will now restart so you begin fresh. Enjoy the story."
        }
    ],

    // ---- lifecycle ------------------------------------------------------
    // Which screen are we on? The library phase runs on index.html, the play
    // phase on play.html. Detected from real markup rather than the filename,
    // so a renamed/rehosted page cannot silently disable the tour.
    page: function () {
        try {
            if (document.getElementById("games-list")) return "library";
            if (document.getElementById("windowport") && document.querySelector(".Input, #pl-input-submit")) return "play";
            if (/play\.html/i.test(location.pathname)) return "play";
        } catch (e) {}
        return null;
    },

    steps: function () {
        if (Tutorial._page === "library") return Tutorial.LIBRARY_STEPS;
        // D135 (operator): "Welcome to ParchLock" was showing TWICE -- once on
        // the module screen and again inside the story. The library phase now
        // owns the welcome, so the play phase drops it and opens on the story
        // window instead. It is only dropped when the library phase actually
        // ran, so a player who reaches play.html directly (a deep link, or a
        // resumed session) still gets the introduction exactly once.
        if (Tutorial.libraryDone() && Tutorial.STEPS.length && /^Welcome to ParchLock/.test(Tutorial.STEPS[0].title)) {
            return Tutorial.STEPS.slice(1);
        }
        return Tutorial.STEPS;
    },

    libraryDone: function () {
        try { return localStorage.getItem(Tutorial.LIBRARY_KEY) === "1"; } catch (e) { return false; }
    },

    markLibraryDone: function () {
        try { localStorage.setItem(Tutorial.LIBRARY_KEY, "1"); } catch (e) {}
    },

    // D132: nothing else may be covering the screen when the tour opens.
    // Three real cases, all of which appear at almost exactly the moment the
    // first prompt does:
    //   - the ParchLock splash (per-session, both pages);
    //   - ParchLock's own first-run Help popup, which Message.Init fires on a
    //     new install at the first line prompt -- precisely when the play
    //     phase becomes eligible, so the tour would have opened on top of it;
    //   - Glk's own save/restore dialog.
    // The tour waits rather than competing; the poll simply tries again.
    screenIsBusy: function () {
        try {
            if (document.documentElement.classList.contains("parchlock-splash-pending")) return true;
            var splash = document.getElementById("parchlock-splash");
            if (splash && splash.getClientRects().length) return true;
            if (typeof Message !== "undefined" && Message.IsOpen) return true;
            if (document.body.classList.contains("app-dialog-open")) return true;
            var msg = document.querySelector("#message.show");
            if (msg && msg.getClientRects().length) return true;
            var glk = document.getElementById("dialog_frame");
            if (glk && glk.getClientRects().length) return true;
        } catch (e) {}
        return false;
    },

    ShouldRun: function () {
        try {
            if (typeof Global === "undefined" || !Global.TutorialIsComplete) return false;
            if (Global.TutorialIsComplete()) return false;
            if (Tutorial.screenIsBusy()) return false;

            var page = Tutorial.page();
            if (page === "library") {
                // Introduce the library BEFORE a module is chosen, once.
                return !Tutorial.libraryDone() && !!document.getElementById("games-list");
            }
            if (page !== "play") return false;

            if (document.body.classList.contains("no-story")) return false;

            // D130 (operator-reported): the tour used to start as soon as a
            // BufferWindow existed, which on a game with a long title/intro
            // sequence (Anchorhead, Planetfall) is while the player is still
            // pressing SPACE through front matter. Every step then pointed at
            // chrome that genuinely was not on screen yet. A real LINE prompt
            // is the honest "the story is actually running and waiting for
            // you" signal -- it cannot appear until the intro screens are
            // done -- so wait for that instead.
            if (!document.querySelector("#windowport .BufferWindow")) return false;
            if (!document.querySelector(".Input.LineInput")) return false;
            // And give the first room description a moment to paint, so the
            // actionable marks and the exits band exist to be pointed at.
            return Tutorial._readySince != null && (Date.now() - Tutorial._readySince) >= 900;
        } catch (e) { return false; }
    },

    _readySince: null,

    Init: function () {
        if (Tutorial._bound) return;
        Tutorial._bound = true;
        // Poll rather than hook: the readiness signal differs per page and per
        // story, and a story with a long intro can take many seconds of the
        // player pressing SPACE before it is genuinely waiting for input.
        var tries = 0;
        var poll = setInterval(function () {
            if (++tries > 240) { clearInterval(poll); return; }   // ~2 minutes
            if (Tutorial._active) { clearInterval(poll); return; }
            // Stamp the moment a real prompt first appears, so ShouldRun can
            // require a short settle before pointing at anything.
            try {
                if (document.querySelector(".Input.LineInput")) {
                    if (Tutorial._readySince == null) Tutorial._readySince = Date.now();
                } else {
                    Tutorial._readySince = null;
                }
            } catch (e) {}
            if (Tutorial.ShouldRun()) { clearInterval(poll); Tutorial.Start(); }
        }, 500);
    },

    Start: function () {
        if (Tutorial._active) return;
        Tutorial._page = Tutorial.page();
        Tutorial._active = true;
        Tutorial._step = 0;
        Tutorial.buildChrome();
        document.body.classList.add("pl-tutorial");
        Tutorial.renderStep();
    },

    // ---- chrome ---------------------------------------------------------
    buildChrome: function () {
        if (document.getElementById("pl-tut-overlay")) return;
        var wrap = document.createElement("div");
        wrap.id = "pl-tut-overlay";
        wrap.setAttribute("role", "dialog");
        wrap.setAttribute("aria-modal", "true");
        wrap.innerHTML =
            '<div id="pl-tut-scrim"></div>' +
            '<div id="pl-tut-spot" aria-hidden="true"></div>' +
            '<div id="pl-tut-card">' +
              '<p id="pl-tut-progress"></p>' +
              '<h2 id="pl-tut-title"></h2>' +
              '<p id="pl-tut-body"></p>' +
              '<div id="pl-tut-actions">' +
                '<button type="button" id="pl-tut-skip">Skip tour</button>' +
                '<span class="pl-tut-spacer"></span>' +
                '<button type="button" id="pl-tut-back">Back</button>' +
                '<button type="button" id="pl-tut-next">Next</button>' +
              '</div>' +
            '</div>';
        document.body.appendChild(wrap);

        document.getElementById("pl-tut-next").addEventListener("click", Tutorial.next);
        document.getElementById("pl-tut-back").addEventListener("click", Tutorial.back);
        document.getElementById("pl-tut-skip").addEventListener("click", Tutorial.skip);

        // Keyboard parity for desktop. Deliberately does NOT trap anything
        // else: there is nothing else to do while the tour is up.
        Tutorial._onKey = function (e) {
            if (!Tutorial._active) return;
            if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") { e.preventDefault(); Tutorial.next(); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); Tutorial.back(); }
            else if (e.key === "Escape") { e.preventDefault(); Tutorial.skip(); }
        };
        document.addEventListener("keydown", Tutorial._onKey, true);

        Tutorial._onResize = function () { if (Tutorial._active) Tutorial.placeSpotlight(); };
        window.addEventListener("resize", Tutorial._onResize, { passive: true });
        if (window.visualViewport) window.visualViewport.addEventListener("resize", Tutorial._onResize, { passive: true });

        try {
            if (typeof ResizeObserver !== "undefined") {
                new ResizeObserver(function () { if (Tutorial._active) Tutorial.placeSpotlight(); })
                    .observe(document.getElementById("pl-tut-card"));
            }
        } catch (e) {}
    },

    // ---- sheets ---------------------------------------------------------
    // A step can ask for the real map or equipment sheet, because it is about
    // something inside it. Driven through the same body classes the app's own
    // controls use, never by faking the sheet.
    applySheet: function (want) {
        var body = document.body;
        if (Tutorial._prevSheet === want) return;
        Tutorial._prevSheet = want;
        body.classList.remove("map-open", "equip-open");
        if (want === "map") body.classList.add("map-open");
        else if (want === "equipment") {
            body.classList.add("equip-open");
            // D128: many modules start you empty-handed, and a container tree
            // cannot be taught by pointing at a blank panel. EquipmentUI only
            // substitutes examples when the player genuinely has nothing, so a
            // module that does start you with gear always shows real items.
            try { if (typeof EquipmentUI !== "undefined" && EquipmentUI.SetDemo) EquipmentUI.SetDemo(true); } catch (e) {}
        }
    },

    // ---- steps ----------------------------------------------------------
    renderStep: function () {
        var def = Tutorial.steps()[Tutorial._step];
        if (!def) { Tutorial.finish(); return; }

        Tutorial.applySheet(def.sheet || null);

        // D168: the options row is now collapsed by default, so the two steps
        // that describe sort/search/filters would otherwise point at a box
        // that is not on screen and fall through to highlighting the whole
        // sheet. Open the disclosure for exactly those steps and close it
        // again afterwards, so the tour shows the controls without changing
        // the state the player is left in.
        try {
            var opts = document.getElementById("equipment-options");
            if (opts) {
                var wants = (def.target || []).indexOf("#equipment-controls") !== -1;
                opts.open = wants;
            }
        } catch (e) {}
        if (def.sheet !== "equipment") {
            try { if (typeof EquipmentUI !== "undefined" && EquipmentUI.SetDemo) EquipmentUI.SetDemo(false); } catch (e) {}
        }

        document.getElementById("pl-tut-progress").textContent = "Step " + (Tutorial._step + 1) + " of " + Tutorial.steps().length;
        document.getElementById("pl-tut-title").textContent = def.title;
        document.getElementById("pl-tut-body").textContent = Tutorial.bodyFor(def);

        var back = document.getElementById("pl-tut-back");
        back.disabled = Tutorial._step === 0;
        document.getElementById("pl-tut-next").textContent =
            Tutorial._step === Tutorial.steps().length - 1 ? "Finish" : "Next";

        // Give the sheet a frame to lay out before measuring the target.
        requestAnimationFrame(function () {
            Tutorial.placeSpotlight();
            Tutorial.speak(def);
        });
        // The map/equipment sheets animate in, so a target measured on the
        // very next frame can still be zero-sized and fall back to a centred
        // card. Re-place once the transition has settled.
        setTimeout(function () { if (Tutorial._active) Tutorial.placeSpotlight(); }, 320);
    },

    // `target` may be a single selector or a comma-free ordered list; the
    // first one that is genuinely on screen wins. Several of these elements
    // are legitimately absent or zero-sized at tour time -- #pl-input-mic
    // carries `hidden` until voice input is available, the exits band
    // collapses to 0px in a room with no mapped exits (D121), and there may
    // be no .pl-act in the opening paragraph yet -- so each step names a
    // fallback that is always present rather than framing empty space.
    // D128: some steps describe something a given module may not have yet --
    // an unexplored map, a room with no mapped exits. Rather than describing
    // a blank panel as though it were full, those steps carry an `emptyBody`
    // used when the live thing really is empty.
    bodyFor: function (def) {
        try {
            if (def.emptyBody && typeof def.isEmpty === "function" && def.isEmpty()) return def.emptyBody;
        } catch (e) {}
        return def.body;
    },

    mapIsEmpty: function () {
        try {
            if (typeof ParchLockMap === "undefined" || !ParchLockMap.Rooms) return true;
            return ParchLockMap.Rooms.filter(function (r) { return r && r.Name; }).length <= 1;
        } catch (e) { return true; }
    },

    resolveTarget: function (def) {
        if (!def || !def.target) return null;
        var list = Array.isArray(def.target) ? def.target : [def.target];
        for (var i = 0; i < list.length; i++) {
            var el = null;
            try { el = document.querySelector(list[i]); } catch (e) { continue; }
            if (!el) continue;
            var r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            if (r.bottom < 0 || r.top > window.innerHeight) continue;
            return el;
        }
        return null;
    },

    placeSpotlight: function () {
        var def = Tutorial.steps()[Tutorial._step];
        var spot = document.getElementById("pl-tut-spot");
        var card = document.getElementById("pl-tut-card");
        if (!spot || !card) return;

        var wrap = document.getElementById("pl-tut-overlay");
        var el = Tutorial.resolveTarget(def);
        if (!el) {
            if (wrap) wrap.classList.remove("pl-tut-has-spot");
            spot.style.display = "none";
            card.classList.add("pl-tut-centred");
            card.style.top = "";
            card.style.bottom = "";
            return;
        }

        var r = el.getBoundingClientRect();
        var pad = 6;
        var top = Math.max(0, r.top - pad);
        var left = Math.max(0, r.left - pad);
        var w = Math.min(window.innerWidth - left, r.width + pad * 2);
        var h = Math.min(window.innerHeight - top, r.height + pad * 2);

        if (wrap) wrap.classList.add("pl-tut-has-spot");
        spot.style.display = "block";
        spot.style.top = top + "px";
        spot.style.left = left + "px";
        spot.style.width = w + "px";
        spot.style.height = h + "px";

        // D136 (operator-reported): the card was landing ON the thing it was
        // describing. Picking "whichever side has more room" is not enough --
        // when the target is large (the story window is nearly the whole
        // screen) NEITHER side has room for the card, and it was simply drawn
        // over the highlight.
        //
        // Choose the larger free band, and if the card does not fit there,
        // CAP its height to that band so it scrolls internally instead of
        // spilling across the spotlight. Only when neither band can hold a
        // readable card at all does it fall back to overlaying, and then it
        // goes to the roomier side so it covers as little as possible.
        card.classList.remove("pl-tut-centred");
        var gapAbove = Math.max(0, top - 16);
        var gapBelow = Math.max(0, window.innerHeight - (top + h) - 16);
        var natural = card.scrollHeight || card.getBoundingClientRect().height || 200;
        var MIN_READABLE = 132;

        var useBelow = gapBelow >= gapAbove;
        var gap = useBelow ? gapBelow : gapAbove;

        if (gap >= MIN_READABLE) {
            var cardH = Math.min(natural, gap - 8);
            card.style.maxHeight = cardH + "px";
            card.style.overflowY = (natural > cardH) ? "auto" : "";
            card.style.top = useBelow
                ? (top + h + 12) + "px"
                : Math.max(8, top - cardH - 12) + "px";
            card.style.bottom = "auto";
        } else {
            // Target fills the screen (the story window is nearly all of it),
            // so SOME overlap is unavoidable. Where the card lands still
            // matters: the top of the screen carries the status banner and the
            // exits/direction band, and the operator reported the card burying
            // that band completely on a phone. Both gaps being ~0 used to pick
            // "above" and do exactly that. Prefer the BOTTOM whenever the
            // highlight starts near the top, so the direction bar and status
            // line stay visible behind the tour.
            // Always the bottom. A target this large is effectively "the whole
            // screen", and the top of the screen is never the right place to
            // put the card: that is where the Glk status banner and the
            // direction/exits band live, and burying those is exactly what the
            // operator reported. Centring on the target's midpoint was too
            // clever -- a full-height target's midpoint sits near the middle,
            // which flipped the card back to the top for no benefit.
            var fallbackH = Math.min(natural, Math.round(window.innerHeight * 0.42));
            card.style.maxHeight = fallbackH + "px";
            card.style.overflowY = (natural > fallbackH) ? "auto" : "";
            card.style.top = Math.max(8, window.innerHeight - fallbackH - 16) + "px";
            card.style.bottom = "auto";
        }
    },

    speak: function (def) {
        try {
            if (typeof ReadAloud === "undefined" || !ReadAloud.speak) return;
            if (typeof ReadAloud.stop === "function") ReadAloud.stop();
            else if (window.speechSynthesis) window.speechSynthesis.cancel();
            ReadAloud.speak(def.title + ". " + Tutorial.bodyFor(def));
        } catch (e) {}
    },

    next: function () {
        if (Tutorial._step >= Tutorial.steps().length - 1) { Tutorial.finish(); return; }
        Tutorial._step++;
        Tutorial.renderStep();
    },

    back: function () {
        if (Tutorial._step === 0) return;
        Tutorial._step--;
        Tutorial.renderStep();
    },

    skip: function () { Tutorial.close(false); },

    finish: function () { Tutorial.close(true); },

    close: function (restart) {
        Tutorial._active = false;
        try {
            if (typeof ReadAloud !== "undefined" && typeof ReadAloud.stop === "function") ReadAloud.stop();
            else if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (e) {}

        try { if (typeof EquipmentUI !== "undefined" && EquipmentUI.SetDemo) EquipmentUI.SetDemo(false); } catch (e) {}
        // Leave the options row as the player will meet it: collapsed (D168).
        try {
            var opts = document.getElementById("equipment-options");
            if (opts) opts.open = false;
        } catch (e) {}
        document.body.classList.remove("pl-tutorial", "map-open", "equip-open");
        var wrap = document.getElementById("pl-tut-overlay");
        if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
        document.removeEventListener("keydown", Tutorial._onKey, true);

        // The library phase does NOT complete the tutorial or reload
        // anything: finishing it just hands the player back to the real
        // module list so they can choose a story, and the play phase picks up
        // once that story is running. Skipping, however, means skipping the
        // whole tour, not just this half.
        if (Tutorial._page === "library") {
            Tutorial.markLibraryDone();
            if (!restart) {                      // Skip = skip everything
                try { if (typeof Global !== "undefined" && Global.TutorialMarkComplete) Global.TutorialMarkComplete(); } catch (e) {}
            }
            return;
        }

        try { if (typeof Global !== "undefined" && Global.TutorialMarkComplete) Global.TutorialMarkComplete(); } catch (e) {}

        // "the module can be restarted for them so it starts fresh" -- a
        // reload of play.html with the same ?story= boots the module from the
        // beginning. Nothing is lost: the tour is non-interactive, so the
        // player never advanced the story while it was up.
        if (restart) {
            var intent = typeof SaveState !== "undefined" && SaveState.prepareNewGame ? SaveState.prepareNewGame() : null;
            if (intent === false) return;
            try { location.replace(location.href); }
            catch (e) { if (intent && typeof SaveState !== "undefined") SaveState.cancelNewGameIntent(intent); }
        }
    },

    // Options > Replay tutorial.
    Replay: function () {
        try { if (typeof Global !== "undefined" && Global.TutorialClear) Global.TutorialClear(); } catch (e) {}
        if (typeof Message !== "undefined" && Message.Hide) Message.Hide();
        Tutorial._bound = false;
        Tutorial._active = false;
        Tutorial._prevSheet = null;
        if (Tutorial.ShouldRun()) Tutorial.Start();
        else Tutorial.Init();
    }
};

try {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", Tutorial.Init);
    else Tutorial.Init();
} catch (e) {}
