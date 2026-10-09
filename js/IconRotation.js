/* D215: rotating storybook icon (Android) - first-run offer and Options.
 *
 * The launcher icon itself never changes by default. With the player's consent
 * ParchLock pins one home-screen icon of its own, and the native side
 * (IconRotator.java) updates that icon's picture in place each time the player
 * leaves. Changing the launcher icon too is an experimental opt-in with a
 * warning. On the web and on PC this file does nothing; the PC launcher rotates
 * its own desktop shortcut.
 */
var IconRotation = {
    OfferKey: "PL_IconPinOffered",

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

    // Asked once. "No" (or dismissing) is remembered; Options can offer it again.
    offerOnce: function () {
        var seen = null;
        try { seen = localStorage.getItem(IconRotation.OfferKey); } catch (e) {}
        if (seen) return;
        IconRotation.state().then(function (s) {
            if (!s || !s.canPin || s.pinned) return;
            if (typeof Message === "undefined" || Message.IsOpen) return;   // never over another window
            try { localStorage.setItem(IconRotation.OfferKey, "1"); } catch (e) {}
            IconRotation.askPin();
        });
    },

    askPin: function () {
        Message.Show("A home-screen icon that changes",
            "<p>Add a ParchLock icon to your home screen? Its picture changes to a different story scene each time you leave ParchLock. It stays where you put it.</p>" +
            "<div class='qol-window-actions'><button id='pl-icon-pin-yes' type='button'>Add icon</button><button id='pl-icon-pin-no' type='button'>Not now</button></div>", true);
        $("#pl-icon-pin-yes").on("click", function () {
            Message.Hide();
            var p = IconRotation.plugin();
            if (p) p.pinRotatingShortcut().catch(function () {});
        });
        $("#pl-icon-pin-no").on("click", Message.Hide);
    },

    // Called by WorkspaceUI.ShowOptions with its group() helper.
    addOptions: function (group) {
        if (!IconRotation.plugin()) return;
        var box = group("App icon", "A home-screen icon that changes scene");
        IconRotation.state().then(function (s) {
            if (!s) return;
            if (s.canPin) {
                var pin = $("<button type='button' class='pl-options-action'>").appendTo(box);
                pin.text(s.pinned ? "Rotating home-screen icon added" : "Add a rotating home-screen icon").prop("disabled", !!s.pinned);
                pin.on("click", function () {
                    var p = IconRotation.plugin();
                    if (p) p.pinRotatingShortcut().catch(function () {});
                });
            }
            var label = $("<label>").appendTo(box);
            var check = $("<input type='checkbox'>").prop("checked", !!s.experimental).appendTo(label);
            label.append(document.createTextNode("Change the app icon too (experimental)"));
            $("<div class='pl-options-note'>").text("Experimental: changing the app icon can make some phones remove or move your ParchLock home-screen icon. Takes effect when you next leave ParchLock.").appendTo(box);
            check.on("change", function () {
                var p = IconRotation.plugin();
                if (!p) return;
                box.find(".pl-icon-warning").remove();
                if (!this.checked) { p.setExperimentalIcon({ enabled: false }).catch(function () {}); return; }
                // Only a confirmed warning turns it on; Cancel is the default.
                this.checked = false;
                var warn = $("<div class='pl-icon-warning' role='alertdialog'>").appendTo(box);
                $("<p>").text("Experimental: changing the app icon can make some phones remove or move your ParchLock home-screen icon. Turn it on anyway?").appendTo(warn);
                var actions = $("<div class='qol-window-actions'>").appendTo(warn);
                var cancel = $("<button type='button'>").text("Cancel").appendTo(actions);
                $("<button type='button'>").text("Turn on").appendTo(actions).on("click", function () {
                    check.prop("checked", true);
                    warn.remove();
                    p.setExperimentalIcon({ enabled: true }).catch(function () {});
                });
                cancel.on("click", function () { warn.remove(); check.trigger("focus"); });
                cancel.trigger("focus");
            });
        });
    }
};

try {
    if (typeof document !== "undefined") {
        document.addEventListener("DOMContentLoaded", function () {
            // Let the splash, tutorials and any startup window settle first.
            setTimeout(IconRotation.offerOnce, 4000);
        });
    }
} catch (e) {}
