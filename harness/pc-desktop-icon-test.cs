// D215 PC desktop-shortcut rotation proof (claude). Compiled together with
// pc-launcher/ParchLockLauncher.cs, run against a scratch folder -- the real
// desktop is never touched:
//   csc /target:exe /main:DesktopIconTest /r:System.Windows.Forms.dll /r:System.Drawing.dll
//       /out:%TEMP%\pc-icon-test.exe pc-launcher\ParchLockLauncher.cs harness\pc-desktop-icon-test.cs
//   %TEMP%\pc-icon-test.exe <repo root>
using System;
using System.IO;
using System.Reflection;

internal static class DesktopIconTest
{
    static int pass, fail;
    static void Check(bool ok, string msg) { if (ok) pass++; else fail++; Console.WriteLine((ok ? "PASS: " : "FAIL: ") + msg); }

    static string IconOf(string lnk)
    {
        object shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
        object o = shell.GetType().InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { lnk });
        return Convert.ToString(o.GetType().InvokeMember("IconLocation", BindingFlags.GetProperty, null, o, null));
    }
    static void WriteForeign(string lnk, string target)
    {
        object shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
        object o = shell.GetType().InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { lnk });
        o.GetType().InvokeMember("TargetPath", BindingFlags.SetProperty, null, o, new object[] { target });
        o.GetType().InvokeMember("IconLocation", BindingFlags.SetProperty, null, o, new object[] { target + ",0" });
        o.GetType().InvokeMember("Save", BindingFlags.InvokeMethod, null, o, null);
    }

    [STAThread]
    static int Main(string[] args)
    {
        string root = Path.GetFullPath(args.Length > 0 ? args[0] : ".");
        string scratch = Path.Combine(Path.GetTempPath(), "parchlock-icon-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(scratch);
        string ini = Path.Combine(scratch, "launcher.ini");
        string lnk = Path.Combine(scratch, "ParchLock.lnk");
        try
        {
            DesktopIcon d = DesktopIcon.ForTest(root, ini, lnk, true);
            Check(File.Exists(lnk) && IconOf(lnk).IndexOf("parchlock-archive.ico", StringComparison.OrdinalIgnoreCase) >= 0,
                "a created shortcut starts on the archive scene");
            d.Rotate();
            Check(IconOf(lnk).IndexOf("parchlock-map.ico", StringComparison.OrdinalIgnoreCase) >= 0, "closing rotates it to the map scene");
            DesktopIcon again = DesktopIcon.LoadFrom(root, ini);
            Check(again.Scene == 1 && again.Consent == "yes", "the scene and consent persist in launcher.ini");
            again.Rotate(); again.Rotate(); again.Rotate();
            Check(IconOf(lnk).IndexOf("parchlock-archive.ico", StringComparison.OrdinalIgnoreCase) >= 0, "four closes cycle back to archive");

            File.Delete(lnk);
            again.Rotate();
            Check(!File.Exists(lnk), "a deleted shortcut is never recreated");

            string foreignTarget = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "notepad.exe");
            WriteForeign(lnk, foreignTarget);
            again.Rotate();
            Check(IconOf(lnk).IndexOf("notepad.exe", StringComparison.OrdinalIgnoreCase) >= 0, "a shortcut that points elsewhere is not ours and is left unchanged");
        }
        finally
        {
            // Delete only the scratch folder this run created inside %TEMP%.
            string temp = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            string full = Path.GetFullPath(scratch);
            if (full.StartsWith(temp, StringComparison.OrdinalIgnoreCase)
                && Path.GetFileName(full).StartsWith("parchlock-icon-test-", StringComparison.Ordinal))
            {
                try { Directory.Delete(full, true); } catch { }
            }
        }
        Console.WriteLine(pass + " PASS / " + fail + " FAIL");
        return fail == 0 ? 0 : 1;
    }
}
