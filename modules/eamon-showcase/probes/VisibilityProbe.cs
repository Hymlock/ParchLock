using System;
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using Eamon.Framework.Primitive.Classes;

public static partial class VisibilityProbe
{
    private sealed class FixtureEngine : Eamon.Game.Plugin.Engine
    {
        public override T CreateInstance<T>(Type ifaceType, Action<T> initialize = null)
        {
            if (ifaceType != typeof(IArtifactCategory)) return base.CreateInstance(ifaceType, initialize);
            var value = (T)(object)new Eamon.Game.Primitive.Classes.ArtifactCategory();
            initialize?.Invoke(value); return value;
        }
    }

    [JSExport]
    public static string Check()
    {
        var previous = Eamon.Game.Plugin.Globals.gEngine;
        try
        {
            var engine = new FixtureEngine(); Eamon.Game.Plugin.Globals.gEngine = engine;
            engine.MutatePropertyCounter--;
            var room = new Eamon.Game.Room { Uid = 1 };
            var artifact = new Eamon.Game.Artifact { Uid = 9, Location = 1, IsListed = false, Seen = false };
            var before = artifact.Seen;
            var listed = room.IsArtifactListedInRoom(artifact);
            var after = artifact.Seen;
            artifact.Seen = false;
            var direct = artifact.IsInRoom(room) && artifact.IsListed;
            return JsonSerializer.Serialize(new { before, listed, after, direct, directSeen = artifact.Seen });
        }
        finally { Eamon.Game.Plugin.Globals.gEngine = previous; }
    }
}
