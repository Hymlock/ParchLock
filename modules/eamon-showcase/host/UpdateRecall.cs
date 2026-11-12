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
					// ParchLock's desk subclass, so this recall and the desk's own paid one report deleted saves the same way.
					new HallRegistrationDeskMenu().RecallCharacterFromAdventure();
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

		/// <summary>The adventure's own module name (MODULE.DAT), which names its saves; a Main Hall fileset name can differ
		/// (Demo Adventure is "Eamon Deluxe 5.0 Demo Adventure" in its module, Grok #3462 C1). Null when unreadable.</summary>
		internal static string ModuleName(string workDir)
		{
			try
			{
				var dir = (workDir ?? "").Replace('\\', '/').TrimEnd('/').Split('/').Last();
				var path = Entry.BasePath + "/Adventures/" + dir + "/MODULE.DAT";
				if (!File.Exists(path)) return null;
				var name = Field(Read(path), "Name").Trim();
				return name.Length > 0 ? name : null;
			}
			catch (Exception) { return null; }
		}
	}

	/// <summary>Upstream's registration desk with one addition: when its recall returns a character (upstream's -dgs hop has
	/// then deleted every save slot of that adventure, outside the plugin loop), those saves leave ParchLock after the next
	/// commit, as on an ordinary exit (Grok #3462). Fee, text and questions are upstream's own.</summary>
	[Eamon.Game.Attributes.ClassMappings(typeof(EamonMH.Framework.Menus.ActionMenus.IRegistrationDeskMenu))]
	public class HallRegistrationDeskMenu : EamonMH.Game.Menus.ActionMenus.RegistrationDeskMenu
	{
		public override void RecallCharacterFromAdventure()
		{
			base.RecallCharacterFromAdventure();
			var character = (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;
			if (character == null || character.Status == Status.Adventuring || string.IsNullOrWhiteSpace(AdventureName)) return;
			var fileset = gDatabase?.FilesetTable?.Records?.FirstOrDefault(f => string.Equals((f.Name ?? "").Trim(), AdventureName.Trim(), StringComparison.Ordinal));
			SaveEvents.MarkSavesDeleted(UpdateRecall.ModuleName(fileset?.WorkDir) ?? AdventureName.Trim());
		}
	}
}
