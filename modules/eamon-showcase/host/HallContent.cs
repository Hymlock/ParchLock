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
			// Upstream's subtitle with the count of choices including ParchLock's "Seek New Game+" (MhMenu.cs:17-19).
			gOut.Print("Character: {0}", gCharacter != null ? gCharacter.Name : gEngine.UnknownName);
			gOut.Print("As you wander about the hall, you realize you can do one of eight things:");
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
			// New Game+ is on offer from the start, so the goal is visible; before it is earned it says what remains
			// (operator 2026-11-12). Placed before upstream's X.
			var leave = MenuItemList.IndexOf(MenuItemList.FirstOrDefault(i => i.SelectChar == 'X'));
			MenuItemList.Insert(leave < 0 ? MenuItemList.Count : leave, gEngine.CreateInstance<IMenuItem>(x =>
			{
				x.SelectChar = '7';
				x.LineText = string.Format("{0}7. Seek New Game+.", Environment.NewLine);
				x.SubMenu = new NewGamePlusMenu();
			}));
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
		// What completing these takes, where it is not obvious from the adventure itself (Grok #3433).
		static readonly Dictionary<string, string> Requirements = new Dictionary<string, string>(StringComparer.Ordinal)
		{
			["The Training Ground"] = "complete it by graduating: leave with armour expertise above 25 (only plate armour allows that)",
			["Beginner's Cave II"] = "complete it by carrying out the mummy's treasure chest yourself (it weighs 90: hardiness 10 or more and a light load)",
			["Escape from Mt. Moon"] = "complete it by beating the Rocket boss and leaving through the far side",
		};

		public override void Execute()
		{
			gOut.Print("{0}", gEngine.LineSep);
			var character = (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;
			var id = character != null ? RunLedger.CharacterId(character.Uid, character.Name ?? "") : null;
			var everCleared = RunLedger.ClearedAdventures(id);
			var outgrown = ProgressionGate.Outgrown(character);
			var (cycle, cleared) = RunLedger.CurrentCycle(id, outgrown);
			var open = ProgressionGate.OpenTier(ProgressionGate.Completed(character, id));
			gOut.Print("The notices on the Quest Board are grouped in five tiers. A tier opens once two different adventures of the tier below have been cleared. Complete every adventure (of the beginner adventures one is enough: they are alternatives) and New Game+ is offered, in which each can be credited again.");
			if (cycle > 1) gOut.Print("New Game+ cycle {0}: \"(cleared)\" marks the adventures cleared in this cycle.", cycle);
			for (var tier = 1; tier <= 5; tier++)
			{
				gOut.Print("Tier {0}, {1}: {2}", tier, ProgressionGate.TierNames[tier], tier <= open ? "open" : "locked");
				// One line per notice (Print adds a blank line after each).
				foreach (var adventure in ProgressionGate.Tiers.Where(t => t.Value == tier).Select(t => t.Key).OrderBy(n => n))
					gOut.WriteLine("  {0}{1}{2}", adventure, cleared.Contains(adventure) ? " (cleared)" : outgrown.Contains(adventure) ? " (overqualified: completed)" : "",
						!cleared.Contains(adventure) && !outgrown.Contains(adventure) && Requirements.TryGetValue(adventure, out var need) ? " - " + need : "");
			}
			// New Game+ is offered, never imposed: the next cycle opens only when the player accepts it here.
			if (RunLedger.NewGamePlusOffered(id, outgrown))
			{
				gOut.Print("A gilded notice is pinned above the rest: every adventure on the board is complete. New Game+ is offered: cycle {0}, in which each adventure can be credited again. {1} keeps everything.", cycle + 1, character.Name);
				gOut.Write("{0}Begin New Game+ cycle {1} (Y/N): ", Environment.NewLine, cycle + 1);
				Buf.Clear();
				var rc = gEngine.In.ReadField(Buf, gEngine.BufSize02, null, ' ', '\0', false, null, gEngine.ModifyCharToUpper, gEngine.IsCharYOrN, null);
				if (gEngine.IsSuccess(rc) && Buf.Length > 0 && Buf[0] == 'Y')
				{
					var opened = RunLedger.AcceptNewGamePlus(id, outgrown);
					if (opened > 0) { Persistence.Flush(); SaveEvents.AfterFlush(); }   // kept the moment it is shown (Grok #3437)
					gOut.Print(opened > 0 ? "You take down the gilded notice. New Game+ cycle " + opened + " begins." : "The notice is gone.");
				}
				else gOut.Print("You leave the gilded notice where it is. It will wait for you.");
			}
			gEngine.In.KeyPress(Buf);
		}

		public QuestBoardMenu() { Buf = gEngine.Buf; }
	}

	/// <summary>"Seek New Game+": offered from the start. Before every Showcase adventure is complete in the current cycle
	/// it names what remains; once it is, the player may accept the next cycle (or leave it for later). The character is
	/// never reset (operator, #3427, 2026-11-12).</summary>
	public class NewGamePlusMenu : Menu
	{
		public override void Execute()
		{
			gOut.Print("{0}", gEngine.LineSep);
			var character = (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;
			if (character == null) { gOut.Print("There is no adventurer signed in."); gEngine.In.KeyPress(Buf); return; }
			var id = RunLedger.CharacterId(character.Uid, character.Name ?? "");
			var outgrown = ProgressionGate.Outgrown(character);
			var (cycle, _) = RunLedger.CurrentCycle(id, outgrown);
			if (!RunLedger.NewGamePlusOffered(id, outgrown))
			{
				var remaining = RunLedger.RemainingInCycle(id, outgrown);
				gOut.Print("The Irishman shakes his head. \"New Game+ is for those who have completed every adventure on the Quest Board{0}. Ye still have {1} to go: {2}.\"",
					cycle > 1 ? " in this cycle (cycle " + cycle + ")" : "", remaining.Count, string.Join(", ", remaining));
				gOut.Print("Complete each one through its own end and come back. {0} keeps everything in New Game+; each adventure can then be credited again.", character.Name);
				gEngine.In.KeyPress(Buf);
				return;
			}
			gOut.Print("The Irishman grins. \"Every adventure on the board is done. New Game+ is yours: cycle {0}, where each adventure can be credited again, and ye keep everything.\"", cycle + 1);
			gOut.Write("{0}Begin New Game+ cycle {1} (Y/N): ", Environment.NewLine, cycle + 1);
			Buf.Clear();
			var rc = gEngine.In.ReadField(Buf, gEngine.BufSize02, null, ' ', '\0', false, null, gEngine.ModifyCharToUpper, gEngine.IsCharYOrN, null);
			if (gEngine.IsSuccess(rc) && Buf.Length > 0 && Buf[0] == 'Y')
			{
				var opened = RunLedger.AcceptNewGamePlus(id, outgrown);
				if (opened > 0) { Persistence.Flush(); SaveEvents.AfterFlush(); }   // kept the moment it is shown (Grok #3437)
				gOut.Print(opened > 0 ? "New Game+ cycle " + opened + " begins." : "The offer is gone.");
			}
			else gOut.Print("\"Whenever ye are ready,\" he says.");
			gEngine.In.KeyPress(Buf);
		}

		public NewGamePlusMenu() { Buf = gEngine.Buf; }
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
			// The signed-in character's shelf for the current New Game+ cycle (operator 2026-11-12): the trophies earned in
			// this cycle, plus the latest earlier trophy of an adventure the character is overqualified for (it cannot be
			// earned again, so it stays). Trophies of adventures that can be played again leave the shelf when a new cycle
			// begins and return when earned again; the full record stays in the campaign files.
			var character = (gEngine as EamonMH.Framework.Plugin.IEngine)?.Character;
			var id = character != null ? RunLedger.CharacterId(character.Uid, character.Name ?? "") : null;
			var overqualified = ProgressionGate.Outgrown(character);
			var (cycle, _) = RunLedger.CurrentCycle(id, overqualified);
			var mine = RunLedger.Trophies().Where(t => t.character == id).ToList();
			var trophies = mine.Where(t => t.cycle == cycle).ToList();
			foreach (var a in overqualified)
				if (!trophies.Any(t => t.adventure == a)) { var kept = mine.Where(t => t.adventure == a).OrderByDescending(t => t.cycle).FirstOrDefault(); if (kept != null) trophies.Add(kept); }
			if (trophies.Count == 0) gOut.Print("Your hooks on the Trophy Wall are bare{0}. They wait for your first completed adventure.", cycle > 1 ? " in this New Game+ cycle" : "");
			else
			{
				gOut.Print("On the Trophy Wall hang {0}'s trophies{1}:", character?.Name, cycle > 1 ? " for New Game+ cycle " + cycle : "");
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
