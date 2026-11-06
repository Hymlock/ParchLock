var ParchLockQol = {

    CommonCommands: [
        "look", "inventory", "examine ", "search ", "take ", "drop ",
        "open ", "close ", "unlock ", "talk to ", "ask ", "tell ",
        "wait", "again", "undo", "save", "restore", "verbose", "brief"
    ],

    Directions: [
        "n", "s", "e", "w", "ne", "nw", "se", "sw", "up", "down", "in", "out"
    ],

    Init: () => {

        $("#tools-toggle").click(ParchLockQol.ToggleTools);
        $("#show-transcript").click(ParchLockQol.ShowTranscript);
        $("#show-history").click(ParchLockQol.ShowHistory);
        $("#show-commands").click(ParchLockQol.ShowCommands);
        $("#show-display").click(ParchLockQol.ShowDisplay);
        $("#save-manager").click(ParchLockQol.ShowSaveManager);
        $("<button>").text("Items").attr("title", "Inventory actions").appendTo("#control-panel").click(Actionable.ShowInventory);
        $(document).on("contextmenu", ".Input.LineInput", ParchLockQol.ShowRadialMenu);
        // T10: desktop right-click on Send opens the command history.
        $(document).on("contextmenu", "#pl-input-submit", ParchLockQol.ShowHistoryRadial);
        $(document).on("mousedown keydown scroll", ParchLockQol.HideRadialMenu);
        $("#radial-menu").on("mousedown", function(e) { e.stopPropagation(); });
        ParchLockQol.UpdateIndicators();
    },

    ToggleTools: () => {

        if (Message.IsOpen) {

            Message.Hide();
            return;
        }

        if ($("#dialog_cancel").length) {

            $("#dialog_cancel").trigger("click");
            return;
        }

        if ($("#radial-menu").hasClass("show") && $("#radial-menu").data("context").source === "tools") { ParchLockQol.HideRadialMenu(); return; }
        WorkspaceUI.OpenTools();
    },

    UpdateIndicators: () => {

        $("#display-summary").text(Global.Prefs.FontSize + "px / " + Global.Prefs.LineHeight.toFixed(1));
    },

    NormalizeText: (text) => {

        return (text || "")
            .replace(/\u00a0/g, " ")
            .replace(/^>(\S)/gm, "> $1")
            .replace(/[ \t]+\n/g, "\n")
            .trim();
    },

    GetTranscriptText: () => {

        var title = $("title").text().replace(" - " + APPNAME, "").trim();
        var transcript = "";

        $("#windowport .BufferWindow").each(function() {

            var buffer = $(this).clone();
            buffer.find("style, script").remove();

            buffer.find(".BufferLine").each(function() {

                transcript += $(this).text() + "\n";
            });

            if (!buffer.find(".BufferLine").length) transcript += buffer.text() + "\n";
        });

        transcript = ParchLockQol.NormalizeText(transcript);

        if (!transcript) transcript = ParchLockQol.NormalizeText($("#windowport").text());

        return title + "\n" + "=".repeat(title.length) + "\n\n" + transcript + "\n";
    },

    // D114 (operator-reported, pre-existing -- never worked): MainActivity.java
    // is a bare BridgeActivity with no DownloadListener/WebViewClient of any
    // kind, and Android's WebView does not reliably fire download handling
    // for blob: URLs at all even when one IS wired up. An <a download> click
    // on a blob: URL therefore silently did nothing on the APK -- Download
    // map, Text export, transcript download, and every save-package export
    // all funnel through this one function, which is why they all appeared
    // broken together while "Save map" (a named localStorage slot, no OS
    // file interaction) worked fine. Fixed by routing through
    // @capacitor/filesystem + @capacitor/share on a real device (write the
    // blob into the app's cache dir, then hand its file:// uri to the native
    // share sheet so the player can save it to Downloads/Drive/Files/etc.,
    // the standard modern-Android-scoped-storage-safe pattern) -- falling
    // back to the original blob-anchor technique everywhere else (desktop
    // browsers, and any environment without those plugins), unchanged.
    // D121 (operator-reported, D114 shipped broken): the D114 native branch
    // handed Filesystem.writeFile the Blob directly. A Blob cannot cross the
    // Capacitor bridge -- it serializes to {} -- and the plugin's own typings
    // say so outright ("Note: Blob data is only supported on Web",
    // @capacitor/filesystem/dist/esm/definitions.d.ts). The Android side then
    // rejects in FilesystemMethodOptions.kt (`getString("data") ?: return
    // null`) with the literal message "The 'writeFile' input parameters
    // aren't valid.", which this function's own catch then rendered back to
    // the player. Every export funnels through here, so all five failed
    // identically. Native wants a STRING plus an explicit encoding: with no
    // `encoding` the plugin base64-decodes `data`, so fixing the Blob alone
    // would only trade one failure for another. The Blob is still exactly
    // right for the browser fallback below, so it is built there instead.
    DownloadText: (filename, text) => {

        var Cap = window.Capacitor;
        var native = !!(Cap && typeof Cap.isNativePlatform === "function" && Cap.isNativePlatform());
        var CapFs = Cap && Cap.Plugins && Cap.Plugins.Filesystem;
        var CapShare = Cap && Cap.Plugins && Cap.Plugins.Share;
        var CapSave = Cap && Cap.Plugins && Cap.Plugins.SaveFile;

        // D129 (operator-reported): D114/D121 routed every export through the
        // SHARE sheet, which is the right verb for "send this somewhere else"
        // and the wrong one for "save this onto my phone". The player wants
        // the same thing a desktop browser does: a file picker, and a file in
        // Downloads. Android's scoped storage blocks writing there by path
        // (see android/.../SaveFilePlugin.java for why), so the sanctioned
        // route is the Storage Access Framework -- the system's own "Save
        // to..." picker, no permission required. Preferred whenever the
        // native plugin is present; the share route stays as the fallback for
        // an APK built before this existed.
        if (native && CapSave && typeof CapSave.saveFile === "function") {

            CapSave.saveFile({
                filename: filename,
                data: String(text),
                mimeType: ParchLockQol.MimeForFilename(filename)
            }).catch(function (error) {

                var msg = (error && error.message) || String(error || "");
                if (/cancel/i.test(msg)) return;   // backing out is not a failure
                try { Message.Show("Could not save " + ParchLockQol.EscapeHtml(filename), "This file could not be saved" + (msg ? " (" + ParchLockQol.EscapeHtml(msg) + ")" : "") + ".", true); } catch (e) {}
            });
            return;
        }

        if (native && CapFs) {

            CapFs.writeFile({ path: filename, data: String(text), directory: "CACHE", encoding: "utf8", recursive: true }).then(function (result) {

                // Share missing (not installed/synced) is not a reason to
                // silently fall through to the blob-anchor path -- that does
                // nothing at all in an Android WebView, which is the whole
                // reason D114 existed. The bytes ARE on disk at this point,
                // so say so rather than failing quietly.
                if (!CapShare) {
                    Message.Show("Saved " + ParchLockQol.EscapeHtml(filename), "Saved to the app's storage, but this device has no share support available to move it elsewhere.");
                    return;
                }
                return CapShare.share({ title: filename, files: [result.uri] });
            }).catch(function (error) {

                // A player who backs out of the share sheet without picking
                // anything also lands here on some Android versions -- do
                // not treat that as an error worth interrupting them over.
                var msg = (error && error.message) || String(error || "");
                if (/cancel/i.test(msg)) return;
                try { Message.Show("Could not save " + ParchLockQol.EscapeHtml(filename), "This file could not be saved or shared" + (msg ? " (" + ParchLockQol.EscapeHtml(msg) + ")" : "") + ".", true); } catch (e) {}
            });
            return;
        }

        var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    // Android's document picker filters the visible folders by MIME type, so
    // a wrong or missing type can make a file manager look empty. Derived
    // from the extension the export already chose.
    MimeForFilename: (filename) => {
        var ext = String(filename || "").toLowerCase().split(".").pop();
        if (ext === "txt") return "text/plain";
        if (ext === "json") return "application/json";
        return "application/octet-stream";
    },

    SavePackageAs: async () => {
        var filename = ParchLockQol.ExportFilename("Save package", undefined, "json");
        var data = await ParchLockQol.PackageWithTranscripts(ParchLock.GetSaveData());
        if (!window.showSaveFilePicker) { ParchLockQol.DownloadText(filename, data); return; }
        try {
            var handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: "ParchLock save package", accept: { "application/json": [".json"] } }] });
            var stream = await handle.createWritable();
            await stream.write(data); await stream.close();
            $("#save-location").text("Saved: " + handle.name);
        } catch (error) {
            if (error.name !== "AbortError") Message.Show("Save failed", ParchLockQol.EscapeHtml(error.message), true);
        }
    },

    // E4: a package carries the transcript token and lines of each save in it.
    // Packages without transcripts (and older packages) are unchanged.
    PackageWithTranscripts: (json) => {
        try {
            if (typeof Transcript === "undefined" || !Transcript.exportFor) return Promise.resolve(json);
            var data = JSON.parse(json);
            var names = (data.Save || []).map(s => String(s && s.Key || "")).filter(k => /^dirent:save:/.test(k)).map(k => k.split(":").slice(3).join(":"));
            // D215: each save's own map and item labels travel with it.
            try { var states = typeof SaveState !== "undefined" ? SaveState.exportFor(names) : null; if (states) { data.SaveStates = states; json = JSON.stringify(data); } } catch (eStates) {}
            return Transcript.exportFor(names).then(t => { if (t) data.Transcripts = t; return JSON.stringify(data); }, () => json);
        } catch (e) { return Promise.resolve(json); }
    },

    CopyText: (text, successMessage) => {

        if (navigator.clipboard && navigator.clipboard.writeText) {

            navigator.clipboard.writeText(text).then(() => {
                Message.Show("Copied", successMessage || "Copied to clipboard.");
            }).catch(() => {
                ParchLockQol.ShowCopyFallback(text);
            });
        }
        else {

            ParchLockQol.ShowCopyFallback(text);
        }
    },

    ShowCopyFallback: (text) => {

        Message.Show("Copy", "<div class='pl-tool-content'><textarea id='copy-box' aria-label='Text to copy' readonly></textarea></div>", true);
        $("#copy-box").val(text).focus().select();
    },

    // E4: the running transcript for this line of play (js/Transcript.js),
    // falling back to the on-screen text only when nothing is stored yet.
    ShowTranscript: () => {
        var stored = (typeof Transcript !== "undefined" && Transcript.getText) ? Transcript.getText() : Promise.resolve(null);
        stored.then(function (text) { ParchLockQol.ShowTranscriptText(text || ParchLockQol.GetTranscriptText()); },
            function () { ParchLockQol.ShowTranscriptText(ParchLockQol.GetTranscriptText()); });
    },
    ShowTranscriptText: (text) => {
        var body = "";
        var lineCount = text.split("\n").length;

        body += "<div class='qol-window-actions'>";
        body += "<span>" + lineCount + " lines</span>";
        body += "<button id='copy-transcript'>Copy</button>";
        body += "<button id='download-transcript'>Download</button>";
        body += "</div>";
        body += "<textarea id='transcript-box' aria-label='Story transcript' class='qol-large-text' readonly></textarea>";

        Message.Show("Transcript", "<div class='pl-tool-content'>" + body + "</div>", true);

        $("#transcript-box").val(text);
        $("#copy-transcript").click(() => ParchLockQol.CopyText(text, "Transcript copied to clipboard."));
        $("#download-transcript").click(() => ParchLockQol.DownloadText(ParchLockQol.ExportFilename("Transcript", (typeof Transcript !== "undefined" && Transcript.currentSaveLabel) || undefined, "txt"), text));
    },

    // T10 (operator): every command the player SENDS, however it was sent
    // (typed, radial, map, menu, voice, repeat), newest first. Recorded at the
    // submission choke points (Input.Inject, Enter); status probes excluded there.
    _sent: [],
    RecordSent: (command) => {
        var c = ParchLockQol.NormalizeText(String(command || ""));
        if (!c) return;
        var key = c.toLowerCase();
        ParchLockQol._sent = [c].concat(ParchLockQol._sent.filter(function (x) { return x.toLowerCase() !== key; })).slice(0, 30);
    },

    GetHistory: () => {

        var seen = {};
        var history = [];
        // Commands sent this session come first, in the order sent.
        ParchLockQol._sent.forEach(function (c) {
            if (seen[c.toLowerCase()]) return;
            seen[c.toLowerCase()] = true;
            history.push(c);
        });

        $($(".Style_input").get().reverse()).each(function() {

            // T10/D207: only what the player actually submitted. A hidden
            // status probe's echo is excluded by its ownership, never by its
            // verb, so a typed "score" still counts.
            if (this.closest && this.closest(".pl-stat-probe, .pl-carry-probe")) return;
            var command = ParchLockQol.NormalizeText($(this).text());
            if (!command || seen[command.toLowerCase()]) return;

            seen[command.toLowerCase()] = true;
            history.push(command);
        });

        return history.slice(0, 30);
    },

    // T10: a readable radial label. Keeps the start (the verb), cuts at a word
    // boundary and marks the cut; a single overlong word is hard-cut. Only the
    // label is shortened -- the full command is what gets submitted.
    HistoryLabel: (command, max) => {
        var text = String(command || "").replace(/\s+/g, " ").trim();
        max = max || 22;
        if (text.length <= max) return text;
        var room = text.slice(0, max - 1);
        var space = room.lastIndexOf(" ");
        var cut = space > 0 ? room.slice(0, space) : room;
        return cut.replace(/[\s,.;:]+$/, "") + "…";
    },

    // T10: the Submit button's hold radial -- the player's own recent
    // commands, newest first. Choosing one submits it (Enter: true routes
    // through Actionable.Submit, the single submission path).
    GetHistoryRadialCommands: () => {
        // Every remembered command; the radial pages the rest behind "More...".
        var items = ParchLockQol.GetHistory().map(function (command) {
            return { Label: ParchLockQol.HistoryLabel(command, 22), Command: command, Enter: true, source: "history" };
        });
        if (!items.length) items.push({ Label: "No commands yet", Action: function () {} });
        return items;
    },

    ShowHistoryRadial: (e) => {
        e.preventDefault();
        e.stopPropagation();
        ParchLockQol.OpenRadial(e.clientX, e.clientY, ParchLockQol.GetHistoryRadialCommands(), { source: "history" });
    },

    ShowHistory: () => {

        var history = ParchLockQol.GetHistory();
        var body = "";

        if (!history.length) {

            body = "<p>No commands have been entered yet.</p>";
        }
        else {

            body += "<div class='qol-command-list'>";
            history.forEach(command => {
                body += "<button class='qol-command' data-command='" + ParchLockQol.EscapeAttr(command) + "'>" + ParchLockQol.EscapeHtml(command) + "</button>";
            });
            body += "</div>";
        }

        Message.Show("Command History", "<div class='pl-tool-content'>" + body + "</div>", true);
        // A chosen past command runs at once, like the Send-hold history radial.
        $(".qol-command").click(function() {
            ParchLockQol.RunDialogCommand($(this).data("command"));
        });
    },

    ShowCommands: () => {

        var body = "";

        body += "<h3>Actions</h3>";
        body += ParchLockQol.BuildCommandButtons(ParchLockQol.CommonCommands);
        body += "<h3>Directions</h3>";
        body += ParchLockQol.BuildCommandButtons(ParchLockQol.Directions);
        body += "<h3>ParchLock</h3>";
        body += ParchLockQol.BuildCommandButtons(Input.GetAllSpecialCommands());
        body += "<h3>Map</h3>";
        body += ParchLockQol.BuildMapCommandButtons();

        Message.Show("Commands", "<div class='pl-tool-content'>" + body + "</div>", true);
        $(".qol-command").click(function() {
            ParchLockQol.RunDialogCommand($(this).data("command"));
        });
    },

    // Operator rule (2026-10-25): Commands and History dialog buttons use the
    // one shared decision (Actionable.runChosenCommand). A complete command --
    // look, n, undo, /map, "/goto Room;" -- runs at once; a stem ("examine ",
    // "take ", "unlock ") is left in the line for the player to finish.
    RunDialogCommand: (command) => {
        Message.Hide();
        return Actionable.runChosenCommand(command == null ? "" : String(command));
    },

    BuildCommandButtons: (commands) => {

        var html = "<div class='qol-command-list'>";

        commands.forEach(command => {
            html += "<button class='qol-command' data-command='" + ParchLockQol.EscapeAttr(command) + "'>" + ParchLockQol.EscapeHtml(command) + "</button>";
        });

        return html + "</div>";
    },

    BuildMapCommandButtons: () => {

        var html = "<div class='qol-command-list'>";
        var rooms = ParchLockMap.Rooms.slice(0, 30);

        rooms.forEach(room => {
            html += "<button class='qol-command' data-command='/goto " + ParchLockQol.EscapeAttr(room.Name) + ";'>go " + ParchLockQol.EscapeHtml(room.Name) + "</button>";
        });

        if (!rooms.length) html += "<p>No rooms have been mapped yet.</p>";

        return html + "</div>";
    },

    ShowDisplay: () => {

        var body = "";

        body += "<div class='qol-display-row'><span>Text size</span><button id='font-smaller' aria-label='Decrease text size'>-</button><strong id='font-size-value'></strong><button id='font-larger' aria-label='Increase text size'>+</button></div>";
        body += "<div class='qol-display-row'><span>Line spacing</span><button id='line-tighter' aria-label='Decrease line spacing'>-</button><strong id='line-height-value'></strong><button id='line-looser' aria-label='Increase line spacing'>+</button></div>";
        body += "<p><button id='display-reset'>Reset Display</button></p>";

        Message.Show("Display", "<div class='pl-tool-content'>" + body + "</div>", true);

        var refresh = () => {
            $("#font-size-value").text(Global.Prefs.FontSize + "px");
            $("#line-height-value").text(Global.Prefs.LineHeight.toFixed(1));
            ParchLockQol.UpdateIndicators();
        };

        $("#font-smaller").click(() => { Global.SetFontSize(Global.Prefs.FontSize - 1); refresh(); });
        $("#font-larger").click(() => { Global.SetFontSize(Global.Prefs.FontSize + 1); refresh(); });
        $("#line-tighter").click(() => { Global.SetLineHeight(Math.round((Global.Prefs.LineHeight - 0.1) * 10) / 10); refresh(); });
        $("#line-looser").click(() => { Global.SetLineHeight(Math.round((Global.Prefs.LineHeight + 0.1) * 10) / 10); refresh(); });
        $("#display-reset").click(() => { Global.SetFontSize(25); Global.SetLineHeight(1.4); refresh(); });

        refresh();
    },

    ShowSaveManager: () => {

        var body = "";
        var saves = ParchLockQol.GetStoredFiles();

        body += "<div class='qol-window-actions'>";
        body += "<span>" + saves.length + " browser save files</span>";
        body += "<button id='native-save'>Game Save</button>";
        body += "<button id='native-restore'>Game Restore</button>";
        body += "<button id='download-package'>Download Package</button>";
        body += "<button id='save-package-as'>Save Package As...</button><span id='save-location'></span>";
        body += "</div>";
        body += "<p class='qol-note'>Browser games cannot silently choose an arbitrary save path. Download exports go to your browser's configured downloads folder, and imports use a file picker.</p>";
        body += "<div class='qol-save-grid'>";
        body += "<button id='import-package-file'>Import File</button>";
        body += "<button id='import-package-text'>Paste Import</button>";
        body += "<button id='copy-package'>Copy Package</button>";
        body += "</div>";
        body += "<input id='save-package-file' type='file' accept='.json,application/json,text/plain'>";
        body += "<div id='save-file-list'>";

        if (!saves.length) {

            body += "<p>No Parchment save files are currently stored for this story.</p>";
        }
        else {

            saves.forEach(save => {

                body += "<div class='save-row'>";
                body += "<strong>" + ParchLockQol.EscapeHtml(save.Filename) + "</strong>";
                body += "<span>" + ParchLockQol.EscapeHtml(save.Usage) + "</span>";
                body += "<button class='download-save-file' data-key='" + ParchLockQol.EscapeAttr(save.Key) + "'>Download</button>";
                body += "<button class='delete-save-file' data-dirent='" + ParchLockQol.EscapeAttr(save.DirentKey) + "' data-content='" + ParchLockQol.EscapeAttr(save.ContentKey) + "'>Delete</button>";
                body += "</div>";
            });
        }

        body += "</div>";

        Message.Show("Save / Restore", "<div class='pl-tool-content'>" + body + "</div>", true);

        $("#native-save").click(() => { Message.Hide(); Input.Clear(); Input.Inject("save", true); });
        $("#native-restore").click(() => { Message.Hide(); Input.Clear(); Input.Inject("restore", true); });
        $("#download-package").click(() => { var name = ParchLockQol.ExportFilename("Save package", undefined, "json"); ParchLockQol.PackageWithTranscripts(ParchLock.GetSaveData()).then(data => ParchLockQol.DownloadText(name, data)); });
        $("#save-package-as").click(ParchLockQol.SavePackageAs);
        $("#copy-package").click(() => ParchLockQol.PackageWithTranscripts(ParchLock.GetSaveData()).then(data => ParchLockQol.CopyText(data, "Save package copied to clipboard.")));
        $("#import-package-file").click(() => $("#save-package-file").trigger("click"));
        $("#import-package-text").click(ParchLockQol.ShowImportPackageText);
        $("#save-package-file").change(ParchLockQol.ImportPackageFile);
        $(".download-save-file").click(function() {

            var key = $(this).data("key");
            var metadataKey = key.replace(/^content:/, "dirent:");
            var data = { Story: ParchLock.GameFilename, Map: ParchLockMap.Rooms, Save: [metadataKey, key].map(k => ({ Key: k, Data: localStorage.getItem(k) })) };
            // The player's own save name labels the file.
            var name = ParchLockQol.ExportFilename("Save", String(key).split(":").slice(3).join(":"), "json");
            ParchLockQol.PackageWithTranscripts(JSON.stringify(data)).then(text => ParchLockQol.DownloadText(name, text));
        });
        $(".delete-save-file").click(function() {

            if (!window.confirm("Delete this browser save?")) return;
            localStorage.removeItem($(this).data("dirent"));
            localStorage.removeItem($(this).data("content"));
            // E4: a deleted save takes its own transcript with it.
            try { if (typeof Transcript !== "undefined" && Transcript.reconcileSaves) Transcript.reconcileSaves(); } catch (eTx) {}
            ParchLockQol.ShowSaveManager();
        });
    },

    GetStoredFiles: () => {

        var files = [];

        Object.keys(localStorage).forEach(key => {

            if (key.indexOf("dirent:") != 0) return;

            var parts = key.replace("dirent:", "").split(":");
            var usage = parts[0] || "";
            var gameId = parts[1] || "";
            var filename = parts.slice(2).join(":") || "(unnamed)";

            if (!ParchLock.GameId || gameId != ParchLock.GameId) return;

            files.push({
                Key: "content:" + usage + ":" + gameId + ":" + filename,
                DirentKey: key,
                ContentKey: "content:" + usage + ":" + gameId + ":" + filename,
                Usage: usage,
                Filename: filename
            });
        });

        return files.sort((a, b) => a.Filename.localeCompare(b.Filename));
    },

    ImportPackageFile: function() {

        var file = this.files && this.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = () => ParchLockQol.ImportPackageData(reader.result);
        reader.readAsText(file);
    },

    ShowImportPackageText: () => {

        var body = "";
        body += "<textarea id='import-package-box' aria-label='Save package JSON' placeholder='Paste your save package here' class='qol-large-text'></textarea>";
        body += "<p><button id='import-package-submit'>Import Package</button></p>";

        Message.Show("Import Save Package", "<div class='pl-tool-content'>" + body + "</div>", true);
        $("#import-package-submit").click(() => ParchLockQol.ImportPackageData($("#import-package-box").val()));
    },

    ImportPackageData: (text) => {

        var previous = [], previousRooms = ParchLockMap.Rooms, importSucceeded = false;
        var previousBlocked = ParchLockMap.PersistenceBlocked;
        try {

            var data = JSON.parse(text);

            if (!data || !Array.isArray(data.Map) || !Array.isArray(data.Save)) throw new Error("Invalid package");
            if (data.Story && data.Story !== ParchLock.GameFilename) throw new Error("This package belongs to another story");
            WorkspaceUI.ValidateMap(data);
            // E4: transcript records are validated before anything is changed.
            if (typeof Transcript !== "undefined" && Transcript.validImport && !Transcript.validImport(data.Transcripts)) throw new Error("Invalid transcript records in this package");
            if (typeof SaveState !== "undefined" && !SaveState.validImport(data.SaveStates)) throw new Error("Invalid save map records in this package");
            if (data.Map.some((room, index) => room.Id !== index || Object.values(room.Exits).some(id => !Number.isInteger(id) || id < 0 || id >= data.Map.length))) throw new Error("Invalid room connections");
            if (data.Save.some(entry => !entry || typeof entry.Key !== "string" || typeof entry.Data !== "string" || !/^(dirent|content):(save|data|transcript|command):[^:]+:.+/.test(entry.Key))) throw new Error("Invalid save entries");
            if (data.Save.length && !ParchLock.GameId) throw new Error("Wait for the story identity before importing saves");
            if (ParchLock.GameId && data.Save.some(entry => entry.Key.split(":")[2] !== ParchLock.GameId)) throw new Error("This save belongs to another story");
            if (!ParchLock.GameFilename) throw new Error("Open a story before importing a map");
            if (new Set(data.Save.map(entry => entry.Key)).size !== data.Save.length) throw new Error("Duplicate save entries in this package");
            var stateWrites = [];
            if (typeof SaveState !== "undefined") {
                if ((data.Save.length || data.SaveStates) && SaveState.importReady && !SaveState.importReady()) throw new Error("Wait for the story to finish loading before importing saves.");
                var importedNames = data.Save.map(entry => entry.Key).filter(k => /^dirent:save:/.test(k)).map(k => k.split(":").slice(3).join(":"));
                stateWrites = SaveState.importWrites(data.SaveStates, importedNames);
            }
            var mapKey = "PL_Map_" + ParchLock.GameFilename;
            previous.push({ Key: mapKey, Data: localStorage.getItem(mapKey) });

            // D112: a new Rooms array invalidates any active Notes scope
            // (the previously-scoped room record no longer exists in it).
            if (data.Map) { if (typeof MapTopology !== "undefined" && MapTopology.quarantineUnprovenSubSteps) MapTopology.quarantineUnprovenSubSteps(data.Map); ParchLockMap.Rooms = data.Map; ParchLockMap.NotesScopeRoomKey = null; }
            if (data.Save) {

                data.Save.forEach(k => {
                    previous.push({ Key: k.Key, Data: localStorage.getItem(k.Key) });
                    localStorage.setItem(k.Key, k.Data);
                });
            }

            // D215: each imported game save gets exactly its packaged map and
            // labels (or loses an old one), inside this import's rollback.
            if (typeof SaveState !== "undefined") {
                stateWrites.forEach(w => {
                    previous.push({ Key: w.Key, Data: localStorage.getItem(w.Key) });
                    if (w.Data === null) localStorage.removeItem(w.Key); else localStorage.setItem(w.Key, w.Data);
                });
            }

            ParchLockMap.Draw();
            ParchLockMap.RebuildRoomsList();
            ParchLockMap.RebuildNotesList();
            ParchLockMap.ApplyNotesAddButtonPref();
            ParchLockMap.PersistenceBlocked = false;
            ParchLockMap.Save();
            try { if (typeof Transcript !== "undefined" && Transcript.importRecords && data.Transcripts) Transcript.importRecords(data.Transcripts); } catch (eTx) {}

            Message.Show("Import Complete", "The save package and map data were imported.");
            importSucceeded = true;
        }
        catch(e) {

            ParchLockMap.Rooms = previousRooms;
            ParchLockMap.PersistenceBlocked = previousBlocked;
            previous.reverse().forEach(entry => {
                try { if (entry.Data === null) localStorage.removeItem(entry.Key); else localStorage.setItem(entry.Key, entry.Data); }
                catch (rollbackError) { ParchLockMap.PersistenceBlocked = true; }
            });
            Message.Show("Import Failed", ParchLockQol.EscapeHtml(e.message), true);
        }
        if (importSucceeded && typeof SaveState !== "undefined" && SaveState.afterImport) SaveState.afterImport();
    },

    GetRadialCommands: () => {
        if (typeof Actionable !== "undefined" && Actionable.withResolutionPool && !Actionable._resolutionPool && !Actionable._lazyPoolScope) {
            return Actionable.withResolutionPool(function () { return ParchLockQol.GetRadialCommands(); });
        }
        /* D26/#8: app chrome is local; look/inventory/wait are Inform-family
           universals (not story guesses); remaining game-content is RAM. */
        var chrome = [
            { Command: "undo", Label: "Undo", Enter: true, Score: 54, source: "chrome" },
            { Command: "save", Label: "Save", Enter: true, Score: 38, source: "chrome" },
            { Command: "restore", Label: "Restore", Enter: true, Score: 34, source: "chrome" },
            { Command: "/map", Label: "Map", Enter: false, Score: 30, source: "chrome" },
            { Command: "/history", Label: "History", Enter: false, Score: 28, source: "chrome" },
            { Command: "/transcript", Label: "Transcript", Enter: false, Score: 24, source: "chrome" }
        ];
        var universals = [
            { Command: "look", Label: "Look", Enter: true, Score: 50, source: "universal" },
            { Command: "inventory", Label: "Inventory", Enter: true, Score: 50, source: "universal" },
            { Command: "wait", Label: "Wait", Enter: true, Score: 50, source: "universal" }
        ];
        var game = [];
        var seen = {};
        chrome.forEach(function (x) { seen[x.Command.toLowerCase()] = true; });
        // Reserve D26 universals before dictionary-verb specialCommands
        // consume look/inventory/wait at the lower dump score.
        universals.forEach(function (x) { seen[x.Command.toLowerCase()] = true; });
        var pushGame = function (item) {
            var key = String(item.Command || "").toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            game.push(item);
        };
        try {
            var p = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            ((p && p.specialCommands) || []).forEach(function (c) {
                var cmd = typeof c === "string" ? c : (c && (c.command || c.label));
                if (!cmd) return;
                cmd = String(cmd).trim();
                if (!cmd) return;
                var lab = (typeof c === "object" && c.label) ? String(c.label) : cmd;
                var fromDict = typeof c === "object" && c.source === "dictionary-verb";
                // Dictionary verbs are game-wide vocabulary (D34 follow-up),
                // not the current room's exits. Keep them below ram-exit /
                // ram-synth so a 200-word dump does not bury real exits.
                var score = fromDict ? 42 : 60;
                pushGame({ Command: cmd, Label: lab, Enter: !/\s$/.test(cmd), Score: score, source: fromDict ? "dictionary-verb" : "ram-special" });
            });
            ((p && p.exits) || []).forEach(function (e) {
                var label = String((e && e.label) || "").trim();
                if (!label) return;
                // D54: the display label is not always real game vocabulary
                // (an I7 numbered exit's own "exit-91" placeholder submits
                // as "x1" instead, confirmed live) -- use the exit's own
                // real command, defaulting to the label for ordinary
                // compass exits where the two are the same word.
                var realCommand = (e && e.command) || label;
                pushGame({ Command: realCommand, Label: label, Enter: true, Score: 52, source: "ram-exit" });
            });
            // D88 Stage 6 cutover point (default off): flag on sources from
            // SemanticActions.resolveForPayload, proven byte-parity with
            // ActionSynth.collectFromPayload (harness/d88-semantic-parity.js).
            var cutoverOn = false;
            try { cutoverOn = typeof SemanticActions !== "undefined" && SemanticActions.CutoverFlag && SemanticActions.CutoverFlag.isEnabled(); } catch (eF) {}
            var synthCommands = null;
            if (cutoverOn) {
                try { synthCommands = SemanticActions.resolveForPayload(p); } catch (eSA) { synthCommands = null; }
            }
            if (!synthCommands && p && typeof ActionSynth !== "undefined" && ActionSynth.commandsForObject) {
                synthCommands = ActionSynth.collectFromPayload(p);
            }
            (synthCommands || []).forEach(function (c) {
                    var stem = String(c.verb || "").trim();
                    if (!stem) return;
                    pushGame({ Command: stem + " ", Label: stem, Enter: false, Score: 48, source: "ram-synth" });
            });
        } catch (e) {}
        return chrome.concat(universals).concat(game);
    },

    ShowRadialMenu: (e) => {

        // D105 (F3): on mobile, while the keyboard is open on the line field, Android's long-press
        // may emit contextmenu; leave it alone so the native Cut/Copy/Paste menu owns the gesture.
        try {
            if (document.body.classList.contains("pl-mobile") && typeof Input !== "undefined"
                && Input.KbIntent && Input.KbIntent() === "line"
                && document.activeElement && $(document.activeElement).is(".Input.LineInput")) return;
        } catch (eKb) {}

        e.preventDefault();
        e.stopPropagation();

        var commands = ParchLockQol.GetRadialCommands();
        ParchLockQol.OpenRadial(e.clientX, e.clientY, commands, { source: "input" });
    },

    /* Confirmed item preferences precede usage. Within each tier, retain
       D110's uncapped usage, source prior and stable original order. */
    RankRadialCommands: (commands, context) => {
        var ranked = (commands || []).map(function (item, index) {
            var next = Object.assign({}, item);
            var prior = Number(next.Prior != null ? next.Prior : next.Score);
            if (!isFinite(prior)) prior = 0;
            if (next.Enter === false && next.Command && !next.UsageKey) {
                next.UsageKey = "radial:" + Actionable.usageKey(next.Command);
                next.TrackTap = true;
            }
            var count = 0;
            var bonus = 0;
            try {
                if (typeof Actionable !== "undefined" && Actionable.usageCount) {
                    count = Actionable.usageCount(next.Command, next.UsageKey);
                    bonus = Actionable.usageBonus(next.Command, next.UsageKey);
                }
            } catch (eB) {}
            next.Prior = prior;
            next.Score = prior;
            next.UsageCount = Number(count) > 0 ? Number(count) : 0;
            next.Usage = bonus;
            next.LearnedPriority = 0;
            try {
                var c = next.LearnedCommand;
                if (context && ['text', 'inventory'].indexOf(context.source) >= 0 && context.objectId != null &&
                    c && String(c.objectId) === String(context.objectId) && c.command === next.Command &&
                    Actionable.learnedItemScopeCurrent(c, c.learnedItemScope && c.learnedItemScope.context) && Actionable.radialCommandCurrent(c)) next.LearnedPriority = 1;
            } catch (eLearning) {}
            next._radialOriginalIndex = index;
            return next;
        });
        ranked.sort(function (a, b) {
            return (b.LearnedPriority - a.LearnedPriority)
                || (b.UsageCount - a.UsageCount)
                || (b.Prior - a.Prior)
                || (a._radialOriginalIndex - b._radialOriginalIndex);
        });
        var topTier = ranked.length ? ranked[0].LearnedPriority : 0;
        var top = ranked.filter(function (item) { return item.LearnedPriority === topTier; });
        var maxCount = top.reduce(function (n, item) { return Math.max(n, item.UsageCount); }, 0);
        var uniqueLeader = maxCount > 0 && top.filter(function (item) { return item.UsageCount === maxCount; }).length === 1;
        ranked.forEach(function (item) { item._usageLeader = uniqueLeader && item.LearnedPriority === topTier && item.UsageCount === maxCount; });
        return ranked;
    },

    RankInputRadialCommands: (commands) => {
        return ParchLockQol.RankRadialCommands(commands);
    },

    ObjectStatusStamp: () => {
        try {
            var mem = AttributeSchema._getMem(), digest = ModuleLibrary.currentExecutableDigest();
            if (!mem || !digest) return null;
            return { generation: typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0, digest: digest, buffer: mem.buffer, offset: mem.byteOffset, length: mem.byteLength };
        } catch (eStamp) { return null; }
    },
    ObjectStatusForRadial: (context) => {
        try {
            var stamp = context && context.objectStatusStamp, now = ParchLockQol.ObjectStatusStamp();
            if (!stamp || !now || stamp.generation !== now.generation || stamp.digest !== now.digest || stamp.buffer !== now.buffer || stamp.offset !== now.offset || stamp.length !== now.length ||
                ["text", "inventory"].indexOf(context.source) < 0 || context.kind === "direction" || !Number.isInteger(context.objectId) ||
                (typeof UndoRestoreSync !== "undefined" && UndoRestoreSync.pending) || (typeof CharKeys !== "undefined" && CharKeys._composing)) return null;
            var fields = document.querySelectorAll(".Input.LineInput");
            if (fields.length !== 1 || fields[0].value || document.getElementById("dialog") || (typeof Message !== "undefined" && Message.IsOpen) ||
                (typeof StatTracker !== "undefined" && (StatTracker._probeActive || StatTracker._hideCarryProbe))) return null;
            var pool = Actionable.payloadPool(), objects = pool.filter(o => o && o.id === context.objectId);
            if (objects.length !== 1) return null;
            var ref = Actionable.referenceFor(objects[0]);
            if (!ref.unique || !ref.verified) return null;
            return AttributeSchema.lockedObjectStatus(context.objectId);
        } catch (eStatus) { return null; }
    },
    OpenRadial: (clientX, clientY, commands, context, pageIndex) => {

        if (typeof LearnedWords !== "undefined" && context && context.objectId != null) commands = commands.map(function (c) {
            var form = c.Form;
            if (!form && c.Command && context.noun && c.Command.endsWith(" " + context.noun)) form = c.Command.slice(0, -(context.noun.length + 1));
            return form ? Object.assign({}, c, { Label: LearnedWords.commandLabel(context.objectId, form, c.Label) }) : c;
        });

        var menu = $("#radial-menu");
        // Mobile: opening any radial must collapse the soft keyboard so the
        // menu is not buried under the IME (operator: keyboard only when the
        // line field is deliberately short-tapped).
        try {
            if (document.body.classList.contains("pl-mobile")
                && typeof Input !== "undefined" && Input.DismissKeyboard) {
                Input.DismissKeyboard();
            }
        } catch (eKb) {}
        // D93 (G18): defensive-only timestamp -- a touch-fired long-press
        // (Actionable.js) can produce a trailing, browser-synthesized
        // compatibility mousedown shortly after Open() runs; HideRadialMenu
        // below ignores a mousedown that arrives within this window so a
        // radial can never be dismissed by the very gesture that opened it.
        // (Actionable.js's own preventDefault on a fired long-press's
        // touchend already suppresses this in practice -- this is a second,
        // belt-and-suspenders guard, not evidence the bug is currently live.)
        ParchLockQol._radialOpenedAt = Date.now();
        $("body").addClass("radial-open");
        ParchLockQol.BeginRadialSelection();
        menu.data("context", context);
        context = context || {};
        commands = (commands || []).slice();

        // D93 (G17): the Tools menu (WorkspaceUI.OpenTools, up to 12 entries)
        // is a fixed utility list, not an adaptive command radial --
        // paginating it behind "More..." on phones (capacity 6 below) buried
        // Options/Theme/Display/Commands/Help/Transcript on a second page for
        // no reason tied to any ranking discipline. On the mobile shell, the
        // Tools context renders as a simple scrollable vertical list instead
        // of the circular radial layout -- every entry reachable by scrolling,
        // no pagination, no "More...". Object/input radials are untouched;
        // D110 ranking is not applied to this branch.
        // Tools list only (not Game Menu radial). Close X + hide when .show
        // is removed. Does not alter Game Menu behavior.
        if (context.source === "tools") {
            menu.empty().addClass("show").attr("aria-hidden", "false").addClass("pl-tools-list");
            $("body").addClass("radial-open");
            var header = $("<div>").addClass("pl-tools-header").appendTo(menu);
            $("<h3>").addClass("pl-tools-heading").text("Tools").appendTo(header);
            $("<button>")
                .addClass("pl-tools-close")
                .attr({ type: "button", title: "Close", "aria-label": "Close tools" })
                .text("✕")
                .appendTo(header)
                .on("click", function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    ParchLockQol.HideRadialMenu();
                });
            var groups = [
                ["Game & files", ["Save", "Restore", "Save files", "Maps", "Map files", "Modules", "Choose story", "Exit game"]],
                ["Play & navigation", ["Open map", "Arrow keys", "Items", "Commands"]],
                ["Your workspace", ["Transcript", "History", "Edit Learned Words"]],
                ["Preferences", ["Display", "Theme", "Options"]],
                ["Information", ["Help", "About"]]
            ];
            var details = { "Save": "Save in the game", "Restore": "Return to a game save", "Save files": "Back up and import progress", "Maps": "Save and export maps", "Map files": "Save and export maps", "Modules": "Manage your game library", "Items": "Inventory and status", "Transcript": "Read or export your story", "History": "Reuse a recent command", "Edit Learned Words": "Review words and labels", "Display": "Text size and spacing", "Commands": "Browse command shortcuts", "Help": "Controls and guidance", "About": "Credits and documents", "Theme": "Switch light and dark", "Options": "Game and app preferences", "Open map": "Show your discovered rooms", "Arrow keys": "On-screen game controls", "Exit game": "Leave this story", "Choose story": "Open the game library" };
            var groupedLabels = groups.flatMap(group => group[1]);
            var otherLabels = commands.filter(item => !groupedLabels.includes(item.Label)).map(item => item.Label);
            if (otherLabels.length) groups.push(["More tools", otherLabels]);
            groups.forEach(function (group) {
                var members = commands.filter(item => group[1].includes(item.Label));
                if (!members.length) return;
                $("<div>").addClass("pl-tools-section").text(group[0]).appendTo(menu);
                members.forEach((item) => {
                $("<button>")
                    .addClass("radial-command")
                    .append($("<span>").text(item.Label))
                    .append($("<span>").addClass("pl-tool-detail").text(details[item.Label] || ""))
                    .attr("title", item.Command)
                    .data("command", item.Command)
                    .data("enter", item.Enter)
                    .data("action", item.Action)
                    .appendTo(menu);
                });
            });
            menu.find(".radial-command").off("click.pmToolsList").on("click.pmToolsList", function () {
                var command = $(this).data("command");
                ParchLockQol.HideRadialMenu();
                var action = $(this).data("action");
                if (action) { action(); return; }
                Actionable.runChosenCommand(command);
            });
            ParchLockQol.ClearRadialSelection();
            return;
        }
        menu.removeClass("pl-tools-list");

        /* Every adaptive command radial shares one usage-first order. Fixed
           Tools and game-menu lists retain their authored order. Ranking is
           recomputed before pagination so a new tap can change the next open. */
        // T10: history keeps the order the player typed it in.
        if (context.source !== "tools" && context.source !== "game" && context.source !== "history") {
            commands = ParchLockQol.RankRadialCommands(commands, context);
        }
        var capacity = window.innerWidth < 600 || window.innerHeight < 600 ? 6 : 16;
        if (commands.length > capacity) {
            var allCommands = commands.slice();
            // Object suggestions are the continuation after the last action
            // page, not a second More button beside the page navigator.
            var continuation = allCommands.find(item => item.MoreSuggestions === true);
            var pagedCommands = continuation ? allCommands.filter(item => item !== continuation) : allCommands;
            var page = pageIndex || 0;
            var pageCount = Math.ceil(pagedCommands.length / (capacity - 1));
            commands = pagedCommands.slice(page * (capacity - 1), (page + 1) * (capacity - 1));
            if (continuation && page === pageCount - 1) commands.push(continuation);
            else commands.push({ Label: "More...", Action: () => ParchLockQol.OpenRadial(clientX, clientY, allCommands, context, (page + 1) % pageCount) });
        }
        var size = Math.min(window.innerWidth - 16, window.innerHeight - 16, capacity === 6 || commands.length <= 8 ? 330 : 460);
        menu.css({ width: size, height: size });
        // Any item missing a numeric Usage (e.g. the synthetic "More..."
        // overflow button, or an object-radial command that never carried
        // one) must not poison Math.max for the WHOLE radial -- a single
        // undefined operand makes Math.max return NaN, which previously
        // blanked the fill percentage on every button, not just the one
        // missing a value.
        //
        // The fill percentage is deliberately usage-only, not the blended
        // Score (confidence prior + usage bonus): Score is a ranking/prior
        // value, and several commands on the same object routinely share
        // the same base confidence, so normalizing fill against maxScore
        // made every command in a freshly-opened radial show up ~100%
        // filled even with zero real usage -- exactly backwards from the
        // "fills in as you use it more" behavior this bar is meant to show.
        var safeUsage = (c) => (typeof c.Usage === "number" && !isNaN(c.Usage)) ? c.Usage : 0;
        // D46: normalize the FILL against the same absolute ceiling
        // Actionable.usageBonus saturates at (Actionable.MAX_USAGE_BONUS),
        // not against maxUsage among the CURRENT radial's items. Fill
        // relative to the local max meant the very first real use of
        // anything was, by definition, "the max" in that radial -- dividing
        // it by itself snapped straight to 100% after a single click, which
        // is exactly backwards (fill should visibly grow over several uses,
        // not instantly cap). With an absolute ceiling, one use shows a
        // modest partial fill and it takes several real uses to fully
        // saturate. When nothing has been used yet, every item is 0%.
        var usageCeiling = (typeof Actionable !== "undefined" && typeof Actionable.MAX_USAGE_BONUS === "number")
            ? Actionable.MAX_USAGE_BONUS : 36;

        menu.empty().addClass("show").attr("aria-hidden", "false");
        var objectStatus = ParchLockQol.ObjectStatusForRadial(context);
        if (objectStatus) $("<span>").addClass("pl-object-status").text(objectStatus).appendTo(menu);

        var menuSize = menu.outerWidth();
        // D215: give the desktop game-menu labels room; keep its outer ring.
        var spaciousGameMenu = capacity !== 6 && context.source === "game";
        var firstRadius = capacity === 6 ? menuSize * 0.33 : spaciousGameMenu ? 110 : 95;
        var ringGap = spaciousGameMenu ? 71 : 86;
        var maxRadius = (menuSize / 2) - 34;

        commands.forEach((item, index) => {

            var perRing = capacity === 6 ? 6 : 8;
            var ring = Math.floor(index / perRing);
            var ringIndex = index % perRing;
            var itemsInRing = Math.min(perRing, commands.length - ring * perRing);
            var angle = ((Math.PI * 2) / itemsInRing) * ringIndex - Math.PI / 2;
            var radius = Math.min(maxRadius, firstRadius + ring * ringGap);
            var usagePercent = usageCeiling > 0 ? Math.min(100, Math.round((safeUsage(item) / usageCeiling) * 100)) : 0;
            var x = Math.cos(angle) * radius;
            var y = Math.sin(angle) * radius;
            // Fill color intensity also scales with real usage (dim when
            // barely used, visibly brighter as usage grows) instead of a
            // fixed constant, so a heavily-used command doesn't just look
            // "wider," it looks brighter. The leader ring marks whichever
            // item has the single STRICTLY highest usage in this radial
            // (not tied with another item, and above zero) -- a real,
            // currently-favored command, independent of whether it has
            // fully saturated the absolute fill scale yet.
            var fillAlpha = (0.14 + (usagePercent / 100) * 0.5).toFixed(2);
            var isLeading = commands.length > 1 && item._usageLeader === true;

            $("<button>")
                .addClass("radial-command")
                .toggleClass("is-leading", !!isLeading)
                .text(item.Label)
                .attr("title", item.Command)
                .css({
                    left: "calc(50% + " + x + "px)",
                    top: "calc(50% + " + y + "px)",
                    "--score": usagePercent + "%",
                    "--fill-alpha": fillAlpha
                })
                .data("command", item.Command)
                .data("enter", item.Enter)
                .data("action", item.Action)
                .data("usage-key", item.UsageKey)
                .data("track-tap", item.TrackTap === true)
                .appendTo(menu);
        });

        // Menu already lists Tools; Tools radial is the tools list itself.
        // A center Tools button here duplicated the category on desktop+mobile.
        if (context.source !== "game" && context.source !== "tools") {
            $("<button>")
                .addClass("radial-tools")
                .text("Tools")
                .attr("title", "Toggle tools")
                .click(function() {
                    ParchLockQol.HideRadialMenu();
                    ParchLockQol.ToggleTools();
                })
                .appendTo(menu);
        }

        var width = menu.outerWidth();
        var height = menu.outerHeight();
        var left = Math.max(8, Math.min(clientX - width / 2, window.innerWidth - width - 8));
        var top = Math.max(8, Math.min(clientY - height / 2, window.innerHeight - height - 8));

        menu.css({ left: left, top: top });
        ParchLockQol.ClearRadialSelection();

        $(".radial-command").click(function() {

            var command = $(this).data("command");
            var hitEnter = $(this).data("enter") === true || $(this).data("enter") === "true";
            var usageKey = $(this).data("usage-key");
            var trackTap = $(this).data("track-tap") === true || $(this).data("track-tap") === "true";

            if (trackTap && usageKey && typeof Actionable !== "undefined" && Actionable.noteRadialInteraction) {
                Actionable.noteRadialInteraction(usageKey);
            }

            ParchLockQol.HideRadialMenu();
            var action = $(this).data("action");
            if (action) { action(); return; }
            /* #33/#34: route real submissions through Actionable.Submit --
               the single usage choke-point -- instead of noteUsage+Inject
               directly. This also means a radial-clicked Undo/Restore gets
               the same RAM resync Submit already does for typed commands,
               which the old direct-Inject path skipped entirely. A stem
               (trailing whitespace, e.g. "take ") is not a real submission
               yet; it goes through runChosenCommand below. */
            if (hitEnter) {
                Actionable.Submit(command);
                return;
            }
            // T11 (operator): choosing a radial command runs it -- never just
            // pastes text that then needs Send.
            var text = String(command || "");
            if (/\s$/.test(text) && typeof Actionable !== "undefined" && Actionable.payloadPool && Actionable.referenceFor) {
                // A verb stem ("take ") needs its object: offer the scoped
                // objects, and choosing one submits the whole command.
                var targets = Actionable.payloadPool().filter(function (o) {
                    return o && o.id != null && o.name && Actionable.referenceFor(o).unique;
                });
                if (targets.length) {
                    ParchLockQol.OpenRadial(clientX, clientY, targets.map(function (t) {
                        return { Label: t.displayName || t.name, Command: text + Actionable.referenceFor(t).noun, Enter: true };
                    }), { source: "target" });
                    return;
                }
            }
            // One shared decision (Actionable.runChosenCommand): a complete
            // command runs at once; only a stem with nothing in scope to act
            // on is left in the line for the player to finish.
            Actionable.runChosenCommand(command);
        });
    },

    // D210: a rendered radial owns page selection until close. The original
    // held target still owns its independent begin/fire/end lifecycle.
    GuardRadialSelection: (e) => {
        if (!document.body.classList.contains("radial-open")) return;
        var input = document.activeElement;
        if (input && input.matches(".Input.LineInput") &&
            (input === e.target || input.contains(e.target))) return;
        e.preventDefault();
    },

    ClearRadialSelection: () => {
        var menu = document.getElementById("radial-menu");
        var selection = window.getSelection();
        if (!menu || !selection) return;
        // Preserve unrelated pre-existing transcript ranges, including on close.
        for (var i = selection.rangeCount - 1; i >= 0; i--) {
            var range = selection.getRangeAt(i);
            if (range.intersectsNode(menu)) selection.removeRange(range);
        }
    },

    BeginRadialSelection: () => {
        if (!ParchLockQol._radialSelectionBound) {
            document.addEventListener("selectstart", ParchLockQol.GuardRadialSelection, true);
            document.addEventListener("contextmenu", ParchLockQol.GuardRadialSelection, true);
            document.addEventListener("selectionchange", ParchLockQol.ClearRadialSelection);
            ParchLockQol._radialSelectionBound = true;
        }
        ParchLockQol.ClearRadialSelection();
    },

    EndRadialSelection: () => {
        ParchLockQol.ClearRadialSelection();
        document.removeEventListener("selectstart", ParchLockQol.GuardRadialSelection, true);
        document.removeEventListener("contextmenu", ParchLockQol.GuardRadialSelection, true);
        document.removeEventListener("selectionchange", ParchLockQol.ClearRadialSelection);
        ParchLockQol._radialSelectionBound = false;
    },

    HideRadialMenu: (e) => {

        if (e && e.type === "mousedown" && $(e.target).closest("#tools-toggle, #game-menu").length) return;
        if (e && e.type == "keydown" && e.key != "Escape") return;
        // D93 (G18): ignore a mousedown that arrives within 400ms of this
        // radial opening -- a synthesized compatibility event from the same
        // touch gesture that just opened it, not a real dismiss request.
        if (e && e.type === "mousedown" && ParchLockQol._radialOpenedAt
            && (Date.now() - ParchLockQol._radialOpenedAt) < 400) return;
        ParchLockQol.EndRadialSelection();
        $("#radial-menu .pl-object-status").remove();
        $("#radial-menu").removeClass("show").removeClass("pl-tools-list").attr("aria-hidden", "true");
        $("body").removeClass("radial-open");
    },

    // Export naming (operator, consensus #1746): every download says what it
    // is. "<Story title> - <Kind>[ - <label>] - YYYY-MM-DD HH-MM-SS-mmm[ (n)].<ext>"
    // The label is the player's own save/map name, kept verbatim except for
    // characters file systems forbid. The name is built once, at the click,
    // and never changes payloads, stored save keys or import identity.
    _exportNames: {},
    ExportComponent: (text, max) => {
        var raw = String(text == null ? "" : text);
        if (raw.normalize) raw = raw.normalize("NFC");
        var forbidden = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
        // Nothing the player typed is usable (only forbidden characters or
        // blanks): the caller falls back ("unnamed save").
        if (!raw.replace(forbidden, "").trim()) return "";
        // Otherwise keep it as typed (spacing and punctuation included); only
        // forbidden characters are replaced, and trailing dots/spaces trimmed.
        var s = raw.replace(forbidden, "-").trim().replace(/[. ]+$/, "");
        var chars = Array.from(s);                       // never split a surrogate pair
        if (chars.length > max) s = chars.slice(0, max).join("").replace(/[. ]+$/, "");
        if (!s) return "";
        if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(s)) s = "_" + s;
        return s;
    },
    ExportTitle: () => {
        var title = "", digest = "";
        try {
            var item = typeof ModuleLibrary !== "undefined" && ModuleLibrary.find && ModuleLibrary.find(ParchLock.StoryPath || ParchLock.GameFilename);
            title = (item && item.Title) || "";
            // Two installed modules with the same title: add a short digest.
            if (title && ModuleLibrary.all) {
                var same = ModuleLibrary.all().filter(g => g && g.Title === title).length;
                if (same > 1 && ModuleLibrary.currentExecutableDigest) digest = String(ModuleLibrary.currentExecutableDigest() || "").slice(0, 8);
            }
        } catch (e) {}
        if (!title) title = String(ParchLock.GameFilename || "story").replace(/^.*[\\/]/, "").replace(/(\.(js|z[1-8]|zblorb|gblorb|ulx|blb|blorb))+$/gi, "");
        title = ParchLockQol.ExportComponent(title, 60) || "Story";
        return digest ? title + " [" + digest + "]" : title;
    },
    ExportFilename: (kind, label, ext) => {
        var d = new Date(), p = (n, w) => String(n).padStart(w || 2, "0");
        var stamp = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " "
            + p(d.getHours()) + "-" + p(d.getMinutes()) + "-" + p(d.getSeconds()) + "-" + p(d.getMilliseconds(), 3);
        var parts = [ParchLockQol.ExportTitle(), ParchLockQol.ExportComponent(kind, 30) || "Export"];
        if (label !== undefined && label !== null) parts.push(ParchLockQol.ExportComponent(label, 60) || "unnamed save");
        // The stamp, counter and extension are never cut: only the head
        // (title - kind - label, label first) is shortened to fit 150.
        var dot = "." + String(ext || "txt").replace(/^\./, "");
        var head = parts.join(" - "), budget = 150 - Array.from(" - " + stamp + " (99)" + dot).length;
        if (Array.from(head).length > budget) head = Array.from(head).slice(0, budget).join("").replace(/[ .\-]+$/, "");
        var base = head + " - " + stamp;
        var n = (ParchLockQol._exportNames[base] || 0) + 1;      // same name twice this session
        ParchLockQol._exportNames[base] = n;
        return base + (n > 1 ? " (" + n + ")" : "") + dot;
    },

    GetSafeFilename: (suffix) => {

        var base = ParchLock.GameFilename || "story";
        base = base.replace(/\.(zblorb|z3|z4|z5|z8|js)$/gi, "").replace(/[^a-z0-9_-]+/gi, "-");
        return base + "-" + suffix;
    },

    EscapeHtml: (text) => {

        return $("<div>").text(text).html();
    },

    EscapeAttr: (text) => {

        return ParchLockQol.EscapeHtml(text).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
}

// Export naming (#1746): the native file dialog's Display link downloads a
// stored game file under the generic name "data". Rename it at the click,
// from the file name the dialog itself shows on the link; the bytes, the
// stored file and lib/main.js are untouched.
if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("click", function (e) {
        try {
            // Every click gets a fresh name, including a repeat click.
            var a = e.target && e.target.closest && e.target.closest('a[download="data"], a[data-pl-native-export]');
            if (!a || !a.closest("#dialog, #dialog_frame, #dialog_screen")) return;
            a.setAttribute("data-pl-native-export", "1");
            // Save vs data from the file's own bytes, never the dialog prose:
            // a Quetzal save (ZVM and Glulx alike) is an IFF "FORM....IFZS".
            var isSave = false;
            try {
                var b64 = String(a.getAttribute("href") || "").replace(/^data:[^,]*,/, "");
                var bytes = atob(b64.slice(0, 16));
                isSave = bytes.slice(0, 4) === "FORM" && bytes.slice(8, 12) === "IFZS";
            } catch (eB) {}
            a.download = ParchLockQol.ExportFilename(isSave ? "Save file" : "Data file", String(a.textContent || "").trim(), isSave ? "glksave" : "glkdata");
        } catch (eN) {}
    }, true);
}
