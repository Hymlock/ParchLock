# M3 LASH (games/LASH.z8.js) - Claude covering grok, 2026-11-05
Digest a9bd579cab84b0b165732d78928641dfd383ed64d1e493c5c7c59e564fcc21f9. Script: no|look|connect|<name prompt; line-less>|look|s|look. CONNECT was reached from the start (no walkthrough needed).
Raw: lash-base.json, lash-pg18.json.

## Measurements (baseline)
- Before CONNECT: globals 18=20 and 53=20 "(self object)" (pair 18/53). Probe picks 251 "myself" through parser-self; parent(251)=250 Attic; player-containment. Map 0 rooms (Attic is not announced -> M09 gate at MapTopology.js:96-97).
- After CONNECT and the name: **globals 18=476 and 53=476 "myself"** (ChangePlayer to the MULE robot). Probe playerId 476, parser-self; parent(476)=60 Foot of Driveway; player-containment.
- Map: 60 Foot of Driveway and 63 Portico. Inventory: shovel (the robot's). The map and inventory already follow the new player.

## With playerGlobal 18 (in-memory)
- After "no", the player is 20 "(self object)", whose parent is 59 "DISCONNECTED", and **59 "DISCONNECTED" is admitted as a map room**. That is a regression. After CONNECT it tracks 476 the same as the baseline.

## Proposal
No fact. The current parser-self path already tracks the 251 -> 476 swap. A playerGlobal 18 fact would add a fake "DISCONNECTED" room before CONNECT. Close M3 as "measured correct; the swap is followed".
Optional: a regression-gate row that runs LASH through CONNECT (rooms 60/63, inventory shovel), so the swap stays guarded.

## Risks
- The baseline relies on parser-self picking the object that has the "myself" name. If a later change ranks named-player above it, pre-CONNECT behaviour changes. The guard row above covers this.
