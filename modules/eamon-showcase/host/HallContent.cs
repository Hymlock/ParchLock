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
		internal const char Ledger = 'L', Stones = 'F';
	}

	/// <summary>The Hall's description before upstream's own subtitle: the names ParchLock underlines.</summary>
	[ClassMappings(typeof(EamonMH.Framework.Menus.IMhMenu))]
	public class HallMhMenu : EamonMH.Game.Menus.MhMenu
	{
		public override void PrintMainHallMenuSubtitle()
		{
			gOut.Print("The guild's long hall stretches away under smoke-black beams. Down its middle runs the Long Fire, a trench of embers the length of the hall that is never let die. Members' shields hang along the Shield Wall. By the door the Guild Ledger lies open on its lectern, and beside it stand the Stones of the Fallen. At the far end a stair leads down toward the Village.");
			base.PrintMainHallMenuSubtitle();
		}
	}

	/// <summary>Upstream Main Hall menu plus hidden object choices.</summary>
	[ClassMappings(typeof(IMainHallMenu))]
	public class HallMainHallMenu : EamonMH.Game.Menus.HierarchicalMenus.MainHallMenu
	{
		public HallMainHallMenu() : base()
		{
			MenuItemList.Add(gEngine.CreateInstance<IMenuItem>(x => { x.SelectChar = HallKeys.Ledger; x.LineText = ""; x.SubMenu = new LedgerMenu(); }));
			MenuItemList.Add(gEngine.CreateInstance<IMenuItem>(x => { x.SelectChar = HallKeys.Stones; x.LineText = ""; x.SubMenu = new StonesMenu(); }));
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
