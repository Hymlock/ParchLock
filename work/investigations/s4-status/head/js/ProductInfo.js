var ProductInfo = Object.freeze({
    displayName: "ParchLock!",
    artifactName: "ParchLock",
    creditLine: "Adapted by Hymlock Groves. Based on Parchmap by Roy Lazarovich.",
    adapter: "Hymlock Groves",
    upstreamName: "Parchmap",
    upstreamAuthor: "Roy Lazarovich",
    sourceArchive: "ParchLock-source.zip",

    buildLabel: function () {
        var build = typeof BUILD !== "undefined" ? BUILD : "development";
        return ProductInfo.displayName + " build " + build;
    },

    applyDocumentIdentity: function () {
        if (typeof document === "undefined") return;
        document.querySelectorAll("[data-product-name]").forEach(function (node) {
            node.textContent = ProductInfo.displayName;
        });
        document.querySelectorAll("[data-product-credit]").forEach(function (node) {
            node.textContent = ProductInfo.creditLine;
        });
    },

    showAbout: function () {
        var body = "<p><strong>" + ProductInfo.creditLine + "</strong></p>" +
            "<p>Interactive fiction player with adaptive desktop and mobile controls, local and World maps, Equipment and story status, module-derived actions, saves and transcripts, notes, navigation, read aloud, and an on-device module library. Features vary by story and format.</p>" +
            "<p>Imported modules remain on this device. Add only files you have the right to use. Technical compatibility checks do not establish ownership or permission.</p>" +
            "<p>Licensed under GNU GPL version 3. This distribution includes modification, credit, privacy, third-party notice, and source-build documents. Corresponding source is provided in <code>" + ProductInfo.sourceArchive + "</code>.</p>" +
            "<p>" +
            "<a href='#' class='pl-doc-link' data-doc='CREDITS.md' data-title='Credits'>Credits</a> " +
            "<a href='#' class='pl-doc-link' data-doc='PRIVACY.md' data-title='Privacy'>Privacy</a> " +
            "<a href='#' class='pl-doc-link' data-doc='THIRD_PARTY_NOTICES.md' data-title='Third-party notices'>Third-party notices</a> " +
            "<a href='#' class='pl-doc-link' data-doc='SOURCE_BUILD.md' data-title='Source and build'>Source and build</a>" +
            "</p>";
        Message.Show("About " + ProductInfo.displayName, "<div class='pl-tool-content pl-about-content'>" + body + "</div>", true);
        ProductInfo.bindDocLinks();
    },

    // Operator-reported fix: these four links used to be real
    // <a href="X.md" target="_blank"> navigation. Android's Capacitor
    // WebView has no multi-window support -- target="_blank" there does
    // NOT open a separate tab, it navigates the single WebView itself away
    // from the entire app, unloading every bit of running JS/game state
    // (confirmed live: the raw .md file rendered as plain text, exactly
    // matching the operator's screenshot). That page never loaded
    // js/MobileLayout.js, so the hardware back button had no in-app dialog
    // to return to -- which is exactly why back appeared to reset or close
    // the game instead of dismissing a screen. Fix: never navigate away at
    // all. Fetch the doc's own text and render it inside the SAME Message
    // dialog, which is still governed by MobileLayout.bindAndroidBackButton's
    // existing Message.IsOpen check (hardware back already calls
    // Message.Hide() there) and by the dialog's own X/typing-to-close.
    bindDocLinks: function () {
        if (typeof $ === "undefined") return;
        $("#message")
            .off("click.plDoc").on("click.plDoc", ".pl-doc-link", function (e) {
                e.preventDefault();
                ProductInfo.showDoc($(this).data("title"), $(this).data("doc"));
            })
            .off("click.plDocBack").on("click.plDocBack", ".pl-doc-back", function (e) {
                e.preventDefault();
                ProductInfo.showAbout();
            });
    },

    showDoc: function (title, filename) {
        Message.Show(title, "<div class='pl-tool-content'><p>Loading…</p></div>", true);
        ProductInfo.bindDocLinks();
        var escape = (typeof ParchLockQol !== "undefined" && ParchLockQol.EscapeHtml) ? ParchLockQol.EscapeHtml : function (s) { return String(s); };
        fetch(filename).then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.text();
        }).then(function (text) {
            Message.Show(title, "<div class='pl-tool-content'><p><a href='#' class='pl-doc-back'>&larr; Back to About</a></p><pre class='pl-doc-text'>" + escape(text) + "</pre></div>", true);
            ProductInfo.bindDocLinks();
        }).catch(function (error) {
            Message.Show(title, "<p><a href='#' class='pl-doc-back'>&larr; Back to About</a></p><p>Could not load this document" + (error && error.message ? " (" + escape(error.message) + ")" : "") + ". It ships as <code>" + escape(filename) + "</code> alongside the app.</p>", true);
            ProductInfo.bindDocLinks();
        });
    }
});

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", ProductInfo.applyDocumentIdentity);
    } else {
        ProductInfo.applyDocumentIdentity();
    }
}
