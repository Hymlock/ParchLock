// ParchLock Eamon host: the adapters that replace upstream's Avalonia-bound ones.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices.JavaScript;
using System.Text;
using Eamon;
using Eamon.Framework.Portability;
using EamonPM;
using static Eamon.Game.Plugin.Globals;

namespace ParchLock.EamonHost
{
	public static partial class HostBridge
	{
		[JSImport("output", "eamon-host")] internal static partial void Output(int keep, string text);
		[JSImport("trim", "eamon-host")] internal static partial void Trim(int dropped);
		[JSImport("phase", "eamon-host")] internal static partial void Phase(string kind, string detail);
		/// <summary>Blocks until the page answers. Returns null when the host cancels.</summary>
		[JSImport("read", "eamon-host")] internal static partial string Read(string kind, int size, string fill, string mask, string defaultText, bool safePoint);
		/// <summary>What the player can perceive now, as JSON; empty when the engine is not at an adventure's own prompt.</summary>
		[JSImport("world", "eamon-host")] internal static partial void World(string json);
		[JSImport("sleep", "eamon-host")] internal static partial void Sleep(int milliseconds);
		[JSImport("stage", "eamon-host")] internal static partial void Stage(string path, byte[] bytes);
		[JSImport("unstage", "eamon-host")] internal static partial void Unstage(string path);
		/// <summary>Everything staged since the last commit becomes one atomic durable revision.</summary>
		[JSImport("commit", "eamon-host")] internal static partial void Commit(string launch);
	}

	public class HostMutex : IMutex
	{
		// One engine per worker and one worker per tab; cross-tab exclusion is the page's job.
		public virtual void CreateAndWaitOne() { }
	}

	public class HostThread : IThread
	{
		public virtual void Sleep(long milliseconds)
		{
			App.RefreshOutputWindowText();
			HostBridge.Sleep((int)Math.Max(0, Math.Min(milliseconds, 5000)));
		}
	}

	/// <summary>
	/// Upstream TextReader with the Avalonia view replaced by one blocking host request. The engine's
	/// own character callbacks are applied here, in order, to whatever the player submitted, so prompts
	/// keep their validation, transforms and terminators.
	/// </summary>
	public class HostTextReader : ITextReader
	{
		public virtual bool EnableInput { get; set; }
		public virtual StringBuilder Buf01 { get; set; }
		public virtual bool ReadLineMode { get; set; }

		public virtual RetCode ReadField(StringBuilder buf, long bufSize, char[] boxChars, char fillChar, char maskChar, bool emptyAllowed, string emptyVal, Func<char, char> modifyCharFunc, Func<char, bool> validCharFunc, Func<char, bool> termCharFunc)
		{
			Debug.Assert(gEngine != null);
			if (buf == null || bufSize < 1 || (boxChars != null && (boxChars[0] == '\0' || boxChars[1] == '\0')) || (emptyVal != null && emptyVal[0] == '\0'))
				return RetCode.InvalidArg;
			if (!EnableInput) { buf.Clear(); return RetCode.Success; }

			App.RefreshOutputWindowText();
			// Only a top-level wait is a safe point (plan section 5). A nested prompt (a parser question,
			// a shop or registration step, a yes/no inside an action) is mid-transaction and saves nothing.
			var ask = AskContext.Current();
			var safePoint = IsSafePoint(ask);
			if (safePoint)
			{
				if (gEngine is EamonMH.Framework.Plugin.IEngine) HallCheckpoint.SaveModified();
				Persistence.Flush();
			}
			// ParchLock's map, exits and object lists follow the game only at an adventure's own prompt.
			// Anywhere else (the Main Hall, a nested question) there is no world to offer actions on.
			// In the Main Hall engine, the Hall's own rooms (HallSnapshot.cs), at every prompt, so a place's
			// nested prompts show that place.
			string world = null;
			if (gEngine is EamonMH.Framework.Plugin.IEngine)
			{
				try { world = HallSnapshot.Build(ask); } catch (Exception) { world = null; }
			}
			else if (safePoint)
			{
				try { world = WorldSnapshot.Build(); } catch (Exception) { world = null; }
			}
			// A Hall menu is answered with a line, so ParchLock's normal command path (radial, map, fast
			// travel, history, transcript) can drive it; the engine still gets one valid menu key.
			var hallMenu = ask.IsHallMenu;
			HostBridge.World(world ?? "");
			var text = App.OutputBuf.ToString();
			var lastIndex = text.LastIndexOf(Environment.NewLine, StringComparison.Ordinal);
			var startColumn = lastIndex > -1 ? text.Length - (lastIndex + 1) : (long)text.Length;
			var defaultText = buf.ToString();
			// A terminator that accepts every character means "any single key".
			var anyKey = termCharFunc != null && termCharFunc('a') && termCharFunc(' ') && termCharFunc('\n');

			while (true)
			{
				var reply = HostBridge.Read(anyKey ? "key" : (ReadLineMode || hallMenu ? "line" : "field"), (int)Math.Min(bufSize, int.MaxValue),
					fillChar == '\0' ? "" : fillChar.ToString(), maskChar == '\0' ? "" : maskChar.ToString(), defaultText, safePoint);
				if (reply == null) throw new HostCancelledException();
				if (hallMenu)
				{
					// Never let an unrecognised line become the default "X" (leave the universe): ask again.
					reply = HallSnapshot.Translate(ask, reply, validCharFunc);
					if (reply == null) continue;
				}

				buf.Clear();
				foreach (var typed in reply)
				{
					if (buf.Length >= bufSize) break;
					var ch = modifyCharFunc != null ? modifyCharFunc(typed) : typed;
					if (ch != '\0' && (validCharFunc == null || validCharFunc(ch))) buf.Append(ch);
					if (termCharFunc != null && termCharFunc(typed)) break;
				}
				if (buf.Length == 0 && !string.IsNullOrEmpty(emptyVal)) buf.Append(emptyVal);
				if (buf.Length > 0 || (emptyAllowed && string.IsNullOrEmpty(emptyVal)) || anyKey) break;
			}

			if (gEngine.EnableScreenReaderMode) { App.OutputBuf.Clear(); startColumn = 0L; }
			gEngine.LineWrap(buf.ToString(), Buf01, startColumn);
			if (gEngine.Out != null) gEngine.Out.WriteLine("{0}", Buf01);
			else if (gEngine.Error != null) gEngine.Error.WriteLine("{0}", Buf01);
			return RetCode.Success;
		}

		/// <summary>
		/// True when the engine is waiting at the top level: the adventure's own command prompt
		/// (GetPlayerInputState) or a menu waiting for a choice (Menu.Execute). Decided from who is
		/// asking, not from what the prompt says.
		/// </summary>
		static bool IsSafePoint(AskContext ask)
		{
			// Unknown context is never a safe point.
			if (ask?.Asker == null) return false;
			// An adventure's own command prompt.
			if (ask.Asker.EndsWith(".GetPlayerInputState", StringComparison.Ordinal)) return true;
			// A hierarchical Main Hall menu waiting for a choice: the Hall, the Village or the Practice Area,
			// now rooms the player lingers in (plan section 5; Grok #3379). Places and nested prompts are not.
			return ask.IsHallMenu;
		}

		public virtual RetCode ReadField(StringBuilder buf, long bufSize, char[] boxChars, string emptyVal, Func<char, bool> validCharFunc)
			=> ReadField(buf, bufSize, boxChars, ' ', '\0', true, emptyVal, null, validCharFunc, null);

		public virtual RetCode ReadField(StringBuilder buf, long bufSize, char[] boxChars, string emptyVal)
			=> ReadField(buf, bufSize, boxChars, ' ', '\0', true, emptyVal, null, null, null);

		public virtual string ReadLine()
		{
			if (!EnableInput) return string.Empty;
			var bufSize = gEngine.WindowWidth * 2;
			var buf = new StringBuilder((int)bufSize);
			ReadLineMode = true;
			gEngine.Out.WordWrap = false;
			var suppressNewLines = gEngine.Out.SuppressNewLines;
			gEngine.Out.SuppressNewLines = false;
			RetCode rc;
			try { rc = ReadField(buf, bufSize, null, ' ', '\0', true, null, null, null, null); }
			finally { gEngine.Out.WordWrap = true; gEngine.Out.SuppressNewLines = suppressNewLines; ReadLineMode = false; }
			Debug.Assert(gEngine.IsSuccess(rc));
			return buf.ToString();
		}

		public virtual char ReadKey(bool intercept)
		{
			if (!EnableInput) return '\0';
			var buf = new StringBuilder((int)gEngine.BufSize);
			ReadField(buf, gEngine.BufSize02, null, ' ', '\0', true, null, intercept ? gEngine.ModifyCharToNull : null, null, gEngine.IsCharAny);
			return buf.Length > 0 ? buf[0] : '\0';
		}

		public virtual void KeyPress(StringBuilder buf, bool prependNewLine = true)
		{
			Debug.Assert(gEngine != null && buf != null);
			if (!EnableInput) return;
			gEngine.Out.WriteLine("{0}{1}", prependNewLine ? Environment.NewLine : "", gEngine.LineSep);
			gEngine.Out.Write("{0}Press any key to continue: ", Environment.NewLine);
			buf.Clear();
			var rc = ReadField(buf, gEngine.BufSize02, null, ' ', '\0', true, null, gEngine.ModifyCharToNull, null, gEngine.IsCharAny);
			Debug.Assert(gEngine.IsSuccess(rc));
		}

		public HostTextReader()
		{
			EnableInput = true;
			Buf01 = new StringBuilder((int)gEngine.BufSize);
		}
	}
}
