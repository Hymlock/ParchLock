var Autocomplete = {

    Words: [],
    CurrentWord: "",
    CurrentToggleWord: "",
    Strip: [ "\n", ")", "(", "\"", "'", ",", ".", "!", "?", ";" ],

    UsesRam: (text) => {
        var p = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
        return !/^\s*\//.test(text || "") && typeof Actionable !== "undefined" && Actionable.isStructuralPayload(p);
    },
    RamSuggestions: (text) => {
        var prefix = String(text || "").toLowerCase();
        var commands = Autocomplete.RamCommandSeeds().filter(command => command.toLowerCase().indexOf(prefix) === 0);
        // Complete user-supplied nouns from the story dictionary too; objects
        // outside immediate scope need not have synthesized action suggestions.
        var split = prefix.lastIndexOf(" ");
        if (split >= 0 && prefix.slice(split + 1)) {
            try {
                var mem = AttributeSchema._getMem();
                var dictionary = ZRamReader.parseDictionary(mem);
                Object.keys(dictionary.words || {}).forEach(function (word) {
                    if (word.indexOf(prefix.slice(split + 1)) === 0) commands.push(prefix.slice(0, split + 1) + word);
                });
            } catch (_) {}
        }
        return Array.from(new Set(commands));
    },
    InjectCommand: (command, hitEnter) => {
        Input.Clear();
        Input.Inject(command, !!hitEnter && !/\s$/.test(command), 'user-autocomplete');
    },

    UpdateWords: () => {

        // Get the 1000 most recent words
        Autocomplete.Words = [];

        $("#windowport .BufferWindow .BufferLine").each(function() {

            var words = $(this).text();

            Autocomplete.Strip.forEach(symbol => {
                    
                while (words.indexOf(symbol) != -1) words = words.replace(symbol, " ");
            });
    
            words = words.split(" ");
    
            words.reverse().forEach(word => {
    
                word = word.trim();
    
                if (Autocomplete.Words.length < 1000 && word.length > 1) {
    
                    if (!Autocomplete.Words.find(e => e.toLowerCase() == word.toLowerCase())) Autocomplete.Words.push(word);
                }
            });
        });
    },

    ToggleSuggestions: (text) => {

        if (Autocomplete.UsesRam(text)) {
            if (!Autocomplete.CurrentToggleWord) Autocomplete.CurrentToggleWord = text;
            var commands = Autocomplete.RamSuggestions(Autocomplete.CurrentToggleWord);
            if (commands.length) {
                var index = commands.indexOf(text);
                Autocomplete.InjectCommand(commands[(index + 1) % commands.length], false);
            }
            return;
        }

        text = text.trim();
        var wordsInInput = text.split(" ");

        if (Autocomplete.CurrentToggleWord == "") {

            Autocomplete.CurrentToggleWord = wordsInInput[wordsInInput.length - 1];
        }

        var collection = Autocomplete.Words;

        if (text.indexOf("/goto") == 0 || text.indexOf("/room-notes") == 0 || text.indexOf("/see") == 0) {

            collection = [];
            ParchLockMap.Rooms.forEach(r => collection.push(r.Name));
        }

        var list = Autocomplete.GetSuggestions(Autocomplete.CurrentToggleWord, collection);

        if (list.length == 0) return;

        var pos = list.indexOf(wordsInInput[wordsInInput.length - 1]);
        pos++;

        if (pos >= list.length) pos = 0;

        var str = "";

        for (var i = 0; i < wordsInInput.length - 1; i++) {
            str += wordsInInput[i] + " ";
        }

        str += list[pos] + " "

        Input.Clear();
        Input.Inject(str);
    },

    Suggest: (text) => {

        if (Autocomplete.UsesRam(text)) {
            Autocomplete.Clear();
            if (!text.trim()) return;
            Autocomplete.RamSuggestions(text).forEach(function (command) {
                $("<div>").text(command).appendTo("#autocomplete").click(function (e) {
                    Autocomplete.InjectCommand(command, e.ctrlKey);
                });
            });
            return;
        }

        if (text[text.length - 1] == " ") {

            Autocomplete.Clear();
            return;
        }

        var words = text.trim().split(" ");
        var lastWord = words[words.length - 1];

        if (lastWord != Autocomplete.CurrentWord && lastWord.length > 0) {

            var originalLastWord = lastWord;
            lastWord = lastWord.replace("\\", "").replace("/", "");

            Autocomplete.Clear();

            Autocomplete.CurrentWord = lastWord;

            var suggestions = [];

            if (text.indexOf("/goto") == 0 || text.indexOf("/room-notes") == 0 || text.indexOf("/see") == 0) {
                
                // When using special commands that allow for room names as parameters, show room name suggestions instead of suggestions from the story text
                var rooms = [];
                ParchLockMap.Rooms.forEach(r => rooms.push(r.Name));

                suggestions = Autocomplete.GetSuggestions(lastWord, rooms);
            }
            else if (originalLastWord[0] == "/") {

                suggestions = Autocomplete.GetSuggestions(originalLastWord, Input.GetAllSpecialCommands());
            }
            else {

                suggestions = Autocomplete.GetSuggestions(lastWord);
            }

            var link = null;

            suggestions.forEach(e => {

                var title = "Click to inject '" + e + "' into the prompt, ctrl+click to inject and hit Enter";
                if (suggestions.length == 1) title = "As this is the only match, type \\ to inject '" + e + "' plus Enter into the prompt, or / to inject without Enter";

                link = $("<div>").text(e).appendTo("#autocomplete").attr("title", title).click(Autocomplete.WordClicked);
            });

            // If there is exactly one match and the user typed \ or /, select the suggestion
            if (text.length > 1 && text[text.length - 1] == "\\" && suggestions.length == 1 && link) Autocomplete.InjectWord(link.text(), true);
            if (text.length > 1 && text[text.length - 1] == "/" && suggestions.length == 1 && link) Autocomplete.InjectWord(link.text());
        }
    },

    Clear: () => {

        $("#autocomplete").empty();
        Autocomplete.CurrentWord = "";
    },

    GetSuggestions: (word, collection) => {

        if (!word) return [];

        collection = collection || Autocomplete.Words;

        return collection.filter(e => e.toLowerCase().indexOf(word.toLowerCase()) == 0).reverse();
    },

    InjectWord: (word, hitEnter) => {

        var value = $(".Input.LineInput").val();

        Input.Clear();

        var words = value.split(" ");
        for (var i = 0; i < words.length; i++) {

            if (i < words.length - 1) 
                Input.Inject(words[i] + " ");
            else {

                if (value[0] == "/") {

                    if (hitEnter)
                        Input.Inject(word + ";");
                    else
                        Input.Inject(word + " ");
                }
                else {

                    Input.Inject(word + " ", hitEnter, 'user-autocomplete');
                }
            }
        }
    },

    WordClicked: function(e) {

        var word = $(this).text();
        
        Autocomplete.InjectWord(word, e.ctrlKey);
    },

    
    RamCommandSeeds: function () {
        var out = [];
        try {
            var p = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            if (!p) return out;
            // D88 Stage 6 cutover point (default off): flag on sources from
            // SemanticActions.resolveForPayload, proven byte-parity with
            // ActionSynth.collectFromPayload (harness/d88-semantic-parity.js).
            var cutoverOn = false;
            try { cutoverOn = typeof SemanticActions !== "undefined" && SemanticActions.CutoverFlag && SemanticActions.CutoverFlag.isEnabled(); } catch (eF) {}
            var synthCommands = null;
            if (cutoverOn) {
                try { synthCommands = SemanticActions.resolveForPayload(p); } catch (eSA) { synthCommands = null; }
            }
            if (!synthCommands && typeof ActionSynth !== "undefined") {
                synthCommands = ActionSynth.collectFromPayload(p);
            }
            (synthCommands || []).forEach(function (c) { if (c.command) out.push(c.command); });
            (p.exits || []).forEach(function (e) { if (e.command) out.push(e.command); });
            (p.specialCommands || []).forEach(function (c) {
                out.push(typeof c === "string" ? c : (c.command || c.label || ""));
            });
        } catch (e) {}
        return Array.from(new Set(out.filter(Boolean)));
    },

    TranslatorSeeds: function () {
        var out = [];
        try {
            (window.__PL_ACTION_SYNTH__ || []).forEach(function (c) { if (c && c.command) out.push(c.command); });
            if (typeof WorldModel !== "undefined" && WorldModel.lastPayload) {
                (WorldModel.lastPayload.specialCommands || []).forEach(function (c) {
                    out.push(typeof c === "string" ? c : (c.command || c.label || ""));
                });
            }
        } catch (e) {}
        return out.filter(Boolean);
    }
}
