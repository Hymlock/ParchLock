# I7 proposal (claude): attribute layouts for the 42 non-ZIL gap titles, from each game's own object table
Method: work/investigations/inform-all/bits2/ (bits.cjs = 10-24 inform-bits exemplar dump, extended to all gap titles; classify.cjs = anchors).
Anchors are I6 library objects whose attributes are fixed in library source: compass (concealed), direction walls (scenery),
yourself/selfobj (animate, concealed, proper, transparent), rooms (light). Exemplars (doors/containers/clothes/food/supporters) cross-check.

## Layout maps (all from the 10-24 inform-bits layouts; L = older library without `absent`)
- L:     animate0 clothing1 concealed2 container3 door4 edible5 enterable6 light9 lockable10 locked11 on13 open14 openable15 proper16 scenery17 static19 supporter20 switchable21 transparent23 worn26
- TOY:   L with +1 from door up: door5 edible6 enterable7 light10 lockable11 locked12 on14 open15 openable16 proper17 scenery18 static20 supporter21 switchable22 transparent24 worn27
- WIN:   TOY +1 everywhere (animate1 clothing2 concealed3 container4 door6 light11 open16 openable17 scenery19 static21 supporter22 transparent25 worn28)
- TH:    L +2 everywhere (animate2 clothing3 concealed4 container5 door6 light11 open16 openable17 scenery19 static21 supporter22 transparent25 worn28)
- L+10:  L +10 everywhere

## Per title
| Layout | Titles | Confidence / key evidence |
|---|---|---|
| L | Adventureland b2demo bedlam booth break-in bse cheater curses Enemies frozen godot Gumshoe heist I-0 Jigsaw karn library lists lost minster night ninepts phlegm piece_v3 Slackerx SoFar spirit vindaloo wedding | high: compass 2, walls 17 (bse/Enemies/SoFar/ninepts: no wall objects, compass+self still exact), yourself 0,2,16,23; doors 4,15(+10,11,19); containers 3,15; clothes 1; food 5; supporters 20; worn 26 seen on start-worn clothes (karn hat/jacket/scarf 1,26; I-0 T-shirt 1,26). Rooms-light top count missed only where game attrs outnumber lit rooms (wedding 35, phlegm 23, booth 1 room) |
| TH | claw | high: compass 4, walls 19, yourself 2,4,18,25 (x2), rooms 11; gloves/coat 3 |
| WIN | inhumane | high: compass 3, walls 19, yourself 1,3,18,25, rooms 11; chest 4,12,13,17,21; doors 6,17,21 |
| TOY | tk1, weather | high: compass 2, walls 18, yourself 0,2,17,24, rooms 10; tk1 door 5,16,20; weather shed door 5,11,15,18, bucket 3,15 |
| L+10 | tatctae | high: compass 12, walls 27, yourself 10,12,26,33, rooms 19; locker 13,20,21,25,29; uniform 11; shelf/tables 30 |
| unresolved | mindelec (TOY anchors 0,2,17,24 + walls 18 but rooms 18, floor door 7,18,23), mhpquest (compass 3, walls 18, yourself 1,3,17,24, rooms 10: TOY with low block +1?), paperchase (compass 3, yourself 1,3,18,25, rooms 20), praser5 (no anchors), sutwin (no attrs set), catseye/dejavu/moonglow (z3, separate) | fail-closed until a native check |

Request: adversarial review. Attack anchors, the L worn=26 inference, and any title whose exemplars contradict its map. On consensus Claude lands exact-digest attributeMap + wornAttribute facts (ModuleStatFactsClaude) and extends inform-layout to all 272 non-ZIL titles.
