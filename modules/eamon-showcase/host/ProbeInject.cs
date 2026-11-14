// ParchLock Eamon host, PROBE BUILDS ONLY (compiled with PARCHLOCK_PROBE; never in a shipped package): applies an end state
// an adventure's own finish code produces, so a probe can check that the clear contract turns true at the author's end
// and that the real finish path then credits it (Grok #3489, method (c)). A probe types "#probe <json>" at an adventure
// prompt; the host applies it to the loaded database and asks again. Each op names exactly one change:
//   {"artifact": 23, "to": "carried" | "worn" | "limbo"}  or  {"artifact": 23, "room": 12}
//   {"monster": 27, "to": "limbo" | "player"}             or  {"monster": 26, "room": 12}
//   {"monster": 8, "set": "Field1", "value": 1}  or  {"monster": 11, "set": "Reaction", "value": "Friend"}  (a record's own property)
//   {"state": "Ro", "value": 60}   (a game state property; "Ro" also moves the player there)
//   {"stateKey": "ParalyzedTargets", "value": 3}   (adds the player's monster to a game state dictionary keyed by monster
//   uid; a list value gets [value]; "remove": true takes it out; stats acceptance, Grok #3558 C1)
//   {"report": true}               (lifecycle "probe-contract": the contract's evaluation now)
#if PARCHLOCK_PROBE
using System;
using System.Reflection;
using System.Text.Json;
using Eamon.Framework.Primitive.Enums;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class ProbeInject
	{
		internal const string Prefix = "#probe ";

		static void SetProperty(object record, string name, JsonElement v)
		{
			var p = record.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance) ?? throw new InvalidOperationException("no property " + name);
			object value = p.PropertyType.IsEnum ? (v.ValueKind == JsonValueKind.String ? Enum.Parse(p.PropertyType, v.GetString()) : Enum.ToObject(p.PropertyType, v.GetInt64()))
				: p.PropertyType == typeof(bool) ? (object)(v.GetInt64() != 0) : Convert.ChangeType(v.GetInt64(), p.PropertyType);
			p.SetValue(record, value);
		}

		internal static string Apply(string json)
		{
			string result;
			try
			{
				using (var doc = JsonDocument.Parse(json))
				{
					var c = doc.RootElement;
					var db = gEngine.Database;
					var state = gEngine.GetGameState();
					var player = db.MonsterTable.FindRecord(state.Cm) ?? throw new InvalidOperationException("no player");
					if (c.TryGetProperty("artifact", out var au))
					{
						var a = db.ArtifactTable.FindRecord(au.GetInt64()) ?? throw new InvalidOperationException("no artifact " + au);
						if (c.TryGetProperty("set", out var aset)) SetProperty(a, aset.GetString(), c.GetProperty("value"));
						else if (c.TryGetProperty("room", out var ar)) a.SetInRoomUid(ar.GetInt64());
						else switch (c.GetProperty("to").GetString())
						{
							case "carried": a.SetCarriedByMonster(player); break;
							case "worn": a.SetWornByMonster(player); break;
							case "limbo": a.SetInLimbo(); break;
							default: throw new InvalidOperationException("artifact to: carried, worn or limbo");
						}
					}
					else if (c.TryGetProperty("monster", out var mu))
					{
						var m = db.MonsterTable.FindRecord(mu.GetInt64()) ?? throw new InvalidOperationException("no monster " + mu);
						if (c.TryGetProperty("set", out var mset)) SetProperty(m, mset.GetString(), c.GetProperty("value"));
						else if (c.TryGetProperty("room", out var mr)) m.SetInRoomUid(mr.GetInt64());
						else switch (c.GetProperty("to").GetString())
						{
							case "limbo": m.SetInLimbo(); break;
							case "player": m.SetInRoomUid(state.Ro); break;
							default: throw new InvalidOperationException("monster to: limbo or player");
						}
					}
					else if (c.TryGetProperty("state", out var sf))
					{
						SetProperty(state, sf.GetString(), c.GetProperty("value"));
						if (sf.GetString() == "Ro") { player.SetInRoomUid(state.Ro); }
					}
					else if (c.TryGetProperty("stateKey", out var sk))
					{
						var p = state.GetType().GetProperty(sk.GetString(), BindingFlags.Public | BindingFlags.Instance) ?? throw new InvalidOperationException("no property " + sk);
						var dict = p.GetValue(state) as System.Collections.IDictionary ?? throw new InvalidOperationException(sk + " is not a dictionary");
						if (c.TryGetProperty("remove", out _)) dict.Remove(state.Cm);
						else
						{
							var valueType = p.PropertyType.GetGenericArguments()[1];
							var v = c.GetProperty("value").GetInt64();
							dict[state.Cm] = valueType == typeof(long) ? (object)v : new System.Collections.Generic.List<long> { v };
						}
					}
					else if (!c.TryGetProperty("report", out _)) throw new InvalidOperationException("unknown op");
					ClearContracts.Evaluate();
					result = "ok contract=" + ClearContracts.Latest;
				}
			}
			catch (Exception e) { result = "error: " + e.Message; }
			HostBridge.Lifecycle("probe-contract", (gEngine.GetModule()?.Name ?? "") + "|" + json + "|" + result);
			return result;
		}
	}
}
#endif
