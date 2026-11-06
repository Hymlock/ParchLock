var WorkspaceUI = {
    HasStory: () => !!Global.GetUrlParameter("story"),
    StartEntries: () => [["Choose story", () => { location.href = "index.html"; }], ["Modules", ModuleLibrary.openManager], ["Options", WorkspaceUI.ShowOptions], ["Help", Message.ShowHelp], ["About", ProductInfo.showAbout], ["Display", ParchLockQol.ShowDisplay], ["Theme", Global.ToggleTheme]],
    Init: () => {
        $("#game-menu").click(WorkspaceUI.OpenGameMenu);
        Actionable.RenderInventory();
        new ResizeObserver(WorkspaceUI.DrawPaths).observe(document.getElementById("rooms"));
    },
    ShowHelp: () => {
        var sections = [
            ["Playing", "The command input stays at the bottom while you scroll the story. Enter submits a game command. Tab cycles autocomplete; Ctrl+Up and Ctrl+Down cycle command history. Startup screens and games waiting for a single key do not have a command prompt."],
            ["Menus and windows", "On desktop, Menu opens game actions; right-click the command input for common commands, or type /tools to reveal a Tools shortcut. On a touch device, touch and hold the command line or submit arrow for about half a second. When its radial appears, tap Tools for the complete game and app menu; a quick tap on the command line opens the keyboard normally. At screens that wait for a single key, tapping the bottom field opens the keyboard. Arrow-navigable game menus automatically show the on-screen arrow pad; Tools > Arrow keys can also open it manually (arrows around a circle, Enter in the centre; tap outside to close). Tap the exposed bottom field when you need to type a letter or number instead. With the keyboard open, holding the command line gives the normal Cut/Copy/Paste menu. Tap the faint tab on the right edge to open or close the map. Escape closes a radial or dialog first; otherwise it toggles the map. Popups have a close button."],
            ["Actions and items", "Underlined objects and exits offer actions supported by the current story's information. Tap or click for the primary action; touch and hold or right-click for other choices. Available words vary by story, and the game can reject a command because of its rules or your current situation. Items opens Equipment; /items toggles it. Glulx stories currently play without the Z-machine mapping and object-action layer."],
            ["Equipment and status", "Equipment shows your belongings and any known container hierarchy. Yourself represents the character carrying the items, where that holder can be identified; worn items appear beneath it. Use Options to sort, search or change the container view. Drag using an item's grip onto a known open container to put it in, or onto Yourself to take it out. Hold it over Yourself for available actions. Known worn, open/closed and active/inactive states appear as tags; unknown states stay unlabelled. Inventory and status requests can use turns in some stories. The warning appears once per installed module and returns after you uninstall and reinstall that module. The status card shows supported, current readings. Recognized death and win endings count for this playthrough; the tiles appear above zero. Counts are saved for each playthrough and survive quitting, reopening and older saves. A new game or accepted RESTART starts separate history; restoring a save returns to its playthrough history."],
            ["Modules", "Modules opens the on-device library manager. It accepts Z-machine v3, v4, v5 and v8 files, zblorb packages, and Glulx ulx or gblorb files after checking their bytes. Z-machine modules have full mapping and action support; Glulx is play-only. Add files you have the right to use. Imported bytes do not upload to a ParchLock server. Clearing app or browser storage removes imported modules and local state."],
            ["Mapping", "Map opens the local room view; the World tab (globe) opens the wider map of discovered rooms. Explored rooms stay recorded. Some stories also reveal destinations before you visit them: faded rooms and dotted links are hints, not routes for automatic travel. The same room can acquire a clearer description later without becoming a second room when its identity is known. Drag to pan and scroll to zoom. Search finds known rooms. Selecting a local room browses its connections; use its Go control for a known route. On touch, the first tap on a faded Back or Go control reveals it, and the next tap acts. /map toggles the local map; /goto room; travels along a known route, /see room; browses a room, and /see me; returns to your location. Game rules can still block travel."],
            ["Map files", "Maps opens named map saves for this story. Save map stores a named snapshot in this browser; Load restores one, and Delete removes it. Download map exports reloadable JSON; Load file imports that JSON or the map from a compatible save package. Text export and /export-map produce a readable map report. Map saves contain rooms, paths and notes, not the game's current position. The working map also saves automatically in this browser."],
            ["Game saves and exit", "Save and Restore run the game's own save commands. Save files manages browser saves and portable packages containing saves and the map. Download Package exports JSON; Save Package As offers a location picker where supported. Import File or Paste Import imports a package for the current story. Save your game before leaving: a map alone does not save the game's position. Transcript shows the current line of play; saved portions are attached to their game saves, and restoring a save returns to that transcript view. Unsaved portions are not permanent. Removing the module removes its transcripts. Export important files before clearing app or browser data. Exit game and /quit warn about unsaved progress and offer Save game first; choose Exit again after saving."],
            ["Notes, display and options", "/note text; adds a note to the current room. /notes shows its notes; /room-notes room; shows another room's notes. /clear notes clears current-room notes, and /clear map resets the working map. Tools > Display adjusts text size and spacing; Theme switches colours. Options groups voice input, read aloud, story scrolling, accessibility and controls, notes, learned words and tutorial replay. Supported Android devices also have App icon options: the default uses a consented pinned shortcut; changing the app icon itself is experimental and requires a warning confirmation. /history shows submitted commands; /commands opens command shortcuts; /transcript opens the transcript with Copy and Download; /help opens this reference."]
        ];
        Message.Show("ParchLock Help", "<div class='pl-tool-content'>" + sections.map(section => "<details class='pl-help-section'><summary>" + section[0] + "</summary><p>" + section[1] + "</p></details>").join("") + "</div>", true);
    },
    OpenTools: () => {
        var mobile = !!(document.body && document.body.classList.contains("pl-mobile"));
        // Arrow keys shares DirectionalRadialEnabled with the exits-mode
        // handle now (both are the same merged widget, D118) -- hide the
        // manual entry point when the operator has turned the whole thing
        // off, rather than leaving a menu item that silently no-ops.
        var dirRadialOn = typeof Global === "undefined" || Global.Prefs.DirectionalRadialEnabled !== false;
        var entries = [
            ["Save", () => WorkspaceUI.Command("save")], ["Restore", () => WorkspaceUI.Command("restore")],
            ...(mobile ? [["Open map", ParchLockMap.Toggle]] : []),
            ...(mobile && dirRadialOn ? [["Arrow keys", () => CharKeys.openArrowPad()]] : []),
            ["Save files", ParchLockQol.ShowSaveManager], [mobile ? "Map files" : "Maps", WorkspaceUI.ShowMaps],
            ...(mobile ? [["Modules", ModuleLibrary.openManager]] : []),
            ["Items", Actionable.ShowInventory], ["Transcript", ParchLockQol.ShowTranscript],
            ["Edit Learned Words", () => LearnedWords.open()],
            ["History", ParchLockQol.ShowHistory], ["Display", ParchLockQol.ShowDisplay],
            ["Commands", ParchLockQol.ShowCommands], ["Help", Message.ShowHelp], ["About", ProductInfo.showAbout],
            ["Theme", Global.ToggleTheme], ["Options", WorkspaceUI.ShowOptions],
            ...(mobile ? [["Exit game", WorkspaceUI.ExitGame]] : [])
        ];
        if (!WorkspaceUI.HasStory()) entries = WorkspaceUI.StartEntries();
        // Mobile: center in the visible viewport (above keyboard when open).
        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2;
        try {
            if (window.visualViewport) {
                cx = window.visualViewport.offsetLeft + window.visualViewport.width / 2;
                cy = window.visualViewport.offsetTop + window.visualViewport.height / 2;
            }
        } catch (e) {}
        ParchLockQol.OpenRadial(cx, cy, entries.map(entry => ({ Label: entry[0], Action: entry[1] })), { source: "tools" });
    },
    Command: command => {
        if (!WorkspaceUI.HasStory()) { Message.Show("Choose a story", "<a href='index.html'>Open the game library</a>", true); return; }
        if (!$("#windowport .Input.LineInput:visible").length || $("#dialog").length) {
            Message.Show("Game command unavailable", "Close this window and finish the game's startup screen or current prompt before choosing " + ParchLockQol.EscapeHtml(command) + ".", true);
            return;
        }
        if (Message.IsOpen) Message.Hide();
        Input.Clear();
        Input.Inject(command, true);
        if (document.body.classList.contains("pl-mobile") && typeof Input !== "undefined" && Input.DismissKeyboard) {
            Input.DismissKeyboard();
        } else {
            Input.Focus();
        }
    },
    OpenGameMenu: () => {
        if ($("#radial-menu").hasClass("show") && $("#radial-menu").data("context") && $("#radial-menu").data("context").source === "game") { ParchLockQol.HideRadialMenu(); return; }
        // Tools stays a Menu item (already how desktop works); do not replace Menu with Tools.
        var entries = [["Tools", WorkspaceUI.OpenTools], ["Save", () => WorkspaceUI.Command("save")], ["Restore", () => WorkspaceUI.Command("restore")], ["Map", ParchLockMap.Toggle], ["Modules", ModuleLibrary.openManager], ["Options", WorkspaceUI.ShowOptions], ["Help", Message.ShowHelp], ["About", ProductInfo.showAbout], ["Exit game", WorkspaceUI.ExitGame]];
        if (!WorkspaceUI.HasStory()) entries = WorkspaceUI.StartEntries();
        var cx = window.innerWidth - 30;
        var cy = 40;
        try {
            if (document.body && document.body.classList.contains("pl-mobile") && window.visualViewport) {
                cx = window.visualViewport.offsetLeft + window.visualViewport.width / 2;
                cy = window.visualViewport.offsetTop + window.visualViewport.height / 2;
            }
        } catch (e) {}
        ParchLockQol.OpenRadial(cx, cy, entries.map(entry => ({ Label: entry[0], Action: entry[1] })), { source: "game" });
    },
    _leaving: false,
    LeaveWithLearning: async function (navigate) {
        if (WorkspaceUI._leaving) return;
        WorkspaceUI._leaving = true;
        var block = function (e) {
            if (e.target && e.target.matches && e.target.matches('.Input.LineInput,.Input.CharInput')) { e.preventDefault(); e.stopImmediatePropagation(); }
        };
        document.addEventListener('keypress', block, true);
        var ok=false;
        try {
            ok = typeof TurnRecorder === 'undefined' || await TurnRecorder.whenSettled(1500);
            if (ok && typeof LearningStores !== 'undefined') ok=(await LearningStores.flush(2000)).ok;
            if(ok && navigate() !== false) return;
        } catch(e) {}
        WorkspaceUI._leaving=false;
        document.removeEventListener('keypress',block,true);
        Message.Show('Learning is still saving',"<p>Your learned words and actions could not be saved yet. Keep this game open and try again.</p><button id='learning-exit-retry'>Try again</button><button id='learning-exit-cancel'>Keep playing</button>",true);
        $('#learning-exit-retry').click(function(){WorkspaceUI.LeaveWithLearning(navigate);});
        $('#learning-exit-cancel').click(Message.Hide);
    },
    ExitGame: () => {
        Message.Show("Exit game?", "<p>Progress since your last game save will be lost. A saved map does not save your game position.</p><div class='qol-window-actions'><button id='exit-save'>Save game first</button><button id='exit-confirm'>Exit without saving</button><button id='exit-cancel'>Keep playing</button></div>", true);
        $("#exit-save").click(() => WorkspaceUI.Command("save"));
        $("#exit-confirm").click(() => WorkspaceUI.LeaveWithLearning(function() { location.href = "index.html"; }));
        $("#exit-cancel").click(Message.Hide);
    },
    // After the story accepts QUIT (or otherwise glk_exit), GlkOte disables and
    // removes LineInput and never navigates away. Offer a general end-of-story
    // path back to the library / restart -- not a per-game quit interceptor.
    OfferStoryEnded: () => {
        if (!WorkspaceUI.HasStory()) return;
        var story = "";
        try { story = Global.GetUrlParameter("story") || ""; } catch (e) {}
        Message.Show(
            "Story ended",
            "<p>The story has stopped and is no longer accepting commands. You can return to the library or restart this module.</p>" +
            "<div class='qol-window-actions'>" +
            "<button id='story-ended-library' type='button'>Return to library</button>" +
            "<button id='story-ended-restart' type='button'>Restart story</button>" +
            "<button id='story-ended-dismiss' type='button'>Keep viewing</button>" +
            "</div>",
            true
        );
        $("#story-ended-library").off("click.plStoryEnded").on("click.plStoryEnded", function () {
            WorkspaceUI.LeaveWithLearning(function() { location.href = "index.html"; });
        });
        $("#story-ended-restart").off("click.plStoryEnded").on("click.plStoryEnded", function () {
            WorkspaceUI.LeaveWithLearning(function() {
            var intent = typeof SaveState !== "undefined" && SaveState.prepareNewGame ? SaveState.prepareNewGame() : null;
            if (intent === false) return false;
            try {
                if (story) location.href = "play.html?story=" + encodeURIComponent(story);
                else location.reload();
            } catch (e) { if (intent && typeof SaveState !== "undefined") SaveState.cancelNewGameIntent(intent); return false; }
            });
        });
        $("#story-ended-dismiss").off("click.plStoryEnded").on("click.plStoryEnded", Message.Hide);
    },
    ShowOptions: () => {
        Message.Show("Game options", "<div id='game-options'></div>", true);
        $("<p class='pl-options-intro'>").text("Make yourself at home. Your choices are saved automatically.").appendTo("#game-options");
        var groups = {};
        function group(label, description) {
            var details = $("<details class='pl-options-group'>").appendTo("#game-options");
            var summary = $("<summary>").on("keydown", function(e) {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) details[0].open = !details[0].open; }
            }).appendTo(details);
            $("<span class='pl-options-heading'>").text(label).appendTo(summary);
            $("<span class='pl-options-description'>").text(description).appendTo(summary);
            return details;
        }
        groups.help = group("Getting started", "Help when a story begins");
        groups.mic = group("Voice input", "Hold to talk and automatic sending");
        groups.scroll = group("Story scrolling", "Keep new passages in view");
        groups.speech = group("Read aloud", "Narration, speech rate and repeats");
        groups.interface = group("Accessibility & controls", "Notes, directions and tutorials");
        groups.learned = group("Learned words", "Choose the labels shown in your editor, and erase what was learned for stories you uninstalled");
        // D215: Android only - the rotating storybook icon and its experimental launcher option.
        try { if (typeof IconRotation !== "undefined") IconRotation.addOptions(group); } catch (eIcon) {}
        [
            ["Help at startup", "ShowInfoOnStart", ParchLock.ToggleShowInfo]
        ].forEach(option => {
            var label = $("<label>").appendTo(groups.help);
            $("<input type='checkbox'>").prop("checked", !!Global.Prefs[option[1]]).on("change", () => option[2](true)).appendTo(label);
            label.append(document.createTextNode(option[0]));
        });
        // Mobile mic mode (operator: default hold-to-talk for noisy rooms).
        var micLabel = $("<label>").appendTo(groups.mic);
        $("<input type='checkbox'>")
            .prop("checked", Global.Prefs.MicHoldToTalk !== false)
            .on("change", function () {
                Global.Prefs.MicHoldToTalk = !!this.checked;
                Global.SavePrefs();
                try { if (typeof Input !== "undefined" && Input.InitMic) Input.InitMic(); } catch (e) {}
            })
            .appendTo(micLabel);
        micLabel.append(document.createTextNode("Hold mic to talk (off = tap to toggle)"));

        // D167: holding the mic is itself a deliberate "say this and go", so a
        // hold-release submits by default. Tap mode never submits, whatever
        // this is set to.
        var micSendLabel = $("<label>").appendTo(groups.mic);
        $("<input type='checkbox'>")
            .prop("checked", Global.Prefs.MicAutoSendOnRelease !== false)
            .on("change", function () {
                Global.Prefs.MicAutoSendOnRelease = !!this.checked;
                Global.SavePrefs();
            })
            .appendTo(micSendLabel);
        micSendLabel.append(document.createTextNode("Send automatically when the mic is released (hold mode only)"));

        // D167: follow new output automatically, starting at its first line.
        var scrollLabel = $("<label>").appendTo(groups.scroll);
        $("<input type='checkbox'>")
            .prop("checked", Global.Prefs.AutoScrollOnOutput !== false)
            .on("change", function () {
                Global.Prefs.AutoScrollOnOutput = !!this.checked;
                Global.SavePrefs();
            })
            .appendTo(scrollLabel);
        scrollLabel.append(document.createTextNode("Scroll new story text to the top (off = ordinary scrolling)"));

        // D100 read-aloud (Options only; no chrome button). Default ON = new story text.
        var raLabel = $("<label>").appendTo(groups.speech);
        var raCheck = $("<input type='checkbox'>")
            .prop("checked", Global.Prefs.ReadAloud !== false)
            .on("change", function () {
                var on = !!this.checked;
                Global.Prefs.ReadAloud = on;
                Global.SavePrefs();
                try {
                    if (typeof ReadAloud !== "undefined") {
                        if (on) {
                            ReadAloud.seedSilent();
                            ReadAloud.applyPrefs();
                        } else {
                            ReadAloud.stop();
                        }
                    }
                } catch (e) {}
            })
            .appendTo(raLabel);
        raLabel.append(document.createTextNode("Read aloud new story text"));
        if (typeof ReadAloud !== "undefined" && !ReadAloud.isSupported()) {
            $("<div>").css({ fontSize: "12px", opacity: 0.75, margin: "4px 0 8px 22px" })
                .text("Speech not available on this device.")
                .appendTo(groups.speech);
        }
        var raStatus = $("<label>").appendTo(groups.speech);
        $("<input type='checkbox'>")
            .prop("checked", !!Global.Prefs.ReadAloudStatus)
            .on("change", function () {
                Global.Prefs.ReadAloudStatus = !!this.checked;
                Global.SavePrefs();
            })
            .appendTo(raStatus);
        raStatus.append(document.createTextNode("Also read status line"));
        var raDlg = $("<label>").appendTo(groups.speech);
        $("<input type='checkbox'>")
            .prop("checked", !!Global.Prefs.ReadAloudDialogs)
            .on("change", function () {
                Global.Prefs.ReadAloudDialogs = !!this.checked;
                Global.SavePrefs();
            })
            .appendTo(raDlg);
        raDlg.append(document.createTextNode("Also read app dialogs"));
        var raSkip = $("<label>").appendTo(groups.speech);
        $("<input type='checkbox'>")
            .prop("checked", !!Global.Prefs.ReadAloudSkipRepeats)
            .on("change", function () {
                Global.Prefs.ReadAloudSkipRepeats = !!this.checked;
                Global.SavePrefs();
            })
            .appendTo(raSkip);
        raSkip.append(document.createTextNode("Skip lines repeated from the previous turn"));
        var rateRow = $("<div class='qol-display-row'>").css({ marginTop: "8px" }).appendTo(groups.speech);
        $("<span>").text("Speech rate").appendTo(rateRow);
        $("<button type='button'>").text("-").on("click", function () {
            var r = Math.round(((parseFloat(Global.Prefs.ReadAloudRate) || 1) - 0.1) * 10) / 10;
            Global.Prefs.ReadAloudRate = Math.max(0.7, r);
            Global.SavePrefs();
            $("#pl-readaloud-rate").text(Global.Prefs.ReadAloudRate.toFixed(1));
        }).appendTo(rateRow);
        $("<strong id='pl-readaloud-rate'>").text((parseFloat(Global.Prefs.ReadAloudRate) || 1).toFixed(1)).appendTo(rateRow);
        $("<button type='button'>").text("+").on("click", function () {
            var r = Math.round(((parseFloat(Global.Prefs.ReadAloudRate) || 1) + 0.1) * 10) / 10;
            Global.Prefs.ReadAloudRate = Math.min(1.4, r);
            Global.SavePrefs();
            $("#pl-readaloud-rate").text(Global.Prefs.ReadAloudRate.toFixed(1));
        }).appendTo(rateRow);
        $("<p>").append(
            $("<button type='button' id='pl-readaloud-stop'>").text("Stop speaking").on("click", function () {
                try { if (typeof ReadAloud !== "undefined") ReadAloud.stop(); } catch (e) {}
            })
        ).appendTo(groups.speech);
        // D112: general Interface/Accessibility area -- deliberately NOT
        // grouped with the map-specific options above (operator correction
        // to an earlier map-options placement suggestion). This toggle
        // controls ONLY whether the small button beside the Notes header
        // is present; the Notes header/section itself is always visible
        // regardless of this preference, note count, or collapse state.

        // S4: always shown; the effect is gated per module (StatusLineHide).
        var hideStatusLabel = $("<label>").appendTo(groups.interface);
        $("<input type='checkbox' id='pl-hide-status-line'>")
            .prop("checked", !!Global.Prefs.HideStatusLine)
            .on("change", function () {
                Global.Prefs.HideStatusLine = !!this.checked;
                Global.SavePrefs();
                try { StatusLineHide.apply(); } catch (e) {}
            })
            .appendTo(hideStatusLabel);
        hideStatusLabel.append(document.createTextNode("Hide the story's status line when the stat strip shows it"));

        var notesButtonLabel = $("<label>").appendTo(groups.interface);
        $("<input type='checkbox'>")
            .prop("checked", !!Global.Prefs.ShowNotesAddButton)
            .on("change", function () {
                Global.Prefs.ShowNotesAddButton = !!this.checked;
                Global.SavePrefs();
                try { if (typeof ParchLockMap !== "undefined") ParchLockMap.ApplyNotesAddButtonPref(); } catch (e) {}
            })
            .appendTo(notesButtonLabel);
        notesButtonLabel.append(document.createTextNode("Show an Add note button in the Notes section (for players who can't hold or right-click)"));

        // D117: the dime-sized directional radial handle (js/DirectionalRadial.js).
        // Default ON -- this toggle is the "entire system is togglable in its
        // settings UI" requirement from the original request. D118 follow-up
        // (operator-confirmed): this single preference now governs BOTH of
        // the merged widget's modes -- the exits-mode compass handle AND the
        // arrow-key pad (auto-opened on native menus, or Tools > Arrow keys)
        // -- not just the handle by itself.
        var dirRadialLabel = $("<label>").appendTo(groups.interface);
        $("<input type='checkbox'>")
            .prop("checked", Global.Prefs.DirectionalRadialEnabled !== false)
            .on("change", function () {
                Global.Prefs.DirectionalRadialEnabled = !!this.checked;
                Global.SavePrefs();
                try { if (typeof DirectionalRadial !== "undefined") DirectionalRadial.ApplyEnabledState(); } catch (e) {}
                try { if (!this.checked && typeof CharKeys !== "undefined" && CharKeys.isPadOpen()) CharKeys.closeArrowPad(); } catch (e) {}
            })
            .appendTo(dirRadialLabel);
        dirRadialLabel.append(document.createTextNode("Show the directions handle and arrow-key pad (hold the handle for a compass of known exits; the same widget also shows arrow keys on native menus)"));

        // D118 follow-up (operator): desktop already has a real keyboard
        // with real arrow keys, so unlike mobile's auto-detected pad this
        // is a manual-only, default-OFF toggle -- never auto-opened by
        // CharKeys' native-grid-menu detection, which stays mobile-only
        // exactly as before. Desktop-only control: on mobile the merged
        // DirectionalRadialEnabled checkbox above already covers the arrow
        // pad (auto + Tools > Arrow keys), so a second toggle there would
        // be redundant and confusing.
        if (!(document.body && document.body.classList.contains("pl-mobile"))) {
            var desktopArrowLabel = $("<label>").appendTo(groups.interface);
            $("<input type='checkbox'>")
                .prop("checked", Global.Prefs.DesktopArrowPadEnabled === true)
                .on("change", function () {
                    Global.Prefs.DesktopArrowPadEnabled = !!this.checked;
                    Global.SavePrefs();
                    try { if (typeof DirectionalRadial !== "undefined") DirectionalRadial.ApplyEnabledState(); } catch (e) {}
                })
                .appendTo(desktopArrowLabel);
            desktopArrowLabel.append(document.createTextNode("Show an on-screen arrow-key overlay on PC (optional -- off by default since your keyboard already has arrow keys)"));
        }

        // D117: the full programmable suite -- add/edit/delete custom
        // ("static") slices and additional custom rings, per module. Same
        // dialog on desktop and mobile (one shared implementation, not two
        // separate settings surfaces). A short tap on the handle itself
        // opens the same panel -- this button is the conventional,
        // discoverable second entry point.
        var dirConfigRow = $("<div>").css({ margin: "4px 0" }).appendTo(groups.interface);
        $("<button type='button'>")
            .text("Configure directions...")
            .on("click", function () {
                try { if (typeof DirectionalRadial !== "undefined") DirectionalRadial.ShowSettings(); } catch (e) {}
            })
            .appendTo(dirConfigRow);

        // D120: platform-neutral replay/reset, replacing the old mobile-only
        // "Replay mobile tutorial" button now that the D113 tutorial is one
        // shared route (tutorial.html) for mobile and desktop alike -- no
        // more per-platform behavior difference to branch on here.
        var tutorialRow = $("<div class='pl-tutorial-setting'>").appendTo(groups.interface);
        $("<button type='button' id='pl-replay-tutorial'>")
            .text("Replay tutorial")
            .on("click", function () {
                // D124: replaying no longer leaves the story. The tour is
                // live now -- it runs over this very screen -- so it simply
                // starts here, and the old "you will land on Choose a module"
                // warning would be describing behaviour that no longer
                // exists. It ends by restarting this module fresh, which is
                // worth saying up front.
                if (!confirm("Replay the tutorial over this screen? Your module will restart fresh when it finishes.")) return;
                if (typeof Message !== "undefined" && Message.Hide) Message.Hide();
                if (typeof Tutorial !== "undefined" && Tutorial.Replay) Tutorial.Replay();
            })
            .appendTo(tutorialRow);
        $("<button type='button' id='pl-reset-tutorial'>")
            .text("Reset tutorial")
            .on("click", function () {
                // Reset touches only tutorial state (plan requirement) --
                // no navigation, no confirmation needed; it just clears the
                // completion key so the next visit to the module library
                // shows the tutorial again.
                try { if (typeof Global !== "undefined") Global.TutorialClear(); } catch (e) {}
                $("#pl-tutorial-status").text("The tutorial will show again the next time you open the module library.");
            })
            .appendTo(tutorialRow);
        $("<span id='pl-tutorial-status' role='status'>").appendTo(tutorialRow);
        [['learned','Edit Learned Words'],['actions','Story actions \u00b7 labels only'],['names','Names \u00b7 display labels only'],['status','Status labels \u00b7 display text only']].forEach(function (entry) {
            var label = $("<label>").appendTo(groups.learned);
            $("<input type='checkbox'>").prop("checked", LearnedWords.sectionEnabled(entry[0])).on("change", function () {
                Global.Prefs['LearnedWordsShow_' + entry[0]] = !!this.checked;
                Global.SavePrefs();
                if (LearnedWords._open) LearnedWords.applyVisibility();
            }).appendTo(label);
            label.append(document.createTextNode(entry[1]));
        });
        // D13: erase learned data whose every owner story is uninstalled.
        try { if (typeof LearningStores !== "undefined") LearningStores.addOptions(groups.learned); } catch (eLearn) {}
    },
    MapKey: () => "PL_MapSlots_" + ParchLock.GameFilename,
    ReadSlots: () => {
        try { var slots = JSON.parse(localStorage.getItem(WorkspaceUI.MapKey()) || "[]"); return Array.isArray(slots) ? slots : []; } catch (_) { return []; }
    },
    MapData: () => ({ Format: "ParchLockMap", Version: 1, Story: ParchLock.GameFilename, Map: ParchLockMap.Rooms, DisplayedRoom: ParchLockMap.DisplayedRoom }),
    ValidateMap: data => {
        if (!data || !Array.isArray(data.Map) || (data.Story && data.Story !== ParchLock.GameFilename)) throw new Error("Choose a map for this story.");
        if (data.Map.some((room, index) => !room || room.Id !== index || typeof room.Name !== "string" || !room.Exits || typeof room.Exits !== "object" || Array.isArray(room.Exits) || (room.Notes != null && (!Array.isArray(room.Notes) || room.Notes.some(note => typeof note !== "string"))) || Object.values(room.Exits).some(id => !Number.isInteger(id) || id < 0 || id >= data.Map.length))) throw new Error("Invalid map data.");
        return data;
    },
    LoadMap: data => {
        var previousRooms = ParchLockMap.Rooms, previousBlocked = ParchLockMap.PersistenceBlocked;
        var key = "PL_Map_" + ParchLock.GameFilename, previous;
        try {
            if (!ParchLock.GameFilename) throw new Error("Open a story first.");
            WorkspaceUI.ValidateMap(data);
            previous = localStorage.getItem(key);
            ParchLockMap.Rooms = JSON.parse(JSON.stringify(data.Map));
            // D213: unproven in-room steps move to UnprovenSubSteps (never deleted).
            if (typeof MapTopology !== "undefined" && MapTopology.quarantineUnprovenSubSteps) MapTopology.quarantineUnprovenSubSteps(ParchLockMap.Rooms);
            // D112: the previous Rooms array (and any room record
            // NotesScopeRoomKey pointed at) is gone -- a stale scope would
            // resolve against nothing. Reset to the unscoped all-rooms view.
            ParchLockMap.NotesScopeRoomKey = null;
            if (WorldModel.lastPayload) MapTopology.resolveCurrentRoomName(WorldModel.lastPayload);
            ParchLockMap.ResetViewport();
            ParchLockMap.Draw(data.DisplayedRoom && ParchLockMap.GetRoom(data.DisplayedRoom) ? data.DisplayedRoom : undefined);
            ParchLockMap.RebuildRoomsList();
            ParchLockMap.RebuildNotesList();
            ParchLockMap.ApplyNotesAddButtonPref();
            localStorage.setItem(key, JSON.stringify(ParchLockMap.Rooms));
            ParchLockMap.PersistenceBlocked = false;
            Message.Hide(); ParchLockMap.Show();
        } catch (error) {
            ParchLockMap.Rooms = previousRooms;
            ParchLockMap.PersistenceBlocked = previousBlocked;
            if (previous !== undefined) {
                try { if (previous === null) localStorage.removeItem(key); else localStorage.setItem(key, previous); }
                catch (_) { ParchLockMap.PersistenceBlocked = true; }
            }
            Message.Show("Map load failed", ParchLockQol.EscapeHtml(error.message), true);
        }
    },
    ShowMaps: () => {
        Message.Show("Maps", "<div class='qol-window-actions'><label class='pl-map-name-field'>Map name<input id='map-slot-name' aria-label='Map name' placeholder='Name this map' maxlength='100'></label><button id='save-map-slot'>Save map</button><button id='download-map-json'>Download map</button><button id='load-map-file'>Load file</button><button id='download-map-text'>Text export</button></div><input id='map-file' type='file' accept='.json,application/json' hidden><div id='map-slots'></div><p id='map-storage-status' role='status'></p>", true);
        var slots = WorkspaceUI.ReadSlots();
        if (!slots.length) $("#map-slots").text("No named maps saved for this story.");
        slots.forEach((slot, index) => {
            var row = $("<div class='save-row'>").appendTo("#map-slots");
            $("<strong>").text(slot.Name).appendTo(row);
            $("<span>").text(new Date(slot.Date).toLocaleString()).appendTo(row);
            $("<button>").text("Load").appendTo(row).click(() => WorkspaceUI.LoadMap(slot.Data));
            $("<button>").text("Download").appendTo(row).click(() => ParchLockQol.DownloadText(ParchLockQol.ExportFilename("Map", slot.Name, "json"), JSON.stringify(slot.Data, null, 2)));
            $("<button>").text("Delete").appendTo(row).click(() => {
                if (!confirm("Delete saved map \"" + slot.Name + "\"?")) return;
                slots.splice(index, 1); localStorage.setItem(WorkspaceUI.MapKey(), JSON.stringify(slots)); WorkspaceUI.ShowMaps();
            });
        });
        $("#save-map-slot").click(() => {
            var name = $("#map-slot-name").val().trim();
            if (!name) { $("#map-storage-status").text("Enter a map name."); return; }
            var existing = slots.findIndex(slot => slot.Name === name);
            if (existing >= 0 && !confirm("Replace saved map \"" + name + "\"?")) return;
            var slot = { Name: name, Date: new Date().toISOString(), Data: WorkspaceUI.MapData() };
            if (existing >= 0) slots[existing] = slot; else slots.push(slot);
            try { localStorage.setItem(WorkspaceUI.MapKey(), JSON.stringify(slots)); WorkspaceUI.ShowMaps(); $("#map-storage-status").text("Map saved."); }
            catch (error) { $("#map-storage-status").text(error.message); }
        });
        $("#download-map-json").click(() => ParchLockQol.DownloadText(ParchLockQol.ExportFilename("Map", undefined, "json"), JSON.stringify(WorkspaceUI.MapData(), null, 2)));
        $("#download-map-text").click(ParchLockMap.ExportMap);
        $("#load-map-file").click(() => $("#map-file").click());
        $("#map-file").change(async function() {
            if (!this.files[0]) return;
            try { WorkspaceUI.LoadMap(JSON.parse(await this.files[0].text())); }
            catch (error) { $("#map-storage-status").text("Could not load map: " + error.message); }
        });
    },
    UpdateGrid: () => {
        $("#windowport .GridLine").each(function() {
            var spans = Array.from(this.children).filter(el => el.tagName === "SPAN");
            this.classList.toggle("pl-reverse-row", spans.length > 0 && spans.every(el => el.classList.contains("reverse")));
        });
    },
    DrawPaths: () => {
        var root = document.getElementById("rooms");
        if (!root) return;
        var svg = root.querySelector("svg.map-paths");
        if (!svg) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("map-paths");
            svg.setAttribute("aria-hidden", "true");
            root.prepend(svg);
        }
        svg.replaceChildren();
        // Layout box (transform-independent) so the SVG viewBox stays aligned with
        // room nodes under CSS translate/scale zoom, pan, and shell minimize/resize.
        var w = root.clientWidth, h = root.clientHeight;
        if (w < 1 || h < 1) return;
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);
        var rootRect = root.getBoundingClientRect();
        var sx = rootRect.width / w, sy = rootRect.height / h;
        if (!(sx > 0) || !(sy > 0)) return;
        function localCenter(el) {
            var r = el.getBoundingClientRect();
            return {
                x: (r.left + r.width / 2 - rootRect.left) / sx,
                y: (r.top + r.height / 2 - rootRect.top) / sy
            };
        }
        var center = root.querySelector(".dir-here.shown");
        if (!center) return;
        var a = localCenter(center);
        root.querySelectorAll(".room.shown:not(.dir-here)").forEach(function (target) {
            var b = localCenter(target);
            var dx = b.x - a.x, dy = b.y - a.y;
            if (!dx && !dy) return;
            // Keep the path attached to the room centers; opaque room surfaces cover its interior.
            var line = document.createElementNS(svg.namespaceURI, "line");
            line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
            line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
            svg.appendChild(line);
        });
    }

};

// S4 (R2): hide the game's one-line status grid while the stat strip shows
// at least one metric AND the grid yields a readable room label. Only the
// live grid inside #windowport is tagged (GlkOte's #layout_test_pane
// measurement grid is never touched, so gridmarginy/gridcharheight are
// unaffected). One GridLine child === GlkOte gridheight 1 (GlkOte keeps one
// .GridLine per grid row). Hiding is visibility:hidden (text stays readable
// via textContent); the line is reclaimed by moving the buffer window(s)
// directly below the grid up through a CSS top override. GlkOte's own
// inline left/top/right/bottom and the bbox-derived sizes it reports to the
// VM are not changed.
var StatusLineHide = {
    _pending: false,
    _observer: null,
    gateOpen: function (grid) {
        if (typeof StatusGridDecoder === "undefined") return false;
        // GridLine rows only: the grid frame can carry a <style> element.
        var d = StatusGridDecoder.decode(Array.prototype.map.call(grid.querySelectorAll(".GridLine"), function (l) { return l.textContent || ""; }).join("\n"));
        if (!d.roomLabel || !/[A-Za-z]/.test(d.roomLabel)) return false;
        var shown = 0;
        try { if (typeof StatTracker !== "undefined" && StatTracker.visibleStats) shown = (StatTracker.visibleStats() || []).length; } catch (e) {}
        if (!shown) shown = d.metrics.length;
        return shown > 0;
    },
    apply: function () {
        StatusLineHide._pending = false;
        if (typeof document === "undefined") return;
        var wp = document.getElementById("windowport");
        if (!wp) return;
        var frames = Array.prototype.filter.call(wp.children, function (el) { return el.classList.contains("WindowFrame"); });
        var oneline = [];
        frames.forEach(function (el) {
            if (!el.classList.contains("GridWindow")) return;
            var rows = Array.prototype.filter.call(el.children, function (c) { return c.classList.contains("GridLine"); }).length;
            var is1 = rows === 1;
            if (el.classList.contains("pl-oneline-status") !== is1) el.classList.toggle("pl-oneline-status", is1);
            if (is1) oneline.push(el);
        });
        var grid = oneline.length === 1 ? oneline[0] : null;
        var on = !!(typeof Global !== "undefined" && Global.Prefs && Global.Prefs.HideStatusLine && grid && StatusLineHide.gateOpen(grid));
        if (wp.classList.contains("pl-hide-status") !== on) wp.classList.toggle("pl-hide-status", on);
        var gTop = grid ? parseFloat(grid.style.top) : NaN;
        var gBottom = grid ? wp.clientHeight - parseFloat(grid.style.bottom) : NaN;
        frames.forEach(function (el) {
            var below = false, target = "";
            if (on && el !== grid && isFinite(gTop) && isFinite(gBottom)) {
                var top = parseFloat(el.style.top);
                // Directly beneath the grid (GlkOte inserts at most a small spacing).
                if (isFinite(top) && top >= gBottom - 1 && top <= gBottom + 16) { below = true; target = gTop + "px"; }
            }
            if (el.classList.contains("pl-status-below") !== below) el.classList.toggle("pl-status-below", below);
            if (below) { if (el.style.getPropertyValue("--pl-reclaim-top") !== target) el.style.setProperty("--pl-reclaim-top", target); }
            else if (el.style.getPropertyValue("--pl-reclaim-top")) el.style.removeProperty("--pl-reclaim-top");
        });
    },
    schedule: function () {
        if (StatusLineHide._pending) return;
        StatusLineHide._pending = true;
        (typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout)(StatusLineHide.apply);
    },
    start: function () {
        if (StatusLineHide._observer || typeof MutationObserver === "undefined" || !document.body) return;
        StatusLineHide._observer = new MutationObserver(StatusLineHide.schedule);
        StatusLineHide._observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
        StatusLineHide.schedule();
    }
};
try {
    if (typeof document !== "undefined") {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", StatusLineHide.start);
        else StatusLineHide.start();
    }
} catch (e) {}
