# Community announcement draft (R4) - for operator review

## intfiction.org forum post (category: Technical Development / Interpreters)

**Subject:** ParchLock: a free touch-and-map interface for Z-machine games (Android + desktop)

Hi all,

I've been building **ParchLock**, a free, non-commercial front end for classic interactive fiction, based on Roy Lazarovich's Parchmap and running on Parchment's interpreters.

The idea: keep the story exactly as written, but read the game's own data (the Z-machine object table, attributes and exits) to add a layer for phones and new players:

- an automatic map built from the rooms and exits the game defines, with "?" hints for exits you haven't walked yet;
- underlined objects in the text, with a long-press menu of actions that fit the object (open, take, wear, put in, and so on);
- an Equipment screen for what you carry and wear;
- notes, voice input and narration.

It comes with 75 freely licensed stories and plays your own Z-machine files. Glulx files also play, but story-only for now (no map or object layer).

It's free on itch.io (Android APK + desktop), with source on GitHub: [links]

I'd especially welcome reports where the map or the object menus get something wrong in a particular game. It decodes each game's data generically, so odd library versions are the most useful test cases.

Thanks to Roy Lazarovich for Parchmap and to the Parchment and interpreter authors.

- Hymlock Groves

## IFDB listing (as a tool / interpreter entry)

- **Title:** ParchLock
- **Author:** Hymlock Groves
- **Type:** Interpreter / play tool (not a game)
- **Platforms:** Android, browser/desktop
- **Formats:** Z-machine (z3/z5/z8, zblorb); Glulx story-only
- **Licence:** free, non-commercial; source available
- **Link:** itch.io page (R2), GitHub releases (R3)
- **Description:** short version of the itch.io description.
