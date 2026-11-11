using System.IO;
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using ParchLock.EamonHost;

public static partial class MetadataProbe
{
    [JSExport]
    public static string Rewrite()
    {
        Directory.CreateDirectory(Entry.BasePath);
        var path = Path.Combine(Entry.BasePath, "probe.bin");
        File.WriteAllBytes(path, new byte[] {1, 2, 3});
        var fixedStamp = new System.DateTime(2026, 1, 1, 0, 0, 0, System.DateTimeKind.Utc);
        File.SetLastWriteTimeUtc(path, fixedStamp);
        var stamp = File.GetLastWriteTimeUtc(path);
        Persistence.Baseline();
        File.WriteAllBytes(path, new byte[] {4, 5, 6});
        File.SetLastWriteTimeUtc(path, fixedStamp);
        Persistence.Flush();
        Persistence.Flush(); // Unchanged content must not generate a second revision.
        return JsonSerializer.Serialize(new {body = File.ReadAllBytes(path), sameStamp = stamp == File.GetLastWriteTimeUtc(path)});
    }
}
