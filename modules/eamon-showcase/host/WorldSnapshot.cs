// ParchLock Eamon host: a read-only picture of what the player can perceive, for ParchLock's
// existing map, exits, underlines, Equipment and stats. Built only at an adventure's top-level prompt.
//
// Non-interference rules (see WORLD_ADAPTER_CONTRACT.md):
//  - reads fields and location arithmetic only; never calls the engine's printing or "listed in room"
//    helpers, which set Seen flags, and never draws a random number;
//  - an object or monster is included only when the game has already shown it (Seen) and the room is
//    lit, so nothing hidden, embedded or unlisted is revealed by ParchLock before the game reveals it;
//  - exits are exactly those the game itself puts in its "Obvious exits" line; a destination's name is
//    given only for a room the player has already been in.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Eamon.Framework;
using Eamon.Framework.Primitive.Enums;

namespace ParchLock.EamonHost
{
	internal static class WorldSnapshot
	{
		// One id space for ParchLock: rooms keep their own number; other kinds are offset so a room,
		// an artifact and a monster with the same native number never collide.
		internal const long ArtifactBase = 100000, MonsterBase = 200000, PlayerBase = 300000;
		// Native numbers repeat between adventures, so every id also carries the adventure:
		// adventure code * 1,000,000 + kind base + native number. The code is a stable hash of the
		// adventure name (checked collision-free for the 23 shipped adventures).
		static long _adventure;
		static long PlayerId => _adventure + PlayerBase;
		static long AdventureCode(string name)
		{
			uint hash = 2166136261;
			foreach (var ch in (name ?? "").ToLowerInvariant()) { hash ^= ch; hash *= 16777619; }
			return (hash % 2000 + 1) * 1000000L;
		}

		internal static string Build()
		{
			var engine = Eamon.Game.Plugin.Globals.gEngine;
			var state = engine?.GetGameState();
			var db = engine?.Database;
			if (state == null || db?.RoomTable == null || db.ArtifactTable == null || db.MonsterTable == null) return null;
			var room = db.RoomTable.FindRecord(state.Ro);
			var self = db.MonsterTable.FindRecord(state.Cm);
			if (room == null || self == null) return null;
			_adventure = AdventureCode(engine.GetModule()?.Name);

			var lit = room.IsLit();
			var exits = new List<object>();
			var objects = new List<object>();
			var inventory = new List<object>();
			var artifacts = db.ArtifactTable.Records.ToList();
			var shown = new HashSet<long>();

			if (lit)
			{
				var module = engine.GetModule();
				var numDirs = module != null ? module.NumDirs : 6;
				for (long dv = 1; dv <= numDirs; dv++)
				{
					if (!room.IsDirectionInObviousExitsList(dv)) continue;
					var dir = engine.GetDirection((Direction)dv); // the long overload is a zero-based table index
					if (dir == null) continue;
					var dest = room.IsDirectionRoom(dv) ? db.RoomTable.FindRecord(room.GetDir(dv)) : null;
					var known = dest != null && dest.Seen;
					exits.Add(new { label = dir.Name.ToLowerInvariant(), command = (dir.Abbr ?? dir.Name).ToLowerInvariant(), to = known ? (long?)(_adventure + dest.Uid) : null, toName = known ? dest.Name : null, door = room.IsDirectionDoor(dv) });
				}
				foreach (var a in artifacts)
					if (a.Seen && a.IsInRoomUid(room.Uid)) { objects.Add(Describe(a, null, self)); shown.Add(a.Uid); }
				foreach (var m in db.MonsterTable.Records)
					if (m.Uid != self.Uid && m.Seen && m.IsInRoomUid(room.Uid))
						objects.Add(new { id = _adventure + MonsterBase + m.Uid, name = m.Name, parent = (long?)null, kind = "monster", aliases = m.Synonyms ?? Array.Empty<string>(), reaction = m.Reaction.ToString(), count = m.CurrGroupCount });
			}

			foreach (var a in artifacts)
			{
				var worn = a.IsWornByMonster(MonsterType.CharMonster);
				if (!worn && !a.IsCarriedByMonster(MonsterType.CharMonster)) continue;
				inventory.Add(Describe(a, PlayerId, self, worn));
				shown.Add(a.Uid);
			}

			// Contents the game has already shown, inside something the player can see or holds.
			for (var pass = 0; pass < 3; pass++)
				foreach (var a in artifacts)
				{
					if (!a.Seen || shown.Contains(a.Uid) || !a.IsCarriedByContainer()) continue;
					var holder = a.GetCarriedByContainerUid();
					if (!shown.Contains(holder)) continue;
					var holderRecord = db.ArtifactTable.FindRecord(holder);
					var held = holderRecord != null && (holderRecord.IsCarriedByMonster(MonsterType.CharMonster, true) || holderRecord.IsWornByMonster(MonsterType.CharMonster, true));
					(held ? inventory : objects).Add(Describe(a, _adventure + ArtifactBase + holder, self));
					shown.Add(a.Uid);
				}

			var character = (engine as EamonRT.Framework.Plugin.IEngine)?.Character;
			var stats = new Dictionary<string, object>
			{
				["health"] = Math.Max(0, self.Hardiness - self.DmgTaken), ["maxHealth"] = self.Hardiness, ["agility"] = self.Agility,
				["armorClass"] = state.Ar, ["speed"] = state.Speed
			};
			if (character != null) { stats["gold"] = character.HeldGold; stats["name"] = character.Name; }

			// The words this adventure's parser accepts: each player-enabled command's verb and synonyms,
			// and the engine's prepositions. ParchLock offers only these (operator rule: no extra commands).
			var commands = new List<object>();
			var rtEngine = engine as EamonRT.Framework.Plugin.IEngine;
			if (rtEngine?.CommandList != null)
				foreach (var command in rtEngine.CommandList)
					if (command != null && command.IsPlayerEnabled && !string.IsNullOrWhiteSpace(command.Verb))
						commands.Add(new { verb = command.Verb, synonyms = command.Synonyms ?? Array.Empty<string>(), dark = command.IsDarkEnabled });
			var preps = (engine.Preps ?? Array.Empty<Eamon.Framework.Primitive.Classes.IPrep>()).Where(p => p != null && !string.IsNullOrWhiteSpace(p.Name)).Select(p => p.Name.ToLowerInvariant()).Distinct().ToArray();

			return JsonSerializer.Serialize(new
			{
				vocabulary = new { commands, preps },
				adventure = engine.GetModule()?.Name, room = new { id = _adventure + room.Uid, name = room.Name, lit }, exits, objects, inventory, stats,
				playerId = PlayerId
			});
		}

		static object Describe(IArtifact a, long? parent, IMonster self, bool worn = false) => new
		{
			id = _adventure + ArtifactBase + a.Uid, name = a.Name, parent, kind = "artifact", aliases = a.Synonyms ?? Array.Empty<string>(),
			worn, ready = self.Weapon == a.Uid, wearable = a.Wearable != null, container = a.GeneralContainer != null,
			weapon = a.GeneralWeapon != null, readable = a.Readable != null, edible = a.Edible != null, drinkable = a.Drinkable != null,
			light = a.LightSource != null, door = a.DoorGate != null, @fixed = a.IsUnmovable(), state = a.StateDesc ?? ""
		};
	}
}
