# Clear-contract regression (Eamon Showcase)

Test tooling for the clear contracts in `host/ClearContracts.cs` (plan section 6). Not loaded by the app and never
part of a Showcase package. Run from this folder with `PARCHLOCK_SOURCE_ROOT` set to the repository.

## 1. Self-check of all 20 contracts

    sh run-contracts.sh selfcheck <EamonShowcase.eamon> <out-dir>

For each adventure: a fresh profile, a character, a seeded ledger with every tier open (`seed-all-open.js`), then entry
into the adventure. At its first prompt the host evaluates every clause of its contract with no short-circuit and
checks every uid a clause names against the database the engine loaded, and reports `contract-check <name>|ok` or
`|FAIL: ...` (a tiered adventure without a contract fails). `SELS="15 18"` limits the run to those selections.

## 2. Injected end states (probe build only)

    sh run-contracts.sh inject <EamonShowcase-probe.eamon> <out-dir>

Needs a probe build: the host compiled with `PARCHLOCK_PROBE` (`host/ProbeInject.cs` and its hook in
`HostAdapters.cs` exist only then; a shipped build treats `#probe` as ordinary input). Its digest is added to
`js/EamonPackage.js` TRUSTED for the run only and removed afterwards.

Each entry in `inject-specs.json` cites the author's finish code. The positive run checks the contract is false at the
first prompt, applies the end state that finish code produces (`#probe` ops), runs the real finish (the exit, or the
scripted ending) and expects FinishAdventure, die 0, quest true and a credit. The negative run leaves one condition out
(or uses the plain exit where the success is a scripted ending) and expects no credit. `mkseed.py` opens every tier
except the adventure under test, so its own clear is creditable. Results are "contract proven by injected end state";
only played clears are "proven in play".

## 3. Live routes

`mkdrive.py <plan.json> <selection> <out.js>` builds a page script that plays a route like a careful player (repeats a
move after a dark-room bump, fights visible enemies, saves every few steps, restores after a death). `route.py
<AdventureDir> <from> <to>` (with `EAMON_DATA` = the package data folder) finds a route through plain exits and
door/gates. Plans used for the clears proven in play: `dc-plan.json` (The Deep Canyon), `mm-plan.json` (Escape from
Mt. Moon, with `seed-strong-character-mtmoon.js`).

## 4. Real-input acceptance (plan section 11 item 10)

    node real-input-play.cjs <repo> <EamonShowcase.eamon> <out-dir>

Plays a fresh profile with real input: Playwright pointer clicks on the underlined prompt keys, real typing and
Enter, and one 21 s idle (longer than the input relay's 20 s poll) before answering. It walks character creation,
the Main Hall, the Village, the Good Witch, the adventure selection and an adventure's command line, and logs for
each prompt the underlined keys, menu-line phrases (must be none), the radial's choices and whether any overlay is
shown. Questions Eamon asks only on some rolls (the suicide offer) are answered when they appear. This is the PC
half of item 10; the phone half is real taps on the Android APK.
