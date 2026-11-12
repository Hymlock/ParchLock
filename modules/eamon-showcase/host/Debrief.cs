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
		static long? _goldAtChoice;
		static int _rankAtChoice;
		static string _ending;      // set when an adventure plugin returns, cleared once reported

		static Eamon.Framework.ICharacter HallCharacter => (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;

		/// <summary>At the Main Hall's adventure selection: the starting figures.</summary>
		internal static void AtChoice()
		{
			var character = HallCharacter;
			if (character == null) return;
			_goldAtChoice = character.HeldGold;
			try { _rankAtChoice = ProgressionGate.OpenTier(); } catch (Exception) { _rankAtChoice = 0; }
		}

		/// <summary>At the plugin's return: how the adventure ended (from SaveEvents.AfterPlugin).</summary>
		internal static void Ended(string adventure, string exitType, long die, string quest, string credit)
		{
			_ending = JsonSerializer.Serialize(new { adventure, exitType, die, quest, credit });
		}

		/// <summary>At the Main Hall's first safe prompt after the return, after its commit: report the debriefing.</summary>
		internal static void ReportIfDue()
		{
			if (_ending == null || !(gEngine is EamonMH.Framework.Plugin.IEngine)) return;
			var character = HallCharacter;
			if (character == null) return;
			int rank = 0;
			try { rank = ProgressionGate.OpenTier(); } catch (Exception) { }
			using var ending = JsonDocument.Parse(_ending);
			var e = ending.RootElement;
			var payload = JsonSerializer.Serialize(new
			{
				adventure = e.GetProperty("adventure").GetString(),
				exitType = e.GetProperty("exitType").GetString(),
				die = e.GetProperty("die").GetInt64(),
				quest = e.GetProperty("quest").GetString(),
				credit = e.GetProperty("credit").GetString(),
				character = character.Name,
				goldBefore = _goldAtChoice,
				goldAfter = character.HeldGold,
				rankBefore = _rankAtChoice > 0 ? ProgressionGate.TierNames[_rankAtChoice] : null,
				rank = rank > 0 ? ProgressionGate.TierNames[rank] : null,
				tierOpened = rank > _rankAtChoice && _rankAtChoice > 0 ? rank : 0
			});
			_ending = null;
			_goldAtChoice = null;
			// Kept in the campaign files so the Long Fire can tell it again, after a restart too.
			try { System.IO.File.WriteAllText(LastPath, payload); } catch (Exception) { }
			HostBridge.Lifecycle("debrief", payload);
		}

		static string LastPath => Entry.BasePath + "/System/Bin/PLDEBRIEF.DAT";

		/// <summary>The latest debriefing, or null when no adventure has ended yet.</summary>
		internal static string Last()
		{
			try { return System.IO.File.Exists(LastPath) ? System.IO.File.ReadAllText(LastPath) : null; } catch (Exception) { return null; }
		}
	}
}
