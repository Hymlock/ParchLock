// ParchLock Eamon host: each adventure's outcome contract (plan section 6, "How a clear is captured"), as data
// evaluated over the engine's own records at every adventure prompt; the latest result is kept and bound to how
// the adventure ended when its plugin returns. Read-only. ParchLock content, written from each adventure's source.
//
// A contract is written over the world as it stands at the LAST prompt of that adventure's success path, which is
// not always the state before the exit's Y answer (Wrenhold limbos the orb, then asks to name the bow); every
// contract cites that prompt (Grok #3407).
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using Eamon.Framework.Primitive.Enums;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class ClearContracts
	{
		// Module name -> contract. "quest" is the success condition; an adventure with no quest has "quest": null and
		// clears on leaving alive through its own exit.
		static readonly Dictionary<string, string> Contracts = new Dictionary<string, string>(StringComparer.Ordinal)
		{
			// The Beginner's Cave: Duke Luxom's reward for Cynthia, MainLoop.cs:27 (Cynthia, monster 3, in the
			// player's room at the exit and not an Enemy). Last prompt: the exit Y/N (EamonRT PlayerMoveCheckState
			// ReadField); nothing moves Cynthia after it. Grok #3400/#3407 and Claude's blind contract agree.
			["The Beginner's Cave"] = @"{ ""quest"": { ""all"": [ { ""monster"": 3, ""inPlayerRoom"": true }, { ""monster"": 3, ""reactionAbove"": ""Enemy"" } ] } }",
			// The Training Ground: its own end is graduation. The manager turns away a character whose armour expertise is
			// above 25 ("you're overqualified", IntroStory.cs:28-38); operator decision 2026-11-12: leaving it with armour
			// expertise above 25 completes it. Read at the exit Y/N (the character's own record).
			["The Training Ground"] = @"{ ""quest"": { ""character"": ""ArmorExpertise"", ""greaterThan"": 25 } }",
			// The Wayfarers Inn: "resolve the crisis" (intro effect 250) = the haunting laid to rest,
			// GameState.CharlotteRestInPeace, set only at UseCommand.cs:92 (Charlotte's blessed bones and the teddy
			// bear buried); it pays the investors' reward (MainLoop.cs:112). A GameState flag Shutdown never changes.
			// The deed (70), the artisans' remains and the constable path are side rewards, not the quest
			// (Grok #3423 blind version agrees; the constable path and the burial are mutually exclusive).
			["The Wayfarers Inn"] = @"{ ""quest"": { ""gameState"": ""CharlotteRestInPeace"", ""equals"": 1 } }",
			// Beginner's Forest: rescuing the Fairy Queen (monster 8). Meeting her prints "thanks you for rescuing her",
			// gives the crown and sets her Field1 to 1 (GetPlayerInputState.cs:28-58); nothing resets it. Last prompt: exit Y/N.
			// Claude's reading, for Grok's review.
			["Beginner's Forest"] = @"{ ""quest"": { ""monster"": 8, ""field"": ""Field1"", ""equals"": 1 } }",
			// Beginner's Cave II: its author's own hint names the whole design: "There are two secret passages to be found ...
			// That is all there is for special events in this adventure" (HINTS.DAT, all secrets). They lead to its one
			// centrepiece, the treasure chest (artifact 5, value 1500, weight 90) "sealed in this room with its owner (the
			// mummy)" behind the first passage (room 7). Its author says outright that it is to be carried out: OPEN TREASURE
			// CHEST prints "You would only make a mess. Wait until you leave." (OpenCommand.cs:23-28). Completion (operator
			// 2026-11-12: the creator's own completion, played): leave carrying the chest yourself. Accepted, Grok #3437.
			["Beginner's Cave II"] = @"{ ""quest"": { ""artifact"": 5, ""carried"": true, ""recurse"": true } }",
			// Alternate Beginner's Cave: Nina's reward, MainLoop.cs Shutdown: Nina (monster 11) in the player's room at the exit
			// with Reaction == Friend (exactly; Friend is the only reaction above Neutral). Last prompt: exit Y/N; Claude's
			// reading, for Grok's review.
			// The Deep Canyon: pushed into the canyon, "it'll be up to you to find your way out" (intro effects 202-204); no
			// reward or finish code. Escaping alive through an exit is the goal. Claude's reading, for Grok's review.
			// Completion (operator 2026-11-12): the only exit is room 60, "Outside Main Hall. Congratulations!!!!" (the start
			// room has no exit), so reaching it is the author's end; stated explicitly.
			["The Deep Canyon"] = @"{ ""quest"": { ""gameState"": ""Ro"", ""equals"": 60 } }",
			// The Pyramid of Anharos: MainLoop.Shutdown's tomb-restored branch: KV == 1 (set by PUT, PutCommand.cs:71) and
			// KF != 1 (SayCommand.cs:46 toggles it). With Omar, Ali or Farouk present the elders pay a reward (effects 35-38);
			// without one, effect 51 ("the black cloud has vanished", no reward) is still the author's success, so a companion
			// is not required (owner 2026-11-12, #3471). Every other branch levies tax and takes the gold.
			["The Pyramid of Anharos"] = @"{ ""quest"": { ""all"": [ { ""gameState"": ""KV"", ""equals"": 1 }, { ""not"": { ""gameState"": ""KF"", ""equals"": 1 } } ] } }",
			// Land of the Mountain King: no exit; the only finish is the scripted one when the mountain king (monster 1)
			// dies (CombatComponent.cs:32-51); its last prompts are the key presses after that death. For Grok's review.
			["Land of the Mountain King"] = @"{ ""quest"": { ""monster"": 1, ""dead"": true } }",
			// The Tower of Eamon: the mission is "to expose the secret plans" of the Underground Villains Club (effect 200);
			// stock engine, nothing checks it in code, so ParchLock reads it as leaving with the Book of Evil Plans
			// (artifact 22, starts in the tall bookcase 17). Interpretation, for Grok's and the operator's review.
			["The Tower of Eamon"] = @"{ ""quest"": { ""artifact"": 22, ""carried"": true, ""recurse"": true } }",
			// DharmaQuest: the gods' ceremony when praying in room 68 (PrayCommand.cs:122-296), a scripted finish; its last
			// prompt is the key press at :288 with the player still in room 68 (ExitType is set after it). Leaving any
			// other way reads false. Ro==68 holds at every prompt in Olympus; safe because room 68 has no exits (Grok #3429).
			["DharmaQuest"] = @"{ ""quest"": { ""gameState"": ""Ro"", ""equals"": 68 } }",
			// Firestorm: stop Thorak (monster 27, starts in room 85; intro effects 200-206, 47). A slain single monster
			// goes to limbo (EamonRT MonsterDies), and Firestorm's own code reads "not in limbo" as Thorak alive
			// (Room.cs:23-25). Its exit (room 86 south) is itself closed while Thorak lives (Room.GetDir). Accepted, Grok #3429.
			["Firestorm"] = @"{ ""quest"": { ""monster"": 27, ""inLimbo"": true } }",
			// Wrenhold's Secret Vigil: after the exit's Y the orb goes to limbo and, only on success, King Argas hands over
			// the magic elven bow (artifact 50, starts in limbo) before the bow-naming prompt (PlayerMoveCheckState.cs
			// :162-205), its last prompt with ExitType still None (Grok #3407 fix 1).
			["Wrenhold's Secret Vigil"] = @"{ ""quest"": { ""all"": [ { ""artifact"": 50, ""carried"": true }, { ""artifact"": 4, ""inLimbo"": true } ] } }",
			// The Sub-Aquan Laboratory: information for Mayor Frump. Shutdown pays when QuestValue > 0 after adding a share
			// for zone-2 (lab) rooms seen (MainLoop.cs); QuestValue grows by reading the lab's documents (ReadCommand.cs:40,
			// :110, :136). Before Shutdown that is: a document read, or any lab room seen. For Grok's review.
			["The Sub-Aquan Laboratory"] = @"{ ""quest"": { ""any"": [ { ""gameState"": ""QuestValue"", ""greaterThan"": 0 }, { ""zone"": 2, ""roomsSeenAtLeast"": 1 } ] } }",
			// Orb of My Life: the Orb of Life (artifact 23) carried by the player at the exit (MainLoop.cs Shutdown, checked
			// before it is put in limbo there). For Grok's review.
			["Orb of My Life"] = @"{ ""quest"": { ""artifact"": 23, ""carried"": true } }",
			// Escape from Mt. Moon: "safely navigate its corridors and investigate the activities of Team Rocket" (effect
			// 200); stock engine, nothing checks the investigation, so escaping alive through an exit is the clear.
			// Interpretation, for Grok's and the operator's review.
			// Completion (operator 2026-11-12): room 12 "By Many Fossils" ("Now that you've beaten Rocket...") exits north
			// toward Cerulean City, the author's end; room 1's exit only goes back to Pewter City. The Rocket boss (monster
			// 4) beaten as well.
			["Escape from Mt. Moon"] = @"{ ""quest"": { ""all"": [ { ""gameState"": ""Ro"", ""equals"": 12 }, { ""monster"": 4, ""inLimbo"": true } ] } }",
			// The Temple of Ngurct: the mission is returning the gold medallion of Ngurct (artifact 77) carried; otherwise
			// "you have failed in your mission" (MainLoop.cs Shutdown, checked before it limbos the medallion). Princess
			// Thera's return is an extra reward, not the mission. For Grok's review.
			["The Temple of Ngurct"] = @"{ ""quest"": { ""artifact"": 77, ""carried"": true } }",
			// The Vile Grimoire of Jaldi'al: the grimoire (artifact 27) carried to Kreqor (MainLoop.cs Shutdown); the
			// leather-bound book (9) is the forgery he rejects. For Grok's review.
			["The Vile Grimoire of Jaldi'al"] = @"{ ""quest"": { ""artifact"": 27, ""carried"": true } }",
			// Stronghold of Kahr-Dur: its own exit verdict (PlayerMoveCheckState.cs:114-146): the necromancer (22) in limbo
			// and Lady Mirabelle (26) in the player's room; last prompt its own Y/N (:153), before any change (Grok #3402).
			["Stronghold of Kahr-Dur"] = @"{ ""quest"": { ""all"": [ { ""monster"": 22, ""inLimbo"": true }, { ""monster"": 26, ""inPlayerRoom"": true } ] } }",
			// A Runcible Cargo: three scripted victories: the bandit commander (27) and soldiers (28) dead, or the bandit
			// prince (38) and Praetorian Guards (39) dead (GetPlayerInputState.cs:246-277), or the detonator with the
			// explosive (43) in the cargo (129) carried by the prince and the gates (137) closed (UseCommand.cs:63-89), sampled
			// while USE of the detonator (45) is the running command: the capitulation ending (SayCommand.cs:227-241) can leave
			// the same world (the gates slam shut by themselves in room 93, PrintPlayerRoomState.cs:271-283), so only the
			// command tells them apart (Grok #3429). Branches 1-2 accepted by Grok #3429.
			["A Runcible Cargo"] = @"{ ""quest"": { ""any"": [ { ""all"": [ { ""monster"": 27, ""inLimbo"": true }, { ""monster"": 28, ""inLimbo"": true } ] }, { ""all"": [ { ""monster"": 38, ""inLimbo"": true }, { ""monster"": 39, ""inLimbo"": true } ] }, { ""all"": [ { ""artifact"": 43, ""inContainer"": 129 }, { ""artifact"": 129, ""carriedByMonster"": 38 }, { ""artifact"": 137, ""open"": false }, { ""command"": ""use"", ""dobj"": 45 } ] } ] } }",
			["Alternate Beginner's Cave"] = @"{ ""quest"": { ""all"": [ { ""monster"": 11, ""inPlayerRoom"": true }, { ""monster"": 11, ""reactionAbove"": ""Neutral"" } ] } }",
		};

		/// <summary>The latest evaluation for the running adventure: "true", "false", "none" (no quest), "uncontracted"
		/// or "error: ...".</summary>
		internal static string Latest = "uncontracted";

		static readonly Dictionary<string, JsonDocument> Parsed = new Dictionary<string, JsonDocument>(StringComparer.Ordinal);

		internal static void Reset() => Latest = "uncontracted";

		static readonly HashSet<string> Checked = new HashSet<string>(StringComparer.Ordinal);

		internal static void Evaluate()
		{
			var name = gEngine?.GetModule()?.Name ?? "";
			if (!Contracts.TryGetValue(name, out var json))
			{
				Latest = "uncontracted";
				// A tiered adventure must have a contract (Grok #3484 self-check).
				if (ProgressionGate.Tiers.ContainsKey(name) && Checked.Add(name)) HostBridge.Lifecycle("contract-check", name + "|FAIL: no contract");
				return;
			}
			try
			{
				if (!Parsed.TryGetValue(name, out var doc)) Parsed[name] = doc = JsonDocument.Parse(json);
				if (gEngine.GetGameState() == null || gEngine.Database == null) { Latest = "error: no game state"; return; }
				// Once per adventure load: every clause against the database and game state the engine actually loaded.
				if (Checked.Add(name))
				{
					var problems = new List<string>();
					var questToCheck = doc.RootElement.GetProperty("quest");
					if (questToCheck.ValueKind != JsonValueKind.Null) Check(questToCheck, problems);
					HostBridge.Lifecycle("contract-check", name + "|" + (problems.Count == 0 ? "ok" : "FAIL: " + string.Join("; ", problems)));
				}
				var quest = doc.RootElement.GetProperty("quest");
				Latest = quest.ValueKind == JsonValueKind.Null ? "none" : (Holds(quest) ? "true" : "false");
			}
			catch (Exception e) { Latest = "error: " + e.Message; }
		}

		// Each leaf names one subject and exactly one predicate (plus the "recurse" modifier for artifacts); any other
		// key is refused, so a typo can never be read as a different test (Grok #3407 item 3). Defaults follow the
		// engine: carried, worn and container tests are not recursive unless "recurse": true (item 2).
		static readonly string[] MonsterPredicates = { "inPlayerRoom", "reactionAbove", "inLimbo", "inRoom", "field", "dead" };
		static readonly string[] ArtifactPredicates = { "carried", "worn", "inContainer", "carriedByMonster", "inLimbo", "inRoom", "field", "open" };

		static bool Holds(JsonElement c)
		{
			var keys = c.EnumerateObject().Select(p => p.Name).ToArray();
			if (keys.Length == 1 && keys[0] == "all") return c.GetProperty("all").EnumerateArray().All(Holds);
			if (keys.Length == 1 && keys[0] == "any") return c.GetProperty("any").EnumerateArray().Any(Holds);
			if (keys.Length == 1 && keys[0] == "not") return !Holds(c.GetProperty("not"));
			var state = gEngine.GetGameState();
			var db = gEngine.Database;
			if (keys.Contains("monster"))
			{
				var predicate = Single(c, keys, "monster", MonsterPredicates, "equals");
				var m = db.MonsterTable.FindRecord(c.GetProperty("monster").GetInt64()) ?? throw new InvalidOperationException("no monster " + c.GetProperty("monster"));
				var v = c.GetProperty(predicate);
				if (predicate == "field") return FieldEquals(m, c);
				switch (predicate)
				{
					case "inPlayerRoom": return (m.Location == state.Ro) == v.GetBoolean();
					case "reactionAbove": return m.Reaction > Enum.Parse<Friendliness>(v.GetString());
					case "inLimbo": return m.IsInLimbo() == v.GetBoolean();
					case "dead": return m.IsDead() == v.GetBoolean();
					default: return m.Location == v.GetInt64();
				}
			}
			if (keys.Contains("artifact"))
			{
				var predicate = Single(c, keys, "artifact", ArtifactPredicates, "recurse", "equals");
				var recurse = c.TryGetProperty("recurse", out var r) && r.GetBoolean();
				var a = db.ArtifactTable.FindRecord(c.GetProperty("artifact").GetInt64()) ?? throw new InvalidOperationException("no artifact " + c.GetProperty("artifact"));
				if (predicate == "field") return FieldEquals(a, c);
				var v = c.GetProperty(predicate);
				switch (predicate)
				{
					case "carried": return a.IsCarriedByMonster(MonsterType.CharMonster, recurse) == v.GetBoolean();
					case "worn": return a.IsWornByMonster(MonsterType.CharMonster, recurse) == v.GetBoolean();
					case "inContainer": return a.IsCarriedByContainerUid(v.GetInt64(), recurse);
					case "carriedByMonster": return a.IsCarriedByMonsterUid(v.GetInt64(), recurse);
					case "inLimbo": return a.IsInLimbo(recurse) == v.GetBoolean();
					// A door/gate or an in-container's open state (the engine's own IsOpen()).
					case "open":
						var openable = (Eamon.Framework.Primitive.Classes.IArtifactCategory)a.DoorGate ?? a.InContainer ?? throw new InvalidOperationException("artifact " + a.Uid + " has no open state");
						return openable.IsOpen() == v.GetBoolean();
					default: return a.IsInRoomUid(v.GetInt64());
				}
			}
			if (keys.Contains("command"))
			{
				// The command the engine is running now (gEngine.CurrState during its Execute): its verb and direct object.
				if (keys.Length != 2 || !keys.Contains("dobj")) throw new InvalidOperationException("command needs exactly: dobj");
				var running = (gEngine as EamonRT.Framework.Plugin.IEngine)?.CurrState as EamonRT.Framework.Commands.ICommand;
				return running != null && string.Equals(running.Verb, c.GetProperty("command").GetString(), StringComparison.OrdinalIgnoreCase)
					&& running.DobjArtifact != null && running.DobjArtifact.Uid == c.GetProperty("dobj").GetInt64();
			}
			if (keys.Contains("character"))
			{
				// The player character's own record: ArmorExpertise or a weapon ability (Axe, Bow, Club, Spear, Sword).
				var comparison = keys.Contains("equals") ? "equals" : keys.Contains("greaterThan") ? "greaterThan" : null;
				if (keys.Length != 2 || comparison == null) throw new InvalidOperationException("character needs exactly one of: equals, greaterThan");
				var who = (gEngine as EamonRT.Framework.Plugin.IEngine)?.Character ?? throw new InvalidOperationException("no character");
				var stat = c.GetProperty("character").GetString();
				long value = stat == "ArmorExpertise" ? who.ArmorExpertise
					: Enum.TryParse<Weapon>(stat, out var weapon) ? who.GetWeaponAbility(weapon)
					: throw new InvalidOperationException("unknown character stat " + stat);
				return comparison == "equals" ? value == c.GetProperty("equals").GetInt64() : value > c.GetProperty("greaterThan").GetInt64();
			}
			if (keys.Contains("zone"))
			{
				// Rooms of an adventure zone the player has seen (Room.Seen), as an engine's own Shutdown counts them.
				if (keys.Length != 2 || !keys.Contains("roomsSeenAtLeast")) throw new InvalidOperationException("zone needs exactly: roomsSeenAtLeast");
				var zone = c.GetProperty("zone").GetInt64();
				return db.RoomTable.Records.Count(r => r.Zone == zone && r.Seen) >= c.GetProperty("roomsSeenAtLeast").GetInt64();
			}
			if (keys.Contains("gameState"))
			{
				var comparison = keys.Contains("equals") ? "equals" : keys.Contains("greaterThan") ? "greaterThan" : null;
				if (keys.Length != 2 || comparison == null) throw new InvalidOperationException("gameState needs exactly one of: equals, greaterThan");
				var field = c.GetProperty("gameState").GetString();
				PropertyInfo property;
				try { property = state.GetType().GetProperty(field, BindingFlags.Public | BindingFlags.Instance); }
				catch (AmbiguousMatchException) { throw new InvalidOperationException("ambiguous game state property " + field); }
				if (property == null) throw new InvalidOperationException("no game state property " + field + " (properties only)");
				var value = Convert.ToInt64(property.GetValue(state));
				return comparison == "equals" ? value == c.GetProperty("equals").GetInt64() : value > c.GetProperty("greaterThan").GetInt64();
			}
			throw new InvalidOperationException("unknown contract clause " + c.GetRawText());
		}

		/// <summary>The self-check (Grok #3484): every leaf is evaluated, with no short-circuit of all/any/not, and every
		/// uid a predicate names (a holder container or monster, a room) must exist, so a contract that names something the
		/// built package does not have fails loudly at the adventure's first prompt instead of at its end.</summary>
		static void Check(JsonElement c, List<string> problems)
		{
			var keys = c.EnumerateObject().Select(p => p.Name).ToArray();
			if (keys.Length == 1 && (keys[0] == "all" || keys[0] == "any")) { foreach (var child in c.GetProperty(keys[0]).EnumerateArray()) Check(child, problems); return; }
			if (keys.Length == 1 && keys[0] == "not") { Check(c.GetProperty("not"), problems); return; }
			try
			{
				Holds(c);
				var db = gEngine.Database;
				if (keys.Contains("artifact"))
				{
					if (c.TryGetProperty("inContainer", out var holder) && db.ArtifactTable.FindRecord(holder.GetInt64()) == null) problems.Add("no container artifact " + holder);
					if (c.TryGetProperty("carriedByMonster", out var mon) && db.MonsterTable.FindRecord(mon.GetInt64()) == null) problems.Add("no monster " + mon);
					if (c.TryGetProperty("inRoom", out var room) && db.RoomTable.FindRecord(room.GetInt64()) == null) problems.Add("no room " + room);
				}
				if (keys.Contains("monster") && c.TryGetProperty("inRoom", out var mroom) && db.RoomTable.FindRecord(mroom.GetInt64()) == null) problems.Add("no room " + mroom);
				if (keys.Contains("zone") && !db.RoomTable.Records.Any(r => r.Zone == c.GetProperty("zone").GetInt64())) problems.Add("no room in zone " + c.GetProperty("zone"));
			}
			catch (Exception e) { problems.Add(e.Message); }
		}

		static string Single(JsonElement c, string[] keys, string subject, string[] predicates, params string[] modifiers)
		{
			var found = keys.Where(k => predicates.Contains(k)).ToArray();
			var other = keys.Where(k => k != subject && !modifiers.Contains(k) && !predicates.Contains(k)).ToArray();
			if (found.Length != 1 || other.Length > 0) throw new InvalidOperationException("clause needs exactly one predicate: " + c.GetRawText());
			// "equals" belongs to "field" only.
			if ((found[0] == "field") != keys.Contains("equals")) throw new InvalidOperationException("field needs equals, and only field takes it: " + c.GetRawText());
			return found[0];
		}

		/// <summary>A record's own numeric property (an adventure's Field1..Field5 marker), read like a GameState field.</summary>
		static bool FieldEquals(object record, JsonElement c)
		{
			var name = c.GetProperty("field").GetString();
			PropertyInfo property;
			try { property = record.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance); }
			catch (AmbiguousMatchException) { throw new InvalidOperationException("ambiguous property " + name); }
			if (property == null) throw new InvalidOperationException("no property " + name + " (properties only)");
			return Convert.ToInt64(property.GetValue(record)) == c.GetProperty("equals").GetInt64();
		}
	}
}
