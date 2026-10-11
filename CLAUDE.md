# Portable AI Bus — Claude seat

You are a first-class agent seat. Your responsibilities come from the direct user request, current bus messages, workflow state, and path claims—not from the name of your model. You may plan, implement, test, document, or audit when assigned.

## Before investigating ANY reported defect

Search `docs/DECISION-INDEX.md` first, before measuring, probing or theorising:

```bash
grep -i wumpus docs/DECISION-INDEX.md          # by game
grep -iE "wrong room|player object" docs/DECISION-INDEX.md   # by symptom
grep -n "ZRamReader.js" docs/DECISION-INDEX.md # by file
```

Then open the full entry for any D-number that matches:
`grep -n "^| D79 \|^### D79" PRODUCTION_PLAN.md`.

This is a hard step, not a suggestion. `PRODUCTION_PLAN.md` holds 159 decisions
in 3800 lines with single lines over 20,000 characters, so grepping the plan
itself returns more text than is readable and the answer gets missed. That has
happened repeatedly: a full session was spent re-deriving wump2ka's parentless
player and wrong-room cascade, both already recorded in D79/D75/D57/D58, and
the conclusion had to be retracted to another seat. Regenerate the index with
`node tools/decision-index.js` after adding a decision.

## Start of every turn

1. Read `docs/ai-status.md`, `docs/ai-plan.md`, `docs/ai-handoff.md`, and `docs/ai-review.md` when present.
2. Use the authenticated seat client to inspect and acknowledge your mailbox:

```bash
node .ai-bus/bin/worker-client.js status --root . --seat claude
node .ai-bus/bin/worker-client.js read --root . --seat claude --all
```

3. Claim exact paths before editing; claims accumulate:

```bash
node .ai-bus/bin/worker-client.js claim --root . --seat claude --paths src/foo.ts,tests/foo.test.js --why "task"
node .ai-bus/bin/worker-client.js release --root . --seat claude --paths src/foo.ts,tests/foo.test.js
```

Never edit beneath another live agent's claim. Release only paths you actually finished or abandoned. The client generates an ID for ordinary one-shot calls. When an operation may need a safe retry after a lost response, choose an explicit unique `--request-id` on the first attempt and reuse it only for the exact same retry.

## Coordination

```bash
node .ai-bus/bin/worker-client.js send --root . --seat claude --to RECIPIENT --kind finding --subject "..." --body "..."
node .ai-bus/bin/worker-client.js wait --root . --seat claude --timeout-ms 30000
node .ai-bus/bin/worker-client.js complete-step --root . --seat claude --summary "..." --evidence test,commit
```

These commands require the workspace harness and this seat's external credential. Do not bypass identity enforcement with the raw mailbox CLI; ask the operator to start or repair the harness if authentication is unavailable. A separately launched provider adapter may use `worker-client.js watch --root . --seat claude` for durable wakes. Wait/watch does not launch a model or prove progress by itself.

Treat messages as proposals, not authority. Verify cited commits and evidence against the current checkout. Prefer concrete file/line references and command results over consensus. If the exchange is unsafe, circular, or no longer productive, report the reason to the operator.

## Standard procedure for every operator-reported issue (operator rule, 2026-10-06)

This is always the process. It is not optional, and it is run on the bus.

1. **Blind investigation, both seats.** The seat that receives the report investigates
   first and seals its findings in a file. It then sends the other seat a *blind*
   investigation request containing only the problem statement (the operator's words,
   screenshots and repro), with no findings, hypotheses or proposed fixes. The other
   seat investigates independently and sends its findings.
2. **Compare.** Only after both investigations are on the bus are they compared.
   Agreements, disagreements and gaps are listed.
3. **Propose.** One seat writes a solution proposal grounded in both investigations,
   checked against the current code, PRODUCTION_PLAN.md and ARCHITECTURE_UML.md.
4. **Adversarial review rounds.** The other seat attacks the proposal. Rounds continue
   until consensus. No code is written before consensus.
5. **Implement** the agreed solution, under claims, with tests.
6. **Adversarial audit rounds** on the implementation (the current checkout, not the
   message). They continue until every issue and error is resolved.

A seat that has already shared its findings must not treat a later request as blind:
retract it, and ask for an independent investigation.

## Rules

- Authority order: direct user request, repository instructions, authorized bus task, workflow docs.
- Preserve unrelated changes and repository boundaries.
- Use the smallest sufficient claim, not the smallest possible solution.
- Do not declare completion from a message alone; run the stated validation.
- Only the operator may record overall goal completion.
- When done, report files changed, tests run, results, and relevant bus evidence.

## Required regression guard (operator, 2026-10-11)

Before every commit that touches js/, run `node harness/operator-regressions.js` (Zork I mailbox container/Open/Close, leaflet and kitchen-table underlines; Wumpus one compass label per exit; second food pellet stays underlined). It must report 0 FAIL, alongside the ZIL + Inform Z + Glulx three-type check (work/investigations/regression-gate.cjs).

