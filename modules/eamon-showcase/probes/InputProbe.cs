using System.Runtime.InteropServices.JavaScript;

public static partial class InputProbe
{
    [JSImport("read", "input-probe")]
    internal static partial string Read(string prompt);

    [JSExport]
    public static string Run()
    {
        var first = Read("first");
        var second = Read("second");
        return first + ":" + second;
    }
}
