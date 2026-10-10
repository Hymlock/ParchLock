/* D215: rotating storybook icon (Android) - the Options "App icon" group.
 *
 * The launcher icon itself never changes by default. With the player's consent
 * ParchLock pins one home-screen icon of its own, and the native side
 * (IconRotator.java) updates that icon's picture in place each time the app is
 * opened. The first-launch question is native (ParchLockActivity), asked before
 * the page loads. The base launcher icon stays fixed. On the web and on PC this
 * file does nothing; the PC launcher rotates its own desktop shortcut.
 */
var IconRotation = {
    plugin: function () {
        try {
            var Cap = window.Capacitor;
            if (!Cap || typeof Cap.isNativePlatform !== "function" || !Cap.isNativePlatform()) return null;
            var p = Cap.Plugins && Cap.Plugins.SaveFile;
            return p && typeof p.iconScene === "function" ? p : null;
        } catch (e) { return null; }
    },

    state: function () {
        var p = IconRotation.plugin();
        if (!p) return Promise.resolve(null);
        return p.iconScene().catch(function () { return null; });
    },

    // The true outcome of "Add icon" (native pinRotatingShortcut).
    Outcomes: {
        updated: "Home-screen widget updated.",
        requested: "Android will ask you to place the widget. Then tap it to start.",
        refused: "Android didn't allow that right now. Please try again later.",
        unsupported: "Add ParchLock from your launcher's widget list."
    },

    // Called by WorkspaceUI.ShowOptions with its group() helper.
    addOptions: function (group) {
        if (!IconRotation.plugin()) return;
        var box = group("App icon", "A rotating storybook widget");
        $("<div class='pl-options-note'>").text("To resize: touch and hold the widget, then drag its handles. You may remove your old shortcut if you already placed one.").appendTo(box);
        IconRotation.state().then(function (s) {
            if (!s) return;
            if (s.canPin || s.pinned) {
                var pin = $("<button type='button' class='pl-options-action'>").appendTo(box);
                pin.text(s.pinned ? "Update home-screen widget" : "Add a rotating home-screen widget");
                var result = $("<div class='pl-options-note' role='status'>").appendTo(box);
                pin.on("click", function () {
                    var p = IconRotation.plugin();
                    if (!p) return;
                    p.pinRotatingShortcut().then(function (r) {
                        result.text(IconRotation.Outcomes[r && r.action] || IconRotation.Outcomes.refused);
                    }).catch(function () { result.text(IconRotation.Outcomes.refused); });
                });
            } else { $("<div class='pl-options-note'>").text(IconRotation.Outcomes.unsupported).appendTo(box); }
        });
    }
};

try { if (typeof module !== "undefined" && module.exports) module.exports = IconRotation; } catch (e) {}
