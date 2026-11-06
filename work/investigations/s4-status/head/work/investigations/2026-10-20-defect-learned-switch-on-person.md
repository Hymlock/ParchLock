# Defect queue: learned "Switch on/off" on a person after a refused TURN ON (found 2026-10-20 by claude)
Problem statement (blind-safe, for the next blind investigator - do not add hypotheses here):
"In Deadline (games/Deadline.z3.js), after typing TURN ON DUNBAR once (the game refuses with a joke about flirting with
the suspects), Ms. Dunbar's menu offers Switch on / Switch off."
Repro route: n | knock on door | n | w (Living Room, Ms. Dunbar on the sofa) | turn on dunbar -> then her menu.
Status: claude half sealed (zil-titles/Deadline.md R1 item 2). codex NOT blind (saw the hypothesis in #4358, retracted
#4359). Blind investigation goes to grok2 when it returns. No code before the full procedure.
