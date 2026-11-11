// ParchLock Eamon host: entry points called from the worker.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.JavaScript;
using EamonPM;

namespace ParchLock.EamonHost
{
	/// <summary>
	/// The runtime's in-memory file system is the only place the engine can write, so saving is
	/// "send what changed since the last safe point". The page stores each batch atomically.
	/// </summary>
	public static class Persistence
	{
		static Dictionary<string, (long Length, long Stamp)> _known = new Dictionary<string, (long, long)>();
		static string _launch = "";

		static Dictionary<string, (long, long)> Scan()
		{
			var result = new Dictionary<string, (long, long)>();
			if (!Directory.Exists(Entry.BasePath)) return result;
			foreach (var file in new DirectoryInfo(Entry.BasePath).EnumerateFiles("*", SearchOption.AllDirectories))
				result[file.FullName.Substring(Entry.BasePath.Length + 1)] = (file.Length, file.LastWriteTimeUtc.Ticks);
			return result;
		}

		public static void Baseline() => _known = Scan();

		public static void Flush()
		{
			var now = Scan();
			var changed = false;
			foreach (var item in now)
				if (!_known.TryGetValue(item.Key, out var before) || before != item.Value)
				{
					HostBridge.Stage(item.Key, File.ReadAllBytes(Path.Combine(Entry.BasePath, item.Key)));
					changed = true;
				}
			foreach (var path in _known.Keys)
				if (!now.ContainsKey(path)) { HostBridge.Unstage(path); changed = true; }
			var launch = App.CurrentArgs == null ? "" : string.Join("\n", App.CurrentArgs);
			if (changed || launch != _launch) HostBridge.Commit(launch);
			_known = now;
			_launch = launch;
		}
	}

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

		[JSExport]
		public static void DeleteFile(string relativePath)
		{
			var path = Path.Combine(BasePath, relativePath);
			if (File.Exists(path)) File.Delete(path);
		}

		/// <summary>Call once the bundle and any saved files are in place: later changes are what gets saved.</summary>
		[JSExport]
		public static void Baseline() => Persistence.Baseline();

		/// <summary>Run the Main Hall (or any plugin) until the plugin chain ends. Returns "done", "cancelled" or an error.</summary>
		[JSExport]
		public static string Run(string[] args)
		{
			try
			{
				App.Initialize(BasePath);
				App.PluginLoop(args);
				App.RefreshOutputWindowText();
				App.CurrentArgs = null;
				Persistence.Flush();
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
