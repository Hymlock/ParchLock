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
			// The Training Ground: a practice facility (module description, intro effects 1-3); no quest code, no
			// reward, no scripted finish. Clears on leaving alive through its one exit. Last prompt: the exit Y/N.
			// Claude's reading; Grok's blind version (#3419) pending.
			["The Training Ground"] = @"{ ""quest"": null }",
			// The Wayfarers Inn: "resolve the crisis" (intro effect 250) = the haunting laid to rest,
			// GameState.CharlotteRestInPeace, set only at UseCommand.cs:92 (Charlotte's blessed bones and the teddy
			// bear buried); it pays the investors' reward (MainLoop.cs:112). A GameState flag Shutdown never changes.
			// Whether the "long-lost documentation" (deed 70 or diary 85) is also required is open. Claude's reading;
			// Grok's blind version (#3419) pending.
			["The Wayfarers Inn"] = @"{ ""quest"": { ""gameState"": ""CharlotteRestInPeace"", ""equals"": 1 } }",
			// Beginner's Forest: rescuing the Fairy Queen (monster 8). Meeting her prints "thanks you for rescuing her",
			// gives the crown and sets her Field1 to 1 (GetPlayerInputState.cs:28-58); nothing resets it. Last prompt: exit Y/N.
			// Claude's reading, for Grok's review.
			["Beginner's Forest"] = @"{ ""quest"": { ""monster"": 8, ""field"": ""Field1"", ""equals"": 1 } }",
			// Beginner's Cave II: no quest text, no reward or finish code (only OpenCommand, Monster, IntroStory). Claude's
			// reading, for Grok's review.
			["Beginner's Cave II"] = @"{ ""quest"": null }",
			// Alternate Beginner's Cave: Nina's reward, MainLoop.cs Shutdown: Nina (monster 11) in the player's room at the exit
			// with Reaction == Friend (exactly; Friend is the only reaction above Neutral). Last prompt: exit Y/N; Claude's
			// reading, for Grok's review.
			["Alternate Beginner's Cave"] = @"{ ""quest"": { ""all"": [ { ""monster"": 11, ""inPlayerRoom"": true }, { ""monster"": 11, ""reactionAbove"": ""Neutral"" } ] } }",
		};

		/// <summary>The latest evaluation for the running adventure: "true", "false", "none" (no quest), "uncontracted"
		/// or "error: ...".</summary>
		internal static string Latest = "uncontracted";

		static readonly Dictionary<string, JsonDocument> Parsed = new Dictionary<string, JsonDocument>(StringComparer.Ordinal);

		internal static void Reset() => Latest = "uncontracted";

		internal static void Evaluate()
		{
			var name = gEngine?.GetModule()?.Name ?? "";
			if (!Contracts.TryGetValue(name, out var json)) { Latest = "uncontracted"; return; }
			try
			{
				if (!Parsed.TryGetValue(name, out var doc)) Parsed[name] = doc = JsonDocument.Parse(json);
				if (gEngine.GetGameState() == null || gEngine.Database == null) { Latest = "error: no game state"; return; }
				var quest = doc.RootElement.GetProperty("quest");
				Latest = quest.ValueKind == JsonValueKind.Null ? "none" : (Holds(quest) ? "true" : "false");
			}
			catch (Exception e) { Latest = "error: " + e.Message; }
		}

		// Each leaf names one subject and exactly one predicate (plus the "recurse" modifier for artifacts); any other
		// key is refused, so a typo can never be read as a different test (Grok #3407 item 3). Defaults follow the
		// engine: carried, worn and container tests are not recursive unless "recurse": true (item 2).
		static readonly string[] MonsterPredicates = { "inPlayerRoom", "reactionAbove", "inLimbo", "inRoom", "field" };
		static readonly string[] ArtifactPredicates = { "carried", "worn", "inContainer", "carriedByMonster", "inLimbo", "inRoom", "field" };

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
					default: return a.IsInRoomUid(v.GetInt64());
				}
			}
			if (keys.Contains("gameState"))
			{
				if (keys.Length != 2 || !keys.Contains("equals")) throw new InvalidOperationException("gameState needs exactly: equals");
				var field = c.GetProperty("gameState").GetString();
				PropertyInfo property;
				try { property = state.GetType().GetProperty(field, BindingFlags.Public | BindingFlags.Instance); }
				catch (AmbiguousMatchException) { throw new InvalidOperationException("ambiguous game state property " + field); }
				if (property == null) throw new InvalidOperationException("no game state property " + field + " (properties only)");
				return Convert.ToInt64(property.GetValue(state)) == c.GetProperty("equals").GetInt64();
			}
			throw new InvalidOperationException("unknown contract clause " + c.GetRawText());
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
