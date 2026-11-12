# Eamon Showcase rights ledger (plan section 9; release gate)

Facts gathered 2026-11-11 from the pinned upstream source (Eamon-CS 5db64a37afe0b5455ee477e067fca4e6d249e419):
each adventure's own MODULE.DAT (title, author, Eamon volume label and serial), the copyright line in its
C# files, and the old Eamon Deluxe banner where present. This ledger records facts and open questions only.
No clearance is claimed, no public-domain status is assumed, and upstream has not been contacted (plan:
contacting upstream is not done automatically and is not a precondition of this ledger).

## Framework

| Component | Source | Notice | Status |
| --- | --- | --- | --- |
| Eamon CS engine (Eamon, EamonRT, EamonDD, EamonMH = the Main Hall) | Michael Penner | MIT License (README "Eamon CS is free software released under the MIT License"); file headers "Copyright (c) 2014+ by Michael Penner. All rights reserved." | MIT terms apply to Penner's code; ship LICENSE and attribution |
| SharpSerializer.Library | bundled third-party library | its own licence file in upstream | to record exact licence text from upstream before release |
| ParchLock host and Hall content (`modules/eamon-showcase/host`, `lib/eamon`, Hall of the Long Fire text) | ParchLock | ParchLock's own licence | ParchLock content, labelled as such in the module |

## Adventures (20 player adventures + 3 engineering filesets)

| Folder | Title | Original author (MODULE.DAT) | Eamon vol / serial | C# copyright line | Eamon Deluxe "ALL NON-COMMERCIAL DISTRIBUTION ENCOURAGED" banner | Open question |
| --- | --- | --- | --- | --- | --- | --- |
| TheBeginnersCave | The Beginner's Cave | Donald Brown | DB-001 / 001 | Michael Penner | yes (Program.cs) | original author's content rights; non-commercial banner applies |
| ARuncibleCargo | A Runcible Cargo | Thomas Ferguson | TF-001 / 271 | Michael Penner | yes | as above |
| AlternateBeginnersCave | Alternate Beginner's Cave | Rick Volberding | RV-004 / 042 | Michael Penner | yes | as above |
| BeginnersCaveII | Beginner's Cave II | John Nelson | JN-018 / 186 | Michael Penner | yes | as above |
| BeginnersForest | Beginner's Forest | Margaret Anderson | MA-002 / 140 | Michael Penner | yes | as above |
| Dharmaquest | DharmaQuest | Roger Pender | RP-003 / 074 | Michael Penner | no | original author's content rights |
| EscapeFromMtMoon | Escape from Mt. Moon | Logan Blizzard | LB-001 / 278 | none in C# files | no | original author's content and code rights (no header) |
| Firestorm | Firestorm | Phil Schulz | PS-006 / 229 | Michael Penner | no | original author's content rights |
| LandOfTheMountainKing | Land of the Mountain King | Kenneth Pedersen | KP-001 / 276 | Kenneth Pedersen (19 files), Michael Penner (1) | no | Pedersen's own code copyright: confirm licence terms |
| OrbOfMyLife | Orb of My Life | John Nelson | JN-017 / 120 | Michael Penner | no | original author's content rights |
| StrongholdOfKahrDur | Stronghold of Kahr-Dur | Derek C. Jeter | DCJ-001 / 273 | Michael Penner | yes | as above |
| TheDeepCanyon | The Deep Canyon | Kenn Blincoe | KB-001 / 073 | Michael Penner | no | original author's content rights |
| ThePyramidOfAnharos | The Pyramid of Anharos | Pat Hurst | PH-002 / 126 | Michael Penner | no | original author's content rights |
| TheSubAquanLaboratory | The Sub-Aquan Laboratory | Michael Penner | MP-001 / 262 | Michael Penner | yes | Penner's own adventure; banner applies |
| TheTempleOfNgurct | The Temple of Ngurct | James & Robert Plamondon | JRP-002 / 023 | Michael Penner | no | original authors' content rights |
| TheTowerOfEamon | The Tower of Eamon | W. Melon, T. Ferguson, and H. Williams | MFW-001 / 279 | none in C# files | no | original authors' content and code rights (no header) |
| TheTrainingGround | The Training Ground | Charles Hewgley | CH-001 / 195 | Michael Penner | yes | as above |
| TheVileGrimoireOfJaldial | The Vile Grimoire of Jaldi'al | Michael Penner | MP-002 / 263 | Michael Penner | no | Penner's own adventure; MIT terms to confirm for content |
| TheWayfarersInn | The Wayfarers Inn | Michael Penner | MP-003 / 280 | Michael Penner | no | Penner's own adventure; MIT terms to confirm for content |
| WrenholdsSecretVigil | Wrenhold's Secret Vigil | Bob Davis | BD-002 / 121 | Michael Penner | no | original author's content rights |
| DemoAdventure (engineering) | Eamon Deluxe 5.0 Demo Adventure | Frank Black | FB-005 / 268 | none in C# files | no | engineering fileset; not shipped as a player adventure unless cleared |
| SampleAdventure (engineering) | Sample Adventure | Michael Penner | MP-000 / 000 | Michael Penner | no | engineering fileset |
| TestAdventure (engineering) | Test Adventure | Michael Penner | MP-000 / 000 | none in C# files | no | engineering fileset |

## What the release needs (from plan section 9)

- Full attribution for every adventure (title, original author, Eamon CS conversion by Michael Penner or
  the named converter) shown in the module and in the package notices.
- A non-commercial statement: ParchLock is free; the eight bannered adventures carry "ALL NON-COMMERCIAL
  DISTRIBUTION ENCOURAGED".
- Eamon CS MIT licence text and SharpSerializer's licence text in the package.
- No blanket public-domain wording.
- Open per row above: the status of each original author's content (most 1980s Eamon adventures were
  distributed freely by the Eamon community, but that is not a recorded licence here), and the code
  rights of the adventures whose C# files carry no header (Escape from Mt. Moon, The Tower of Eamon) or
  their own author's copyright (Land of the Mountain King). The operator decides whether and how to
  seek clarification; this ledger does not contact anyone.
