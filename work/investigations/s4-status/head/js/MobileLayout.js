/* MobileLayout — portrait-primary play shell + system keyboard room.
 *
 * D93: portrait is the default, fully-supported orientation (supersedes
 * D92's landscape-lock/rotate-hint, which the operator identified as wrong
 * -- portrait was never actually broken, it was being actively discouraged).
 * GUI_BASELINE: mobile uses modal/sheet chrome, not a third column.
 * Uses visualViewport when available so the story buffer and line input
 * shrink above the on-screen keyboard instead of being covered.
 */
var MobileLayout = {
    _bound: false,

    // D93 (G26): layout compactness is width/height only. `pointer: coarse`
    // was previously OR'd in here too, which meant any touchscreen
    // desktop/laptop (a real, common device class) at a normal desktop
    // viewport -- including the 1400x900 layout-regression test viewport --
    // incorrectly got the whole mobile shell (stacking rules, sheets,
    // Tools-FAB, rotate-hint). Touch capability and compact layout are
    // different questions; a coarse pointer alone no longer flips the shell.
    isCompact: function () {
        try {
            return !!(window.matchMedia
                && (window.matchMedia("(max-width: 900px)").matches
                    || window.matchMedia("(max-height: 520px)").matches));
        } catch (e) {
            return Math.min(window.innerWidth || 0, window.innerHeight || 0) < 700;
        }
    },

    isPortrait: function () {
        try {
            if (window.matchMedia && window.matchMedia("(orientation: portrait)").matches) return true;
        } catch (e) {}
        return (window.innerHeight || 0) > (window.innerWidth || 0);
    },

    apply: function () {
        try {
            var root = document.documentElement;
            var body = document.body;
            if (!root || !body) return;

            var compact = MobileLayout.isCompact();
            var portrait = MobileLayout.isPortrait();
            body.classList.toggle("pl-mobile", compact);
            body.classList.toggle("pl-portrait", compact && portrait);
            body.classList.toggle("pl-landscape", compact && !portrait);

            var vv = window.visualViewport;
            var layoutH = window.innerHeight || document.documentElement.clientHeight || 0;
            if (!layoutH || layoutH < 1) {
                layoutH = Math.max(window.screen && window.screen.availHeight || 0, 480);
            }
            var visibleH = vv && typeof vv.height === "number" ? vv.height : layoutH;
            // Capacitor/WebView cold start can report 0-height visualViewport
            // briefly — that collapsed #windowport to nothing (black screen
            // with only Tools/Menu FABs). Never allow a sub-floor height.
            if (!visibleH || visibleH < 1) visibleH = layoutH;
            var offsetTop = vv && typeof vv.offsetTop === "number" ? vv.offsetTop : 0;
            // ONE geometry model (layout coordinates + a single visual-bottom inset). The shell is sized from the LAYOUT height
            // (--pl-layout-height) and everything that must clear the keyboard uses the same --pl-kb-inset exactly once:
            // pane heights are layout - inset and fixed controls sit at bottom: inset. If the WebView already resized the layout
            // (adjustResize / interactive-widget=resizes-content) then layoutH == offsetTop + visibleH and the inset is 0; if only
            // the visual viewport shrank (overlay keyboard, or the frames while the layout catches up) the controls are lifted
            // once, to the same physical place the resized layout will put them, so nothing jumps. Previously the visible height was
            // used as the shell height AND the keyboard delta was subtracted again: a double count that parked the input strip
            // mid-screen for a few frames every time the keyboard animated in (operator: "flashes 2-3 times").
            var inset = Math.max(0, Math.round(layoutH - (offsetTop + visibleH)));
            if (inset < 48) inset = 0;                                  // ignore browser-chrome jitter

            root.style.setProperty("--pl-vv-height", Math.round(visibleH) + "px");
            root.style.setProperty("--pl-layout-height", Math.round(layoutH) + "px");
            root.style.setProperty("--pl-kb-inset", inset + "px");
            body.classList.toggle("pl-keyboard-open", inset >= 48);

            // D116 follow-up (operator-reported): the top compass strip
            // (#exits .row.horizontal.top) was fixed to clear only the OS
            // status bar (--pl-safe-top). #windowport itself starts BELOW
            // that (top: 8px + --pl-safe-top), and the restored Glk status
            // GridWindow (D93 G47, "Deck Nine / Score / Turns") renders as
            // that window's own first line -- a real, dynamic height this
            // stylesheet has no static value for. The compass strip landed
            // on/under that in-app banner instead of below it. Measured
            // live (not guessed/hardcoded) so it tracks real content/font-
            // size changes, same discipline as --pl-kb-inset above.
            var statusGrid = document.querySelector("#windowport .GridWindow.reverse");
            var statusH = (statusGrid && statusGrid.offsetParent !== null) ? statusGrid.offsetHeight : 0;
            root.style.setProperty("--pl-statusbar-h", Math.round(statusH) + "px");

            // D93 (G7/L1): portrait is the primary, fully-supported layout
            // now -- this hint used to show WHEN portrait, telling the user
            // to rotate away from it, which is exactly backwards under D93.
            // Left permanently hidden rather than removed outright so a
            // future, genuinely-optional landscape enhancement (explicit
            // non-goal for this v1, see docs/mobile-ui-plan-d93.md §2) has
            // an existing element to repurpose instead of re-adding one.
            var hint = document.getElementById("pl-rotate-hint");
            if (hint) {
                hint.hidden = true;
                hint.setAttribute("aria-hidden", "true");
            }
        } catch (e) {}
    },

    // D93 (G7/G16/G19/G20): the landscape orientation lock and the
    // first-gesture fullscreen+lock chain that used to live here are
    // DELETED, not disabled/optional -- the operator identified this as an
    // active correctness bug, not a preference: it silently rotated a
    // portrait session into landscape on the very first tap anywhere,
    // including a tap meant for the menu, a noun, or the input field
    // (§13 Q1 of docs/mobile-ui-plan-d93.md: the operator-recommended
    // resolution is to drop the whole first-gesture fullscreen request too,
    // since the PWA manifest already requests display:fullscreen and the
    // Capacitor WebView is already its own app chrome -- a JS
    // requestFullscreen() on first tap was redundant for the APK while
    // being the direct cause of the layout jump). Portrait is now simply
    // the default; #pl-rotate-hint no longer nags the user to rotate away
    // from it (see MobileLayout.apply, which now leaves the hint permanently
    // hidden). See ARCHITECTURE_UML.md §30 for the full D93 writeup.

    init: function () {
        if (MobileLayout._bound) {
            MobileLayout.apply();
            return;
        }
        MobileLayout._bound = true;
        var run = function () { MobileLayout.apply(); };
        try {
            window.addEventListener("resize", run, { passive: true });
            window.addEventListener("orientationchange", function () {
                setTimeout(run, 50);
                setTimeout(run, 300);
            }, { passive: true });
            if (window.visualViewport) {
                window.visualViewport.addEventListener("resize", run, { passive: true });
                window.visualViewport.addEventListener("scroll", run, { passive: true });
            }
            document.addEventListener("focusin", function (e) {
                var t = e && e.target;
                if (t && (t.classList && t.classList.contains("LineInput") || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
                    setTimeout(run, 50);
                    setTimeout(run, 350);
                }
            }, true);
            document.addEventListener("focusout", function () {
                setTimeout(run, 50);
                setTimeout(run, 350);
            }, true);
            // D93 (G16): no first-gesture fullscreen/orientation-lock chain
            // here anymore -- see the removal note above init(). A tap
            // anywhere is now just a tap; nothing hijacks it.
        } catch (e) {}
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", run);
        } else {
            run();
        }
        setTimeout(run, 100);
        MobileLayout.bindAndroidBackButton();
        // Both of these bind to elements declared later in play.html than this
        // script tag, so they must wait for the document -- see the timing
        // note above bindTopBand().
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", MobileLayout.bindChrome);
            document.addEventListener("DOMContentLoaded", MobileLayout.bindTopBand);
        } else {
            MobileLayout.bindChrome();
            MobileLayout.bindTopBand();
        }
    },

    // D121: the top chrome band (#exits on mobile) is a real reflow region
    // sitting between the Glk status banner and the story text, not an
    // overlay. It has three independent content sources that used to pile on
    // top of each other and on the text:
    //   1. the compass chip row       (js/Map.js CreateMiniMap/DrawRoom)
    //   2. the non-cardinal spokes    (js/MapBeautify.js nonCardinalSpokes)
    //   3. the per-exit notation icons(js/Map.js .room-notes show/hide)
    // Publishing its real rendered height as --pl-band-h lets the story
    // buffer reserve exactly that much padding-top (css/ParchLock.css), so
    // when a label wraps to a second line the text is pushed down to match,
    // and when there is nothing to show the band collapses to 0px.
    //
    // A ResizeObserver is used rather than hooking each of the three writers:
    // it fires for every cause including ones nothing calls into (a wrap
    // caused by rotation, body.map-open hiding the band, a font-size change),
    // and it cannot drift out of sync the way three separate call-site hooks
    // would. There is no feedback loop -- the band is fixed-position, so the
    // buffer's padding can never change the band's own height.
    //
    // NOTE ON TIMING: js/MobileLayout.js is loaded at play.html:110, but
    // #windowport and #exits are not declared until play.html:170/184. Both
    // observers below therefore MUST be bound after DOMContentLoaded --
    // binding them from init() silently found null and attached nothing,
    // which is how the first cut of this fix reproduced the exact D116
    // failure mode (the CSS was right, the measured var stayed 0px, and a
    // source-text harness could not tell the difference). Caught by a live
    // browser probe; that is why one exists.
    _bandBound: false,
    bindTopBand: function () {
        if (MobileLayout._bandBound) return;
        try {
            // --pl-statusbar-h was measured ONLY inside apply(), and apply()
            // only ran on resize/orientation/visualViewport/focus/
            // DOMContentLoaded. The Glk status GridWindow is created when the
            // story loads -- after all of those -- and no resize follows, so
            // the value stayed 0px for the whole session and everything
            // anchored to the status banner resolved to its fallback. Watch
            // #windowport instead. Never disconnected: the banner is
            // rewritten every turn.
            if (typeof MutationObserver !== "undefined") {
                var wp = document.getElementById("windowport");
                if (wp) {
                    var pendingApply = false;
                    new MutationObserver(function () {
                        if (pendingApply) return;
                        pendingApply = true;
                        requestAnimationFrame(function () { pendingApply = false; MobileLayout.apply(); });
                    }).observe(wp, { childList: true, subtree: true });
                }
            }

            if (typeof ResizeObserver === "undefined") return;
            var el = document.getElementById("exits");
            if (!el) return;
            MobileLayout._bandBound = true;
            var lastH = -1;
            var lastBottomH = -1;
            var observedBottom = null;
            var bottomObserver = new ResizeObserver(function () { publish(); });
            var measure = function () {
                try {
                    // D215: the lower labels reflow independently of the top
                    // band. Publish their real height; no exits reserve nothing.
                    var bottom = el.querySelector(".row.horizontal.bottom");
                    if (bottom !== observedBottom) {
                        bottomObserver.disconnect();
                        observedBottom = bottom;
                        if (bottom) bottomObserver.observe(bottom);
                    }
                    var bh = document.body.classList.contains("pl-mobile") && bottom && bottom.getClientRects().length
                        ? Math.ceil(bottom.getBoundingClientRect().height) : 0;
                    if (bh !== lastBottomH) {
                        lastBottomH = bh;
                        document.documentElement.style.setProperty("--pl-bottom-band-h", bh + "px");
                        document.documentElement.style.setProperty("--pl-bottom-exit-reserve", (bh > 0 ? 28 + bh + 8 : 0) + "px");
                    }
                    // NOT offsetParent: the band is position:fixed, and
                    // offsetParent is null for fixed elements in every
                    // browser, so the usual --pl-statusbar-h-style guard
                    // would report 0 forever. getClientRects() is empty
                    // exactly when the element is display:none, which is the
                    // case that must reserve nothing (body.map-open hides the
                    // whole #exits tree, and body.no-story hides it too).
                    // Round outward: a fractional wrapped line must never be
                    // under-reserved by a pixel. The protector itself is now
                    // painted by #exits, so this value owns only story reflow.
                    var h = el.getClientRects().length ? Math.ceil(el.getBoundingClientRect().height) : 0;
                    // Only touch the var when it actually moved: writing it
                    // unconditionally would dirty layout on every tick.
                    if (h === lastH) return;
                    lastH = h;
                    document.documentElement.style.setProperty("--pl-band-h", h + "px");
                } catch (e) {}
            };
            // Coalesce to one measurement per frame. The mutation sources
            // below fire far more often than they change anything (the
            // compass rows are rewritten once per turn, and MapBeautify's
            // spokes are revisited ~5x/second), so an unbatched handler
            // would read layout in the middle of a mutation burst.
            var queued = false;
            var publish = function () {
                if (queued) return;
                queued = true;
                requestAnimationFrame(function () { queued = false; measure(); });
            };
            new ResizeObserver(publish).observe(el);
            // The rows are rebuilt (not resized) on some passes, and the map
            // sheet toggles display rather than size, so watch content and
            // the class that hides it too.
            if (typeof MutationObserver !== "undefined") {
                new MutationObserver(publish).observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
                new MutationObserver(publish).observe(document.body, { attributes: true, attributeFilter: ["class"] });
            }
            publish();
        } catch (e) {}
    },

    // D102: the bottom mobile Menu handle is gone. Existing input long-press
    // radials remain the menu entry point; this binding owns only the Map tab.
    _chromeBound: false,
    bindChrome: function () {
        if (MobileLayout._chromeBound) return;
        var tab = document.getElementById("pl-map-tab");
        if (!tab) return;
        MobileLayout._chromeBound = true;
        tab.addEventListener("click", function (e) {
            e.preventDefault();
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.Toggle) ParchLockMap.Toggle();
        });
    },

    // D93 (G37): Android hardware back button, Capacitor APK only -- no-op
    // in the browser/PWA path where window.Capacitor does not exist.
    // Registering a 'backButton' listener with @capacitor/app disables the
    // platform's own default handling entirely (per its own docs), so this
    // must explicitly decide what back means every time it fires. Mirrors
    // js/Input.js's existing Escape-key priority order exactly (radial menu
    // -> Message dialog -> native Glk dialog's cancel button -> map) rather
    // than inventing a second dismiss-order.
    //
    // D115 (operator-reported, still reproducing after D113): with nothing
    // else open -- e.g. reading ordinary story text, including a native
    // BufferWindow "[Please press SPACE.]" MORE/CharInput prompt, which
    // D111 deliberately excludes from the auto arrow-pad and which is not
    // a Message/dialog/radial/map state at all -- this final case used to
    // call CapApp.exitApp() immediately and silently. A real single back
    // press or back-swipe gesture then killed the whole Activity outright:
    // relaunching from the home screen or recent-apps cold-starts the app
    // from scratch, which is indistinguishable from "the game reset" to the
    // player, with no warning it was about to happen. Escape's own chip
    // (js/Input.js) can get away with opening the map here because a
    // keyboard shortcut is never triggered by accident -- a back gesture on
    // a touchscreen very much can be. Operator requirement, stated
    // repeatedly: back must never minimize/exit/reset the app without an
    // explicit confirmation first. `confirm()` is the same mechanism this
    // app already uses for its other destructive actions (Reset Map,
    // Remove all modules) and is unaffected by anything in this back-button
    // handler; only a genuinely unexpected internal error below still exits
    // immediately, since that is a last-resort safety net, not ordinary
    // back-navigation.
    bindAndroidBackButton: function () {
        try {
            var CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
            if (!CapApp || !CapApp.addListener) return; // browser/PWA: nothing to bind
            CapApp.addListener("backButton", function () {
                try {
                    // D120: the old MobileTutorial._active branch here is
                    // removed -- MobileTutorial is retired, and the D113
                    // tutorial now runs on its own separate route
                    // (tutorial.html) that this back-button handler (bound
                    // only on play.html) can never observe anyway.
                    if (typeof CharKeys !== "undefined" && CharKeys.isPadOpen()) {
                        CharKeys.closeArrowPad();
                    } else if ($ && $("#radial-menu").hasClass("show")) {
                        ParchLockQol.HideRadialMenu();
                    } else if (typeof Message !== "undefined" && Message.IsOpen) {
                        Message.Hide();
                    } else if ($ && $("#dialog_cancel").length) {
                        $("#dialog_cancel").trigger("click");
                    } else if (typeof WorldMap !== "undefined" && WorldMap.IsOpen()) {
                        WorldMap.Close();
                    } else if (document.body.classList.contains("map-open") && typeof ParchLockMap !== "undefined") {
                        ParchLockMap.Toggle();
                    } else if (confirm("Exit ParchLock?")) {
                        CapApp.exitApp();
                    }
                } catch (e) {
                    // Never leave the hardware back button silently dead on
                    // an unexpected error -- fall back to exiting.
                    try { CapApp.exitApp(); } catch (e2) {}
                }
            });
        } catch (e) {}
    }
};

// D120: the D103 MobileTutorial (two-popup, live-story overlay that used to
// live here -- StorageKey PL_MobileTutorialSeen, spotlight/placeSpotlight,
// its own MutationObserver) is retired. It's replaced by the D113 tutorial,
// a fully separate non-live route: tutorial.html + js/Tutorial.js +
// css/Tutorial.css. See PRODUCTION_PLAN.md D120 and ARCHITECTURE_UML.md's
// matching section for the full contract; js/Global.js carries the
// versioned completion key (TutorialIsComplete/TutorialMarkComplete),
// js/MainMenu.js's Init() does the first-run routing.
try { MobileLayout.init(); } catch (eInit) {}
