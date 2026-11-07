# B7 phone timing evidence (claude, 2026-11-07, Build 83, NX799J Android 16, WebView over CDP)
Script: scratchpad phoneperf2/3 (connectOverCDP to webview_devtools_remote; wraps functions in-page, no code change).
Zork I (Zork1-TheGreatUndergroundEmpire.z3):
- one WorldModel.tick = ~16 ms idle (first 30 ms).
- per command (look/i/look/n/s): 854 / 1013 / 911 / 924 / 857 ms of long tasks on the main thread.
- breakdown of ONE "look": 28 x WorldModel.tick = 961 ms, of which ZRamReader.snapshot 932 ms (28 calls, ~33 ms each);
  Actionable.Refresh 9 calls = 737 ms (nested ticks: Actionable.js:2291/2298); map/equipment/HUD render <= 7 ms total.
  Long tasks: 149,69,116,92,119,110,121,117,108,72 ms (ten separate stalls, each a visible hitch at 144 Hz).
Conclusion: the cost is redundant world-model ticks (28 per command), each re-walking RAM; desktop hid it (~0.1 s), phone shows ~1 s.
Direction for proposal: collapse ticks that see no VM progress. Needs a VM-progress barrier (the r3 REJECT point: probes and /goto run the VM
between ticks) - e.g. a counter bumped on every VM resume/step return in ZvmCapture/ZRamProvider, plus UndoRestoreSync.generation; tick returns
lastPayload when both are unchanged. Tick call sites: Actionable 2291/2298, EquipmentUI 1159, ParchLock 49/160/462, TranslatorUI 302, UndoRestoreSync 62/86.
