// ParchLock Eamon host: each adventure's outcome contract (plan section 6, "How a clear is captured"), as data
// evaluated over the engine's own records at every adventure prompt; the latest result is kept and bound to how
// the adventure ended when its plugin returns. Read-only. ParchLock content, written from each adventure's source.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Eamon.Framework.Primitive.Enums;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class ClearContracts
	{
		// Module name -> contract. "quest" is the success condition; an adventure with no quest has "quest": null and
		// clears on leaving alive through its own exit. Sources are cited per adventure.
		static readonly Dictionary<string, string> Contracts = new Dictionary<string, string>(StringComparer.Ordinal)
		{
			// The Beginner's Cave: Duke Luxom's reward for Cynthia, MainLoop.cs:27 (Cynthia, monster 3, in the
			// player's room at the exit and not an Enemy). Grok #3400 and Claude's blind contract agree.
			["The Beginner's Cave"] = @"{ ""quest"": { ""all"": [ { ""monster"": 3, ""inPlayerRoom"": true }, { ""monster"": 3, ""reactionAbove"": ""Enemy"" } ] } }",
		};

		/// <summary>The latest evaluation for the running adventure: "true", "false", "none" (no quest), "uncontracted"
		/// or "error: ...".</summary>
		internal static string Latest = "uncontracted";

		internal static void Evaluate()
		{
			var name = gEngine?.GetModule()?.Name ?? "";
			if (!Contracts.TryGetValue(name, out var json)) { Latest = "uncontracted"; return; }
			try
			{
				using var doc = JsonDocument.Parse(json);
				var quest = doc.RootElement.GetProperty("quest");
				Latest = quest.ValueKind == JsonValueKind.Null ? "none" : (Holds(quest) ? "true" : "false");
			}
			catch (Exception e) { Latest = "error: " + e.Message; }
		}

		static bool Holds(JsonElement c)
		{
			if (c.TryGetProperty("all", out var all)) return all.EnumerateArray().All(Holds);
			if (c.TryGetProperty("any", out var any)) return any.EnumerateArray().Any(Holds);
			if (c.TryGetProperty("not", out var not)) return !Holds(not);
			var state = gEngine.GetGameState();
			var db = gEngine.Database;
			if (c.TryGetProperty("monster", out var mId))
			{
				var m = db.MonsterTable.FindRecord(mId.GetInt64()) ?? throw new InvalidOperationException("no monster " + mId);
				if (c.TryGetProperty("inPlayerRoom", out var inRoom)) return (m.Location == state.Ro) == inRoom.GetBoolean();
				if (c.TryGetProperty("reactionAbove", out var above)) return m.Reaction > Enum.Parse<Friendliness>(above.GetString());
				if (c.TryGetProperty("inLimbo", out var limbo)) return m.IsInLimbo() == limbo.GetBoolean();
				if (c.TryGetProperty("inRoom", out var room)) return m.Location == room.GetInt64();
			}
			if (c.TryGetProperty("artifact", out var aId))
			{
				var a = db.ArtifactTable.FindRecord(aId.GetInt64()) ?? throw new InvalidOperationException("no artifact " + aId);
				if (c.TryGetProperty("carried", out var carried)) return (a.IsCarriedByMonster(MonsterType.CharMonster, true) || a.IsWornByMonster(MonsterType.CharMonster, true)) == carried.GetBoolean();
				if (c.TryGetProperty("inContainer", out var holder)) return a.IsCarriedByContainerUid(holder.GetInt64(), true);
				if (c.TryGetProperty("inLimbo", out var limbo)) return a.IsInLimbo() == limbo.GetBoolean();
				if (c.TryGetProperty("inRoom", out var room)) return a.IsInRoomUid(room.GetInt64());
			}
			if (c.TryGetProperty("gameState", out var field) && c.TryGetProperty("equals", out var value))
			{
				var property = state.GetType().GetProperty(field.GetString()) ?? throw new InvalidOperationException("no game state field " + field);
				return Convert.ToInt64(property.GetValue(state)) == value.GetInt64();
			}
			throw new InvalidOperationException("unknown contract clause " + c.GetRawText());
		}
	}
}
