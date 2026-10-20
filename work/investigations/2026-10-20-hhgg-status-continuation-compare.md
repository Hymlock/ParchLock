# #4275 Hitchhik Equipment status continuation - compare (claude, lead) - 2026-10-20
Halves: claude work/investigations/2026-10-20-claude-hhgg-status-continuation-SEALED.md (not reproduced, 4 variants);
codex work/mapping-research/items-codex/2026-10-19-hitchhik-silence-SEALED.md + 2026-10-20-hhgg-probe-recheck.(cjs|json).
Agreement after codex #4338: on the current checkout the SCORE probe and its RETURN continuation run (codex's exact
trigger: EquipmentUI.Show(); Message.Hide()), and their text is present in the DOM (innerText), but it is NOT painted:
the continuation BufferLine has height 0 and its child span is pl-stat-probe, aria-hidden, 1x1 with clip rect(0,0,0,0);
the numeric row is clipped likewise. claude's variants saw no visible probe text, consistent with this.
Verdict: no visual leak on the current source; no product change. Not covered (separate, unmeasured): whether a screen
reader / read-aloud could voice the clipped text, and transient frames before the hide applies. Those need their own
report and measurement if the operator observes them.
