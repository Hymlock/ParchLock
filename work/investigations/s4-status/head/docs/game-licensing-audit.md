# Game licensing audit (2026-10-05)

Decision record behind `GAMES_INCLUDED.md`. Not legal advice; a qualified reviewer should confirm before release.

## Method

1. Each story file's IFID was computed from its bytes (Z-code release/serial/checksum, Inform 7 UUID, or Blorb metadata) and looked up on IFDB, which matched 308 of 309 exactly.
2. Text inside every Z-code story file was decoded and searched for copyright, licence and distribution statements; Glulx games were checked through their in-game ABOUT/LICENSE pages and official sources.
3. IFDB's "Freeware" label alone was not treated as permission: the IF Archive's terms say material with no attached licence is personal-use only.
4. ParchLock is distributed free of charge with no ads or purchases (operator, 2026-10-05), so non-commercial licences and "no profit" terms are satisfied.

## Summary

| Decision | Count | Meaning |
|---|---|---|
| KEEP | 80 | Explicit permission found (open licence or the author's own terms allow free, unmodified redistribution). Included. |
| NO GRANT | 189 | No licence or permission found. Under the IF Archive terms (https://ifarchive.org/misc/license.html), material with no attached licence is presumed licensed for personal use only. Remove, or keep only after obtaining the author's permission. |
| EXCLUDE | 36 | Commercial rights holder or terms that forbid this kind of redistribution. Remove. |
| REVIEW | 4 | Permission found or implied but the game reuses third-party copyrighted material. Remove unless you accept that risk. |

**Release note:** this repository is distributed through Git. Removing a game in a new commit does not remove it from earlier commits, so a public repository must be created without the non-included games anywhere in its history.

## EXCLUDE

| Game | Author | File | IFDB licence | Reason / basis |
|---|---|---|---|---|
| Ad Verbum | Nick Montfort | `adverbum.z5.js` | Freeware | Terms allow distribution only via the IF Archive, its mirrors, the author's site and sites with written permission. |
| Adventureland | Scott Adams | `Adventureland.z5.js` | Former commercial | Scott Adams commercial title; no grant found. |
| Anchorhead | Michael S. Gentry | `anchor.z8.js` | Commercial | Now sold commercially (IFDB: Commercial); the 1998 file calls itself freeware but gives no distribution grant. Needs author confirmation. |
| Ballyhoo | Infocom | `Ballyhoo.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Border Zone | Infocom | `Borderzo.z5.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Cutthroats | Infocom | `Cutthroats.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Deadline | Infocom | `Deadline.z3.js` | Former commercial | IFDB records this as Former commercial (rights held by Activision (Infocom)). |
| Dr. Dumont's Wild P.A.R.T.I. | Muffy and Michael Berlyn | `dumont.z5.js` | Former commercial | Commercial title (Cascade Mountain Publishing), "All rights reserved". |
| Enchanter | Infocom | `Enchanter.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Hollywood Hijinx | Infocom | `HollywoodHijinx.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Infidel | Infocom | `Infidel.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Leather Goddesses of Phobos | Infocom | `LeatherGoddessesofPhobos.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Moonmist | Infocom | `Moonmist.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Only After Dark | Gunther Schmidl | `oad.z5.js` | Freeware | Terms forbid redistribution on electronic media without written permission. |
| PataNoir | Simon Christiansen | `PataNoir.gblorb.js` | Commercial | IFDB records this release as Commercial. |
| Planetfall | Infocom | `Planetfall.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Plundered Hearts | Infocom | `PlunderedHearts.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Seastalker | Infocom | `Seastalker.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Shadowgate | David Griffith | `sgate.z5.js` | Former commercial | Unauthorised adaptation of the commercial game Shadowgate. |
| Sherlock | Infocom | `Sherlock.z5.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Sorcerer | Infocom | `Sorcerer.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Spellbreaker | Infocom | `Spellbreaker.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Starcross | Infocom | `Starcross.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Stationfall | Infocom | `Stationfall.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Suspect | Infocom | `Suspect.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Suspended | Infocom | `Suspended.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| The Hitchhiker's Guide to the Galaxy | Infocom | `Hitchhik.z5.js` | Commercial (Out of Print) | IFDB records this as Commercial (Out of Print) (rights held by Activision (Infocom)). |
| The Lurking Horror | Infocom | `TheLurkingHorror.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| The Orion Agenda | Ryan Weisenberger | `orion.z5.js` | Freeware | Beta release; it states only invited beta-testers are licensed to play it. |
| The Witness | Infocom | `TheWitness.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Wishbringer | Infocom | `Wishbringer.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| ZDungeon | Ethan Dicks | `zdungeon.z5.js` | Freeware | Port of MIT Dungeon, "All rights reserved"; no grant found. |
| Zork 1 | Infocom | `Zork1-TheGreatUndergroundEmpire.z3.js` | Former commercial | IFDB records this as Former commercial (rights held by Activision (Infocom)). |
| Zork 2 | Infocom | `Zork2-TheWizardofFrobozz.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Zork 3 | Infocom | `Zork3-TheDungeonMaster.z3.js` | Commercial | IFDB records this as Commercial (rights held by Activision (Infocom)). |
| Zork: The Cavern of Doom | Infocom | `cavern.z5.js` | Former commercial | IFDB: former commercial; no grant found. |

## REVIEW

| Game | Author | File | IFDB licence | Reason / basis |
|---|---|---|---|---|
| Being Andrew Plotkin | J. Robinson Wheeler | `BeingAndrewPlotkin.zblorb.js` | Freeware | Licence is limited "for this CD image as part of a non-commercial IF games collection" (may be copied and distributed with credit); also uses Activision/Infocom material under permission. Confirm the licence extends to ParchLock. |
| Perilous Magic | David Fillmore | `permagic.z5.js` | Freeware | Built from Infocom's Enchanter manual; the author says no permission was sought from Activision. |
| The Bastard Operator from Hell | Howard A. Sherman | `bofh.z5.js` | Freeware | "All Rights Reserved"; uses BOFH material under the author's own permission; no redistribution grant found. |
| The Incredible Erotic Adventures of Stiffy Makane | Mark Ryan | `stiffmst.z5.js` | Freeware | Uses Mystery Science Theater 3000 characters "without permission for satirical purposes". |

## NO GRANT

| Game | Author | File | IFDB licence | Reason / basis |
|---|---|---|---|---|
| 9:05 | Adam Cadre | `905.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| A Bear's Night Out | David Dyte | `bear.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| A Change in the Weather | Andrew Plotkin | `weather.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| A Day for Fresh Sushi | Emily Short | `Sushi.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| A Dream Too Real | Raditz | `DreamTooReal.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| A Fable | Stan Heller and Stuart Moore | `fable.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| A Little Like Rogue | Guy Hungerford | `LLR3.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| A New Day | Jonathan Fry | `newday.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Adventure aka Colossal Cave | Will Crowther and Don Woods | `Advent.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Alice Through the Looking Glass | Gareth Rees | `alice3.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| All Roads | Jon Ingold | `AllRoads.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Amishville, a plain adventure | Jacob Amman | `amish.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Amissville | A.P. Hill | `amiss.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| An Abbreviated Night Before Christmas | Adam Thornton | `NightBeforeChristmas.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| An Escape To Remember | The IF Whispers Team | `escape.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Annoyotron | Ben Parrish | `annoy.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Apartment F209 | Ben Parrish | `f209.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Appallatron: Annoyotron 3 | Sean Barrett | `appall.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Are You A Chef? | Adam Biltcliffe | `ayac.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Attack of the Terror Tabby! | Eric Mayer | `terror_tabby.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Attack of the Yeti Robot Zombies | Oyvind Thorsby | `AOTYRZ.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Balances | Graham Nelson | `Balances.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Bedlam | Michael Zey | `bedlam.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Being Steve | Anonymous | `BeingSteve.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Beneath | Graham Lowther | `beneath.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Biscuit | Petar Kanuritch | `Biscuit.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Blow Job Drifter | Big Al | `bj.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Bronze | Emily Short | `Bronze.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| BSE | Chris Smith | `bse.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Burglar! | Doug Roberts | `burglar.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Candy | Rybread Celsius | `candy.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Cat's Eye | Dave Bernazzani | `catseye.z3.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Catcher in the Rye | Frank Teng | `CatcherInTheRye.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Causality | Hugo Martay | `causality.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Cheater | Martin Wesley Osam | `cheater.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Cheeseshop | David Welbourn | `cheeseshop.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Chicks Dig Jerks | Robb Sherwin | `chix.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| CIA Adventure | Hugh Lampert | `cia.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Conan Kill Everything | Ian Haberkorn | `ConanKillEverything.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| CosmoServe | Judith Pintar | `CosmoServe.gblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Countdown to Doom | Peter D. Killworth | `CtDoom.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Cragne Manor | Various authors | `CragneManor.gblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Curses | Graham Nelson | `curses.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Damnatio Memoriae | Emily Short | `Damnatio-Memoriae.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Dangerous Curves | Irene Callaci | `curves.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Dead Reckoning | Andrés Viedma Peláez | `deadreck.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Debate | Louis Joyce | `Debate.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Deephome, a Telleen Adventure | Joshua Wise | `deephome.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Deja Vu | Graham Nelson | `dejavu.z3.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Detective | Matt Barringer and Stuart Moore | `detective.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Dutch Dapper IV | Harry Hol | `DDIV.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Eric The Power-Mad Dungeon Master | Mark Arenz | `eric_dm.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Escape from the Starship Zenon | Andrew Gawthorpe | `zenon.z5.js` | Shareware | IFDB: Shareware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| ETO | Ian Waddell | `eto.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Final Selection | Sam Gordon | `selection.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Fine-Tuned | Dionysius Porcupine | `FineTune.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| For a Change | Dan Schmidt | `change.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Fox, Fowl and Feed | Chris Conroy | `FFF.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Fractured Metamorphoses | Emily Short | `fracture.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Frozen | Jeremy Farnham | `frozen.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Galatea | Emily Short | `Galatea.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Gamlet | Tomasz Pudlo | `gamlet.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Get Magazine. Open Magazine. Read Article. | Simon Scott | `wireless.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Glass | Emily Short | `Glass.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Goose, Egg, Badger | Brian Rapp | `geb.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Gourmet | Aaron Reed | `gourmet.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Grooverland | Mathbrush | `Grooverland.gblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Guss's Death | Kyle Frownfelter | `gussdeath.z3.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| House of Dream of Moon | The IF Whispers Team | `HouseOfDreamOfMoon.z8.js` | Free | IFDB: Free. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Housekey | Ariën Holthuizen | `housekey1.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Hunter, in Darkness | \"Dave Ahl Jr.\" (Andrew Plotkin) | `huntdark.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| I-0 | Adam Cadre | `I-0.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Identity | Dave Bernazzani | `identity.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Inhumane | Andrew Plotkin | `inhumane.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Inside the Facility | Arthur DiBianca | `Facility.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Insight | Jon Ingold | `insight.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| It's a Dog's Life | Mr. WiggleButt | `dogslife.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Jigsaw | Graham Nelson | `Jigsaw.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Kook U | sbfaq@genesis.nred.ma.us | `kooku.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Lack of Vision | Rybread Celsius | `vision.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Large Machine | Gringo G. Scumm | `largemac.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Last Days of Doom | Peter D. Killworth | `LDoDoom.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Limp | Rybread Celsius | `limp.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Lost Pig | Admiral Jota | `LostPig.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Make it Good | Jon Ingold | `MakeItGood.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Medusa | Jim Fisher | `medusa.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Mercy | Christopher Klimas | `Mercy.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Metamorphoses | Emily Short | `metamorp.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Möbius | J.D. Clemens | `Mobius.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Mother Loose | Irene Callaci | `loose.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Muse | Christopher Huang | `muse.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| My Magic Tire Hoax | nd | `tirehoax.zblorb.js` | Free | IFDB: Free. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| NEW |  | `moonglow.z3.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Night at the Computer Center | Bonni Mierzejewska | `night.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Nine Points | Robert Janelle and Brad O'Donnell | `ninepts.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| No Room | Ben Heaton | `noroom.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Not Just A Game | John Menichelli | `njag2.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Not Just an Ordinary Ballerina | Jim Aikin | `ballerina102.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Not Made With Hands | Emily Short | `Peacock.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Of Forms Unknown | Chris Markwyn | `forms.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Orevore Courier | Brian Rapp | `orevore.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Paper Chase | Chris Skapura | `paperchase.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Parallel | David Hughes | `parallel.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Pentari | Howard Sherman | `pentari.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Perry's World | Jim Wilbur | `PerrysWorld.zblorb.js` | - | IFDB: no licence recorded. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Phlegm | Adjacent Drooler | `phlegm.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Photograph | Steve Evans | `Photograph.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Photopia | Adam Cadre | `photopia.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Pick Up the Phone Booth and Aisle | Various | `PUTPBAA.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Pick up the Phone Booth and Die | R. Noyes | `booth.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Pick up the Phone Booth and Die, Part 2 | R. Noyes | `b2demo.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Piece of Mind | Giles Boutel | `piece_v3.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Praser 5 | Andrew Plotkin | `praser5.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Quest for the Magic Healing Plant | Adam Crutchlow | `mhpquest.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Rachel has a bad day | Sly Old Dog | `RBD.z8.js` | - | IFDB: no licence recorded. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Return to Doom | Peter D. Killworth | `RtDoom.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Return to Karn | Patrick Wigfull | `karn.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Revenger | Robb Sherwin | `mary.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Reverberations | Russell Glasser | `reverb.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Robin & Orchid | Ryan Veeder & Emily Boegheim | `RobinAndOrchid.gblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Rock'Em Sock'Em Robots | Benjamin Mullins | `reser.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Samhain | Eddie Mueller | `samhain.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Scroll Thief | Daniel M. Stelzer | `ScrollThief.gblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Shade | \"Ampe R. Sand\" (Andrew Plotkin) | `shade.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Shadow of Memories | Bethany Horbury | `ShadowOfMemories.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Shadow Soldiers | Arvind Pillai | `ShadowSoldiers.zblorb.js` | - | IFDB: no licence recorded. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Silence of the Lambs | Gunther Schmidl, original author unknown | `lambs.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Silence of the Lambs 2 | The Thief of Bad Gags | `lambs2.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Sins Against Mimesis | Adam Thornton | `mimesis.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Slacker X | The Velvet Jester, Smoke Dog and Wormy Jurmy | `Slackerx.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Solitary | Kahlan | `solitary.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Somewhere | Kazuki Mishima | `Somewhere.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Space Station | David Ledgard and the Online Inform Community | `spacest2.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| SpAdventure | Jay Walton | `SpAdventure.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Spodgeville Murphy and The Jewelled Eye of Wossname | David Fillmore | `wossname.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Sporkery 1 | David Hughes | `sporkery1.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Sycamora Tree | David Dyte | `sycamora.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Tales From The College Presents A Breath Of Fresh Blair | Jesse Burneko | `blair.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Teacher Feature | Paul Equinox Collins | `teacher.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Acorn Court | Todd S. Murchison | `acorncourt.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Bible Retold: The Bread and the Fishes | Celestianpower and Justin Morgan | `BibleRetold.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Care and Feeding of Adjuncts | Eric Remy | `faculty.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Citizen of the Year | KG | `TCOTY.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Corn Identity | The IF Whispers Team | `whispers.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Cove | Kathleen M. Fischer | `Cove.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Devil Made Me Do It | David A. Cornelson | `devdoit.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Dreamhold | Andrew Plotkin | `dreamhold.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Enterprise Incidents | Brendan Desilets | `enter.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Farmer's Daughter | R.W. Fisher, D.W.J. Sarhan and the Despoiler | `farm.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Great | Peter Blanston | `thegreat.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Great Xavio | Reese Warner | `GreatXavio.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Hunt For Relief | Christian Gaertner | `Relief.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Land of the Cyclops | Francesco Cordella | `Cyclops.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Ludicorp Mystery | Cal Henderson | `ludicorp.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Meteor, the Stone and a Long Glass of Sherbet | Angela M. Horns | `sherbet.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Mind Electric | Jason Dyer | `mindelec.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Mulldoon Legacy | Jon Ingold | `Mulldoon.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Mulldoon Murders | Jon Ingold | `Mullmurd.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Musician | Phillip Skains | `musician.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Night of the Vampire Bunnies | Jason Dyer | `bunny.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Primrose Path | Nolan Bonvouloir | `Primrose.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Reliques of Tolti-Aph | Graham Nelson | `RoTA.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Spot | Kid Vicious | `spot.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Thorn | Eric Mayer | `thorn.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Underoos That Ate New York! | Kevin Wilson | `under.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Visitor | Peter Polkinghorne | `visitor.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The WadeWars Book III: Askin | Jim Fisher | `wadewar3.z5.js` | Shareware | IFDB: Shareware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| The Warbler's Nest | Jason McIntosh | `TheWarblersNest.zblorb.js` | Freeware | The only licence text found covers the cover-art photograph (CC BY-SA 2.5), not the game. |
| The X-Child | Jesse Burneko | `kirby.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Time | Andy Phillips | `tatctae.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Time Killer #1 | Sam Hulick | `tk1.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Total Paddling Mania | Dr. Aloysius Beltway, Ph.D | `pad.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Treasures of a Slaver's Kingdom | Dr. Saul Leeman, with Henry and Dinah Riley | `TreasuresofaSlaversKingdom.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Tryst of Fate | Gregory M. Zagurski | `tryst205.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Uh-Oh! DEMO VERSION | Scott Covert | `uhoh-demo.z5.js` | Demo | IFDB: Demo. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Varicella | Adam Cadre | `vgame.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Vespers | Jason Devlin | `vespers.z8.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Vicious Cycles | Mark Simon | `cycles.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Vindaloo | Adam G Crutchlow | `vindaloo.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Warp! | Richard Kelly | `warp.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Wearing the Claw | Paul O'Brian | `claw.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Weirdness | Gregory Janson | `weirdness.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| When in Rome 1 | Emily Short | `WiR1.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| When in Rome 2 | Emily Short | `WiR2.zblorb.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| William Tell | Kid Vicious | `tell.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Within a Wreath of Dewdrops | Alphonse de l'Entaille | `dewdrops.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Wumpus 2000, The Virulent Labyrinth Of Yob-Shuggoth | Muffy St. Bernard | `wump2ka.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Zork: A Troll's Eye View | Dylan O'Donnell | `troll.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |
| Zork: The Undiscovered Underground | Infocom | `ztuu.z5.js` | Freeware | IFDB: Freeware. No licence or distribution permission found in the story file. Under the IF Archive terms, material without a licence is personal-use only. |

## KEEP

| Game | Author | File | IFDB licence | Reason / basis |
|---|---|---|---|---|
| Accuse | David A. Wheeler | `Accuse.zblorb.js` | Freeware | GPL-2.0-or-later |
| Adventure in Humongous Cave | David Malmberg and Al Golden | `HugeCave.z8.js` | Public Domain | Public domain (IFDB) |
| Alabaster | John Cater, Daniel Allington-Krzysztofiak, and collaborators | `Alabaster.gblorb.js` | Freeware | CC BY-NC-ND 3.0 US |
| All Quiet on the Library Front | Michael S. Phillips | `library.z5.js` | Freeware | Author permission (freeware terms) |
| All Things Devours | half sick of shadows | `devours.z5.js` | Public Domain | Public domain |
| Andromeda Apocalypse | Marco Innocenti | `AndromedaApocalypse.gblorb.js` | Creative Commons | CC BY-NC-SA 3.0 |
| Augmented Fourth | Brian Uri | `Aug4.z8.js` | Freeware | Author permission (freeware terms) |
| Beyond The Tesseract | David Lo | `tess.z5.js` | Freeware | Author permission (freeware terms) |
| Blue Chairs | Chris Klimas | `bluechairs.z5.js` | Creative Commons | CC BY-NC-ND 1.0 |
| Blue Lacuna | Aaron A. Reed | `BlueLacuna.gblorb.js` | Creative Commons (BY-NC-SA 3.0) | CC BY-NC-SA 3.0 |
| Book and Volume | Nick Montfort | `bookvol.z5.js` | CC BY-NC-SA 2.5 | CC BY-NC-SA 2.5 |
| Break-In | Jon Ingold | `break-in.z5.js` | Freeware | Author permission (freeware terms) |
| Building | Intaligo Productions | `building.z5.js` | Freeware | Author licence |
| Chico and I Ran | J.D. Berry | `chico.z5.js` | Freeware | Freeware (author-declared) |
| Child's Play | Stephen Granade | `ChildsPlay.zblorb.js` | Freeware | Author permission (freeware terms) |
| Christminster | Gareth Rees | `minster.z5.js` | Freeware | Author licence |
| Counterfeit Monkey | Emily Short | `CounterfeitMonkey.gblorb.js` | Creative Commons | CC BY-SA 4.0 |
| Crystal and Stone Beetle and Bone | Jenny Eriksson | `csbb.z8.js` | free | Author permission (freeware terms) |
| De Baron | Victor Gijsbers | `baron_EN.z8.js` | GPL | GPL |
| Death to my Enemies | Jonathan Blask | `death.z5.js` | Freeware | Standard IF licence |
| Degeneracy | Leonard Richardson | `degen.z5.js` | Freeware | Author permission (freeware terms) |
| Delightful Wallpaper | Andrew Plotkin | `Wallpaper.zblorb.js` | Freeware | Author permission (freeware terms) |
| Delusions | Christopher E. Forman | `Delusns.z5.js` | Freeware | Author permission (freeware terms) |
| Downtown Tokyo. Present Day. | Digby McWiggle | `Tokyo2.z5.js` | Freeware | Author permission (freeware terms) |
| Enemies | Andy Phillips | `Enemies.z8.js` | Freeware | Author permission (freeware terms) |
| Figaro | Victor Gijsbers | `Figaro.zblorb.js` | GPL | GPL-3.0 |
| Fork | Chris Federico | `Fork.z5.js` | Freeware | Author permission (freeware terms) |
| Gardening for Beginners | Juhana Leinonen | `gardening.zblorb.js` | Open Source | BSD-style open source |
| Guess The Verb! | Leonard Richardson | `guess.z5.js` | Freeware | Author permission (freeware terms) |
| Gumshoe | Mike Oliphant | `Gumshoe.z5.js` | Freeware | Author permission (freeware terms) |
| Heist | Andy Phillips | `heist.z8.js` | Freeware | Author permission (freeware terms) |
| Heroine's Mantle | Andy Phillips | `Heroine.z8.js` | Freeware | Author permission (freeware terms) |
| Hoist Sail for the Heliopause and Home | Andrew Plotkin | `Heliopause.zblorb.js` | Freeware | Author permission (freeware terms) |
| House of the Midnight Sun | Paul Johnson | `vampire.z8.js` | Freeware | Standard IF licence |
| Inevitable | T. L. Heinrich (a.k.a. Kathleen M. Fischer) | `Inevita.z5.js` | Freeware | Author permission (freeware terms) |
| Inform School | William J. Shlaer | `School.z5.js` | Freeware | Author permission (freeware terms) |
| Informatory | William J. Shlaer | `Informat.z5.js` | Freeware | Author permission (freeware terms) |
| Jet-Blue | Paul Johnson | `jet.z8.js` | Freeware | Standard IF licence |
| Kingdom of Amphibia | DG Ware | `KoA.z5.js` | Freeware | CC BY-NC-ND 1.0 |
| LASH -- Local Asynchronous Satellite Hookup | Paul O'Brian | `LASH.z8.js` | Freeware | Author permission (freeware terms) |
| Lists and Lists | Andrew Plotkin | `lists.z5.js` | Freeware | Author permission (freeware terms) |
| Looking For Godot | Patrick Shaughnessy | `godot.z5.js` | Freeware | Public domain |
| Masquerade | Kathleen M. Fischer | `Mask.z5.js` | Freeware | Author permission (freeware terms) |
| OMNIQuest | Chris Barden and Chris Ethridge | `omniquest.z5.js` | Freeware | Author permission (freeware terms) |
| Pick up the Phone Booth and Dye | Eric Schmidt | `boothdye.z5.js` | Freeware | Public domain |
| Punk Points | Jim Munroe | `punkpnts.z5.js` | Freeware | Freeware (author-declared) |
| Ralph | Miron Schmidt | `Ralph.z5.js` | GPL3 | GPL-3.0 (IFDB) |
| Rameses | Stephen Bond | `rameses.zblorb.js` | Freeware | Standard IF licence |
| Ribbons | J.D. Berry | `ribbons.z5.js` | Freeware | Author permission (freeware terms) |
| Risorgimento Represso | Michael Coyne | `risorg.z8.js` | Creative Commons (BY-ND-NC 1.0) | CC BY-NC-ND 1.0 |
| Rover's Day Out | Jack Welch & Ben Collins-Sussman | `RoversDayOut.gblorb.js` | Creative Commons (BY-NC-SA 3.0) | CC BY-NC-SA 3.0 |
| Save Princeton | Jacob Sager Weinstein and Karine Schaefer | `saveprinceton.z8.js` | Shareware | Author permission (freeware terms) |
| Savoir-Faire | Emily Short | `Savoir-Faire.zblorb.js` | Freeware | CC BY-NC-ND 2.1 |
| School Days | Andrew MacKinnon | `schooldays.z5.js` | Freeware | Author permission (freeware terms) |
| Shapes | DG Ware Company | `Shapes.z5.js` | Freeware | Author permission (freeware terms) |
| She's Got a Thing For a Spring | Brent VanFossen | `spring.z8.js` | Freeware | Author permission (freeware terms) |
| So Far | Andrew Plotkin | `SoFar.z8.js` | Freeware | Author permission (freeware terms) |
| Spider And Web | Andrew Plotkin | `Tangle.z5.js` | Freeware | Author permission (freeware terms) |
| SpiritWrak | Daniel S. Yu | `spirit.z5.js` | GPL2+ | GPL-2.0-or-later |
| Suveh Nux | David Fisher | `suvehnux.z5.js` | Freeware | Author permission (freeware terms) |
| Swineback Ridge | Eric Eve | `Swineback.z5.js` | Freeware | Standard IF licence |
| The Awakening | Dennis Matheson | `awaken.z5.js` | Freeware | Author permission (freeware terms) |
| The Cabal | Stephen Bond | `cabal.z5.js` | Freeware | Standard IF licence |
| The Djinni Chronicles | J.D. Berry | `djinni.z5.js` | Freeware | Author permission (freeware terms) |
| The Edifice | Lucian Smith | `edifice.z5.js` | Freeware | Author permission (freeware terms) |
| The Ghost Train | Paul Johnson | `ghost.z8.js` | Freeware | Standard IF licence |
| The Gostak | Carl Muckenhoupt | `gostak.z5.js` | Freeware | Author permission (freeware terms) |
| The Lost Spellmaker | Neil James Brown | `lost.z5.js` | Freeware | Author licence |
| The Magic Toyshop | Gareth Rees | `magic-toyshop.z5.js` | Freeware | GPL-2.0 |
| The Path to Fortune | Jeff Cassidy and Christopher E. Forman | `windhal1.z8.js` | Freeware | Author permission (freeware terms) |
| The Space Under the Window | Andrew Plotkin | `sutwin.z5.js` | Freeware | Author permission (freeware terms) |
| The Temple | Johan Berntsson | `temple.z5.js` | Freeware | Author permission (freeware terms) |
| The Wedding | Neil James Brown | `wedding.z5.js` | Freeware | Author permission (freeware terms) |
| The Zuni Doll | Jesse Burneko | `doll.z5.js` | Freeware | Freeware (author-declared) |
| Theatre | Brendon Wyber | `theatre.z5.js` | Freeware | Author permission (freeware terms) |
| Tinseltown Blues | Chip Hayes | `blues.z5.js` | Freeware | Author licence |
| Tube Trouble | Richard Tucker | `tube.z5.js` | Freeware | Author permission (freeware terms) |
| Vacation Gone Awry | Johan Berntsson, Fredrik Ramsberg, and Staffan Friberg | `Vacation.z5.js` | Freeware | Author permission (freeware terms) |
| When Help Collides | J. D. Berry | `Help.z8.js` | Freeware | Author permission (freeware terms) |
| YAGWAD: Yes, Another Game With A Dragon! | Digby McWiggle | `yagwad.z5.js` | Freeware | Author permission (freeware terms) |

