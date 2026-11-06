var Global = {

    Prefs: {

        CRT: true,
        MapAnimation: true,
        ShowInfoOnStart: true,
        LightMode: false,
        // D123 (operator): 20px read too small on a phone. Story-window text
        // only -- this drives --pl-play-font-size, which is scoped to
        // #windowport's BufferWindow and the line input (css/ParchLock.css
        // :311, css/CharCell.css:44). Map, menus and dialogs are unaffected.
        FontSize: 25,
        LineHeight: 1.4,
        // Mobile mic: true = hold-to-talk (default, noisy environments);
        // false = tap to toggle listen on/off.
        MicHoldToTalk: true,
        // D167: a hold gesture submits what was heard on release. Tap mode is
        // unaffected and always only inserts.
        MicAutoSendOnRelease: true,
        // D167: position new story output so its FIRST line is at the top,
        // rather than landing at the end of it. Turning this off does not stop
        // the view moving -- GlkOte scrolls the buffer to the bottom on its own
        // -- it only stops ParchLock repositioning to the start.
        AutoScrollOnOutput: true,
        // D100 read-aloud: default ON; new story buffer text only.
        ReadAloud: true,
        ReadAloudStatus: false,
        // S4: hide the game's one-line status grid while the stat strip
        // already shows its metrics and a readable room label. Default off.
        HideStatusLine: false,
        ReadAloudDialogs: false,
        ReadAloudSkipRepeats: false,
        ReadAloudRate: 1.0,
        // D112: optional Add-note button beside the (always-visible) Notes
        // section header, for players who cannot hold or right-click.
        // Default off; toggled in Options' Interface & Accessibility area.
        ShowNotesAddButton: false,
        // D117: the dime-sized directional radial handle (js/DirectionalRadial.js).
        // Default ON per explicit operator instruction -- it's meant to be a
        // constant, barely-there suggestion, not an opt-in accessibility
        // feature like ShowNotesAddButton above.
        DirectionalRadialEnabled: true,
        // D118 follow-up (operator): a real desktop keyboard already has
        // arrow keys, so unlike mobile (where CharKeys' native-grid-menu
        // auto-detection opens the pad automatically, default effectively
        // on), the on-screen arrow-key overlay defaults OFF on desktop and
        // is manual-toggle-only -- no auto-open/auto-close on PC at all.
        DesktopArrowPadEnabled: false,
        // D123 one-time marker: see LoadPrefs.
        FontSizeDefaultMigrated: false
    },

    SavePrefs: () => {

        localStorage.setItem("PL_Prefs", JSON.stringify(Global.Prefs));
    },

    // D120: the versioned, cross-platform onboarding contract (D113 plan
    // section "Purpose and completion behavior," point 5) replacing the old
    // MobileLayout.js-owned PL_MobileTutorialSeen. A single source of truth
    // shared by index.html (js/MainMenu.js's routing check) and
    // tutorial.html (js/Tutorial.js's own Done/Skip) so the two pages can
    // never disagree about completion. Storing the completed VERSION
    // (not just "1") means a future major tutorial revision can bump
    // TutorialVersion and every existing player sees it again exactly
    // once; a copy-only change must not bump it. Deliberate migration: an
    // existing PL_MobileTutorialSeen="1" (the OLD tutorial) is honored as
    // already-complete for THIS version too, so upgrading players are
    // never surprised by a brand-new full tutorial they didn't ask for --
    // written back to the new key immediately so the legacy key never
    // needs re-checking again after the first read.
    TutorialVersion: "1",
    TutorialStorageKey: "PL_TutorialSeen",
    TutorialLegacyKey: "PL_MobileTutorialSeen",

    TutorialIsComplete: () => {
        try {
            if (localStorage.getItem(Global.TutorialStorageKey) === Global.TutorialVersion) return true;
            if (localStorage.getItem(Global.TutorialLegacyKey) === "1") {
                Global.TutorialMarkComplete();
                return true;
            }
        } catch (e) {}
        return false;
    },

    TutorialMarkComplete: () => {
        try { localStorage.setItem(Global.TutorialStorageKey, Global.TutorialVersion); } catch (e) {}
    },

    // Reset tutorial (Settings): touches only tutorial state, per the plan's
    // explicit "reset touching only tutorial state" requirement -- never
    // clears the legacy key, so a reset-then-reload on an upgraded install
    // still doesn't resurrect a stale pre-migration state.
    TutorialClear: () => {
        try { localStorage.removeItem(Global.TutorialStorageKey); } catch (e) {}
    },

    LoadPrefs: () => {

        if (localStorage.getItem("PL_Prefs")) {

            try {

                var prefs = JSON.parse(localStorage.getItem("PL_Prefs"));
                Global.Prefs = Object.assign({}, Global.Prefs, prefs);

                // D123: raising the default alone would not reach anyone who
                // has already played, because PL_Prefs pins whatever was
                // current at the time -- they would keep 20px forever and see
                // no change. Move existing installs up ONLY when they are
                // sitting exactly on the old default, i.e. never touched the
                // size themselves. Anyone who deliberately chose a size
                // (including 20, if they set it after this ships) keeps it.
                if (!Global.Prefs.FontSizeDefaultMigrated) {
                    if (parseInt(Global.Prefs.FontSize, 10) === 20) Global.Prefs.FontSize = 25;
                    Global.Prefs.FontSizeDefaultMigrated = true;
                    Global.SavePrefs();
                }

                if (Global.Prefs.LightMode) Global.ToggleTheme();
                Global.ApplyDisplayPrefs();
            }
            catch(e) {}
        }

        Global.ApplyDisplayPrefs();

        /*
        if (!ParchLock.Prefs.MapAnimation) ParchLock.ToggleMapAnim();
        if (!ParchLock.Prefs.ShowInfoOnStart) ParchLock.ToggleShowInfo();
        */
    },

    ToggleTheme: () => {

        $("body").toggleClass("light");

        Global.Prefs.LightMode = $("body").hasClass("light");
        Global.SavePrefs();
    },

    ApplyDisplayPrefs: () => {

        var fontSize = parseInt(Global.Prefs.FontSize, 10);
        var lineHeight = parseFloat(Global.Prefs.LineHeight);

        if (!fontSize || fontSize < 14 || fontSize > 30) fontSize = 25;   // D123: default 25px (was 20)
        if (!lineHeight || lineHeight < 1.1 || lineHeight > 2) lineHeight = 1.4;

        Global.Prefs.FontSize = fontSize;
        Global.Prefs.LineHeight = lineHeight;

        document.documentElement.style.setProperty("--pl-play-font-size", fontSize + "px");
        document.documentElement.style.setProperty("--pl-play-line-height", lineHeight);
        document.documentElement.style.setProperty("--pl-reading-scale", ((fontSize / 20) * 100).toFixed(1) + "%");
    },

    SetFontSize: (fontSize) => {

        Global.Prefs.FontSize = Math.max(14, Math.min(30, fontSize));
        Global.ApplyDisplayPrefs();
        Global.SavePrefs();
    },

    SetLineHeight: (lineHeight) => {

        Global.Prefs.LineHeight = Math.max(1.1, Math.min(2, lineHeight));
        Global.ApplyDisplayPrefs();
        Global.SavePrefs();
    },

    GetUrlParameter: (name, url) => {

        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

    // Operator-reported bug class: a relative <a href="X.md" target="_blank">
    // link (the About dialog's Credits/Privacy/Third-party-notices/Source-
    // build docs) navigated the WHOLE app away instead of opening a tab --
    // Android's Capacitor WebView has no real multi-window support, so
    // target="_blank" on a same-WebView relative link just replaces the
    // running document, unloading every bit of JS/game state. The hardware
    // back button then has nothing of this app's own left to return to,
    // which is what made it look like the game had reset or closed.
    //
    // js/ProductInfo.js's own doc links are fixed at the source (fetch +
    // render in-app, the right UX for that specific case). This is the
    // general, one-time backstop the operator asked for instead of hunting
    // down every present and future spot that could make the same mistake:
    // D120 follow-up (operator): phone-size landscape gets a soft "please
    // rotate" prompt -- not a hard OS-level lock (D93 explicitly rejected
    // discouraging/blocking landscape outright, and this keeps that intact
    // for tablets and for anyone who genuinely wants phone landscape badly
    // enough to dismiss nothing -- there IS no dismiss, it just goes away
    // on its own the moment the device rotates back). "Phone-size" uses
    // Android's own sw600dp tablet threshold (the smaller viewport
    // dimension, so a tablet held sideways is still a tablet) rather than
    // inventing a new breakpoint -- tablets keep rotating completely
    // freely, exactly as today. Pure CSS overlay: nothing underneath is
    // paused, destroyed, or reloaded, so rotating back resumes instantly.
    // Bound once, here, in the one file index.html/play.html/tutorial.html
    // all load, so all three get it from a single implementation.
    PORTRAIT_PHONE_MAX_SMALLEST_DIMENSION: 600,

    IsPhoneLandscape: () => {
        try {
            var smallest = Math.min(window.innerWidth || 0, window.innerHeight || 0);
            var landscape = (window.innerWidth || 0) > (window.innerHeight || 0);
            return smallest > 0 && smallest < Global.PORTRAIT_PHONE_MAX_SMALLEST_DIMENSION && landscape;
        } catch (e) { return false; }
    },

    BindPortraitPrompt: () => {
        if (document.__plPortraitPromptBound) return;
        document.__plPortraitPromptBound = true;

        var el = document.createElement("div");
        el.id = "pl-portrait-prompt";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        el.hidden = true;
        el.innerHTML = "<div class='pl-portrait-prompt__card'><p>ParchLock works best in portrait.</p><p>Please rotate your device.</p></div>";
        var attach = function () { if (document.body) document.body.appendChild(el); };
        if (document.body) attach(); else document.addEventListener("DOMContentLoaded", attach, { once: true });

        var apply = function () { el.hidden = !Global.IsPhoneLandscape(); };
        apply();
        window.addEventListener("resize", apply);
        window.addEventListener("orientationchange", apply);
    },

    // ANY relative link, added here or anywhere else in the app, by anyone,
    // today or later, can never again navigate this document away. Bound
    // once, on `document`, in the one file both index.html and play.html
    // load -- not duplicated per screen. A real absolute external URL
    // (a genuinely different origin -- mailto:/tel: included) is left
    // alone; the OS already handles those safely outside this app. This
    // app's own two intentional, explicit whole-app exits (Choose story /
    // Exit game) are untouched -- both are programmatic `location.href`
    // assignments, never <a href> clicks, so this listener never sees them.
    BindNavigationGuard: () => {

        if (document.__plNavGuardBound) return;
        document.__plNavGuardBound = true;

        document.addEventListener("click", function (e) {

            var a = e.target && e.target.closest && e.target.closest("a[href]");
            if (!a) return;

            // A [download] anchor (ParchLockQol.DownloadText's blob-URL
            // export technique -- Download map/Text export/transcript/save-
            // package exports all funnel through it) never navigates this
            // document away regardless of its href's scheme -- it always
            // triggers a save/download instead. Exempt by the presence of
            // this attribute, not by enumerating URL schemes, so a future
            // export using blob:/data:/anything else is never mistaken for
            // a real navigation either.
            if (a.hasAttribute("download")) return;

            var href = a.getAttribute("href") || "";
            if (!href || href.charAt(0) === "#") return;

            // Absolute external URL (a real different origin, or a
            // mailto/tel intent) -- safe to hand to the OS as-is.
            if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href)) return;

            // A relative link would navigate THIS document away and unload
            // the whole running app -- never allow it. Whoever added it
            // should show the content in-app instead (Message.Show + fetch,
            // as ProductInfo.showDoc does).
            e.preventDefault();
            try { console.warn("ParchLock: blocked in-app navigation to local file (would have unloaded the app): " + href); } catch (err) {}

        }, true);
    }
}

try { Global.BindNavigationGuard(); } catch (e) {}
try { Global.BindPortraitPrompt(); } catch (e) {}
