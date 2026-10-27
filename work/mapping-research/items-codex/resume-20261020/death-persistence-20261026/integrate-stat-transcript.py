from pathlib import Path
p=Path('js/StatTracker.js');s=p.read_text(encoding='utf-8')
def sub(a,b):
 global s
 assert s.count(a)==1,(a[:90],s.count(a));s=s.replace(a,b,1)
sub('''        if (outcome === "death") {
            model.deaths = (model.deaths || 0) + 1;''','''        var totals = null;
        try { if (typeof SaveState !== "undefined" && SaveState.recordOutcome) totals = SaveState.recordOutcome(outcome, id); } catch (eHistory) {}
        if (totals) { model.deaths = totals.deaths; model.wins = totals.wins; }
        if (outcome === "death") {
            if (!totals) model.deaths = (model.deaths || 0) + 1;''')
sub('''            model.wins = (model.wins || 0) + 1;
            StatTracker._events.push({ type: "win"''','''            if (!totals) model.wins = (model.wins || 0) + 1;
            StatTracker._events.push({ type: "win"''')
sub('''    load: (key) => {
''','''    syncPlaythrough: function (model) {
        model = model || StatTracker.model();
        try {
            var totals = typeof SaveState !== "undefined" && SaveState.outcomes ? SaveState.outcomes() : null;
            if (totals) { model.deaths = totals.deaths; model.wins = totals.wins; }
        } catch (eHistory) {}
        return model;
    },

    load: (key) => {
''')
start=s.index('    load: (key) => {');end=s.index('    // D157: observe()',start)
piece=s[start:end].replace('return m;', 'return StatTracker.syncPlaythrough(m);')
s=s[:start]+piece+s[end:]
sub('''            StatTracker._aliasEv = null;               // D209: evidence is per timeline
            StatTracker.forgetReadings(StatTracker.model(), reason === "restart" || reason === "new-game");''','''            StatTracker._aliasEv = null;               // D209: evidence is per timeline
            // D182 startup restore decline is the explicit new-game owner.
            // Native restart is owned once by Transcript, not by every resync.
            if (reason === "new-game" && typeof SaveState !== "undefined" && SaveState.startPlaythrough) SaveState.startPlaythrough(reason);
            StatTracker.forgetReadings(StatTracker.model(), reason === "restart" || reason === "new-game");
            StatTracker.syncPlaythrough();''')
# This exact location is the observed per-turn model, not other helpers.
sub('''        var model = StatTracker.model();
        if (facts.clockGame) {''','''        var model = StatTracker.syncPlaythrough(StatTracker.model());
        if (facts.clockGame) {''')
p.write_text(s,encoding='utf-8')
p=Path('js/Transcript.js');s=p.read_text(encoding='utf-8')
def sub(a,b):
 global s
 assert s.count(a)==1,(a[:90],s.count(a));s=s.replace(a,b,1)
sub('''            Transcript.digest = digest;
            Transcript.attachEngines();''','''            Transcript.digest = digest;
            Transcript.storyPath = typeof ParchLock !== "undefined" ? ParchLock.StoryPath || "" : "";
            Transcript.attachEngines();''')
sub('''            if (!Transcript.meta) return;
            if (name === "restart") {
                if (Transcript._booting) return;   // the VM restarts once while booting
                Transcript.collect();''','''            if (name === "restart") {
                var submitted = typeof TurnRecorder !== "undefined" && TurnRecorder._submissionId > 0;
                if (Transcript._booting && !submitted) return; // boot is not a new human playthrough
                if (typeof SaveState !== "undefined") SaveState.onLifecycle("restart");
                if (!Transcript.meta) return;
                Transcript.collect();''')
sub('''                // D215: the map and labels follow the game to a new start.
                if (typeof SaveState !== "undefined") SaveState.onLifecycle("restart");''','''                // Save-owned state already observed the successful restart above.''')
sub('''        Transcript.collect();
        var token = c && c.usage === "restore"''','''        var earlyName = c && c.usage === "restore" && c.name && Date.now() - c.at < 120000 ? c.name : "";
        if (!Transcript.meta) {
            if (typeof SaveState !== "undefined") SaveState.onLifecycle("restore", { name: earlyName });
            return;
        }
        Transcript.collect();
        var token = c && c.usage === "restore"''')
sub('''    commitSave: function (name) {
        Transcript.collect();''','''    commitSave: function (name) {
        if (!Transcript.meta) {
            if (typeof SaveState !== "undefined") SaveState.onLifecycle("save", { name: name });
            return;
        }
        Transcript.collect();''')
sub('''                    if (ok && Transcript.meta && c && c.usage === "save"''','''                    if (ok && c && c.usage === "save"''')
p.write_text(s,encoding='utf-8')
