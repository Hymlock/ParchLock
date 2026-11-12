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
				HostBridge.Lifecycle("save", Name(adventure, save.SaveSlot, save.SaveFileset.Name));
			}
			else if (command is EamonRT.Game.Commands.RestoreCommand restore)
			{
				// Every failed restore sets ExitType.Error; the record the engine loaded is restore.SaveFileset.
				if (rt.ExitType == Eamon.Framework.Primitive.Enums.ExitType.Error) return;
				if (restore.SaveSlot < 1 || string.IsNullOrWhiteSpace(restore.SaveFileset?.Name)) return;
				HostBridge.Lifecycle("restore", Name(adventure, restore.SaveSlot, restore.SaveFileset.Name));
			}
		}

		/// <summary>One save name per adventure and slot, e.g. "The Beginner's Cave, slot 1: Quick Saved Game".</summary>
		static string Name(string adventure, long slot, string saveName) => adventure + ", slot " + slot + ": " + saveName.Trim();
	}
}
