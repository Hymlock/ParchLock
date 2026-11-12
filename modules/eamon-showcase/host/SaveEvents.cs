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

		/// <summary>Called at an adventure's own prompt: the engine's LastCommandList holds last turn's commands.</summary>
		internal static void Report()
		{
			var rt = gEngine as EamonRT.Framework.Plugin.IEngine;
			var command = rt?.LastCommandList?.LastOrDefault(c => c is EamonRT.Framework.Commands.ISaveCommand || c is EamonRT.Framework.Commands.IRestoreCommand);
			if (command == null || ReferenceEquals(command, _reported)) return;
			_reported = command;
			if (rt.ExitType == Eamon.Framework.Primitive.Enums.ExitType.Error) return;
			var adventure = gEngine.GetModule()?.Name ?? "Eamon";
			if (command is EamonRT.Framework.Commands.ISaveCommand save)
			{
				if (save.SaveSlot < 1 || string.IsNullOrWhiteSpace(save.SaveName)) return;
				HostBridge.Lifecycle("save", Name(adventure, save.SaveSlot, save.SaveName));
			}
			else if (command is EamonRT.Framework.Commands.IRestoreCommand restore)
			{
				if (restore.SaveSlot < 1) return;
				// The slot's name as the save recorded it (the engine's own fileset list, in slot order).
				var fileset = gDatabase?.FilesetTable?.Records?.OrderBy(f => f.Uid).Skip((int)restore.SaveSlot - 1).FirstOrDefault();
				if (fileset == null) return;
				HostBridge.Lifecycle("restore", Name(adventure, restore.SaveSlot, fileset.Name));
			}
		}

		/// <summary>One save name per adventure and slot, e.g. "The Beginner's Cave, slot 1: Quick Saved Game".</summary>
		static string Name(string adventure, long slot, string saveName) => adventure + ", slot " + slot + ": " + saveName.Trim();
	}
}
