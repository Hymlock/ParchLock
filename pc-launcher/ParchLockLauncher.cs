using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

internal static class ParchLockLauncher
{
    [STAThread]
    private static int Main(string[] args)
    {
        HttpListener listener = null;
        try
        {
            string root = Path.GetFullPath(AppDomain.CurrentDomain.BaseDirectory);
            string play = Path.Combine(root, "play.html");
            if (!File.Exists(play))
            {
                MessageBox.Show(
                    "play.html was not found next to ParchLock.exe. Put the launcher in the ParchLock folder.",
                    "ParchLock",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return 1;
            }

            // D215: rotating desktop shortcut. Asked once; "No" is remembered and
            // --desktop-shortcut asks again.
            DesktopIcon icon = DesktopIcon.Load(root);
            if (Array.IndexOf(args ?? new string[0], "--desktop-shortcut") >= 0) icon.Consent = "unasked";
            if (icon.Consent == "unasked") icon.Ask();

            // Browser saves and permissions belong to the origin, including its port.
            const int port = 49371;
            listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
            listener.Prefixes.Add("http://localhost:" + port + "/");
            try { listener.Start(); }
            catch (HttpListenerException ex)
            {
                throw new InvalidOperationException(
                    "ParchLock could not open its fixed local address (port 49371). Close another ParchLock instance or the program using that port and try again. The port is kept fixed to preserve browser saves and settings.", ex);
            }

            Thread worker = new Thread(delegate() { Serve(listener, root); });
            worker.IsBackground = true;
            worker.Start();
            Thread.Sleep(150);

            // The splash opens on the scene the desktop icon currently shows.
            string url = "http://127.0.0.1:" + port + "/play.html?splash=" + DesktopIcon.Scenes[icon.Scene];
            Process browser = StartFullscreen(url);
            if (browser == null)
            {
                MessageBox.Show(
                    "Could not find Chrome or Edge. Open this address in a browser:\n" + url + "\n\nClick OK when you are finished.",
                    "ParchLock",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            else if (!browser.WaitForExit(3000))
            {
                browser.WaitForExit();
            }
            else
            {
                RunUntilQuit();
            }
            icon.Rotate();
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "ParchLock", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        finally
        {
            if (listener != null)
            {
                try { listener.Stop(); } catch { }
                try { listener.Close(); } catch { }
            }
        }
    }

    private static Process StartFullscreen(string url)
    {
        string[] browsers = new string[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe")
        };
        string profile = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ParchLock", "browser-profile");
        Directory.CreateDirectory(profile);
        string args = "--user-data-dir=\"" + profile + "\" --no-first-run --no-default-browser-check --start-fullscreen --app=\"" + url + "\"";
        for (int i = 0; i < browsers.Length; i++)
        {
            if (!File.Exists(browsers[i])) continue;
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = browsers[i];
            psi.Arguments = args;
            psi.UseShellExecute = false;
            return Process.Start(psi);
        }
        return null;
    }

    private static void RunUntilQuit()
    {
        NotifyIcon tray = new NotifyIcon();
        tray.Text = "ParchLock";
        tray.Icon = System.Drawing.SystemIcons.Application;
        tray.Visible = true;
        MenuItem quit = new MenuItem("Quit ParchLock");
        quit.Click += delegate { Application.Exit(); };
        tray.ContextMenu = new ContextMenu(new MenuItem[] { quit });
        Application.Run();
        tray.Visible = false;
        tray.Dispose();
    }

    private static void Serve(HttpListener listener, string root)
    {
        while (listener.IsListening)
        {
            HttpListenerContext ctx;
            try { ctx = listener.GetContext(); }
            catch { break; }
            ThreadPool.QueueUserWorkItem(delegate(object state) { Handle((HttpListenerContext)state, root); }, ctx);
        }
    }

    private static void Handle(HttpListenerContext ctx, string root)
    {
        try
        {
            string rel = Uri.UnescapeDataString(ctx.Request.Url.AbsolutePath);
            if (rel == "/" || rel.Length == 0) rel = "/play.html";
            rel = rel.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            string full = Path.GetFullPath(Path.Combine(root, rel));
            string rootSlash = root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            if (!full.StartsWith(rootSlash, StringComparison.OrdinalIgnoreCase) || !File.Exists(full))
            {
                ctx.Response.StatusCode = 404;
                ctx.Response.Close();
                return;
            }
            byte[] data = File.ReadAllBytes(full);
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = Mime(Path.GetExtension(full));
            ctx.Response.ContentLength64 = data.Length;
            ctx.Response.OutputStream.Write(data, 0, data.Length);
            ctx.Response.OutputStream.Close();
        }
        catch
        {
            try { ctx.Response.StatusCode = 500; ctx.Response.Close(); } catch { }
        }
    }

    private static string Mime(string ext)
    {
        ext = (ext ?? "").ToLowerInvariant();
        if (ext == ".html" || ext == ".htm") return "text/html; charset=utf-8";
        if (ext == ".js") return "application/javascript";
        if (ext == ".css") return "text/css";
        if (ext == ".json") return "application/json";
        if (ext == ".wasm") return "application/wasm";
        if (ext == ".png") return "image/png";
        if (ext == ".svg") return "image/svg+xml";
        if (ext == ".ico") return "image/x-icon";
        if (ext == ".gif") return "image/gif";
        if (ext == ".jpg" || ext == ".jpeg") return "image/jpeg";
        if (ext == ".ttf") return "font/ttf";
        if (ext == ".woff") return "font/woff";
        if (ext == ".woff2") return "font/woff2";
        if (ext == ".txt" || ext == ".md") return "text/plain; charset=utf-8";
        return "application/octet-stream";
    }
}

/// <summary>
/// D215: the desktop shortcut ParchLock creates with the player's consent. Its
/// picture moves to the next storybook scene each time ParchLock closes. Only
/// the shortcut this launcher created is ever touched: a file of the same name
/// that is not ours is left alone, and a deleted shortcut is never recreated.
/// </summary>
internal sealed class DesktopIcon
{
    internal static readonly string[] Scenes = { "archive", "map", "dungeon", "forest" };

    internal string Consent = "unasked";   // unasked | yes | no
    internal int Scene;
    private string shortcutPath = "";
    private string shortcutTarget = "";
    private string root;
    private string settingsPath;

    [DllImport("shell32.dll")]
    private static extern void SHChangeNotify(int eventId, uint flags, IntPtr item1, IntPtr item2);
    private const int SHCNE_UPDATEITEM = 0x00002000;
    private const int SHCNE_ASSOCCHANGED = 0x08000000;
    private const uint SHCNF_IDLIST = 0x0000;
    private const uint SHCNF_PATHW = 0x0005;

    internal static DesktopIcon Load(string root)
    {
        string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ParchLock");
        return LoadFrom(root, Path.Combine(dir, "launcher.ini"));
    }

    internal static DesktopIcon LoadFrom(string root, string settings)
    {
        DesktopIcon d = new DesktopIcon();
        d.root = root;
        d.settingsPath = settings;
        try
        {
            if (File.Exists(d.settingsPath))
            {
                foreach (string line in File.ReadAllLines(d.settingsPath))
                {
                    int eq = line.IndexOf('=');
                    if (eq <= 0) continue;
                    string key = line.Substring(0, eq).Trim(), value = line.Substring(eq + 1).Trim();
                    if (key == "shortcut" && (value == "yes" || value == "no" || value == "unasked")) d.Consent = value;
                    else if (key == "scene") { int n; if (int.TryParse(value, out n) && n >= 0 && n < Scenes.Length) d.Scene = n; }
                    else if (key == "shortcutPath") d.shortcutPath = value;
                    else if (key == "shortcutTarget") d.shortcutTarget = value;
                }
            }
        }
        catch { }
        return d;
    }

    // Test seam (harness/pc-desktop-icon-test.cs): a shortcut and settings file
    // in a scratch folder instead of the real desktop.
    internal static DesktopIcon ForTest(string root, string settings, string lnk, bool create)
    {
        DesktopIcon d = new DesktopIcon();
        d.root = root;
        d.settingsPath = settings;
        d.Consent = "yes";
        if (create) { d.WriteShortcut(lnk); d.shortcutPath = lnk; d.shortcutTarget = d.Exe; }
        else d.shortcutPath = lnk;
        d.Save();
        return d;
    }

    // Written to a temporary file and swapped in, so a crash never leaves half a file.
    private void Save()
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(settingsPath));
            string temp = settingsPath + ".tmp";
            File.WriteAllLines(temp, new string[] {
                "shortcut=" + Consent, "scene=" + Scene, "shortcutPath=" + shortcutPath, "shortcutTarget=" + shortcutTarget });
            if (File.Exists(settingsPath)) File.Replace(temp, settingsPath, null);
            else File.Move(temp, settingsPath);
        }
        catch { }
    }

    private string Exe { get { return Path.Combine(root, "ParchLock.exe"); } }
    private string IconFile(int scene) { return Path.Combine(Path.Combine(Path.Combine(root, "img"), "icons"), "parchlock-" + Scenes[scene] + ".ico"); }

    internal void Ask()
    {
        DialogResult answer = MessageBox.Show(
            "Add a ParchLock shortcut to your desktop?\n\nIts picture changes to a different story scene each time you close ParchLock.",
            "ParchLock", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
        if (answer != DialogResult.Yes) { Consent = "no"; Save(); return; }
        Consent = "yes";
        string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "ParchLock.lnk");
        if (File.Exists(path) && !(string.Equals(path, shortcutPath, StringComparison.OrdinalIgnoreCase) && IsOurs(path)))
        {
            MessageBox.Show("A file named ParchLock.lnk is already on your desktop, so ParchLock left it unchanged.",
                "ParchLock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            Save();
            return;
        }
        try
        {
            WriteShortcut(path);
            shortcutPath = path;
            shortcutTarget = Exe;
        }
        catch (Exception ex)
        {
            MessageBox.Show("ParchLock could not create the desktop shortcut: " + ex.Message, "ParchLock",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        Save();
    }

    internal void Rotate()
    {
        try
        {
            Scene = (Scene + 1) % Scenes.Length;
            if (Consent == "yes" && shortcutPath.Length > 0 && File.Exists(shortcutPath) && IsOurs(shortcutPath))
            {
                WriteShortcut(shortcutPath);
                shortcutTarget = Exe;
            }
        }
        catch { }
        Save();
    }

    // Ours: it points at this exe, or at the exe we recorded, which no longer
    // exists because the ParchLock folder was moved.
    private bool IsOurs(string path)
    {
        try
        {
            object lnk = Invoke(Shell(), "CreateShortcut", path);
            string target = Convert.ToString(Get(lnk, "TargetPath"));
            return string.Equals(target, Exe, StringComparison.OrdinalIgnoreCase)
                || (shortcutTarget.Length > 0 && string.Equals(target, shortcutTarget, StringComparison.OrdinalIgnoreCase) && !File.Exists(target));
        }
        catch { return false; }
    }

    private void WriteShortcut(string path)
    {
        object lnk = Invoke(Shell(), "CreateShortcut", path);
        Set(lnk, "TargetPath", Exe);
        Set(lnk, "WorkingDirectory", root);
        Set(lnk, "Description", "ParchLock");
        string ico = IconFile(Scene);
        if (File.Exists(ico)) Set(lnk, "IconLocation", ico + ",0");
        Invoke(lnk, "Save");
        IntPtr p = Marshal.StringToHGlobalUni(path);
        try { SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATHW, p, IntPtr.Zero); }
        finally { Marshal.FreeHGlobal(p); }
        SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, IntPtr.Zero, IntPtr.Zero);
    }

    private static object Shell() { return Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell")); }
    private static object Invoke(object o, string method, params object[] a)
    {
        return o.GetType().InvokeMember(method, BindingFlags.InvokeMethod, null, o, a.Length == 0 ? null : a);
    }
    private static object Get(object o, string prop) { return o.GetType().InvokeMember(prop, BindingFlags.GetProperty, null, o, null); }
    private static void Set(object o, string prop, object v) { o.GetType().InvokeMember(prop, BindingFlags.SetProperty, null, o, new object[] { v }); }
}
