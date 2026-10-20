# SEALED - claude findings: HugeCave knapsack (operator report 2026-10-18)

Not for grok2 until its blind findings are on the bus.

Operator: knapsack had no Open/Close until first used; on opening, the system took the matches out by itself;
inventory did not update. Evidence: operator save (Downloads/Adventure in Humongous Cave - Save - 1 - 2026-10-18 19-42-24-827.json),
replay harness (scratchpad knapsack.cjs / knapring*.cjs) on the current checkout (c24ae52).

1. Missing Open/Close is the Equipment-panel menu, not the story-text menu.
   - Story-text underline (kind "object"): Examine, Take, Open, Close, Search, Empty, Remove from boot.
   - Equipment row (EquipmentUI.js:723/782 -> Actionable.Open(..., "inventory")): Examine, Remove, "Unlock with...", More.
   - Cause: js/ActionSynth.js:257-258: a WORN item in inventory context gets verbs = [examine, remove] only,
     discarding the container verbs (open/close/search/empty) that verbsForAttrs derived. Knapsack 503 attrs: worn,
     clothing, container, openable, open=false (read from the game's declared attribute table).
2. "Unlock with..." offered although attrs.lockable=false and locked=false: wrong action. Source not yet traced
   (More/extra-action path).
3. "Took the matches by itself": the matches inside the worn knapsack get exactly ONE inventory action,
   ActionSynth.js:229-250 (context inventory + containerName): label "take out of knapsack", command "take matches".
   A short tap on the matches (underline or row) submits the first/only action, so a tap reads as an automatic take.
   App issued no unprompted take in replay (TurnRecorder submit log).
4. Inventory did update in replay: after take, panel = wooden matches<20, Knapsack<20. The operator's screenshot also
   shows matches outside a closed knapsack. Possible clarity issue: matches row sits directly under Knapsack row.
5. Transcript lines with no ">" follow hidden app inventory probes (StatTracker), not a different input source.

6. (2026-10-19 trace) "Unlock with..." is not the knapsack-as-lock: it is the D147 instrumental launcher
   (js/Actionable.js:814-818, availableInstrumentals gates only on the verb being in the dictionary). It offers the
   clicked item as the KEY ("unlock <B> with <knapsack>") for any item in any game whose dictionary has "unlock",
   even with no lockable object in scope. Candidate gate (T3): offer only when some in-scope object has lockable
   (declared/proven) - a structural+semantic consumer rule, not a removal.
