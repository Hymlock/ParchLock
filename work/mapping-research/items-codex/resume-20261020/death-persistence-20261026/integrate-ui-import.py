from pathlib import Path
p=Path('js/Qol.js');s=p.read_text(encoding='utf-8')
def sub(a,b):
 global s
 assert s.count(a)==1,(a[:85],s.count(a));s=s.replace(a,b,1)
sub('''        var previous = [], previousRooms = ParchLockMap.Rooms;
        var previousBlocked''','''        var previous = [], previousRooms = ParchLockMap.Rooms, importSucceeded = false;
        var previousBlocked''')
sub('''            var mapKey = "PL_Map_" + ParchLock.GameFilename;
            previous.push''','''            if (new Set(data.Save.map(entry => entry.Key)).size !== data.Save.length) throw new Error("Duplicate save entries in this package");
            var stateWrites = [];
            if (typeof SaveState !== "undefined") {
                if ((data.Save.length || data.SaveStates) && SaveState.importReady && !SaveState.importReady()) throw new Error("Wait for the story to finish loading before importing saves.");
                var importedNames = data.Save.map(entry => entry.Key).filter(k => /^dirent:save:/.test(k)).map(k => k.split(":").slice(3).join(":"));
                stateWrites = SaveState.importWrites(data.SaveStates, importedNames);
            }
            var mapKey = "PL_Map_" + ParchLock.GameFilename;
            previous.push''')
sub('''                var importedNames = data.Save.map(entry => entry.Key).filter(k => /^dirent:save:/.test(k)).map(k => k.split(":").slice(3).join(":"));
                SaveState.importWrites(data.SaveStates, importedNames).forEach(w => {''','''                stateWrites.forEach(w => {''')
sub('''            Message.Show("Import Complete", "The save package and map data were imported.");
        }''','''            Message.Show("Import Complete", "The save package and map data were imported.");
            importSucceeded = true;
        }''')
sub('''            Message.Show("Import Failed", ParchLockQol.EscapeHtml(e.message), true);
        }
    },''','''            Message.Show("Import Failed", ParchLockQol.EscapeHtml(e.message), true);
        }
        if (importSucceeded && typeof SaveState !== "undefined" && SaveState.afterImport) SaveState.afterImport();
    },''')
p.write_text(s,encoding='utf-8')
p=Path('js/WorkspaceUI.js');s=p.read_text(encoding='utf-8')
old='''            if (story) location.href = "play.html?story=" + encodeURIComponent(story);
            else location.reload();'''
new='''            var intent = typeof SaveState !== "undefined" && SaveState.prepareNewGame ? SaveState.prepareNewGame() : null;
            if (intent === false) return;
            try {
                if (story) location.href = "play.html?story=" + encodeURIComponent(story);
                else location.reload();
            } catch (e) { if (intent && typeof SaveState !== "undefined") SaveState.cancelNewGameIntent(intent); }'''
assert s.count(old)==1;s=s.replace(old,new)
s=s.replace('A new game or accepted RESTART resets them; restoring or undoing preserves the counts.', 'Counts are saved for each playthrough and survive quitting, reopening and older saves. A new game or accepted RESTART starts separate history; restoring a save returns to its playthrough history.')
p.write_text(s,encoding='utf-8')
p=Path('js/Tutorial.js');s=p.read_text(encoding='utf-8')
old='''        if (restart) {
            try { location.replace(location.href); } catch (e) {}
        }'''
new='''        if (restart) {
            var intent = typeof SaveState !== "undefined" && SaveState.prepareNewGame ? SaveState.prepareNewGame() : null;
            if (intent === false) return;
            try { location.replace(location.href); }
            catch (e) { if (intent && typeof SaveState !== "undefined") SaveState.cancelNewGameIntent(intent); }
        }'''
assert s.count(old)==1;s=s.replace(old,new)
s=s.replace('Starting a new game or restarting resets those counts; restoring a save keeps them.', 'Counts persist for each playthrough through quitting and older saves. A new game or accepted restart starts separate history; restoring a saved playthrough returns to its accumulated count.')
p.write_text(s,encoding='utf-8')
p=Path('js/SaveState.js');s=p.read_text(encoding='utf-8')
old='''        var i = { schema: 1, path: ctx.path, kind: "select", runId: PlaythroughState.freshId(ctx), nonce: PlaythroughState.freshId(ctx) };
        return PlaythroughState.writeIntent(ctx, i) ? i.nonce : false;'''
new='''        var prior = PlaythroughState.readIntent(ctx.path);
        if (ctx.prepared && prior && prior.nonce === ctx.prepared) return ctx.prepared;
        var i = { schema: 1, path: ctx.path, kind: "select", runId: PlaythroughState.freshId(ctx), nonce: PlaythroughState.freshId(ctx) };
        if (!PlaythroughState.writeIntent(ctx, i)) return false;
        ctx.prepared = i.nonce; return i.nonce;'''
assert s.count(old)==1;s=s.replace(old,new)
s=s.replace('''if (i && i.nonce === nonce) { try { sessionStorage.removeItem(PlaythroughState.intentKey(ctx.path)); } catch (e) {} ctx.intent = null; }''','''if (i && i.nonce === nonce) { try { sessionStorage.removeItem(PlaythroughState.intentKey(ctx.path)); } catch (e) {} ctx.intent = null; ctx.prepared = null; }''')
p.write_text(s,encoding='utf-8')
