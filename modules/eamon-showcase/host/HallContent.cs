// ParchLock content for the Eamon Main Hall: the Hall of the Long Fire (HALL_OF_THE_LONG_FIRE.md).
// App-owned. Upstream EamonMH.dll runs unchanged; these classes are added after its own class mappings
// by a host engine class (EamonMH.Program.EngineType is settable). Every constructor here is free of
// side effects: the Hall snapshot builds menus off-stage to read their items.
using System;
using System.Collections.Generic;
using System.Linq;
using Eamon.Framework.Menus;
using Eamon.Game.Attributes;
using Eamon.Game.Menus;
using EamonMH.Framework.Menus.HierarchicalMenus;
using static EamonMH.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	/// <summary>The Main Hall engine plus ParchLock's Hall classes, loaded after EamonMH's own (last write wins).</summary>
	public class HallEngine : EamonMH.Game.Plugin.Engine
	{
		public override Eamon.RetCode LoadPluginClassMappings()
		{
			var rc = base.LoadPluginClassMappings();
			if (rc != Eamon.RetCode.Success) return rc;
			return LoadPluginClassMappings01(typeof(HallEngine).Assembly);
		}
	}

	/// <summary>The hidden Hall choices for objects (not printed; the upstream menu looks unchanged).</summary>
	internal static class HallKeys
	{
		// Symbols nobody types as a command (Grok #3385 C1: 'L' collided with the universal "l" for look).
		internal const char Ledger = '#', Stones = '@', Fire = '&', Board = '%', Trophies = '$';
	}

	/// <summary>The Hall's description before upstream's own subtitle: the names ParchLock underlines.</summary>
	[ClassMappings(typeof(EamonMH.Framework.Menus.IMhMenu))]
	public class HallMhMenu : EamonMH.Game.Menus.MhMenu
	{
		/// <summary>Set by the Hall menu's Startup: the next subtitle is the first since entering the Hall.</summary>
		internal static bool FreshEntry = true;

		public override void PrintMainHallMenuSubtitle()
		{
			if (FreshEntry)
			{
				FreshEntry = false;
				gOut.Print("The guild's long hall stretches away under smoke-black beams. Down its middle runs the Long Fire, a trench of embers the length of the hall that is never let die. Members' shields hang along the Shield Wall. By the door the Guild Ledger lies open on its lectern, and beside it stand the Stones of the Fallen. Notices are nailed to the Quest Board by the desk, and trophies of cleared adventures hang on the Trophy Wall. At the far end a stair leads down toward the Village.");
			}
			else gOut.Print("The Long Fire, the Shield Wall, the Guild Ledger, the Stones of the Fallen, the Quest Board, the Trophy Wall and the stair are here.");
			base.PrintMainHallMenuSubtitle();
		}
	}

	/// <summary>Upstream Main Hall menu plus hidden object choices.</summary>
	[ClassMappings(typeof(IMainHallMenu))]
	public class HallMainHallMenu : EamonMH.Game.Menus.HierarchicalMenus.MainHallMenu
	{
		public override void Startup()
		{
			base.Startup();
			HallMhMenu.FreshEntry = true;   // the long description once per entry (Grok #3385 C2)
		}

		public HallMainHallMenu() : base()
		{
			MenuItemList.Add(gEngine.CreateInstance<IMenuItem>(x => { x.SelectChar = HallKeys.Ledger; x.LineText = ""; x.SubMenu = new LedgerMenu(); }));
			MenuItemList.Add(gEngine.CreateInstance<IMenuItem>(x => { x.SelectChar = HallKeys.Stones; x.LineText = ""; x.SubMenu = new StonesMenu(); }));
			MenuItemList.Add(gEngine.CreateInstance<IMenuItem>(x => { x.SelectChar = HallKeys.Fire; x.LineText = ""; x.SubMenu = new FireMenu(); }));
			MenuItemList.Add(gEngine.CreateInstance<IMenuItem>(x => { x.SelectChar = HallKeys.Board; x.LineText = ""; x.SubMenu = new QuestBoardMenu(); }));
			MenuItemList.Add(gEngine.CreateInstance<IMenuItem>(x => { x.SelectChar = HallKeys.Trophies; x.LineText = ""; x.SubMenu = new TrophyWallMenu(); }));
		}
	}

	/// <summary>Reading the Guild Ledger: the guild's roster from the character file (read-only; signing stays at the desk).</summary>
	public class LedgerMenu : Menu
	{
		public override void Execute()
		{
			gOut.Print("{0}", gEngine.LineSep);
			var names = (gDatabase?.CharacterTable?.Records ?? new List<Eamon.Framework.ICharacter>()).OrderBy(c => c.Name).ToList();
			if (names.Count == 0) gOut.Print("The ledger's pages are blank.");
			else
			{
				gOut.Print("The Irishman's ledger lists every member of the guild:");
				foreach (var c in names)
				{
					var state = c.Status == Eamon.Framework.Primitive.Enums.Status.Adventuring ? "away on an adventure"
						: c.Status == Eamon.Framework.Primitive.Enums.Status.Dead ? "fallen"
						: c.Status == Eamon.Framework.Primitive.Enums.Status.Alive ? "in the hall" : "whereabouts unknown";
					gOut.Print("  {0} ({1})", c.Name, state);
				}
			}
			gEngine.In.KeyPress(Buf);
		}

		public LedgerMenu() { Buf = gEngine.Buf; }
	}

	/// <summary>
	/// The Long Fire: sitting by it opens ParchLock's debriefing panel for the latest return again (plan section 6);
	/// the story text names the tale and does not reprint it. Before any return, no tale is waiting.
	/// </summary>
	public class FireMenu : Menu
	{
		public override void Execute()
		{
			gOut.Print("{0}", gEngine.LineSep);
			var hall = (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;
			var last = hall != null ? Debrief.Last(RunLedger.CharacterId(hall.Uid, hall.Name ?? "")) : null;
			string adventure = null;
			try { if (last != null) using (var d = System.Text.Json.JsonDocument.Parse(last)) adventure = d.RootElement.GetProperty("adventure").GetString(); } catch (Exception) { adventure = null; }
			if (adventure == null) gOut.Print("You sit by the Long Fire. The embers have no new tale for you yet.");
			else
			{
				gOut.Print("You sit by the Long Fire, and the old skald recounts your last adventure, {0}.", adventure);
				// A retelling: the page marks the new-tier and new-cycle lines as news from that time.
				HostBridge.Lifecycle("debrief", last.TrimEnd().TrimEnd('}') + ",\"replay\":true}");
			}
			gEngine.In.KeyPress(Buf);
		}

		public FireMenu() { Buf = gEngine.Buf; }
	}

	/// <summary>The Quest Board: every adventure by tier, open or locked, this character's clears, and the unlock rule
	/// (ParchLock's tier gates, ProgressionGate). Reading it starts nothing; the desk's own selection does that.</summary>
	public class QuestBoardMenu : Menu
	{
		public override void Execute()
		{
			gOut.Print("{0}", gEngine.LineSep);
			var character = (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;
			var id = character != null ? RunLedger.CharacterId(character.Uid, character.Name ?? "") : null;
			var everCleared = RunLedger.ClearedAdventures(id);
			var outgrown = ProgressionGate.Outgrown(character);
			var (cycle, cleared) = RunLedger.CurrentCycle(id, outgrown);
			var open = ProgressionGate.OpenTier(everCleared);
			gOut.Print("The notices on the Quest Board are grouped in five tiers. A tier opens once two different adventures of the tier below have been cleared. Clear every adventure and a New Game+ cycle begins, in which each can be credited again.");
			if (cycle > 1) gOut.Print("New Game+ cycle {0}: \"(cleared)\" marks the adventures cleared in this cycle.", cycle);
			for (var tier = 1; tier <= 5; tier++)
			{
				gOut.Print("Tier {0}, {1}: {2}", tier, ProgressionGate.TierNames[tier], tier <= open ? "open" : "locked");
				// One line per notice (Print adds a blank line after each).
				foreach (var adventure in ProgressionGate.Tiers.Where(t => t.Value == tier).Select(t => t.Key).OrderBy(n => n))
					gOut.WriteLine("  {0}{1}", adventure, cleared.Contains(adventure) ? " (cleared)" : outgrown.Contains(adventure) ? " (outgrown: counts as complete)" : "");
			}
			gEngine.In.KeyPress(Buf);
		}

		public QuestBoardMenu() { Buf = gEngine.Buf; }
	}

	/// <summary>The Trophy Wall: one trophy per credited clear (RunLedger's trophy records). The trophy names are
	/// ParchLock content drawn from each adventure's own story.</summary>
	public class TrophyWallMenu : Menu
	{
		static readonly Dictionary<string, string> Names = new Dictionary<string, string>(StringComparer.Ordinal)
		{
			["The Beginner's Cave"] = "a ribbon from Cynthia's dress", ["The Training Ground"] = "a practice-yard token",
			["The Wayfarers Inn"] = "a sprig from Charlotte's grave", ["Beginner's Forest"] = "a leaf from the Fairy Queen's crown",
			["Beginner's Cave II"] = "a lantern from the Warlord's cave", ["Alternate Beginner's Cave"] = "a ribbon from Nina's slippers",
			["The Deep Canyon"] = "a stone from the deep canyon", ["The Pyramid of Anharos"] = "a scarab from the pyramid",
			["Land of the Mountain King"] = "a shard of the mountain king's crown", ["The Tower of Eamon"] = "a page of the Book of Evil Plans",
			["DharmaQuest"] = "a laurel from the gods' ceremony", ["Firestorm"] = "a cinder from Thorak's fire",
			["Wrenhold's Secret Vigil"] = "an arrow from King Argas", ["The Sub-Aquan Laboratory"] = "a vial from the laboratory",
			["Orb of My Life"] = "a sliver of glass from the Orb of Life", ["Escape from Mt. Moon"] = "a moonstone",
			["The Temple of Ngurct"] = "a link of the medallion's chain", ["Stronghold of Kahr-Dur"] = "the banner of Kahr-Dur",
			["A Runcible Cargo"] = "a bandit's sash", ["The Vile Grimoire of Jaldi'al"] = "the Grimoire's torn page",
		};

		public override void Execute()
		{
			gOut.Print("{0}", gEngine.LineSep);
			var trophies = RunLedger.Trophies();
			if (trophies.Count == 0) gOut.Print("The Trophy Wall is bare. Its hooks wait for the first cleared adventure.");
			else
			{
				gOut.Print("On the Trophy Wall hang the trophies of cleared adventures:");
				foreach (var t in trophies)
					gOut.WriteLine("  {0}, from {1}: earned by {2} on {3} ({4})", Names.TryGetValue(t.adventure, out var n) ? n : "a trophy", t.adventure, t.name, t.date,
						(t.quest == "true" ? "the quest fulfilled" : "returned alive through its own exit") + (t.cycle > 1 ? ", New Game+ cycle " + t.cycle : ""));
			}
			gEngine.In.KeyPress(Buf);
		}

		public TrophyWallMenu() { Buf = gEngine.Buf; }
	}

	/// <summary>The Stones of the Fallen: the names of characters who died, from the character file.</summary>
	public class StonesMenu : Menu
	{
		public override void Execute()
		{
			gOut.Print("{0}", gEngine.LineSep);
			var dead = (gDatabase?.CharacterTable?.Records ?? new List<Eamon.Framework.ICharacter>())
				.Where(c => c.Status == Eamon.Framework.Primitive.Enums.Status.Dead).OrderBy(c => c.Name).ToList();
			if (dead.Count == 0) gOut.Print("The stones stand smooth. No name has been cut into them yet.");
			else
			{
				gOut.Print("Cut into the stones are the names of those who did not come back:");
				foreach (var c in dead) gOut.Print("  {0}", c.Name);
			}
			gEngine.In.KeyPress(Buf);
		}

		public StonesMenu() { Buf = gEngine.Buf; }
	}
}
