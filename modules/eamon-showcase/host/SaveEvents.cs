// ParchLock Eamon host: tells ParchLock's existing save systems (Transcript, SaveState, playthrough
// history) when the game's own SAVE or RESTORE completed, the way the Glk save dialog does for a Z story
// (plan section 7 "Saves and everything that follows them"; register R7/R8). Read-only.
using System;
using System.Linq;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class SaveEvents
	{
		static object _reported;
		/// <summary>Set by the plugin loop when an adventure was entered from the Main Hall.</summary>
		internal static bool FreshEntry;

		/// <summary>Called at an adventure's own prompt: the engine's LastCommandList holds last turn's commands.</summary>
		internal static void Report()
		{
			if (FreshEntry)
			{
				FreshEntry = false;
				HostBridge.Lifecycle("adventure-fresh", gEngine.GetModule()?.Name ?? "");
			}
			var rt = gEngine as EamonRT.Framework.Plugin.IEngine;
			var command = rt?.LastCommandList?.LastOrDefault(c => c is EamonRT.Game.Commands.SaveCommand || c is EamonRT.Game.Commands.RestoreCommand);
			if (command == null || ReferenceEquals(command, _reported)) return;
			_reported = command;
			var adventure = gEngine.GetModule()?.Name ?? "Eamon";
			if (command is EamonRT.Game.Commands.SaveCommand save)
			{
				// GameSaved is the engine's own success flag (a failed save prints "not saved" and leaves it false;
				// a cancelled slot menu never sets it). The name is the fileset record the save wrote, which covers
				// the interactive save (typed name) and a quick save over a named slot (Grok #3388 S1, S2).
				if (!save.GameSaved || save.SaveSlot < 1 || string.IsNullOrWhiteSpace(save.SaveFileset?.Name)) return;
				RunLedger.OnSaved(save.SaveSlot);
				HostBridge.Lifecycle("save", Name(adventure, save.SaveSlot, save.SaveFileset.Name));
			}
			else if (command is EamonRT.Game.Commands.RestoreCommand restore)
			{
				// Every failed restore sets ExitType.Error; the record the engine loaded is restore.SaveFileset.
				if (rt.ExitType == Eamon.Framework.Primitive.Enums.ExitType.Error) return;
				if (restore.SaveSlot < 1 || string.IsNullOrWhiteSpace(restore.SaveFileset?.Name)) return;
				RunLedger.OnRestored(restore.SaveSlot);
				HostBridge.Lifecycle("restore", Name(adventure, restore.SaveSlot, restore.SaveFileset.Name));
			}
		}

		static EamonRT.Framework.Plugin.IEngine _adventure;
		static string _adventureName, _deletedPending;
		static long _dieAtPrompt;
		static string _character;

		/// <summary>Called at every adventure prompt: the adventure engine now running.</summary>
		internal static void Track()
		{
			if (gEngine is EamonRT.Framework.Plugin.IEngine rt)
			{
				_adventure = rt; _adventureName = gEngine.GetModule()?.Name ?? "";
				try { _dieAtPrompt = gEngine.GetGameState()?.Die ?? -99; } catch (Exception) { _dieAtPrompt = -98; }
				// Once the adventure has decided to finish (ExitType set before Shutdown runs), its remaining prompts are
				// Shutdown's own key presses, after it has already moved reward items to limbo (The Wayfarers Inn's deed,
				// MainLoop.cs:65): the contract keeps the last evaluation from before the finish.
				if (rt.ExitType == Eamon.Framework.Primitive.Enums.ExitType.None) ClearContracts.Evaluate();
				try { RunLedger.Track(); } catch (Exception) { }
				// The character of THIS adventure only (no carry-over from an earlier one, Grok #3410 F1).
				try { _character = rt.Character != null ? RunLedger.CharacterId(rt.Character.Uid, rt.Character.Name ?? "") : null; } catch (Exception) { _character = null; }
			}
		}

		/// <summary>Called by the plugin loop after a plugin returns. Going to the Main Hall, finishing, Start Over
		/// and deleting the character all delete every save slot of that adventure (Config.DeleteGameState after the
		/// loop), so its save names stop naming saves (Grok #3391 N3).</summary>
		internal static void AfterPlugin()
		{
			if (_adventure != null && _adventure.DeleteGameStateAfterLoop && !string.IsNullOrEmpty(_adventureName)) _deletedPending = _adventureName;
			// How the adventure ended (plan section 6; Grok #3402 P3). Probed: after the plugin returns ExitType is still
			// readable from the engine object, but its game state is gone (GetGameState() is null), so Die is the value
			// at the adventure's last prompt: the exit Y/N for FinishAdventure, the death menu (Die 1) for a death.
			if (_adventure != null)
			{
				// A clear: the adventure's own finish, alive (Die exactly 0, Grok #3405), with its quest met or no quest.
				var cleared = _adventure.ExitType == Eamon.Framework.Primitive.Enums.ExitType.FinishAdventure && _dieAtPrompt == 0
					&& (ClearContracts.Latest == "true" || ClearContracts.Latest == "none");
				string credit = "not a clear";
				if (cleared) { try { credit = RunLedger.Credit(_adventure, _character, _adventureName, _adventure.Character?.Name, ClearContracts.Latest); } catch (Exception e) { credit = "error: " + e.Message; } }
				HostBridge.Lifecycle("adventure-ended", _adventureName + "|" + _adventure.ExitType + "|die=" + _dieAtPrompt + "|quest=" + ClearContracts.Latest + "|run=" + RunLedger.Current + "|credit=" + credit);
				Debrief.Ended(_adventureName, _adventure.ExitType.ToString(), _dieAtPrompt, ClearContracts.Latest, credit);
			}
			ClearContracts.Reset();
			_adventure = null;
			_character = null;
		}

		/// <summary>Called after a safe-point commit: the deletion is durable, so ParchLock forgets those saves now.</summary>
		internal static void AfterFlush()
		{
			if (_deletedPending == null) return;
			HostBridge.Lifecycle("saves-deleted", _deletedPending);
			_deletedPending = null;
		}

		static object _startOver;
		/// <summary>Called at an adventure's other prompts. Start Over (death menu) has already deleted every save
		/// slot (Config.DeleteGameState, startOver) and the next run boots straight back into the adventure from
		/// its module files, so the plugin loop never sees a Hall entry: this is that adventure's new game.</summary>
		internal static void ReportStartOver()
		{
			var rt = gEngine as EamonRT.Framework.Plugin.IEngine;
			if (rt == null || !rt.StartOver || ReferenceEquals(rt, _startOver)) return;
			_startOver = rt;
			try { RunLedger.NewRun(); } catch (Exception) { }
			HostBridge.Lifecycle("adventure-fresh", gEngine.GetModule()?.Name ?? "");
		}

		/// <summary>One save name per adventure and slot, e.g. "The Beginner's Cave, slot 1: Quick Saved Game".</summary>
		static string Name(string adventure, long slot, string saveName) => adventure + ", slot " + slot + ": " + saveName.Trim();
	}
}
