// Isolated G1 candidate: materialize the Hall's modified records before its stable menu checkpoint.
using System;
using Eamon;
using static EamonMH.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	internal static class HallCheckpoint
	{
		// Called ONLY after HostTextReader verified a top-level Main Hall menu. These are the same
		// serializers as EamonMH.Program shutdown, without output or clearing modification flags.
		// Never run merchant/quest/return logic here. A failed serializer aborts before durable Flush.
		internal static void SaveModified()
		{
			var engine = Eamon.Game.Plugin.Globals.gEngine as EamonMH.Framework.Plugin.IEngine;
			if (engine == null) throw new InvalidOperationException("Hall checkpoint outside the Main Hall.");
			void Require(RetCode result, string operation)
			{
				if (engine.IsFailure(result)) throw new InvalidOperationException("Hall checkpoint failed: " + operation);
			}
			if (engine.EffectsModified) Require(gDatabase.SaveEffects(engine.Config.MhEffectFileName, false), "effects");
			if (engine.CharArtsModified) Require(gDatabase.SaveArtifacts(engine.Config.MhCharArtFileName, false), "artifacts");
			if (engine.CharactersModified) Require(gDatabase.SaveCharacters(engine.Config.MhCharacterFileName, false), "characters");
			if (engine.FilesetsModified) Require(gDatabase.SaveFilesets(engine.Config.MhFilesetFileName, false), "filesets");
			if (engine.ConfigsModified && !string.IsNullOrEmpty(engine.ConfigFileName))
				Require(gDatabase.SaveConfigs(engine.ConfigFileName, false), "configs");
		}
	}
}
