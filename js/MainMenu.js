var MainMenu = {

    CurrentFilterOptions: "",

    Init: () => {

        // D120: first-run routing (D113 plan section "Implementation
        // sequence," step 3) -- hooked here, in MainMenu.Init() itself, NOT
        // into img/ParchLockSplash.js's shared completion callback. The
        // splash is a per-session, per-PAGE gate that also runs on
        // play.html independently; routing through it would risk
        // hijacking a legitimate direct-to-play launch (an Android
        // cold-start resume, or the D119 no-story recovery screen's
        // "Continue" button) into training instead of the player's actual
        // game. This check runs before any module-library work starts, so
        // an unseen player never sees the real library flash before
        // redirecting.
        // D124: the tutorial no longer pre-empts the library. It explains the
        // LIVE system over the real screens (js/Tutorial.js on play.html), so
        // it needs an actual module loaded to point at -- which means the
        // player picks a story normally first, and the tour starts once that
        // story is on screen. The old redirect to the isolated tutorial.html
        // route is gone with the route itself.

        Global.LoadPrefs();
        MainMenu.UpdateUI();
        $("#message #close").click(Message.Hide);
        $("#show-all").hide();

        setTimeout(() => {

            MainMenu.SetupUI();
            ModuleLibrary.onChanged(MainMenu.LoadGameList);
            ModuleLibrary.init().then(MainMenu.LoadGameList).catch(MainMenu.LoadGameList);

        }, 100);

        $(window).resize(MainMenu.UpdateUI);

        window.onerror = function(error, url, line) {

            // D154: an error reporter that can itself throw hides the very
            // thing it exists to show. Whatever happens here, the original
            // error is logged first so it survives.
            try { console.error("ParchLock error:", error, url, line); } catch (e) {}
            // "ResizeObserver loop completed with undelivered notifications" is
            // a benign browser notice, not a fault: it means the observer ran
            // out of frame budget and will deliver next frame. It fires through
            // window.onerror, so without this the library page would throw an
            // alarming modal at the player for nothing.
            if (/ResizeObserver loop/i.test(String(error || ""))) return;
            try {
                Message.Show("A wild error has appeared!",
                    "Looks like something went wrong, here is what we know:<br><br>" + error);
            } catch (e) {}
        };
    },

    SetupUI: () => {

        MainMenu.UpdateUI();
        $(".library-build").text(ProductInfo.buildLabel());
        ProductInfo.applyDocumentIdentity();
        MainMenu.UpdateThemeButton();
        $("#filter").on("input", MainMenu.FilterGameList);
        $("#filter-options [data-filter], #show-all").click(MainMenu.FilterOptionClicked);
        $("#toggle-theme").click(MainMenu.ToggleTheme);
        $("#modules, #import").click(MainMenu.Import);
        $("#about").click(ProductInfo.showAbout);
    },

    ToggleTheme: () => {

        $("body").toggleClass("light");

        Global.Prefs.LightMode = $("body").hasClass("light");
        Global.SavePrefs();
        MainMenu.UpdateThemeButton();
    },

    UpdateThemeButton: () => {
        var light = $("body").hasClass("light");
        $("#toggle-theme").attr("aria-pressed", String(light)).attr("aria-label", "Light theme");
    },

    UpdateUI: () => {

        $(".TextGrid.status").css("width", "");
    },

    LoadGameList: () => {

        var starred = [];
        var done = [];
        
        var d = localStorage.getItem(ModuleLibrary.legacy.starred);
        if (d) { try { starred = JSON.parse(d); } catch (e) { starred = []; } }

        d = localStorage.getItem(ModuleLibrary.legacy.done);
        if (d) { try { done = JSON.parse(d); } catch (e2) { done = []; } }

        var modules = ModuleLibrary.all();

        $("#games-list").empty();

        // Add starred games at top of list
        modules.filter(e => e.Path && starred.includes(e.Path)).forEach(game => MainMenu.AddGame(game, starred, done));

        // Add the rest of the games
        modules.filter(e => e.Path && !starred.includes(e.Path)).forEach(game => MainMenu.AddGame(game, starred, done));

        MainMenu.FilterGameList();

        // $('#windowport').slimScroll({height: '100%'});
    },

    AddGame: (game, starred, done) => {

        // var g = $("<div>").addClass("game").data("game", game).click(() => MainMenu.LoadGame(game)).appendTo("#parchment #games-list");
        var g = $("<div>").addClass("game").data("game", game).appendTo("#windowport #games-list");

        var s = $("<button>").attr("type", "button").addClass("icon fav").attr("title", "Star\\Unstar " + game.Title).attr("aria-label", "Star " + game.Title).appendTo(g);
        s.on("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            MainMenu.StarStory.call(this);
        });
        if (starred && starred.includes(game.Path)) s.addClass("on");
        s.attr("aria-pressed", String(s.hasClass("on")));
        
        var c = $("<a>").attr("href", "play.html?story=" + encodeURIComponent(game.Path)).appendTo(g);
        // Remember selection so APK/play cold-start can offer Continue.
        // Bust cache/hash so a second open after Exit is a clean load.
        c.on("click", function (e) {
            try { localStorage.setItem(ModuleLibrary.legacy.lastStory, game.Path); } catch (err) {}
            try {
                e.preventDefault();
                var href = "play.html?story=" + encodeURIComponent(game.Path) + "&t=" + Date.now();
                location.href = href;
            } catch (err2) {}
        });
        
        var title = $("<div>").addClass("title").appendTo(c);
        $("<div>").text(game.Title).appendTo(title);

        //if (localStorage.getItem("PL_Save_" + game.Filename)) $("<img>").addClass("save-icon").attr("src", "img/icon-save.svg").appendTo(title);

        if (game.Subtitle) $("<div>").text(game.Subtitle).addClass("subtitle").appendTo(c);
        if (game.Author) $("<div>").text("By " + game.Author).addClass("author").appendTo(c);

        var d = $("<button>").attr("type", "button").addClass("icon done").attr("title", "Mark\\Unmark " + game.Title + " as done").attr("aria-label", "Mark " + game.Title + " as finished").appendTo(g);
        d.on("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            MainMenu.DoneStory.call(this);
        });
        if (done && done.includes(game.Path)) d.addClass("on");
        d.attr("aria-pressed", String(d.hasClass("on")));
    },

    UpdateTitle: () => {

        var listing = $("#games-list .game").not(".filtered").length;
        var all = ModuleLibrary.all().length;

        var title = (listing == all) ? "Listing " + all + " stories" : "Listing " + listing + " of " + all + " stories";

        $(".status tt").text(title);
        $("#filter-options [data-filter]").each(function () { $(this).attr("aria-pressed", String($(this).data("filter") === MainMenu.CurrentFilterOptions)); });
    },

    StarStory: function() {

        $(this).toggleClass("on");
        $(this).attr("aria-pressed", String($(this).hasClass("on")));
        MainMenu.SaveGameFlags();
    },

    DoneStory: function() {

        $(this).toggleClass("on");
        $(this).attr("aria-pressed", String($(this).hasClass("on")));
        MainMenu.SaveGameFlags();
    },

    SaveGameFlags: () => {

        var starred = [];
        var done = [];

        $("#games-list .game .fav.on").each(function() {

            starred.push($(this).parent().data("game").Path);
        });

        $("#games-list .game .done.on").each(function() {

            done.push($(this).parent().data("game").Path);
        });

        localStorage.setItem(ModuleLibrary.legacy.starred, JSON.stringify(starred));
        localStorage.setItem(ModuleLibrary.legacy.done, JSON.stringify(done));
    },

    FilterOptionClicked: function() {

        $("#show-all").hide();

        var filter = $(this).data("filter");

        if (filter == MainMenu.CurrentFilterOptions || filter == "all") {

            MainMenu.CurrentFilterOptions = "";
            $("#games-list .game").removeClass("filtered");
            MainMenu.UpdateTitle();
            return;
        }

        $("#filter").val("");

        MainMenu.CurrentFilterOptions = filter;

        $("#games-list .game").addClass("filtered");

        switch(filter) {

            case "fav":
                $("#games-list .game .fav.on").parent().removeClass("filtered");
            break;

            case "done-on":
                $("#games-list .game .done.on").parent().removeClass("filtered");
            break;

            case "done-off":
                $("#games-list .game .done").not(".on").parent().removeClass("filtered");
            break;
        }

        MainMenu.UpdateTitle();

        if ($("#games-list .game.filtered").length > 0) $("#show-all").show();
    },

    FilterGameList: () => {

        MainMenu.CurrentFilterOptions = "";
        $("#show-all").hide();

        var filter = $("#filter").val().toLowerCase();
        
        $("#games-list .game").removeClass("filtered").each(function() {

            var game = $(this).data("game");
    
            var f = {
    
                Title: game.Title || "",
                Subtitle: game.Subtitle || "",
                Author: game.Author || ""
            }

            if ((!f.Title.toLowerCase().includes(filter) && !f.Subtitle.toLowerCase().includes(filter) && !f.Author.toLowerCase().includes(filter))) $(this).addClass("filtered")
        });

        MainMenu.UpdateTitle();
    },

    Import: () => {
        ModuleLibrary.openManager();
    }
}

$(document).ready(MainMenu.Init);
