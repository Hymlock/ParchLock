// ParchLock Eamon host: a character afield in an adventure that a new Showcase package changed is returned to the
// Main Hall through upstream's own recall, free (plan 9a, Grok #3453/#3454). The page lists those adventures in
// System/Bin/PLRECALL.DAT when it carries the campaign over to the new package; at the Hall's first safe prompt this
// runs RegistrationDeskMenu.RecallCharacterFromAdventure, the inner method without the desk's fee: the character comes
// back as at adventure entry (FRESHMEAT.DAT and FRESHGEAR.DAT), and its -dgs hop deletes that adventure's game state and
// save slots, which were made against the old adventure. No credit: the run never reaches the clear check.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Eamon.Framework.Primitive.Enums;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class UpdateRecall
	{
		static string ListPath => Entry.BasePath + "/System/Bin/PLRECALL.DAT";
		internal static bool Pending => File.Exists(ListPath);

		static string Read(string path)
		{
			var bytes = File.ReadAllBytes(path);
			if (bytes.Length > 1 && bytes[0] == 0x1f && bytes[1] == 0x8b)
				using (var gz = new System.IO.Compression.GZipStream(new MemoryStream(bytes), System.IO.Compression.CompressionMode.Decompress))
				using (var r = new StreamReader(gz)) return r.ReadToEnd();
			return System.Text.Encoding.UTF8.GetString(bytes);
		}

		static string Field(string xml, string name) => System.Net.WebUtility.HtmlDecode(System.Text.RegularExpressions.Regex.Match(xml, "name=\"" + name + "\" value=\"([^\"]*)\"").Groups[1].Value);

		/// <summary>At a top-level Main Hall prompt, before the Hall checkpoint saves the modified records.</summary>
		internal static void RunIfDue()
		{
			if (!File.Exists(ListPath)) return;
			var engine = gEngine as EamonMH.Framework.Plugin.IEngine;
			if (engine == null) return;
			List<string> dirs;
			try { dirs = JsonSerializer.Deserialize<List<string>>(File.ReadAllText(ListPath)) ?? new List<string>(); }
			catch (Exception) { dirs = new List<string>(); }
			File.Delete(ListPath);
			var lines = new List<string>();
			var previous = engine.Character;
			foreach (var dir in dirs.Distinct())
			{
				var fileset = gDatabase.FilesetTable.Records.FirstOrDefault(f => string.Equals((f.WorkDir ?? "").Replace('\\', '/').TrimEnd('/').Split('/').Last(), dir, StringComparison.OrdinalIgnoreCase));
				var adventure = fileset?.Name?.Trim() ?? dir;
				var fresh = Entry.BasePath + "/Adventures/" + dir + "/FRESHMEAT.DAT";
				if (!File.Exists(fresh))
				{
					// Fail closed (Grok #3454 A3, #3456 N1): nothing is set by hand; the desk's own recall remains.
					lines.Add(adventure + " was updated. The character who went into it is still listed as adventuring there and could not be returned automatically; the registration desk can recall them. You can keep a copy of this campaign with Download Package in the save manager.");
					continue;
				}
				ICharacterRef found = null;
				try
				{
					var xml = Read(fresh);
					long.TryParse(Field(xml, "Uid"), out var uid);
					var name = Field(xml, "Name");
					var record = gDatabase.CharacterTable.Records.FirstOrDefault(c => c.Uid == uid && string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase));
					if (record != null) found = new ICharacterRef { Record = record };
				}
				catch (Exception) { found = null; }
				if (found == null || found.Record.Status != Status.Adventuring)
				{
					lines.Add(adventure + " was updated. The character who went into it is still listed as adventuring there and could not be returned automatically; the registration desk can recall them. You can keep a copy of this campaign with Download Package in the save manager.");
					continue;
				}
				try
				{
					engine.Character = found.Record;
					new EamonMH.Game.Menus.ActionMenus.RegistrationDeskMenu().RecallCharacterFromAdventure();
				}
				catch (Exception) { }
				finally { engine.Character = previous; }
				lines.Add(found.Record.Status != Status.Adventuring
					? adventure + " was updated. " + found.Record.Name + " has been returned to the Main Hall as they were when they set out; progress and saved games in that adventure were lost. No fee was charged."
					: adventure + " was updated. " + found.Record.Name + " is still listed as adventuring there and could not be returned automatically; the registration desk can recall them. You can keep a copy of this campaign with Download Package in the save manager.");
			}
			if (lines.Count > 0) HostBridge.Lifecycle("package-recall", JsonSerializer.Serialize(lines));
		}

		sealed class ICharacterRef { public Eamon.Framework.ICharacter Record; }
	}
}
