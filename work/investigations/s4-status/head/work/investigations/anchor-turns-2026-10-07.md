# Sealed Codex investigation

Operator screenshot: Anchorhead newly started, Score2/100, Day1, Progress threshold, Turns622; keyring with house/cellar keys present.

Current promoteTurnCounter accepts any RAM global advancing exactly1 across3 transitions and chooses the lowest index if several qualify. Comment assumes advancing globals represent identical turns. seedInterpreterStatus similarly accepts slot2 small-step behavior for all versions. Already known pins are not revalidated in promoteTurnCounter. This can mistake a clock or counter with an offset for absolute turns.

Real clean startup at360: LOOK globals4/10=2/2; WAIT=3/3; WAIT=4/4; SCORE=0/100 without turns in its reply. Tracker pins turns to4. Fresh startup alone is correct. Need replay real early key acquisition/time initialization or persisted wrong pin to reproduce622. No runtime edits or proposed solution before independent findings. Inspect D153/D152 and current plan/architecture.
