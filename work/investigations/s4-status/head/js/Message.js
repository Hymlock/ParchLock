var Message = {

    IsOpen: false,
    NoTypeToClose: false,

    Init: () => {

        $("#message #close").click(Message.Hide);
        $("#message #close").keydown(e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); Message.Hide(); } });

        if (!Global.GetUrlParameter("story")) {

            $("body").addClass("no-story");
            $("#start-screen").prop("hidden", false);
        }
        else {

            if (!location.hash && !localStorage.getItem("PL_Save_" + ParchLock.GameFilename) && Global.Prefs.ShowInfoOnStart) Message.ShowHelp();
        }
    },

    Show: (title, body, disabledTypeToClose, onClosed) => {
        if (typeof LearnedWords !== "undefined" && LearnedWords._open) { LearnedWords.beforeHide(); LearnedWords.cleanup(); }

        // D154: Message.js is loaded by BOTH index.html and play.html, but
        // ParchLock.js is play-only. Calling it unguarded meant every call to
        // Message.Show on the library page threw "ParchLock is not defined" --
        // and because MainMenu installs window.onerror -> Message.Show, an
        // error on that page produced a SECOND error inside the handler and the
        // real one was never reported or displayed at all.
        try { if (typeof ParchLock !== "undefined") ParchLock.HandleOverlayOpened(); } catch (e) {}
        Message.NoTypeToClose = disabledTypeToClose || false;
        Message._onClosed = typeof onClosed === 'function' ? onClosed : null;

        if (disabledTypeToClose)
            $("#message footer").hide();
        else
            $("#message footer").show();

        Input.Clear();

        Message.IsOpen = true;
        $("body").addClass("app-dialog-open");
        $("#message #close").show().attr({ role: "button", tabindex: 0, "aria-label": "Close window" });

        $("#message").find("h2").empty().html(title);
        $("#message").find("> div").empty().html(body);

        $("#message").addClass("show");
        $("#message").attr({ role: "dialog", "aria-modal": "true", "aria-label": $("#message h2").text() });
        $("#message #close").focus();
        try {
            if (typeof ReadAloud !== "undefined" && ReadAloud.onDialog) ReadAloud.onDialog(title, body);
        } catch (e) {}
    },

    Hide: () => {

        if (typeof LearnedWords !== "undefined" && LearnedWords._open) LearnedWords.beforeHide();

        Input.Clear();
        Message.IsOpen = false;
        $("body").removeClass("app-dialog-open");

        $("#message").removeClass("show");
        if (typeof LearnedWords !== "undefined" && LearnedWords._open) LearnedWords.cleanup();
        var onClosed = Message._onClosed;
        Message._onClosed = null;
        if (onClosed) setTimeout(onClosed, 0);
        try { if (typeof ParchLock !== "undefined") ParchLock.HandleOverlayClosed(); } catch (e) {}
        // Mobile: never focus inputs after closing a dialog (opens IME).
        if (document.body.classList.contains("pl-mobile")) {
            try {
                if (typeof Input !== "undefined" && Input.DismissKeyboard) Input.DismissKeyboard();
            } catch (e) {}
            return;
        }
        var input = $("#windowport .Input:visible").first();
        if (input.length) input.focus();
        else if (!Global.GetUrlParameter("story")) $("#start-screen a").focus();
        else $("#windowport").attr("tabindex", "-1").focus();
    },

    RoomNotFound: (roomName) => {

        Message.Show("404 Room not found", "Whoops!, we couldn't find a room named <u>" + roomName + "</u>");
    },

    ShowHelp: () => WorkspaceUI.ShowHelp()
}
