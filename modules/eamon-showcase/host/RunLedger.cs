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

		/// <summary>The adventures this character has a credited clear in.</summary>
		internal static HashSet<string> ClearedAdventures(string characterId)
		{
			var result = new HashSet<string>(StringComparer.Ordinal);
			if (string.IsNullOrEmpty(characterId) || !File.Exists(LedgerPath)) return result;
			var ledger = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(File.ReadAllText(LedgerPath)) ?? new Dictionary<string, List<string>>();
			foreach (var entry in ledger)
				if (entry.Value.Count > 0 && entry.Key.StartsWith(characterId + "|", StringComparison.Ordinal)) result.Add(entry.Key.Substring(characterId.Length + 1));
			return result;
		}

		/// <summary>Records a clear of this run for this character and adventure: "credited", or "already credited"
		/// when this run was credited before (a restored or imported copy of it). Bound to the adventure engine that
		/// was tracked and to a character seen in it (Grok #3410 F1).</summary>
		internal static string Credit(object engine, string characterId, string adventure)
		{
			if (string.IsNullOrEmpty(_run) || !ReferenceEquals(engine, _trackedEngine)) return "no run";
			if (string.IsNullOrEmpty(characterId)) return "no character";
			if (_run.StartsWith(Unbound, StringComparison.Ordinal)) return "unbound run";
			var ledger = File.Exists(LedgerPath)
				? JsonSerializer.Deserialize<Dictionary<string, List<string>>>(File.ReadAllText(LedgerPath)) ?? new Dictionary<string, List<string>>()
				: new Dictionary<string, List<string>>();
			var key = characterId + "|" + adventure;
			if (!ledger.TryGetValue(key, out var runs)) ledger[key] = runs = new List<string>();
			if (runs.Contains(_run)) return "already credited";
			// Operator policy (2026-11-12): a clear is credited once per character and adventure; a fresh replay
			// plays normally (the engine still pays its own rewards) but earns no second credit.
			if (runs.Count > 0) return "already cleared";
			runs.Add(_run);
			Directory.CreateDirectory(Path.GetDirectoryName(LedgerPath));
			File.WriteAllText(LedgerPath, JsonSerializer.Serialize(ledger));
			return "credited";
		}
	}
}
