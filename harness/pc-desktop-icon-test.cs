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
            Check(IconOf(lnk).IndexOf("parchlock-map.ico", StringComparison.OrdinalIgnoreCase) >= 0, "a start rotates it to the map scene");
            DesktopIcon again = DesktopIcon.LoadFrom(root, ini);
            Check(again.Scene == 1 && again.Consent == "yes", "the scene and consent persist in launcher.ini");
            again.Rotate(); again.Rotate(); again.Rotate();
            Check(IconOf(lnk).IndexOf("parchlock-archive.ico", StringComparison.OrdinalIgnoreCase) >= 0, "four starts cycle back to archive");

            File.Delete(lnk);
            again.Rotate();
            Check(!File.Exists(lnk), "a deleted shortcut is never recreated");

            string foreignTarget = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "notepad.exe");
            WriteForeign(lnk, foreignTarget);
            again.Rotate();
            Check(IconOf(lnk).IndexOf("notepad.exe", StringComparison.OrdinalIgnoreCase) >= 0, "a shortcut that points elsewhere is not ours and is left unchanged");

            // Issue 1: "Yes" takes over a desktop shortcut the player already made to this exe.
            string desk = Path.Combine(scratch, "desk1");
            Directory.CreateDirectory(desk);
            string mine = Path.Combine(desk, "My ParchLock.lnk");
            string other = Path.Combine(desk, "Notepad.lnk");
            WriteForeign(mine, Path.Combine(root, "ParchLock.exe"));
            WriteForeign(other, foreignTarget);
            string ini2 = Path.Combine(scratch, "launcher2.ini");
            DesktopIcon fresh = DesktopIcon.LoadFrom(root, ini2);
            fresh.Accept(desk, false);
            Check(!File.Exists(Path.Combine(desk, "ParchLock.lnk")), "an existing shortcut to this exe is taken over; no second shortcut is added");
            Check(IconOf(mine).IndexOf("parchlock-", StringComparison.OrdinalIgnoreCase) >= 0, "the taken-over shortcut gets the scene picture");
            Check(IconOf(other).IndexOf("notepad.exe", StringComparison.OrdinalIgnoreCase) >= 0, "a shortcut to another program is never touched");
            DesktopIcon owned = DesktopIcon.LoadFrom(root, ini2);
            string before = IconOf(mine);
            owned.Rotate();
            Check(owned.Consent == "yes" && IconOf(mine) != before, "the taken-over shortcut is owned and rotates at the next start");

            // No shortcut to this exe: Yes creates ParchLock.lnk and leaves others alone.
            string desk2 = Path.Combine(scratch, "desk2");
            Directory.CreateDirectory(desk2);
            string other2 = Path.Combine(desk2, "Notepad.lnk");
            WriteForeign(other2, foreignTarget);
            DesktopIcon.LoadFrom(root, Path.Combine(scratch, "launcher3.ini")).Accept(desk2, false);
            Check(File.Exists(Path.Combine(desk2, "ParchLock.lnk")) && IconOf(other2).IndexOf("notepad.exe", StringComparison.OrdinalIgnoreCase) >= 0,
                "without one, Yes creates ParchLock.lnk and leaves other shortcuts unchanged");
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
