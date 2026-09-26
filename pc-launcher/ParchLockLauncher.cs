using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

internal static class ParchLockLauncher
{
    [STAThread]
    private static int Main()
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

            int port = FreePort();
            listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
            listener.Prefixes.Add("http://localhost:" + port + "/");
            listener.Start();

            Thread worker = new Thread(delegate() { Serve(listener, root); });
            worker.IsBackground = true;
            worker.Start();
            Thread.Sleep(150);

            string url = "http://127.0.0.1:" + port + "/play.html";
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

    private static int FreePort()
    {
        TcpListener tcp = new TcpListener(IPAddress.Loopback, 0);
        tcp.Start();
        int port = ((IPEndPoint)tcp.LocalEndpoint).Port;
        tcp.Stop();
        return port;
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
