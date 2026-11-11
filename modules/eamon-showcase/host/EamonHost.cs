// ParchLock Eamon host: entry points called from the worker.
using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.JavaScript;
using EamonPM;

namespace ParchLock.EamonHost
{
	public static partial class Entry
	{
		public const string BasePath = "/Eamon-CS";

		/// <summary>Place one bundle or saved file into the runtime's file system (the single storage authority).</summary>
		[JSExport]
		public static void WriteFile(string relativePath, byte[] bytes)
		{
			var path = Path.Combine(BasePath, relativePath.Replace('\\', '/'));
			Directory.CreateDirectory(Path.GetDirectoryName(path));
			File.WriteAllBytes(path, bytes);
		}

		[JSExport]
		public static string[] ListFiles()
			=> Directory.Exists(BasePath)
				? Directory.GetFiles(BasePath, "*", SearchOption.AllDirectories).Select(p => p.Substring(BasePath.Length + 1)).OrderBy(p => p, StringComparer.Ordinal).ToArray()
				: Array.Empty<string>();

		[JSExport]
		public static byte[] ReadFile(string relativePath) => File.ReadAllBytes(Path.Combine(BasePath, relativePath));

		/// <summary>Run the Main Hall (or any plugin) until the plugin chain ends. Returns "done", "cancelled" or an error.</summary>
		[JSExport]
		public static string Run(string[] args)
		{
			try
			{
				App.Initialize(BasePath);
				App.PluginLoop(args);
				App.RefreshOutputWindowText();
				return "done";
			}
			catch (Exception e)
			{
				try { App.RefreshOutputWindowText(); } catch { }
				for (var inner = e; inner != null; inner = inner.InnerException)
					if (inner is HostCancelledException) return "cancelled";
				return "error: " + e;
			}
		}
	}
}
