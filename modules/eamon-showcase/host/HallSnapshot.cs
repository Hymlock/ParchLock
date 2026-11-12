// ParchLock Eamon host: the Main Hall presented as ParchLock rooms (plan section 2, operator direction
// 2026-11-11; design and Grok review #3379 in HALL_AS_ROOMS.md). Read-only: built from which menu is
// waiting and from the engine's own menu items; moving sends the engine's own menu key.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;

namespace ParchLock.EamonHost
{
	/// <summary>Who is asking for input: the waiting frame and how many hierarchical menus are open.</summary>
	internal sealed class AskContext
	{
		internal string Asker, Method;
		internal Type AskerType;
		internal int MenuDepth;

		internal bool IsMainHallEngine => (Eamon.Game.Plugin.Globals.gEngine?.GetType().FullName ?? "").StartsWith("EamonMH.", StringComparison.Ordinal);
		/// <summary>A hierarchical Main Hall menu (Hall, Village, Practice Area) waiting for a choice.</summary>
		internal bool IsHallMenu => IsMainHallEngine && Asker == "Eamon.Game.Menus.Menu" && Method == "Execute" && MenuDepth >= 1 && MenuDepth <= 3;

		// Relies on type and method names: the engine must stay untrimmed (PublishTrimmed=false).
		internal static AskContext Current()
		{
			var ctx = new AskContext();
			foreach (var frame in new StackTrace(false).GetFrames())
			{
				var method = frame.GetMethod();
				var type = method?.DeclaringType;
				if (type == null || type == typeof(HostTextReader) || type == typeof(AskContext)) continue;
				var name = type.FullName ?? "";
				if (ctx.Asker == null) { ctx.Asker = name; ctx.Method = method.Name; ctx.AskerType = type; }
				// Hierarchical menus do not override Execute, so their frames declare as Menu.Execute;
				// action menus (places, the registration desk) override it and never add depth.
				if (name == "Eamon.Game.Menus.Menu" && method.Name == "Execute") ctx.MenuDepth++;
			}
			return ctx;
		}
	}

	internal static class HallSnapshot
	{
		internal const string WorldName = "Main Hall";
		// Map code for the Main Hall world (R16 table): 308 x 1,000,000 + a fixed small room number.
		const long Base = 308L * 1000000;
		static readonly string[] Levels = { "IMainHallMenu", "IVillageMenu", "IPracticeAreaMenu" };
		static readonly (long Id, string Name)[] LevelRooms = { (1, "Main Hall"), (2, "Village"), (3, "Practice Area") };
		// Places: the action menus that run an interaction and return. Names are presentation only.
		static readonly Dictionary<string, (long Id, string Name)> Places = new Dictionary<string, (long, string)>
		{
			["IMarcosCavielliMenu"] = (11, "Weapons and Armor Shop"),
			["IHokasTokasMenu"] = (12, "Hokas Tokas the Wizard"),
			["IRowanMcFennyMenu"] = (13, "Rowan McFenny the Banker"),
			["ICasinoSchmittMenu"] = (21, "Casino Schmitt"),
			["IGoodWitchMenu"] = (22, "Good Witch's Emporium"),
			["IGrendelSmithyMenu"] = (23, "Grendel's Smithy"),
			["IVillageSquareMenu"] = (24, "Village Square"),
			["ILicensedWizardMenu"] = (31, "Licensed Wizard"),
			["IDonDiegoMenu"] = (32, "Don Diego"),
			["IMasterArmorMenu"] = (33, "Master of Armor"),
			["IInfoBoothMenu"] = (34, "Info Booth"),
		};

		sealed class Exit { public string label, command, toName; public long? to; public bool compass, door; }
		sealed class Special { public string label, command; }
		sealed class Level { public List<Exit> Exits = new List<Exit>(); public List<Special> Commands = new List<Special>(); }

		static object _engineSeen;
		static readonly Dictionary<int, Level> _levels = new Dictionary<int, Level>();

		static string Iface(object instance, IEnumerable<string> names) =>
			instance?.GetType().GetInterfaces().Select(i => i.Name).FirstOrDefault(n => names.Contains(n));

		static string Label(string lineText)
		{
			var t = (lineText ?? "").Trim();
			var dot = t.IndexOf(". ", StringComparison.Ordinal);
			return (dot >= 0 && dot <= 2 ? t.Substring(dot + 2) : t).TrimEnd('.');
		}

		/// <summary>Exits and room commands of one hierarchical level, read from the engine's own menu items.</summary>
		static Level LevelFor(int depth)
		{
			var engine = Eamon.Game.Plugin.Globals.gEngine;
			if (!ReferenceEquals(engine, _engineSeen)) { _levels.Clear(); _engineSeen = engine; }
			if (_levels.TryGetValue(depth, out var cached)) return cached;
			var mh = Eamon.Game.Plugin.Globals.gEngine as EamonMH.Framework.Plugin.IEngine;
			Eamon.Game.Menus.Menu menu = null;
			if (depth == 1) menu = mh?.CreateInstance<EamonMH.Framework.Menus.HierarchicalMenus.IMainHallMenu>() as Eamon.Game.Menus.Menu;
			else if (depth == 2) menu = mh?.CreateInstance<EamonMH.Framework.Menus.HierarchicalMenus.IVillageMenu>() as Eamon.Game.Menus.Menu;
			else if (depth == 3) menu = mh?.CreateInstance<EamonMH.Framework.Menus.HierarchicalMenus.IPracticeAreaMenu>() as Eamon.Game.Menus.Menu;
			var level = new Level();
			foreach (var item in menu?.MenuItemList ?? new List<Eamon.Framework.Menus.IMenuItem>())
			{
				var key = item.SelectChar.ToString();
				var text = Label(item.LineText);
				var sub = item.SubMenu;
				var child = Iface(sub, Levels);
				var place = Iface(sub, Places.Keys);
				var subName = Iface(sub, new[] { "IExamineAbilitiesMenu", "IGoOnAdventureMenu" });
				if (sub == null)
				{
					// X: back up one level ("Head north into ..."), or at the top, leave the universe.
					if (depth > 1) level.Exits.Add(new Exit { label = "north", command = key, to = Base + LevelRooms[depth - 2].Id, toName = LevelRooms[depth - 2].Name, compass = true });
					else level.Commands.Add(new Special { label = text, command = key });
				}
				else if (child != null)
				{
					var target = LevelRooms[Array.IndexOf(Levels, child)];
					// Layout slot from the engine's own wording (the child's exit back is "Head north into ..."); the command stays the key.
					level.Exits.Add(new Exit { label = "south", command = key, to = Base + target.Id, toName = target.Name, compass = true });
				}
				else if (place != null)
				{
					var p = Places[place];
					level.Exits.Add(new Exit { label = p.Name, command = key, to = Base + p.Id, toName = p.Name, compass = false });
				}
				else if (subName == "IGoOnAdventureMenu")
					level.Exits.Add(new Exit { label = text, command = key, to = null, toName = null, compass = false, door = true });   // leaves the Hall map
				else
					level.Commands.Add(new Special { label = text, command = key });   // Examine your abilities
			}
			_levels[depth] = level;
			return level;
		}

		/// <summary>The Hall room the player is in, or null when the waiting prompt is not a known Hall state.</summary>
		static (long Id, string Name, Level Level)? Where(AskContext ctx)
		{
			if (ctx == null || !ctx.IsMainHallEngine) return null;
			if (ctx.IsHallMenu)
			{
				var room = LevelRooms[ctx.MenuDepth - 1];
				return (Base + room.Id, room.Name, LevelFor(ctx.MenuDepth));
			}
			// Inside a place: the waiting frame is that place's own Execute (an action menu never adds depth).
			if (ctx.AskerType != null && ctx.Method == "Execute")
			{
				var name = ctx.AskerType.GetInterfaces().Select(i => i.Name).FirstOrDefault(n => Places.ContainsKey(n));
				if (name != null) { var p = Places[name]; return (Base + p.Id, p.Name, new Level()); }
			}
			return null;
		}

		internal static string Build(AskContext ctx)
		{
			var where = Where(ctx);
			if (where == null) return null;
			var w = where.Value;
			return JsonSerializer.Serialize(new
			{
				adventure = WorldName,
				room = new { id = w.Id, name = w.Name, lit = true },
				exits = w.Level.Exits.Select(e => new { e.label, e.command, e.to, e.toName, e.door, e.compass }),
				objects = Array.Empty<object>(),
				inventory = Array.Empty<object>(),
				stats = new { },
				playerId = Base + 300000,
				special = w.Level.Commands.Select(c => new { c.label, c.command }),
				vocabulary = (object)null
			});
		}

		/// <summary>
		/// A typed line at a Hall menu: the key itself, or an exit or room command named by its label (or by
		/// a compass word for a compass exit). Returns null for anything else, so the prompt is asked again
		/// instead of becoming the engine's default "X" (which leaves the universe at the top level).
		/// An empty line is returned as empty: the engine's own default applies, as it does upstream.
		/// </summary>
		internal static string Translate(AskContext ctx, string reply, Func<char, bool> valid)
		{
			var t = (reply ?? "").Trim();
			if (t.Length == 0) return "";
			if (t.Length == 1 && valid != null && valid(char.ToUpperInvariant(t[0]))) return t;
			var level = ctx.IsHallMenu ? LevelFor(ctx.MenuDepth) : null;
			if (level == null) return null;
			var lower = t.ToLowerInvariant();
			if (lower.StartsWith("go ")) lower = lower.Substring(3).Trim();
			var compassWord = lower == "n" ? "north" : lower == "s" ? "south" : lower;
			foreach (var e in level.Exits)
				if (string.Equals(e.label, lower, StringComparison.OrdinalIgnoreCase) || (e.compass && e.label == compassWord)) return e.command;
			foreach (var c in level.Commands)
				if (string.Equals(c.label, t, StringComparison.OrdinalIgnoreCase)) return c.command;
			return null;
		}
	}
}
