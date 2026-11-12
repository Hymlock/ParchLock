// ParchLock Eamon host: stand-in for upstream EamonPM.App (Avalonia UI), so upstream's own
// portability adapters (TextWriter, File, Directory, Path, SharpSerializer, TransferProtocol)
// compile and run unchanged. Only the UI-bound parts are replaced. Not upstream code.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Text;
using Eamon.Framework.Portability;
using static Eamon.Game.Plugin.ContextStack;
using static Eamon.Game.Plugin.Globals;

namespace EamonPM
{
	/// <summary>Single-threaded stand-in for the System.Threading.Mutex upstream guards its buffer with.</summary>
	public sealed class HostLock
	{
		public void WaitOne() { }
		public void ReleaseMutex() { }
	}

	public sealed class HostCancelledException : Exception
	{
		public HostCancelledException() : base("Input cancelled by the host.") { }
	}

	public static class App
	{
		public static StringBuilder OutputBuf { get; set; } = new StringBuilder();
		public static HostLock OutputBufMutex { get; set; } = new HostLock();
		public static string ProgramName { get; set; } = "EamonPM.Desktop";
		public static string BasePath { get; set; }
		public static string WorkDir { get; set; }
		public static string[] NextArgs { get; set; }
		/// <summary>The plugin now running; saved with each revision so a restart resumes the same program.</summary>
		public static string[] CurrentArgs { get; set; }
		public static int OutputBufMaxSize { get; set; } = 65536;

		// The screen text as last delivered to the page. Upstream rewrites the buffer tail in place
		// (cursor moves, command backpatching), so deliveries are a diff: keep N characters, then append.
		static string _delivered = "";

		public static void Initialize(string basePath)
		{
			BasePath = basePath;
			PushEngine();
			gEngine.LoadPortabilityClassMappings = LoadPortabilityClassMappings;
			gEngine.ResolvePortabilityClassMappings();
			WorkDir = gEngine.Path.Combine(BasePath, "System", "Bin");
			gEngine.Directory.SetCurrentDirectory(WorkDir);
		}

		public static void LoadPortabilityClassMappings(IDictionary<Type, Type> classMappings)
		{
			Debug.Assert(classMappings != null);
			classMappings[typeof(ITextReader)] = typeof(ParchLock.EamonHost.HostTextReader);
			classMappings[typeof(ITextWriter)] = typeof(Game.Portability.TextWriter);
			classMappings[typeof(IMutex)] = typeof(ParchLock.EamonHost.HostMutex);
			classMappings[typeof(ITransferProtocol)] = typeof(Game.Portability.TransferProtocol);
			classMappings[typeof(IDirectory)] = typeof(Game.Portability.Directory);
			classMappings[typeof(IFile)] = typeof(Game.Portability.File);
			classMappings[typeof(IPath)] = typeof(Game.Portability.Path);
			classMappings[typeof(ISharpSerializer)] = typeof(Game.Portability.SharpSerializer);
			classMappings[typeof(IThread)] = typeof(ParchLock.EamonHost.HostThread);
		}

		public static void EnforceOutputBufMaxSize()
		{
			if (OutputBuf.Length <= OutputBufMaxSize) return;
			var startIndex = OutputBuf.Length - OutputBufMaxSize;
			var text = OutputBuf.ToString();
			var nlIndex = text.IndexOf('\n', startIndex);
			if (nlIndex > startIndex) startIndex = nlIndex + 1;
			OutputBuf.Clear();
			OutputBuf.Append(text.Substring(startIndex));
			// Keep the delivered copy aligned, and tell the page its text positions moved.
			RefreshDelivered(text);
			_delivered = _delivered.Substring(Math.Min(startIndex, _delivered.Length));
			ParchLock.EamonHost.HostBridge.Trim(startIndex);
		}

		public static void RefreshOutputWindowText() => RefreshDelivered(OutputBuf.ToString());

		static void RefreshDelivered(string text)
		{
			if (text == _delivered) return;
			var limit = Math.Min(text.Length, _delivered.Length);
			var keep = 0;
			while (keep < limit && text[keep] == _delivered[keep]) keep++;
			ParchLock.EamonHost.HostBridge.Output(keep, text.Substring(keep));
			_delivered = text;
		}

		public static void ExecutePlugin(string[] args, bool enableStdio = true)
		{
			Debug.Assert(args != null && args.Length > 1 && args[0].Equals("-pfn", StringComparison.OrdinalIgnoreCase));
			var pluginName = gEngine.Path.GetFileNameWithoutExtension(args[1]);
			// Assemblies are part of the bundle, not loose files: resolve by name instead of by path.
			var plugin = AppDomain.CurrentDomain.GetAssemblies().FirstOrDefault(a => a.GetName().Name == pluginName) ?? Assembly.Load(pluginName);
			var type = plugin.GetType(pluginName + ".Program", true);
			var program = (IProgram)Activator.CreateInstance(type);
			program.EnableStdio = enableStdio;
			program.LineWrapUserInput = true;
			program.LoadPortabilityClassMappings = LoadPortabilityClassMappings;
			// The unchanged Main Hall runs with ParchLock's Hall engine class, which adds the Hall of the Long
			// Fire classes after EamonMH's own mappings (HallContent.cs).
			if (program is EamonMH.Program mhProgram) mhProgram.EngineType = typeof(ParchLock.EamonHost.HallEngine);
			program.Main(args.Skip(2).ToArray());
		}

		/// <summary>Upstream PluginLoop without the UI: run plugins until none asks for a successor.</summary>
		public static void PluginLoop(string[] args)
		{
			string previousPlugin = null;
			while (args != null && args.Length >= 2 && args[0].Equals("-pfn", StringComparison.OrdinalIgnoreCase))
			{
				// An adventure entered from the Main Hall starts from its own module files: a new game of that
				// adventure (booting straight back into an adventure after a restart is not).
				var plugin = args[1];
				ParchLock.EamonHost.SaveEvents.FreshEntry = previousPlugin != null
					&& previousPlugin.Equals("EamonMH.dll", StringComparison.OrdinalIgnoreCase)
					&& !plugin.Equals("EamonMH.dll", StringComparison.OrdinalIgnoreCase);
				ParchLock.EamonHost.RunLedger.PendingNew = ParchLock.EamonHost.SaveEvents.FreshEntry;
				previousPlugin = plugin;
				CurrentArgs = args;
				ParchLock.EamonHost.HostBridge.Phase("plugin", string.Join(" ", args));
				ExecutePlugin(args, true);
				ParchLock.EamonHost.SaveEvents.AfterPlugin();
				RefreshOutputWindowText();
				args = NextArgs;
				NextArgs = null;
			}
		}
	}
}
