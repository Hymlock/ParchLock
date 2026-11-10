using System.IO.Compression;
using System.Text.Json;
using Microsoft.JSInterop;
using Eamon.Framework;
using Eamon.Framework.DataStorage.Generic;
using Eamon.Game.Plugin;

public static class EamonProbe
{
    [JSInvokable]
    public static string Inspect(string moduleBase64)
    {
        var assemblies = new[] { typeof(Eamon.Game.Module).Assembly, typeof(EamonRT.Program).Assembly,
            typeof(EamonMH.Program).Assembly, typeof(TheBeginnersCave.Program).Assembly,
            typeof(TheVileGrimoireOfJaldial.Program).Assembly, typeof(Polenter.Serialization.SharpSerializer).Assembly };
        var types = assemblies.Select(a => new { name = a.GetName().Name, version = a.GetName().Version?.ToString(), types = a.GetTypes().Length }).ToArray();
        object serialization;
        try
        {
            Globals.gEngine = new Eamon.Game.Plugin.Engine();
            Globals.gEngine.MutatePropertyCounter--;
            using var compressed = new MemoryStream(Convert.FromBase64String(moduleBase64));
            using var gzip = new GZipStream(compressed, CompressionMode.Decompress);
            var serializer = new Polenter.Serialization.SharpSerializer(false);
            var table = serializer.Deserialize(gzip) as IDbTable<IModule>;
            var module = table?.Records.FirstOrDefault();
            using var restored = new MemoryStream();
            serializer.Serialize(table, restored);
            restored.Position = 0;
            var copy = serializer.Deserialize(restored) as IDbTable<IModule>;
            serialization = new { ok = module != null && copy?.Records.FirstOrDefault()?.Name == module.Name,
                title = module?.Name, rooms = module?.NumRooms, artifacts = module?.NumArtifacts,
                roundTripBytes = restored.Length };
        }
        catch (Exception e) { serialization = new { ok = false, error = e.ToString() }; }
        finally { if (Globals.gEngine != null) Globals.gEngine.MutatePropertyCounter++; Globals.gEngine = null; }
        return JsonSerializer.Serialize(new { scope = "Browser assembly reflection and source MODULE.DAT serializer roundtrip only; no gameplay or G1 pass", assemblies = types, serialization });
    }
}
