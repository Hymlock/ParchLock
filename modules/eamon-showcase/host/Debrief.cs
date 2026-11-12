// ParchLock Eamon host: the debriefing after an adventure (plan section 6, "Debriefing"; ParchLock's added design). The
// figures are the engine's own: the Main Hall character's gold when the adventure was chosen and when it is back, the
// clear decision made at the plugin's return (SaveEvents), and the Guild rank from the clear ledger. It is reported to
// the page, which shows it in ParchLock's own dialog; nothing is written into the story text.
using System;
using System.Text.Json;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class Debrief
	{
		static long? _goldAtChoice, _bankAtChoice;
		static string _endingCharacter;
		static int _rankAtChoice;
		static string _ending;      // set when an adventure plugin returns, cleared once reported

		static Eamon.Framework.ICharacter HallCharacter => (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;

		/// <summary>At the Main Hall's adventure selection: the starting figures.</summary>
		internal static void AtChoice()
		{
			var character = HallCharacter;
			if (character == null) return;
			_goldAtChoice = character.HeldGold;
			_bankAtChoice = character.BankGold;
			try { _rankAtChoice = ProgressionGate.OpenTier(); } catch (Exception) { _rankAtChoice = 0; }
		}

		/// <summary>At the plugin's return: how the adventure ended (from SaveEvents.AfterPlugin).</summary>
		internal static void Ended(string adventure, string exitType, long die, string quest, string credit, string characterId, int rankBefore)
		{
			_ending = JsonSerializer.Serialize(new { adventure, exitType, die, quest, credit, rankBefore });
			_endingCharacter = characterId;
		}

		/// <summary>At the Main Hall's first safe prompt after the return, after its commit: report the debriefing.</summary>
		/// <summary>Returns true when it wrote the debriefing (the caller then commits it at once, Grok #3431).</summary>
		internal static bool ReportIfDue()
		{
			if (_ending == null || !(gEngine is EamonMH.Framework.Plugin.IEngine)) return false;
			var character = HallCharacter;
			if (character == null) return false;
			int rank = 0;
			try { rank = ProgressionGate.OpenTier(); } catch (Exception) { }
			using var ending = JsonDocument.Parse(_ending);
			var e = ending.RootElement;
			// The figures belong to the character who went on the adventure: if another one is signed in now, report the
			// ending alone (Grok #3429 D2).
			var sameCharacter = _endingCharacter != null && _endingCharacter == RunLedger.CharacterId(character.Uid, character.Name ?? "");
			// The rank before is taken at the plugin's return from the ledger, so it survives a relaunch (D3).
			var rankBefore = e.GetProperty("rankBefore").GetInt32();
			var payload = JsonSerializer.Serialize(new
			{
				adventure = e.GetProperty("adventure").GetString(),
				exitType = e.GetProperty("exitType").GetString(),
				die = e.GetProperty("die").GetInt64(),
				quest = e.GetProperty("quest").GetString(),
				credit = e.GetProperty("credit").GetString(),
				character = sameCharacter ? character.Name : null,
				goldBefore = sameCharacter ? _goldAtChoice : null,
				goldAfter = sameCharacter ? character.HeldGold : (long?)null,
				bankBefore = sameCharacter ? _bankAtChoice : null,
				bankAfter = sameCharacter ? character.BankGold : (long?)null,
				rankBefore = sameCharacter && rankBefore > 0 ? ProgressionGate.TierNames[rankBefore] : null,
				rank = sameCharacter && rank > 0 ? ProgressionGate.TierNames[rank] : null,
				tierOpened = sameCharacter && rank > rankBefore && rankBefore > 0 ? rank : 0
			});
			var owner = _endingCharacter;
			_ending = null;
			_goldAtChoice = null;
			_bankAtChoice = null;
			_endingCharacter = null;
			// Kept in the campaign files, per character, so the Long Fire tells each character their own last tale.
			try
			{
				if (owner != null)
				{
					var all = ReadAll();
					all[owner] = payload;
					System.IO.File.WriteAllText(LastPath, JsonSerializer.Serialize(all));
				}
			}
			catch (Exception) { }
			HostBridge.Lifecycle("debrief", payload);
			return true;
		}

		static System.Collections.Generic.Dictionary<string, string> ReadAll()
		{
			try { return System.IO.File.Exists(LastPath) ? JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(System.IO.File.ReadAllText(LastPath)) ?? new System.Collections.Generic.Dictionary<string, string>() : new System.Collections.Generic.Dictionary<string, string>(); }
			catch (Exception) { return new System.Collections.Generic.Dictionary<string, string>(); }
		}

		static string LastPath => Entry.BasePath + "/System/Bin/PLDEBRIEF.DAT";

		/// <summary>This character's latest debriefing, or null when they have not returned from an adventure yet.</summary>
		internal static string Last(string characterId)
		{
			return characterId != null && ReadAll().TryGetValue(characterId, out var payload) ? payload : null;
		}
	}
}
