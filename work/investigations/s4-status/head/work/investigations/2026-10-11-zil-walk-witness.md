# ZIL walk witnesses (observer-captured runs m1-m4 with real death detection, analyzer2; grok2 for Codex #3449/#3457)

Source: zil-walk-r*.json (per-step location/ROOMS parent/app player, whole-delta replies, game-over cut), zil-walk-analyze2.js. Object ids are RAM ids; `<cmd>` is the walkthrough command whose execution produced the op.

## 475e11d PlunderedHearts.z3.js open (bit {"CB":24,"OB":16,"WB":22,"NB":29,"AB":31}; run 2026-10-11-zil-walk-m2.json, terminal)
- verdict: MEETS 2+1
- positives: 14 powder horn <open it> already-open; 45 large cupboard <open cupboard> set; 55 portrait <open portrait> set; 69 coffer <open coffer> set; 95 water barrel <open hatch> already-open; 104 iron door <open it> set; 137 canvas hatch <open hatch> set; 198 silver tray <open portrait> already-open; 201 bookcase <open portrait> already-open; 210 rum barrel <open hatch> already-open; 221 ornate door <open door> set; 223 your reticule <open cupboard> already-open
- negatives: 37 it <open it> tested-closed; 45 large cupboard <open cupboard> tested-closed; 55 portrait <open portrait> tested-closed; 69 coffer <open coffer> tested-closed; 104 iron door <open it> tested-closed; 121 leather bottle <open coffer> tested-closed; 137 canvas hatch <open hatch> tested-closed; 221 ornate door <open door> tested-closed

## 475e11d Wishbringer.z3.js container (bit {"CB":4,"OB":25,"WB":null,"NB":20,"AB":18}; run 2026-10-11-zil-walk-m2.json, terminal)
- verdict: MEETS 2+1
- positives: 4 little mailbox <get envelope>; 61 fountain <look in fountain>; 82 refrigerator <e>; 217 pit <look in pit>; 229 metal can <break branch>; 235 glass case <give envelope to woman>
- negatives: 14 violet note <d>; 18 service counter <get envelope>; 28 bunk <get blanket>; 38 #38 <get it>; 59 King Anatinus <get hat>; 117 old bone <d>; 126 old woman <get can>; 150 wizard's hat <d>

## 475e11d Wishbringer.z3.js open (bit {"CB":4,"OB":25,"WB":null,"NB":20,"AB":18}; run 2026-10-11-zil-walk-m2.json, terminal)
- verdict: MEETS 2+1
- positives: 4 little mailbox <open mailbox> set; 19 stump <open stump> set; 82 refrigerator <open fridge> set; 190 toll gate <open gate> set; 229 metal can <open can> set; 234 Magick Shoppe door <open door> set
- negatives: 4 little mailbox <open mailbox> tested-closed; 19 stump <open stump> tested-closed; 82 refrigerator <open fridge> tested-closed; 190 toll gate <open gate> tested-closed; 229 metal can <open can> tested-closed; 234 Magick Shoppe door <open door> tested-closed; 235 glass case <open envelope> tested-closed

## 475e11d Zork3-TheDungeonMaster.z3.js open (bit {"CB":10,"OB":12,"WB":null,"NB":15,"AB":21}; run 2026-10-11-zil-walk-m4.json, incomplete)
- NO repaired witness (key absent in this run). Fact stays C pending a repaired run.

## 475e11d Sorcerer.z3.js open (bit {"CB":27,"OB":15,"WB":null,"NB":11,"AB":31}; run 2026-10-11-zil-walk-m3.json, attempted)
- verdict: MEETS 2+1
- positives: 12 desk drawer <open desk> set; 139 spell book <open desk> already-open; 211 ochre vial <open vial> set; 225 journal <open journal> set; 235 receptacle <open receptacle> set
- negatives: 12 desk drawer <open desk> tested-closed; 55 #55 <open box> tested-closed; 102 tiny box <open desk> tested-closed; 211 ochre vial <open receptacle> tested-closed; 225 journal <open journal> tested-closed; 232 sturdy trunk <open vial> tested-closed; 235 receptacle <open receptacle> tested-closed

## 9b72c38 Cutthroats.z3.js container (bit {"CB":11,"OB":21,"WB":13,"NB":17,"AB":null}; run 2026-10-11-zil-walk-m1.json, attempted)
- verdict: MEETS 2+1
- positives: 64 portable drill <open panel>; 140 closet <look in closet>; 145 dresser <get passbook and room key>; 191 #191 <get envelope>
- negatives: 151 back window <open window>; 164 front door <withdraw $603>; 168 #168 <open window>; 172 railing <show envelope to johnny>; 173 ladder bottom <drink water>; 174 ladder top <get out of bunk>; 175 stairs <close door>; 176 ocean <wait for johnny>

## 9b72c38 HollywoodHijinx.z3.js container (bit {"CB":4,"OB":25,"WB":null,"NB":20,"AB":18}; run 2026-10-11-zil-walk-m1.json, attempted)
- verdict: MEETS 2+1
- positives: 14 small pond <s>; 138 small compartment <n>; 172 cannon <n>; 207 pile of cannon balls <n>; 225 Buck Palace-endorsed, regulation mailbox <n>
- negatives: 32 cannon ball <n>; 54 #54 <examine model>; 63 business card <open mailbox>; 67 photo of Uncle Buddy <w>; 96 ladder <n>; 104 orchids <s>; 113 yellowed piece of paper <open mailbox>; 114 bazooka <s>

## 9b72c38 PlunderedHearts.z3.js container (bit {"CB":24,"OB":16,"WB":22,"NB":29,"AB":31}; run 2026-10-11-zil-walk-m2.json, terminal)
- verdict: MEETS 2+1
- positives: 4 well <get spices>; 8 Crulley <s>; 14 powder horn <e>; 27 ledge <z>; 40 chair <n>; 45 large cupboard <z>; 52 skiff <z>; 57 your father <n>; 66 Lafond <n>; 69 coffer <z>; 75 table <n>; 82 cot <e>; 88 garter <e>; 90 blue goblet <n>; 93 cask <n>; 95 water barrel <n>; 111 fence <n>; 121 leather bottle <n>; 128 pair of manacles <s>; 129 trapdoor <s>; 131 bed <z>; 141 green goblet <n>; 152 long table <e>; 154 bed <u>; 163 Cookie <in>; 177 Lucy <e>; 187 crocodile <s>; 190 Captain Jamison <yes>; 199 flagon <n>; 201 bookcase <n>; 210 rum barrel <n>; 213 bed <z>; 214 bed <n>; 218 knob <n>; 223 your reticule <dip rag in water>
- negatives: 16 rapier <s>; 22 quantity of wine <n>; 32 pool <s>; 39 gate <n>; 42 dagger <in>; 56 rope <s>; 72 navigation wheel <n>; 74 line <n>

## 9b72c38 PlunderedHearts.z3.js animate (bit {"CB":24,"OB":16,"WB":22,"NB":29,"AB":31}; run 2026-10-11-zil-walk-m2.json, terminal)
- verdict: MEETS 2+1
- positives: 8 Crulley <hit crulley with coffer>; 57 your father <give garter to papa>; 66 Lafond <n>; 79 butler <show invitation to butler>; 163 Cookie <in>; 177 Lucy <e>; 187 crocodile <s>; 190 Captain Jamison <s>
- negatives: 10 window <smash window with coffer>; 11 smelling salts <remove frock>; 13 your kid slippers <remove frock>; 14 powder horn <e>; 16 rapier <get rapier>; 17 linen chemise <remove frock>; 22 quantity of wine <drink wine>; 25 spices <get spices>

## 9b72c38 Wishbringer.z3.js animate (bit {"CB":4,"OB":25,"WB":null,"NB":20,"AB":18}; run 2026-10-11-zil-walk-m2.json, terminal)
- verdict: MEETS 2+1
- positives: 24 gravedigger <show ticket to gravedigger>; 35 piranha <put worm in fountain>; 59 King Anatinus <get hat>; 113 pelican <give hat to pelican>; 126 old woman <give envelope to woman>; 148 poodle <give bone to poodle>; 193 Miss Voss <get note>
- negatives: 4 little mailbox <open mailbox>; 14 violet note <d>; 38 #38 <get it>; 61 fountain <look in fountain>; 82 refrigerator <open fridge>; 117 old bone <d>; 150 wizard's hat <d>; 158 small stone <d>

## 9b72c38 Zork1-TheGreatUndergroundEmpire.z3.js on (bit {"CB":19,"OB":11,"WB":null,"NB":20,"AB":30}; run 2026-10-11-zil-walk-mz3.json, attempted)
- verdict: MEETS 2+1
- positives: 147 pair of candles <light candles with match>; 155 matchbook <light match>; 164 brass lantern <light lamp>
- negatives: 87 jewel-encrusted egg <light lamp> tested-off; 110 sword <light lamp> tested-off; 123 screwdriver <light lamp> tested-off; 129 rope <light lamp> tested-off; 147 pair of candles <light match> tested-off; 164 brass lantern <light lamp> tested-off; 169 nasty knife <light lamp> tested-off; 189 clove of garlic <light lamp> tested-off

## 9b72c38 Ballyhoo.z3.js open (bit {"CB":23,"OB":15,"WB":null,"NB":24,"AB":31}; run 2026-10-11-zil-walk-m3.json, incomplete)
- verdict: MEETS 2+1
- positives: 65 bucket <open compartment> already-open; 122 your ticket <open door> already-open; 149 cage door <open cage> set; 164 cage door <open door> set; 213 compartment <open compartment> set
- negatives: 44 trailer door <close door> cleared; 149 cage door <open cage> tested-closed; 164 cage door <open door> tested-closed; 213 compartment <open compartment> tested-closed

## ca4d0a5 Planetfall.z3.js open (bit {"CB":24,"OB":11,"WB":12,"NB":5,"AB":null}; run 2026-10-11-zil-walk-m5.json, incomplete)
- verdict: MEETS 2+1
- positives: 125 glass flask <open floyd> already-open; 145 large desk <open desk> set; 149 small desk <open desk> set; 163 canteen <open canteen> set; 173 door <open door> set; 213 survival kit <open it> set; 224 Patrol uniform <open door> already-open; 231 escape pod bulkhead <open door> set
- negatives: 145 large desk <open desk> tested-closed; 149 small desk <open desk> tested-closed; 163 canteen <open canteen> tested-closed; 173 door <open door> tested-closed; 213 survival kit <open door> tested-closed; 231 escape pod bulkhead <open door> tested-closed; 254 #254 <open it> tested-closed

## ca4d0a5 Hitchhik.z5.js open (bit {"CB":40,"OB":39,"WB":null,"NB":45,"AB":42}; run 2026-10-11-zil-walk-m4.json, incomplete)
- NO repaired witness (key absent in this run). Fact stays C pending a repaired run.

## ca4d0a5 Hitchhik.z5.js animate (bit {"CB":40,"OB":39,"WB":null,"NB":45,"AB":42}; run 2026-10-11-zil-walk-m4.json, incomplete)
- verdict: MEETS 2+1
- positives: 139 Vogon Captain <z>; 230 barman <enter pub>
- negatives: 31 toothbrush <turn on light>; 105 flathead screwdriver <turn on light>; 151 shelf of items <enter pub>; 186 babel fish dispenser <examine shadow>; 206 your gown <look in pocket>; 217 glass case <examine shadow>

## 43bf312 TheLurkingHorror.z3.js container (bit {"CB":27,"OB":13,"WB":null,"NB":15,"AB":null}; run 2026-10-11-zil-walk-m3.json, incomplete)
- verdict: MEETS 2+1
- positives: 8 plastic container <s>; 10 cylindrical hole <get paper>; 53 metal flask <light flashlight>; 58 cardboard carton <open carton>; 62 chair <n>; 86 microwave oven <w>; 88 emergency cabinet <e>; 89 elevator doors <d>; 92 tub of dirt <u>; 100 urchin <u>; 105 refrigerator <w>; 115 elevator doors <s>; 120 access panel <s>; 122 elevator doors <d>; 129 hacker <n>; 160 kitchen counter <w>; 191 pc <n>; 197 forklift <w>; 235 floor waxer <e>
- negatives: 1 catwalk <climb rope>; 12 wooden ladder <climb rope>; 18 package of Funny Bones <w>; 28 wall socket <e>; 44 creature <d>; 57 alarm button <s>; 73 microwave controls <w>; 76 elevator doors <u>

