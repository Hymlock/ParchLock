// ParchLock Eamon host: the character's status as data, for ParchLock's own status card (plan section 7 Stats,
// section 11 item 11). The values are the ones the engine's own STATUS builds (EamonRT StatusCommand passes them to
// Engine.StatDisplay as StatDisplayArgs), read at the same between-commands point as the rest of the world snapshot;
// nothing is parsed from printed text. Each adventure's own STATUS rules decide what is shown (Grok #3554 D1-D4):
// where STATUS is not available to the player, or the author shows less, the card shows no more than the game does.
using System;
using System.Collections.Generic;
using System.Reflection;
using Eamon.Framework;
using Eamon.Framework.Primitive.Enums;

namespace ParchLock.EamonHost
{
	internal static class StatsSnapshot
	{
		static readonly Weapon[] Weapons = { Weapon.Axe, Weapon.Bow, Weapon.Club, Weapon.Spear, Weapon.Sword };
		static readonly Spell[] Spells = { Spell.Blast, Spell.Heal, Spell.Speed, Spell.Power };

		/// <summary>An adventure state value an author's own STATUS reads (by property name, through reflection, so the host
		/// needs no compile-time reference to that adventure's game state type).</summary>
		static object StateValue(object state, string name)
		{
			try { return state?.GetType().GetProperty(name, BindingFlags.Public | BindingFlags.Instance)?.GetValue(state); } catch (Exception) { return null; }
		}

		/// <summary>Which adventure's own STATUS rules apply, by the namespace of its game state type (the adventure's own
		/// assembly), not by its display title, so a retitled module or a typographic apostrophe cannot miss (Grok #3558 N1).</summary>
		static bool Is(IGameState state, string ns)
		{
			var n = state?.GetType().Namespace ?? "";
			return n == ns || n.StartsWith(ns + ".", StringComparison.Ordinal);
		}

		/// <summary>Inside an adventure. <paramref name="statusEnabled"/> is whether the player may use STATUS here (the
		/// engine's own StatusCommand.IsPlayerEnabled, which ruleset 5/62 turns off and an adventure may turn back on).
		/// A failing read costs the status alone, never the rest of the world snapshot (Grok #3523 F2, #3558 F1).</summary>
		internal static Dictionary<string, object> Adventure(Eamon.Framework.Plugin.IEngine engine, IGameState state, IMonster self, ICharacter character, bool statusEnabled, string adventure)
		{
			try { return AdventureCore(engine, state, self, character, statusEnabled, adventure); }
			catch (Exception ex) { Console.WriteLine("[world] status left out (" + ex.GetType().Name + ")"); return null; }
		}

		static Dictionary<string, object> AdventureCore(Eamon.Framework.Plugin.IEngine engine, IGameState state, IMonster self, ICharacter character, bool statusEnabled, string adventure)
		{
			if (engine == null || state == null || self == null) return null;
			var s = new Dictionary<string, object> { ["source"] = "adventure", ["adventure"] = adventure ?? "" };
			var health = Math.Max(0, self.Hardiness - self.DmgTaken);
			var healthPct = self.Hardiness > 0 ? (long)Math.Round((double)health / self.Hardiness * 100) : 0;

			// The Vile Grimoire of Jaldi'al's STATUS shows only the health percentage and two conditions (its own
			// StatusCommand.ExecuteForPlayer); the author hides the rest, so this does too.
			if (Is(state, "TheVileGrimoireOfJaldial"))
			{
				s["profile"] = "health-percent";
				s["healthPct"] = healthPct;
				var conditions = new List<string>();
				try
				{
					if (StateValue(state, "ParalyzedTargets") is System.Collections.IDictionary p && p.Contains(state.Cm)) conditions.Add("Paralyzed");
					if (StateValue(state, "ClumsyTargets") is System.Collections.IDictionary c && c.Contains(state.Cm)) conditions.Add("Agility impaired");
				}
				catch (Exception) { }
				s["conditions"] = conditions;
				return s;
			}

			// Where the player has no STATUS (ruleset 5/62: DharmaQuest, Orb of My Life, The Pyramid of Anharos; and The
			// Temple of Ngurct, whose STATUS is not player-enabled) the card shows no more than the game does: health only.
			if (!statusEnabled)
			{
				s["profile"] = "health-only";
				s["health"] = health; s["maxHealth"] = self.Hardiness;
				return s;
			}

			s["profile"] = "status";
			s["name"] = self.Name ?? "";
			if (character != null) s["gender"] = character.EvalGender("Male", "Female", "Neutral");
			s["health"] = health; s["maxHealth"] = self.Hardiness; s["damageTaken"] = self.DmgTaken;
			if (character != null)
			{
				var intellect = character.GetStat(Stat.Intellect);
				var charisma = character.GetStat(Stat.Charisma);
				s["intellect"] = intellect;
				s["learningPct"] = engine.GetIntellectBonusPct(intellect);
				s["charisma"] = charisma;
				s["charmPct"] = engine.GetCharismaFactor(charisma);
			}
			// Agility: STATUS shows the base value and "x2" while a speed spell lasts; both are sent, apart.
			var speedTurns = state.Speed;
			s["agility"] = speedTurns > 0 ? self.Agility / 2 : self.Agility;
			if (speedTurns > 0) { s["agilityNow"] = self.Agility; s["speedTurns"] = speedTurns; }
			// Hardiness: Alternate Beginner's Cave shows the base and "+5" while its magic dagger works.
			var hardiness = self.Hardiness;
			try
			{
				if (Is(state, "AlternateBeginnersCave") && Convert.ToInt64(StateValue(state, "MagicDaggerCounter") ?? 0L) > 0)
				{
					s["hardiness"] = hardiness - 5; s["hardinessBoost"] = 5;
				}
				else s["hardiness"] = hardiness;
			}
			catch (Exception) { s["hardiness"] = hardiness; }

			// Skill stats, unless the engine's own STATUS omits them (ruleset 5.62 with a game state).
			var omitSkills = engine.IsRulesetVersion(5, 62);
			if (!omitSkills && character != null)
			{
				var weapons = new List<object>();
				foreach (var w in Weapons) { var def = engine.GetWeapon(w); weapons.Add(new { name = def?.Name ?? w.ToString(), pct = character.GetWeaponAbility(w) }); }
				s["weapons"] = weapons;
				// Firestorm's own STATUS has no spell block.
				if (!Is(state, "Firestorm"))
				{
					var spells = new List<object>();
					foreach (var sp in Spells) { var def = engine.GetSpell(sp); spells.Add(new { name = def?.Name ?? sp.ToString(), now = state.GetSa(sp), max = character.GetSpellAbility(sp) }); }
					s["spells"] = spells;
				}
			}
			if (character != null) { s["gold"] = character.HeldGold; s["bank"] = character.BankGold; }

			// Armour worn, as StatusCommand works it out from the armour and shield the player wears.
			try
			{
				var cls = (long)Armor.SkinClothes;
				foreach (var uid in new[] { state.Ar, state.Sh })
				{
					if (uid <= 0) continue;
					var a = engine.Database.ArtifactTable.FindRecord(uid);
					if (a?.Wearable != null) cls += a.Wearable.Field1;
				}
				s["armor"] = engine.GetArmor((Armor)cls)?.Name ?? "";
			}
			catch (Exception) { }
			if (!omitSkills && character != null) s["armorExpertise"] = character.ArmorExpertise;

			try
			{
				long weight = 0;
				self.GetFullInventoryWeight(ref weight, recurse: true);
				s["weight"] = weight; s["weightMax"] = engine.GetWeightCarryableGronds(self.Hardiness);
			}
			catch (Exception) { }

			// Effects an adventure adds to its own STATUS (The Beginner's Cave: AfterPrintPlayerStatus, Grok #3554 D4).
			var effects = new List<string>();
			try
			{
				if (Is(state, "TheBeginnersCave") && Convert.ToInt64(StateValue(state, "Trollsfire") ?? 0L) == 1)
				{
					var trollsfire = engine.Database.ArtifactTable.FindRecord(10);
					if (trollsfire != null && trollsfire.IsCarriedByMonster(self)) effects.Add("Trollsfire is alight");
				}
			}
			catch (Exception) { }
			if (effects.Count > 0) s["effects"] = effects;
			return s;
		}

		/// <summary>In the Main Hall (or once a character exists during creation): the character's base values, as the Hall's
		/// own "Examine your abilities" shows them. There is no adventure state, so no weight, spell energy or boosts.</summary>
		internal static Dictionary<string, object> Hall(Eamon.Framework.Plugin.IEngine engine, ICharacter character)
		{
			try { return HallCore(engine, character); }
			catch (Exception ex) { Console.WriteLine("[hall] status left out (" + ex.GetType().Name + ")"); return null; }
		}

		static Dictionary<string, object> HallCore(Eamon.Framework.Plugin.IEngine engine, ICharacter character)
		{
			if (engine == null || character == null) return null;
			var s = new Dictionary<string, object> { ["source"] = "hall", ["profile"] = "hall", ["name"] = character.Name ?? "" };
			s["gender"] = character.EvalGender("Male", "Female", "Neutral");
			var intellect = character.GetStat(Stat.Intellect);
			var charisma = character.GetStat(Stat.Charisma);
			s["intellect"] = intellect; s["learningPct"] = engine.GetIntellectBonusPct(intellect);
			s["hardiness"] = character.GetStat(Stat.Hardiness);
			s["agility"] = character.GetStat(Stat.Agility);
			s["charisma"] = charisma; s["charmPct"] = engine.GetCharismaFactor(charisma);
			var weapons = new List<object>();
			foreach (var w in Weapons) { var def = engine.GetWeapon(w); weapons.Add(new { name = def?.Name ?? w.ToString(), pct = character.GetWeaponAbility(w) }); }
			s["weapons"] = weapons;
			var spells = new List<object>();
			foreach (var sp in Spells) { var def = engine.GetSpell(sp); spells.Add(new { name = def?.Name ?? sp.ToString(), max = character.GetSpellAbility(sp) }); }
			s["spells"] = spells;
			s["armorExpertise"] = character.ArmorExpertise;
			s["gold"] = character.HeldGold; s["bank"] = character.BankGold;
			return s;
		}
	}
}
