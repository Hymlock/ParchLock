# D112 - Map panel: search placement, collapsible controls, unified notation system (PLAN, not implemented)

Author: claude, 2026-09-22 (revision 2: fully reconciled per codex #772 item 4 - this is the single, final design,
not a layered set of amendments). Status: **PROPOSED, awaiting codex's final GO.** Workflow: plan -> codex
adversarial review -> consensus -> implement -> codex reviews the implementation. No product files touched yet.

## 0. Final design summary (five changes to the map panel)

1. Move the room search box (`#room-filter`) to sit directly above the "Known Rooms" list, instead of grouped with
   the zoom/center/reset controls at the top.
2. Make the map controls (Center / - / 100% / + / Maps / Reset Map) collapsible: open by default on desktop,
   collapsed by default on the mobile-compact layout.
3. **Adding a note:** press-and-hold or right-click a row in the **Known Rooms list only** opens a popup text box
   to add a new note to that specific room. A plain/short click on a Known Rooms row keeps its existing meaning
   (travel there) unchanged. **The map canvas gets no new gesture at all** - its room boxes keep their existing
   click-to-travel/center behaviour, existing icon buttons, and existing drag/pan, completely untouched.
4. The map room box (canvas) never renders note text inline again - only a small icon indicating "this room has
   notes," matching what Known Rooms already shows. (Today it prints the first note's raw text into the box,
   which is the operator-reported bug: overlapping room names, unpredictable with long/multiple notes.)
5. One permanent, always-visible **Notes** section sits at the bottom of the map panel, below Known Rooms:
   - Its header/summary bar is **always rendered**, regardless of whether any room has a note yet, regardless of
     whether the section is expanded or collapsed, and regardless of any preference below.
   - Clicking any of the four existing "view this room's notes" icons (see section 1) opens the map panel if
     closed, expands the Notes section, scrolls it into view, and scopes it to only that one room.
   - Manually expanding the Notes section (not via a room's icon) shows every room that has notes, grouped by
     room, in the same order Known Rooms already lists them.
   - The existing room search box narrows the Notes section the same way it narrows Known Rooms.
   - Every individual note, wherever shown, has its own small edit (pencil/scroll) and delete (trash) icon.
   - Multiple notes per room are kept (not collapsed to one-per-room).
   - **Optional add-note button:** a small button may sit beside the Notes header, purely as a second way to open
     the same add-note popup without a hold/right-click gesture (see section 5 for the full, final spec -
     `Global.Prefs.ShowNotesAddButton`, default **off**, toggled in a general Interface/Accessibility area of
     Options, not grouped with the map-specific options). Toggling this preference affects **only** that one
     button's presence - it never hides/collapses the Notes header, never affects note-icon visibility anywhere,
     and never affects hold/right-click or the `/note` slash command.

## 1. Current code, exact mechanism (every change above is grounded here, not assumed)

**Search box.** `play.html:218-226`: `<input id="room-filter">` lives inside `#map-toolbar` with the six
zoom/center/reset/maps buttons. `js/Map.js:35` binds it only to `RebuildRoomsList` - confirmed no other effect
(does not touch the canvas, zoom, or Items).

**Collapsible pattern already exists.** `play.html:234-238`: `#items-tab` is a plain `<details>/<summary>`,
toggled via `Actionable.js:688`. Reused verbatim for change 2 and for the new Notes section - no new widget.

**Notation data model.** `room.Notes` is a plain `string[]` per room record (`js/Map.js:556-557`). No per-note id.
`AddNote(note)` (`js/Map.js:549-563`) is hardcoded to `ParchLockMap.GetCurrentRoom()` - no way today to add a note
to any room other than the one you're standing in (the operator's original complaint). `ClearNotes()`
(`js/Map.js:565-573`) wipes the entire array for the current room only - no per-note delete exists.
`ShowNotes(e, roomName)` (`js/Map.js:469-502`) builds an HTML list and calls `Message.Show("Notes in <Room>", ...)`
- confirmed `/notes` with no argument does **not** show every room's notes (falls through to
`GetCurrentRoom()`, `js/Map.js:473`) - there is genuinely no "every room's notes at once" view today.

**Room identity, not name (D47).** `GetRoom(string)` (`js/Map.js:113-117`) deliberately fails on an ambiguous name
match - rooms can share a display name. Every new function below resolves and carries the actual room record
(by `Id`/`ObjectId`), never a bare name string.

**Four existing "view this room's notes" trigger sites, all calling `ShowNotes` today:**
1. `#current-room-notes` (`js/Map.js:34`) - must be explicitly reset/hidden at the start of every `Draw()`, not
   only inside the notes-present branch (`js/Map.js:455`), or deleting a room's last note can leave it stuck
   visible.
2. Known Rooms row icon (`js/Map.js:611`).
3. A map-canvas neighbour room's note icon (`js/Map.js:88`, `.icon.all-notes`).
4. The compass/exit strip around the main story window (`js/Map.js` `CreateMiniMap`, ~line 103-107, `.icon
   room-notes`) - the "small icon around the edge of the window with the room name, direction, and scroll icon"
   the operator described separately.

All four are rewired to a new `FocusNotesForRoom(room)` (section 2.5), not deleted.

**The exact rendering bug the operator screenshotted.** `js/Map.js:444-453`: `_room.Notes[0]` is written directly
into a `.note` element inside the room box; only >15-char or >1-note cases fall back to the existing icon. Change
4 deletes the text-writing branch entirely and always shows the icon when `Notes.length >= 1`.

**Text-input-in-modal pattern already exists and is already mobile-keyboard-safe.** `js/WorkspaceUI.js:228`
(`ShowMaps`): a plain `<input>` inside `Message.Show(...)`. Confirmed via `js/Input.js:97` that `#message` is
already excluded from the app's aggressive mobile keyboard-dismiss logic. The add/edit-note popup copies this
exact pattern (`disabledTypeToClose: true`, no forced mobile autofocus given this project's prior IME instability
history, trimmed non-empty bounded text on submit) - it inherits correct mobile keyboard behaviour, not a new risk.

**Long-press is an established, separate gesture elsewhere** (input line, char-input strip: short tap = one
meaning, hold = another), with existing timing constants (`Actionable.LongPressMs`,
`Actionable.LongPressMoveCancelPx`) already used elsewhere and reused here, not invented. Known Rooms rows
(`js/Map.js:602`) are plain `.click(...)` today - this is new wiring, scoped to Known Rooms only (see section 2.3).

## 2. Design

### 2.1 Search box placement
Move `<input id="room-filter">` in `play.html` out of `#map-toolbar` to sit immediately above `#rooms-list`'s
`<strong>Known rooms</strong>` header. No JS change - `js/Map.js:35`'s binding is by id.

### 2.2 Collapsible map controls
Wrap the existing `#map-toolbar` button group (minus `#room-filter`, which moves per 2.1) in a `<details>`,
default `open` on desktop, default closed on the mobile-compact layout. Same native widget as `#items-tab`.

### 2.3 Notation: add (Known Rooms only)
- New `ParchLockMap.AddNoteToRoom(room, text)` (room passed explicitly). `AddNote(note)` (used by `/note text;`)
  becomes a thin wrapper calling this with `GetCurrentRoom()` - the slash command is unaffected.
- New hold/right-click handler on a Known Rooms row (`js/Map.js:602`) only:
  - Mobile: hold contract matches the existing pattern used elsewhere in this app - a movement threshold and
    time threshold (reuse `Actionable.LongPressMs`/`LongPressMoveCancelPx`), a child element that is itself an
    icon/button/interactive control never starts the hold timer, `pointercancel` clears state cleanly, and a
    successfully fired hold suppresses exactly the one trailing click that would otherwise also fire "go to room."
    Because this gesture exists **only** on Known Rooms rows (never the canvas), there is no drag/pan to arbitrate
    against - this is the ordinary hold-vs-tap contract already used elsewhere, nothing extra.
  - Desktop: `contextmenu` on a Known Rooms row (matching `js/Qol.js`'s existing line-input `ShowRadialMenu`
    desktop pattern), `preventDefault`/`stopPropagation`. **Desktop does not get `contextmenu` on the map canvas**
    for this feature - the canvas gets no new gesture of any kind (mobile or desktop).
  - Either path opens the same `Message.Show` + `<input>` popup (copying `js/WorkspaceUI.js:228`'s pattern),
    targeting that row's resolved room record via `AddNoteToRoom`.
- The map canvas (`js/Map.js:88`'s `.room` elements) is **not touched by this change at all** - its existing
  short-click travel/center behaviour, existing per-room icon buttons, and existing drag/pan stay exactly as they
  are today. Regression test (section 4) explicitly proves a hold/right-click on a canvas room box does nothing
  new (no add-note popup opens).

### 2.4 Map room box: icon only, never text
Delete the `room.find(".note").text(...)` branch in `js/Map.js:444-453`. The existing `.icon.all-notes`/
`.icon.room-notes` elements show whenever `Notes.length >= 1` (drop the `> 1`/`length > 15` gating that only
existed to choose between text and icon - there is no longer a text path to choose between).

### 2.5 Unified, permanent Notes section
- New `<details id="notes-tab">` in `play.html`, placed after `#rooms-list`. **Its `<summary>` header is always
  rendered** - not conditionally mounted on note count, not hidden by the button preference below. Default
  collapsed (independent of the map-controls collapsible state in 2.2).
- The header is a wrapper (e.g. `.notes-heading`) containing the native `<summary>` **and**, as a sibling inside
  the same header bar (never nested inside `<summary>` itself - two separate interactive elements inside a
  `<summary>` creates activation ambiguity across browsers/assistive tech), the optional Add-note button from
  section 5 when that preference is on.
- New `ParchLockMap.RebuildNotesList(scopeRoom)`: with no scope, renders every room with `Notes.length > 0`,
  grouped under that room's name, in Known-Rooms discovery/insertion order (confirmed via `js/Map.js:600` and
  that `MapBeautify` only hides rooms by floor, never reorders); with a scope, renders only that one room's notes,
  no grouping header. Bound to the **same** refresh event as `RebuildRoomsList` (one shared handler on
  `#room-filter`'s `input` event, so both lists narrow together - today only `RebuildRoomsList` is bound,
  `js/Map.js:35`, which is corrected here).
- New `ParchLockMap.FocusNotesForRoom(room)`: calls the existing idempotent `ParchLockMap.Show()` (never
  `Toggle()`, which could close an already-open panel instead of focusing it) if the map isn't open; **clears
  `#room-filter`** first (so a leftover search term can never hide the room a trigger icon just asked to focus);
  sets `NotesScopeRoomKey` to that room's identity; opens `#notes-tab`; calls `RebuildNotesList(room)`; scrolls the
  section into view.
- `NotesScopeRoomKey` (`null` = showing everything; otherwise a room identity) is explicit state, not inferred -
  a trigger-scoped view and a manually-expanded all-rooms view can never be confused. Closing a scoped view and
  manually reopening the section must show all rooms, not silently reopen scoped.
- Rewire all four trigger sites in section 1 from `ParchLockMap.ShowNotes` to `ParchLockMap.FocusNotesForRoom`.
  `ShowNotes` itself becomes a thin compatibility wrapper around this (`/notes` and `/room-notes room;` in
  `js/Input.js:884`/`:895` call it directly and must keep working) - the old Message-popup body is removed, not
  left reachable from anywhere.
- New `ParchLockMap.EditNote(room, index, text)` / `RemoveNote(room, index)`: mutate `room.Notes` at that index
  (replace/splice). Capture room identity + index + the expected current text at the moment an edit/delete
  button is created; since the Notes DOM is synchronously rebuilt after every mutation, a stale index cannot
  outlive a render, but if a rebuild has happened and that captured pairing no longer matches at click time, fail
  closed (do nothing) rather than editing/deleting the wrong entry. Both call the same `Save()`/`Draw()`/
  `RebuildRoomsList()` `AddNote`/`ClearNotes` already call, plus `RebuildNotesList()` for whichever scope is
  currently active.
- **Single shared refresh point.** `AddNote`/`AddNoteToRoom`, `ClearNotes`, `EditNote`, `RemoveNote`,
  `RemoveRoom`, `EnteredRoom`, map `Load`, `WorkspaceUI.LoadMap`, package import, and `Reset Map` must all also
  refresh the Notes section - add one shared helper (e.g. `RefreshMapPanels()`) that calls
  `Save/Draw/RebuildRoomsList/RebuildNotesList` together, and use it at every one of these sites, rather than
  repeating the call list per site.

## 3. Slash commands, explicitly left alone
`/note text;`, `/notes`, `/room-notes room;`, `/clear notes` (`js/Input.js:871-940`) keep their exact current
behaviour. `/clear notes` (wipe-all) and the new per-note delete are two distinct, both-valid operations.

## 4. Tests to add (real click/touch-driven per this project's standing D27 rule - not synthetic-only)
- Hold and right-click on a Known Rooms row open the add-note popup targeting that row's resolved room (including
  a room that is **not** the player's current room); typing and submitting adds exactly one entry to that room's
  `Notes`.
- **Negative test:** hold and right-click on a map-canvas room box do nothing new - no add-note popup opens, and
  the canvas's existing click-to-travel/center, icon buttons, and drag/pan behave exactly as before this change.
- The map room box never contains note text regardless of note count/length (regression guard for the
  screenshotted bug).
- Each of the four existing note-icon triggers opens the map panel if needed, expands and scroll-focuses the
  Notes section, clears any leftover search term, and scopes it to only that room.
- Manually expanding Notes with no prior trigger shows every room with notes, grouped, in Known-Rooms order.
- Closing a scoped Notes view and manually reopening the section shows all rooms, not the prior scope.
- Typing in the search box narrows Known Rooms and Notes together.
- Each note's edit icon opens the popup pre-filled and replaces only that entry; delete removes only that entry,
  leaving siblings and other rooms' notes untouched.
- Deleting a room's last note correctly hides `#current-room-notes` and every per-room note icon for that room.
- `/note`, `/notes`, `/room-notes`, `/clear notes` behave exactly as before this change.
- Notes header/`<details>` is present and visible with zero notes anywhere, independent of the button preference.
- Add-note button preference: default off (button absent, header still visible); turn on (button present, header
  still visible); turn off again (button absent, header still visible); persists across reload
  (`Global.SavePrefs`); with a scoped room active, the button targets that room; in all-notes/unscoped mode, the
  button targets `GetCurrentRoom()` (matching `/note`'s own target), and is disabled if neither resolves.
- Input-dialog gates preserved: `disabledTypeToClose: true`, no forced mobile autofocus, real tap/type/submit,
  trimmed non-empty bounded text rejected/accepted correctly.

## 5. Add-note button preference (final spec, operator-directed correction to codex's original placement suggestion)

- `Global.Prefs.ShowNotesAddButton`, default **false**.
- Location: a general **Interface/Accessibility** area of the app's Options/Settings surface - **not** grouped
  with the map-specific options (Map animation / Help on start / Assume return paths). If the existing Options
  dialog has no such grouping today, add a distinct heading for it there; this is an implementation detail for
  whoever builds it, not a design blocker.
- Label: "Show Add note button in Notes" (or equivalent wording decided at implementation time).
- Effect, precisely scoped: toggling this preference shows or hides **only** the small button described in
  section 2.5 - it never hides, collapses, or removes the Notes header/section itself (which is permanent and
  always visible regardless of this preference or note count); it never affects note-icon visibility anywhere;
  it never affects the Known-Rooms hold/right-click gesture or the `/note` slash command.
- Target rule when the button is shown and pressed: if `NotesScopeRoomKey` is set, target that scoped room; in
  all-notes/unscoped mode, target `ParchLockMap.GetCurrentRoom()` (exactly matching what `/note` already does) -
  no room-picker UI. Disable the button if neither target resolves to a real room.
- Applies immediately on toggle and persists via `Global.SavePrefs` (same mechanism every other preference in
  this app already uses).
- USER_GUIDE/Help text updates to describe both paths: Known-Room hold/right-click, and (when enabled) the
  optional header button shortcut.
