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
cycle command history. Highlighted objects and exits use structural state and
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
opens the keyboard normally. Tap the faint right-edge tab to open or close the
map. The submit button handles line and single-key prompts. The microphone defaults to
hold-to-talk; Options can switch it to tap-to-toggle. Speech recognition is
provided by the operating system or browser and may use its provider's network.

A short interactive tutorial appears once, the first time you open ParchLock,
on both mobile and desktop. It walks through choosing a story, playing one
(commands, actionables, the game radial and Tools, your directions handle,
voice input, nearby-room banners, and menus that wait for one key), your full
map, and finishes at the real module library -- it never starts, preselects,
or resumes an actual story along the way. Skip works the same way as
finishing it. Use **Options** -> **Replay tutorial** to see it again (it warns
before leaving a story you're playing), or **Reset tutorial** to have it show
again automatically the next time you open the module library.

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

The map records discovered rooms and connections; it is not a walkthrough and
does not know unexplored destinations. Drag to pan and scroll to zoom. Use
`/goto room;`, `/see room;`, and `/see me;` for navigation and centering.
Use `/note text;`, `/notes`, and `/clear notes` for room notes.

Mapping and module-derived actions are full features for supported Z-machine
modules. Glulx currently plays through Quixe without those Z-specific layers.
Unusual engines and nonstandard room models can expose less information until
their structure is proved.

## Saves And Local Data

Save and Restore invoke the story's own commands. Save files manages browser
saves and portable save packages. Maps can be named, downloaded, and loaded
separately. Clearing site/app data removes local imports, maps and browser
saves. Android backup is disabled; reinstalling starts empty.

## Useful Slash Commands

`/help`, `/tools`, `/commands`, `/history`, `/transcript`, `/items`,
`/map`, `/display`, `/theme`, `/clear map`, and `/quit`.
