// ParchLock Eamon host: run identity and the clear ledger (plan section 6, Grok #3402 P4, #3410). A run starts at a
// fresh entry into an adventure (from the Main Hall, or after Start Over): Eamon builds every entry's world from the
// adventure's module files, and an older world comes back only through RESTORE (IntroStory.ShouldPrintOutput offers
// it when save slots exist). Each save slot carries the run it was saved in and a successful RESTORE makes that run
// current, so a restored or imported pre-exit save can never earn a second credit for its run. The files live in the
// campaign file system (an adventure's own folder and System/Bin), so they are committed with the engine's own files
// in one safe-point transaction and travel with campaign export and import.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class RunLedger
	{
		/// <summary>Set by the plugin loop together with SaveEvents.FreshEntry: the next adventure prompt starts a run.</summary>
		internal static bool PendingNew;
		const string Unbound = "unbound-";
		static string _dir, _run;
		static object _trackedEngine;
		static string LedgerPath => Entry.BasePath + "/System/Bin/PLCLEARS.DAT";
		static string TrophiesPath => Entry.BasePath + "/System/Bin/PLTROPHIES.DAT";
		internal sealed class Trophy { public string character { get; set; } public string name { get; set; } public string adventure { get; set; } public string run { get; set; } public string date { get; set; } public string quest { get; set; } public int cycle { get; set; } }
		internal static List<Trophy> Trophies()
		{
			try { return File.Exists(TrophiesPath) ? JsonSerializer.Deserialize<List<Trophy>>(File.ReadAllText(TrophiesPath)) ?? new List<Trophy>() : new List<Trophy>(); }
			catch (Exception) { return new List<Trophy>(); }
		}
		static string CharactersPath => Entry.BasePath + "/System/Bin/PLCHARS.DAT";
		static string RunPath(string dir, long slot = 0) => Path.Combine(dir, slot > 0 ? "PLRUN_" + slot + ".DAT" : "PLRUN.DAT");

		internal static string Current => _run ?? "";

		/// <summary>At every adventure prompt (the engine's working directory is the adventure folder).</summary>
		internal static void Track()
		{
			_trackedEngine = null;
			var dir = Directory.GetCurrentDirectory();
			if (PendingNew) { PendingNew = false; NewRun(dir); }
			else if (_dir != dir || _run == null)
			{
				_dir = dir;
				_run = File.Exists(RunPath(dir)) ? File.ReadAllText(RunPath(dir)).Trim() : null;
				if (string.IsNullOrEmpty(_run)) NewRun(dir);
			}
			_trackedEngine = gEngine;   // only now is this run known to belong to the running adventure
		}

		internal static void NewRun(string dir = null)
		{
			_dir = dir ?? _dir ?? Directory.GetCurrentDirectory();
			_run = Guid.NewGuid().ToString("N");
			File.WriteAllText(RunPath(_dir), _run);
		}

		internal static void OnSaved(long slot)
		{
			if (_dir == null || _run == null || slot < 1) return;
			File.WriteAllText(RunPath(_dir, slot), _run);
		}

		/// <summary>A restored slot's run becomes current. A slot without its run file (a partial copy, a slot saved
		/// before run ids) gets an unbound run that is never credited: fails closed (Grok #3410 F3).</summary>
		internal static void OnRestored(long slot)
		{
			if (_dir == null || slot < 1) return;
			var path = RunPath(_dir, slot);
			_run = File.Exists(path) ? File.ReadAllText(path).Trim() : Unbound + Guid.NewGuid().ToString("N");
			if (string.IsNullOrEmpty(_run)) _run = Unbound + Guid.NewGuid().ToString("N");
			File.WriteAllText(RunPath(_dir), _run);
		}

		/// <summary>A stable id for the character: Eamon reuses names and recycles record uids, so ParchLock keeps its
		/// own id per uid and mints a new one whenever the name at that uid changes (Grok #3410 point 1).</summary>
		internal static string CharacterId(long uid, string name)
		{
			var map = File.Exists(CharactersPath)
				? JsonSerializer.Deserialize<Dictionary<string, string[]>>(File.ReadAllText(CharactersPath)) ?? new Dictionary<string, string[]>()
				: new Dictionary<string, string[]>();
			var key = uid.ToString();
			if (map.TryGetValue(key, out var entry) && entry.Length == 2 && entry[0] == name) return entry[1];
			map[key] = new[] { name, Guid.NewGuid().ToString("N") };
			Directory.CreateDirectory(Path.GetDirectoryName(CharactersPath));
			File.WriteAllText(CharactersPath, JsonSerializer.Serialize(map));
			return map[key][1];
		}

		// The clear ledger (System/Bin/PLCLEARS.DAT): per ParchLock character id, the current New Game+ cycle and every
		// credited clear (adventure, run, cycle). Old cycles stay as history.
		internal sealed class Clear { public string adventure { get; set; } public string run { get; set; } public int cycle { get; set; } }
		internal sealed class CharacterClears { public int cycle { get; set; } = 1; public List<Clear> clears { get; set; } = new List<Clear>(); }

		static Dictionary<string, CharacterClears> ReadLedger()
		{
			try { return File.Exists(LedgerPath) ? JsonSerializer.Deserialize<Dictionary<string, CharacterClears>>(File.ReadAllText(LedgerPath)) ?? new Dictionary<string, CharacterClears>() : new Dictionary<string, CharacterClears>(); }
			catch (Exception) { return new Dictionary<string, CharacterClears>(); }
		}

		/// <summary>The adventures this character has ever cleared (any cycle): the Guild rank and tier gates use these,
		/// since New Game+ never resets the character.</summary>
		internal static HashSet<string> ClearedAdventures(string characterId)
		{
			var result = new HashSet<string>(StringComparer.Ordinal);
			if (!string.IsNullOrEmpty(characterId) && ReadLedger().TryGetValue(characterId, out var c)) foreach (var clear in c.clears) result.Add(clear.adventure);
			return result;
		}

		/// <summary>This character's current cycle and the adventures cleared in it.</summary>
		internal static (int Cycle, HashSet<string> Cleared) CurrentCycle(string characterId)
		{
			var cleared = new HashSet<string>(StringComparer.Ordinal);
			if (string.IsNullOrEmpty(characterId) || !ReadLedger().TryGetValue(characterId, out var c)) return (1, cleared);
			foreach (var clear in c.clears) if (clear.cycle == c.cycle) cleared.Add(clear.adventure);
			return (c.cycle, cleared);
		}

		/// <summary>Records a clear of this run for this character and adventure. "already credited": this run was
		/// credited before (a restored or imported copy of it). "already cleared": cleared earlier in this New Game+
		/// cycle. "credited", or "credited, new cycle N" when this clear completes every Showcase adventure in the
		/// cycle (operator, #3416 and #3427). Bound to the adventure engine that was tracked and to a character seen in
		/// it (Grok #3410 F1).</summary>
		internal static string Credit(object engine, string characterId, string adventure, string characterName = null, string quest = null)
		{
			if (string.IsNullOrEmpty(_run) || !ReferenceEquals(engine, _trackedEngine)) return "no run";
			if (string.IsNullOrEmpty(characterId)) return "no character";
			if (_run.StartsWith(Unbound, StringComparison.Ordinal)) return "unbound run";
			var ledger = ReadLedger();
			if (!ledger.TryGetValue(characterId, out var c)) ledger[characterId] = c = new CharacterClears();
			if (c.clears.Any(x => x.run == _run)) return "already credited";
			if (c.clears.Any(x => x.cycle == c.cycle && x.adventure == adventure)) return "already cleared";
			c.clears.Add(new Clear { adventure = adventure, run = _run, cycle = c.cycle });
			var result = "credited";
			// "All loaded" = the Showcase's tiered adventures (ProgressionGate.Tiers, the package's complete set): once every
			// one is cleared in this cycle, the next cycle opens. Only a credit can advance it, so save/restore cannot.
			if (ProgressionGate.Tiers.Keys.All(a => c.clears.Any(x => x.cycle == c.cycle && x.adventure == a)))
			{
				c.cycle++;
				result = "credited, new cycle " + c.cycle;
			}
			Directory.CreateDirectory(Path.GetDirectoryName(LedgerPath));
			File.WriteAllText(LedgerPath, JsonSerializer.Serialize(ledger));
			// The Trophy Wall's record of this credit: who, which adventure, when, which cycle and what counted.
			try
			{
				var trophies = File.Exists(TrophiesPath) ? JsonSerializer.Deserialize<List<Trophy>>(File.ReadAllText(TrophiesPath)) ?? new List<Trophy>() : new List<Trophy>();
				trophies.Add(new Trophy { character = characterId, name = characterName ?? "", adventure = adventure, run = _run, date = DateTime.UtcNow.ToString("yyyy-MM-dd"), quest = quest ?? "", cycle = c.clears.Last().cycle });
				File.WriteAllText(TrophiesPath, JsonSerializer.Serialize(trophies));
			}
			catch (Exception) { }
			return result;
		}
	}
}
