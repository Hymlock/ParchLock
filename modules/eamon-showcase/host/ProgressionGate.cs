// ParchLock Eamon host: the campaign's tier gates (plan section 6, "Campaign progression"). ParchLock's added design,
// labelled as such. One progression authority: a lock gates only STARTING an adventure, from the Main Hall's own "Go on
// an adventure" selection (EamonMH GoOnAdventureMenu.SelectAdventure is the only start path: resuming is the app
// relaunching into the adventure, RESTORE happens inside one, recall deletes state). Locked adventures stay listed;
// choosing one is refused with the reason. Credits come from the clear ledger (RunLedger), per character.
using System;
using System.Collections.Generic;
using System.Linq;
using Eamon.Framework.Primitive.Enums;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class ProgressionGate
	{
		// Plan section 6 table (four placements from the operator's draft, the rest provisional by theme and difficulty).
		internal static readonly Dictionary<string, int> Tiers = new Dictionary<string, int>(StringComparer.Ordinal)
		{
			["The Beginner's Cave"] = 1, ["The Wayfarers Inn"] = 1, ["Beginner's Forest"] = 1, ["Beginner's Cave II"] = 1,
			["Alternate Beginner's Cave"] = 1, ["The Training Ground"] = 1,
			["The Deep Canyon"] = 2, ["The Pyramid of Anharos"] = 2, ["Land of the Mountain King"] = 2, ["The Tower of Eamon"] = 2,
			["DharmaQuest"] = 3, ["Wrenhold's Secret Vigil"] = 3, ["Firestorm"] = 3,
			["Escape from Mt. Moon"] = 4, ["The Sub-Aquan Laboratory"] = 4, ["Orb of My Life"] = 4,
			["The Temple of Ngurct"] = 5, ["Stronghold of Kahr-Dur"] = 5, ["A Runcible Cargo"] = 5, ["The Vile Grimoire of Jaldi'al"] = 5,
		};
		internal static readonly string[] TierNames = { "", "Novice Initiative", "Journeyman Contracts", "Experienced Expeditions", "The Strange Realms", "Heroic Gauntlets" };
		const int ClearsToOpen = 2;   // a tier opens after two different adventures of the tier below are cleared

		static HashSet<string> Cleared()
		{
			var character = (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;
			if (character == null) return new HashSet<string>();
			return RunLedger.ClearedAdventures(RunLedger.CharacterId(character.Uid, character.Name ?? ""));
		}

		/// <summary>The highest tier open to the current character (1 at the start).</summary>
		internal static int OpenTier(HashSet<string> cleared = null)
		{
			cleared ??= Cleared();
			var open = 1;
			while (open < 5 && Tiers.Count(t => t.Value == open && cleared.Contains(t.Key)) >= ClearsToOpen) open++;
			return open;
		}

		// Upstream's demonstration and test modules ride along in the bundle outside the campaign (not in the release's 20).
		static readonly HashSet<string> Untiered = new HashSet<string>(StringComparer.Ordinal) { "Eamon Deluxe 5.0 Demo Adventure", "Demo Adventure", "Sample Adventure", "Test Adventure" };

		/// <summary>Why this adventure cannot be started now, or null. A name that is neither in the tier table nor a known
		/// test module is locked rather than silently opened (Grok #3429 G2).</summary>
		internal static string LockReason(string adventure, HashSet<string> cleared = null)
		{
			if (adventure == null) return null;
			if (!Tiers.TryGetValue(adventure.Trim(), out var tier))
				return Untiered.Contains(adventure.Trim()) ? null : adventure.Trim() + " is not an adventure this Showcase recognises, so it cannot be started.";
			if (tier <= 1) return null;
			cleared ??= Cleared();
			if (tier <= OpenTier(cleared)) return null;
			var below = Tiers.Count(t => t.Value == tier - 1 && cleared.Contains(t.Key));
			return string.Format("{0} is a tier {1} adventure ({2}). It opens once you have cleared two different tier {3} adventures ({4}); you have cleared {5}.",
				adventure.Trim(), tier, TierNames[tier], tier - 1, TierNames[tier - 1], below);
		}

		static readonly string[] BeginnersStory = { "The Beginner's Cave", "Beginner's Forest", "Beginner's Cave II", "Alternate Beginner's Cave" };

		/// <summary>The beginner alternatives: adventures their authors present as alternatives to the Beginner's Cave
		/// (module descriptions: Beginner's Forest and The Training Ground "an alternative to the Beginner's Cave"; Beginner's
		/// Cave II "a Beginner's Cave"; Alternate Beginner's Cave "an introduction for young Eamonauts"), whose entry checks
		/// admit only a beginner. One completed through its own end satisfies the group for a New Game+ cycle.</summary>
		internal static readonly HashSet<string> BeginnerAlternatives = new HashSet<string>(StringComparer.Ordinal)
			{ "The Beginner's Cave", "Beginner's Forest", "Beginner's Cave II", "Alternate Beginner's Cave", "The Training Ground" };

		/// <summary>The adventures this character has outgrown: their own entry checks now refuse the character for good
		/// (the four Beginners adventures once armour expertise 0, axe 5, club 20, sword 0 no longer all hold, RT
		/// IntroStory; The Training Ground above armour expertise 25). Eamon never lowers these abilities, so it is
		/// permanent. They count as complete for New Game+ cycles (operator 2026-11-12), never as credits.</summary>
		internal static HashSet<string> Outgrown(Eamon.Framework.ICharacter c)
		{
			var result = new HashSet<string>(StringComparer.Ordinal);
			if (c == null) return result;
			var beginner = c.ArmorExpertise == 0 && c.GetWeaponAbility(Weapon.Axe) == 5 && c.GetWeaponAbility(Weapon.Club) == 20 && c.GetWeaponAbility(Weapon.Sword) == 0;
			if (!beginner) foreach (var a in BeginnersStory) result.Add(a);
			if (c.ArmorExpertise > 25) result.Add("The Training Ground");
			return result;
		}

		/// <summary>The fileset (adventure) a typed selection names, or null.</summary>
		internal static string AdventureFor(string selection)
		{
			if (!long.TryParse((selection ?? "").Trim(), out var uid)) return null;
			try { return gEngine.Database?.FilesetTable?.FindRecord(uid)?.Name; } catch (Exception) { return null; }
		}

		/// <summary>The locked adventures among those listed, shown with the selection prompt so they stay visible with the reason.</summary>
		internal static string Legend()
		{
			var cleared = Cleared();
			var locked = (gEngine.Database?.FilesetTable?.Records ?? Enumerable.Empty<Eamon.Framework.IFileset>())
				.Select(f => (f.Uid, f.Name, Reason: LockReason(f.Name, cleared))).Where(f => f.Reason != null).ToList();
			if (locked.Count == 0) return null;
			var open = OpenTier(cleared);
			return string.Format("Guild rank: {0} (tier {1} open). Locked until you earn a higher rank: {2}.",
				TierNames[open], open, string.Join(", ", locked.Select(f => f.Uid + " " + f.Name.Trim() + " (tier " + Tiers[f.Name.Trim()] + ")")));
		}
	}
}
