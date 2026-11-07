/* ParchLock pronunciation catalog -- the ONE place spoken-text respellings live.
 *
 * Applied by ReadAloud.applyPronunciations AFTER ReadAloud.normalizeSpokenCaps,
 * so it sees text whose ALL-CAPS words of 4+ letters are already Capitalised and
 * whose known initialisms (AI, UI, TTS, NPC, GPS ...) are already letter-spoken.
 * Plain-text respellings work identically in Android native TTS and Web Speech;
 * neither engine accepts phoneme notation (ARPAbet/IPA), so CMUdict-style data
 * is not used -- both engines ship large lexicons of their own, and this file
 * only corrects what they get wrong.
 *
 * Compiled 2026-10-06 from the operator's projects (searched C:\Users\hymlo\
 * Downloads\Projects and D:\Projects). Sources found:
 *   - Parchmap  js/ReadAloud.js        anchor (D109), slaver (operator)
 *   - Star Slug client/js/tts-manager.js SPOKEN_ABBREVIATION_RULES
 * Nothing else in those trees held pronunciation rules (Cwars, Ensouled/
 * Mantella, EldritchInquiryAI, DragonbornLogbook checked: no respelling tables).
 *
 * Star Slug rules NOT carried over, and why (interactive fiction prints
 * ordinary words in capitals -- "AT THE CASTLE" -- so a short all-caps token
 * must never be expanded unless it is unambiguous):
 *   AT, DT, AP, DP, DC, RP, DEF, ATK, SPD, KB, GP, PR, HOST, STA, STD, SDP,
 *   EPU, TL, "Guardian AP", "AP/Stats", ISRC  -- Star Slug game terms or
 *       ordinary words/abbreviations with other meanings here;
 *   EVA -- also a character name;
 *   AI, UI, TTS -- this project deliberately letter-spells them
 *       (normalizeSpokenCaps; harness/d100-live-turns "known initialisms").
 *
 * Each entry: { id, re, to, source, examples: [[input, expected], ...] }.
 * `to` is a string or a function (case-preserving respellings).
 * Add an entry whenever a mispronunciation is heard; keep examples current --
 * harness/pronunciation-catalog.js checks every example.
 */
var PronunciationCatalog = (function () {
    "use strict";
    var keepCase = function (lower) {
        return function (word) {
            if (word === word.toUpperCase() && word.length > 1) return lower.charAt(0).toUpperCase() + lower.slice(1);
            return word.charAt(0) === word.charAt(0).toUpperCase() ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
        };
    };
    var ENTRIES = [
        // ---- Parchmap (in-project) ----
        { id: "anchor", re: /\banchor/gi, source: "Parchmap D109",
          to: function (stem) { return stem.charAt(0) === "A" ? "Anker" : "anker"; },
          examples: [["an anchor", "an anker"], ["Anchorhead", "Ankerhead"], ["anchovy", "anchovy"], ["ranch", "ranch"]] },
        { id: "slaver", re: /\bslaver(?=s?\b|'s\b|s'(?:\W|$))/gi, source: "Parchmap (operator 2026-10-06)",
          to: keepCase("slayver"),
          examples: [["the Slaver King", "the Slayver King"], ["Treasures of a Slaver's Kingdom", "Treasures of a Slayver's Kingdom"],
                     ["the slavers fled", "the slayvers fled"], ["slavery", "slavery"], ["slavering jaws", "slavering jaws"], ["a slave", "a slave"]] },

        // ---- Star Slug client/js/tts-manager.js (general rules only) ----
        // Subscript two (U+2082) is not a word character, so a trailing \b would
        // fail before a space or the end; (?!\w) holds for both forms (#1559).
        { id: "co2", re: /\bCO(?:2|\u2082)(?!\w)/g, to: "carbon dioxide", source: "Star Slug", examples: [["CO2 levels", "carbon dioxide levels"], ["CO\u2082 levels", "carbon dioxide levels"]] },
        { id: "o2", re: /\bO(?:2|\u2082)(?!\w)/g, to: "oxygen", source: "Star Slug", examples: [["low O2", "low oxygen"], ["low O\u2082.", "low oxygen."]] },
        { id: "kod", re: /\bKO(?:'|\u2019)d\b/g, to: "knocked out", source: "Star Slug", examples: [["you are KO'd", "you are knocked out"]] },
        { id: "ko", re: /\bKO\b/g, to: "knockout", source: "Star Slug", examples: [["a KO", "a knockout"]] },
        { id: "emp", re: /\bEMP\b/g, to: "electromagnetic pulse", source: "Star Slug", examples: [["the EMP fired", "the electromagnetic pulse fired"]] },
        { id: "na", re: /\bN\s*\/\s*A\b/gi, to: "not applicable", source: "Star Slug", examples: [["Score: N/A", "Score: not applicable"]] },
        { id: "fps", re: /\bFPS\b/g, to: "frames per second", source: "Star Slug", examples: [["60 FPS", "60 frames per second"]] },
        { id: "lan", re: /\bLAN\b/g, to: "local area network", source: "Star Slug", examples: [["the LAN", "the local area network"]] },
        { id: "pvp", re: /\bPVP\b/gi, to: "player versus player", source: "Star Slug", examples: [["PvP", "player versus player"]] },
        { id: "pve", re: /\bPVE\b/gi, to: "player versus environment", source: "Star Slug", examples: [["PvE", "player versus environment"]] },
        { id: "bpm", re: /\bBPM\b/g, to: "beats per minute", source: "Star Slug", examples: [["120 BPM", "120 beats per minute"]] },
        { id: "iq", re: /\bIQ\b/g, to: "I. Q.", source: "Star Slug (letter-spoken here)", examples: [["his IQ", "his I. Q."]] },
        { id: "hp", re: /\bHP\b/g, to: "hit points", source: "Star Slug (IF wording)", examples: [["10 HP", "10 hit points"]] },
        { id: "vs", re: /\bvs\.?(?=\s|$)/gi, to: "versus", source: "Star Slug", examples: [["Ork vs. Elf", "Ork versus Elf"], ["canvas", "canvas"]] },
        { id: "mp3", re: /\bMP3\b/g, to: "M P 3", source: "Star Slug", examples: [["an MP3", "an M P 3"]] },
        { id: "ogg", re: /\bOGG\b/g, to: "O G G", source: "Star Slug", examples: [["OGG file", "O G G file"]] },
        { id: "wav", re: /\bWAV\b/g, to: "wave", source: "Star Slug", examples: [["WAV file", "wave file"]] },
        { id: "m4a", re: /\bM4A\b/g, to: "M 4 A", source: "Star Slug", examples: [["M4A", "M 4 A"]] },
        { id: "aac", re: /\bAAC\b/g, to: "A A C", source: "Star Slug", examples: [["AAC", "A A C"]] },
        { id: "flac", re: /\bFLAC\b/gi, to: "flac", source: "Star Slug", examples: [["FLAC", "flac"]] }
    ];

    function apply(text) {
        var out = String(text || "");
        ENTRIES.forEach(function (e) { out = out.replace(e.re, e.to); });
        return out;
    }

    return { entries: ENTRIES, apply: apply };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PronunciationCatalog;
