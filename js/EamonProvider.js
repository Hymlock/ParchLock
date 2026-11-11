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
        if (o.edible || o.drinkable) a.edible = true;
        return a;
    },

    item: (o, world) => ({
        id: o.id,
        name: o.name,
        parentId: o.parent != null ? o.parent : null,
        attrs: EamonProvider.attrs(o),
        aliases: (o.aliases || []).slice(),
        confidence: 0.95,
        discovered: true,
        eamon: { kind: o.kind, ready: !!o.ready, weapon: !!o.weapon, readable: !!o.readable, light: !!o.light, door: !!o.door, state: o.state || "", reaction: o.reaction || "" }
    }),

    collect: () => {
        if (!EamonProvider.active()) return { sources: [] };
        var world = EamonProvider.world();
        if (!world || !world.room) {
            // Structural, and empty on purpose: there is no room to map or act in right now.
            return {
                sources: [{ name: "eamon", confidence: 0.95 }], engineMode: "structural", vmType: "eamon",
                roomId: null, roomName: "", discoveredObjects: [], inventory: [], exits: [],
                probe: { status: "eamon-idle", playerId: null, roomId: 0, scopeCount: 0 }
            };
        }
        var objects = (world.objects || []).map(function (o) { return EamonProvider.item(o, world); });
        var inventory = (world.inventory || []).map(function (o) { return EamonProvider.item(o, world); });
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
