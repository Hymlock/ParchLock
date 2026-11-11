/* EamonProvider - world facts for an Eamon module, from the Eamon engine's own data.
 *
 * The Eamon host (lib/eamon/zvm.js) receives, at each of an adventure's own prompts, a read-only picture
 * of what the player can perceive: the room, the exits the game itself lists, the objects and monsters
 * the game has already shown, and what the player carries. This provider hands that picture to the
 * existing WorldModel so the map, direction buttons, underlines, radials and Equipment work as they do
 * for any other story. It reads no Z-machine memory and invents nothing: outside an adventure prompt
 * (the Main Hall, a nested question) it reports honest absence.
 */
var EamonProvider = {
    name: "eamon",

    active: () => !!(typeof window !== "undefined" && window.__PARCHLOCK_EAMON__),

    world: () => {
        var vm = typeof window !== "undefined" && window.__PARCHLOCK_EAMON__;
        return vm && vm.state ? vm.state.world : null;
    },

    attrs: (o) => {
        var a = {};
        if (o.kind === "monster") { a.animate = true; a.talkable = true; return a; }
        a.takeable = true;
        if (o.worn) { a.worn = true; a.isWorn = true; }
        if (o.wearable) { a.wearable = true; a.clothing = true; }
        if (o.container) a.container = true;
        if (o.edible) a.edible = true;
        if (o.fixed || o.door) { a.takeable = false; a.scenery = true; }
        return a;
    },

    // Verb forms the Eamon CS parser itself accepts (EamonRT command set), chosen from the engine's own
    // facts about the object. The game remains the judge: a form may still be refused in play.
    commands: (o, held) => {
        var n = o.name, list = [];
        var add = function (verb, command) { list.push({ verb: verb, command: command || (verb + " " + n), confidence: 0.95 }); };
        add("examine");
        if (o.kind === "monster") {
            if (o.reaction !== "Friend") add("attack");
            else add("inventory");
            return list;
        }
        if (held) {
            if (o.weapon && !o.ready) add("ready");
            if (o.wearable && !o.worn) add("wear");
            if (o.worn) add("remove");
        } else if (!o.fixed && !o.door) add("get");
        if (o.readable) add("read");
        if (o.drinkable) add("drink");
        if (o.edible) add("eat");
        if (o.light) add("light");
        if (o.container || o.door) { add("open"); add("close"); }
        if (held && !o.worn) { add("drop"); add("give", "give " + n + " to "); add("put", "put " + n + " in "); }
        return list;
    },

    item: (o, world, held) => ({
        id: o.id,
        name: o.name,
        parentId: o.parent != null ? o.parent : null,
        attrs: EamonProvider.attrs(o),
        aliases: (o.aliases || []).slice(),
        confidence: 0.95,
        discovered: true,
        // Eamon's own verbs for this thing in its present state; the shared menu path offers these as given.
        nativeCommands: EamonProvider.commands(o, held),
        eamon: { kind: o.kind, ready: !!o.ready, weapon: !!o.weapon, readable: !!o.readable, light: !!o.light, door: !!o.door, state: o.state || "", reaction: o.reaction || "" }
    }),

    // One map per adventure (plan section 7): the existing map storage, scoped by adventure name.
    syncMapScope: (world) => {
        try {
            if (typeof ParchLockMap === "undefined" || !ParchLockMap.SetScope) return;
            var vm = window.__PARCHLOCK_EAMON__;
            var inHall = vm && vm.state && /EamonMH/.test(vm.state.phase || "");
            if (world && world.adventure) ParchLockMap.SetScope(world.adventure);
            else if (inHall) ParchLockMap.SetScope("Main Hall");
        } catch (e) {}
    },

    collect: () => {
        if (!EamonProvider.active()) return { sources: [] };
        var world = EamonProvider.world();
        EamonProvider.syncMapScope(world);
        if (!world || !world.room) {
            // Structural, and empty on purpose: there is no room to map or act in right now.
            return {
                sources: [{ name: "eamon", confidence: 0.95 }], engineMode: "structural", vmType: "eamon",
                roomId: null, roomName: "", discoveredObjects: [], inventory: [], exits: [],
                probe: { status: "eamon-idle", playerId: null, roomId: 0, scopeCount: 0 }
            };
        }
        var objects = (world.objects || []).map(function (o) { return EamonProvider.item(o, world, false); });
        var inventory = (world.inventory || []).map(function (o) { return EamonProvider.item(o, world, true); });
        var exits = (world.exits || []).map(function (e) {
            return {
                label: e.label, command: e.command || e.label, prop: null,
                targetRoomId: e.to != null ? e.to : null, targetRoomName: e.toName || "",
                isNonCardinal: false, ambiguousDiagonal: false, hinted: false, confidence: 0.95
            };
        });
        return {
            sources: [{ name: "eamon", confidence: 0.95 }],
            engineMode: "structural",
            vmType: "eamon",
            roomId: world.room.id,
            roomName: world.room.name || "",
            discoveredObjects: objects,
            unnamedCandidates: [],
            inventory: inventory,
            exits: exits,
            hudMetrics: [],
            probe: {
                status: "eamon-live", playerId: world.playerId, inventoryRootId: world.playerId,
                playerSource: "eamon-native", roomId: world.room.id, roomSource: "eamon-native",
                measuredDark: !world.room.lit, scopeCount: objects.length
            },
            confidence: 0.95
        };
    }
};

try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "eamon", collect: function () { return EamonProvider.collect(); } });
        }
    }, 0);
} catch (e) {}
