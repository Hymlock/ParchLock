# ParchLock User Guide

## Library And Modules

Open **Modules** to add one file, several files, or a folder. The manager checks
the bytes, reports the detected format and compatibility level, and stores
accepted modules on this device. Identical bytes are one module even if file
names differ. You may rename imported library entries.

**Remove** deletes imported module bytes but deliberately leaves interpreter
saves and learned calibration data. **Hide** removes a built-in listing without
deleting its immutable file. **Remove all** removes imports and hides built-ins;
**Restore built-ins** restores those listings. Continue is shown only when the
last module still exists.

Add only modules you have the right to use. Compatibility does not establish
copyright status or permission.

## Play And Commands

Type a command and press Enter. Tab cycles autocomplete; Ctrl+Up and Ctrl+Down
cycle command history. Ctrl+Shift+Up moves North; Ctrl+Shift+Down moves South.
Ctrl+Shift+Left/Right moves West/East. The older Ctrl+Shift+* (North) and
Ctrl+Shift+numeric-keypad 5 (South, reported as Clear) shortcuts remain available.
The new Up/Down shortcuts require a normal command prompt and pause while menus or dialogs are open. Highlighted objects and exits use structural state and
the active module's grammar where the Z-machine adapter supports them. Click a
highlight for its deterministic primary action. On touch, tap an underlined
word for that primary action; touch and hold it for about half a second to open
its action radial. On desktop, right-click opens the same additional actions.
Command vocabulary varies by module: inspect may be expressed as examine, look
at, or another module-provided form.

The action system fails closed when an object or command is ambiguous. A game
can still reject a structurally plausible action.

## Mobile Controls

The interface adapts to portrait and landscape. Touch and hold the command line
or submit arrow for about half a second. When the radial appears, choose
**Tools** for the complete game and app menu. A quick tap on the command line
opens the keyboard normally. The tabs on the right edge open the **World** map
(globe), the local **Map** and **Equipment**; tap a tab again to close it. The
submit button handles line and single-key prompts. The microphone defaults to
hold-to-talk; Options can switch it to tap-to-toggle. Speech recognition is
provided by the operating system or browser and may use its provider's network.

A short tutorial appears once, the first time you open ParchLock, on both
mobile and desktop. It is a series of information cards drawn over the real
app, each read aloud; while it runs, the screen underneath is shown but cannot
be operated. It begins at the module library, then continues on the play screen
after you choose a story, explaining commands, highlighted words, the game
radial and Tools, the directions handle, voice input, nearby-room banners, menus
that wait for one key, the map and Equipment. When it ends the story restarts so
your play begins fresh. **Skip** ends it the same way. Use **Options** ->
**Replay tutorial** to see it again (it warns before leaving a story you're
playing), or **Reset tutorial** to have it show again automatically the next time
you open the module library.

On a phone-size screen turned sideways, a brief prompt asks you to rotate
back to portrait -- tablets are unaffected and keep rotating freely. Nothing
is lost or reloaded; rotating back removes the prompt immediately.

Command radials adapt during the current session. A command you use moves ahead of
commands you have not used; more frequently used commands move toward the first or
inner positions. The pill fill grows with use and stops growing after six uses, while
ordering continues to reflect the full count. Equal-use commands retain the module's
confidence order. Tools, game-menu entries, and **More...** do not affect this ranking.

At startup screens and menus that wait for a key ("press any key", the game's own
HELP menu), tap the bottom field to open the keyboard and type keys such as N, P and Q.
For arrow keys choose **Tools** -> **Arrow keys**: a circle appears with Up, Down, Left
and Right around the edge and Enter in the centre; tap outside the circle to close it.
On mobile, native grid-style game menus automatically show this pad. It remains open
while the menu redraws after each key and closes when normal play returns. The bottom
character-entry strip stays exposed; tap it to close the automatic pad and type a
letter or number such as `Q`. Manually opening the pad remains available at any prompt.
On a computer, this same pad is available as an optional on-screen overlay -- off by
default, since a keyboard's own arrow keys already work -- turned on in Options.
With the keyboard open you can hold on the command line for the normal Cut/Copy/Paste
menu; with the keyboard closed, holding opens the game radial as before.

**Read aloud** (**Tools** → **Options**) is on by default and speaks only **new** story
text as it appears—not the whole scrollback when you turn it on. Complete
multi-paragraph replies are kept together even when a story appends them to an existing
line. Diagram strokes and prompt symbols are skipped, useful map labels remain, and
all-capital titles are prepared as words. Android and desktop use the same deterministic
text preparation before handing text to the device or browser voice. Status line and
app dialogs stay off unless you enable them there. There is no on-screen speaker
button; use **Stop speaking** in Options, or press the mic (which stops speech).
Pronunciation hints affect speech only; story text on screen is never rewritten.
Synthesis uses the device or browser voice engine on-device. **Skip lines repeated
from the previous turn** (also in Options, off by default) stops the same line from
being read twice in a row, for example when you LOOK several times; a line that
reappears after different output is read again.

## Mapping, Notes, And Navigation

The map records the rooms and connections you discover; it is not a walkthrough.
Where a story's own data names a nearby room you have not visited yet (for
example in many Infocom-style stories), that room is shown faded with a dotted
link. Such hints are never used for automatic travel until you have walked that
way yourself. The **World** map shows every explored room of the story at once;
the local **Map** shows the room you are in and its neighbours. Drag to pan and
scroll to zoom. **Map controls** and **Notes** open and close with their
headings. When you browse to another room, its Back and Go buttons appear faded
on its box; on a touch screen the first tap on them only reveals them, and a
second tap acts. Use
`/goto room;`, `/see room;`, and `/see me;` for navigation and centering.
Use `/note text;`, `/notes`, and `/clear notes` for room notes.

Mapping and module-derived actions are full features for supported Z-machine
modules. Glulx currently plays through Quixe without those Z-specific layers.
Unusual engines and nonstandard room models can expose less information until
their structure is proved.

## Equipment And Status

**Equipment** lists what you carry and wear, grouped under **Yourself** and the
containers that hold things, with tags such as *worn* and *open* where the story
reports them. Drag an item onto an open container to put it in, or onto Yourself
to take it out; right-click or touch and hold an item for its actions.
**Options** holds sorting, search, the container view, category filters and
**Refresh**. How much a story reveals varies, and some stories expose little. In
some stories, checking inventory or status uses a game turn; for each installed
module ParchLock warns you once, before its first Equipment check.

The status card above the list shows what the story tracks, such as score,
turns or a progress line. When ParchLock recognises the story's own ending as a
death or a win (for example "You have died"), it counts it as **Deaths this
playthrough** or **Wins this playthrough**. Endings a story describes in its own
way may not be recognised. The counts appear once they are above zero. They stay
with that playthrough when you quit, reopen the story, or restore an earlier save;
restoring does not erase deaths that happened later in the same playthrough. A
new game or RESTART begins a separate count. Loading a save from another
playthrough brings back that playthrough's count. Exported save packages carry
the counts for their selected saves.

## Saves And Local Data

Save and Restore invoke the story's own commands. Save files manages browser
saves and portable save packages. Maps can be named, downloaded, and loaded
separately. A running transcript is kept for each story: lines become permanent
when you save, and loading a save shows the transcript as it was at that save.
Deleting a save deletes the lines only it used, and removing the module deletes
its transcripts. If storage fails the transcript is marked incomplete; play is
not affected. Clearing site/app data removes local imports, maps, transcripts
and browser saves. Android backup is disabled; reinstalling starts empty.

## App Icon And Desktop Shortcut

ParchLock's icon is a storybook with one of the four opening scenes on its left
page.

- **Android:** ParchLock offers a rotating home-screen widget. It starts at
  **2 × 2**. Touch and hold it, then drag the resize handles to choose a size
  from **1 × 1 to 4 × 4**, subject to your launcher's grid. Tap the book to open
  ParchLock. Its picture changes once per fresh app launch; Home/return leaves
  it unchanged. **Options → App icon** can add or update it later. If automatic
  placement is unsupported, add ParchLock from your launcher's widget list.
  Once a widget exists, ParchLock disables its old rotating shortcut. Android
  does not let the app remove that shortcut or your ordinary app icon; remove
  them manually if your launcher keeps them.
- **PC:** the first time you run `ParchLock.exe` it asks whether to add a desktop
  shortcut. If you agree, that shortcut's picture changes each time you open
  ParchLock. It never touches other shortcuts, and it never recreates a deleted
  shortcut by itself; run `ParchLock.exe --desktop-shortcut` to be asked again.

Opening ParchLock from one of these icons starts on the same scene.

## Useful Slash Commands

`/help`, `/tools`, `/commands`, `/history`, `/transcript`, `/items`,
`/map`, `/display`, `/theme`, `/clear map`, and `/quit`.
