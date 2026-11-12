// ParchLock Eamon host: run identity and the clear ledger (plan section 6, Grok #3402 P4). A run starts at a fresh
// entry into an adventure (from the Main Hall, or after Start Over). Each save slot carries the run it was saved in
// and a successful RESTORE makes that run current, so a restored or imported pre-exit save can never earn a second
// credit for its run. The files live in the campaign file system (an adventure's own folder and System/Bin), so they
// are committed with the engine's own files at a safe point and travel with campaign export and import.
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace ParchLock.EamonHost
{
	internal static class RunLedger
	{
		/// <summary>Set by the plugin loop together with SaveEvents.FreshEntry: the next adventure prompt starts a run.</summary>
		internal static bool PendingNew;
		static string _dir, _run;
		static string LedgerPath => Entry.BasePath + "/System/Bin/PLCLEARS.DAT";
		static string RunPath(string dir, long slot = 0) => Path.Combine(dir, slot > 0 ? "PLRUN_" + slot + ".DAT" : "PLRUN.DAT");

		internal static string Current => _run ?? "";

		/// <summary>At every adventure prompt (the engine's working directory is the adventure folder).</summary>
		internal static void Track()
		{
			var dir = Directory.GetCurrentDirectory();
			if (PendingNew) { PendingNew = false; NewRun(dir); return; }
			if (_dir == dir && _run != null) return;
			_dir = dir;
			_run = File.Exists(RunPath(dir)) ? File.ReadAllText(RunPath(dir)).Trim() : null;
			if (string.IsNullOrEmpty(_run)) NewRun(dir);
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

		/// <summary>A restored slot's run becomes current; a slot saved before run ids existed starts a new one.</summary>
		internal static void OnRestored(long slot)
		{
			if (_dir == null || slot < 1) return;
			var path = RunPath(_dir, slot);
			_run = File.Exists(path) ? File.ReadAllText(path).Trim() : Guid.NewGuid().ToString("N");
			File.WriteAllText(RunPath(_dir), _run);
		}

		/// <summary>Records a clear of this run for this character and adventure: "credited", or "already credited"
		/// when this run was credited before (a restored or imported copy of it).</summary>
		internal static string Credit(string character, string adventure)
		{
			if (string.IsNullOrEmpty(_run)) return "no run";
			var ledger = File.Exists(LedgerPath)
				? JsonSerializer.Deserialize<Dictionary<string, List<string>>>(File.ReadAllText(LedgerPath)) ?? new Dictionary<string, List<string>>()
				: new Dictionary<string, List<string>>();
			var key = character + "|" + adventure;
			if (!ledger.TryGetValue(key, out var runs)) ledger[key] = runs = new List<string>();
			if (runs.Contains(_run)) return "already credited";
			runs.Add(_run);
			Directory.CreateDirectory(Path.GetDirectoryName(LedgerPath));
			File.WriteAllText(LedgerPath, JsonSerializer.Serialize(ledger));
			return "credited";
		}
	}
}
