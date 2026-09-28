/* ZRamReader - deterministic Z-machine structural reads from live MemoryView or byte array */
var ZRamReader = {
    u8: (mem, a) => {
        if (!mem) return 0;
        if (typeof mem.getUint8 === "function") return mem.getUint8(a) & 0xff;
        return (mem[a] || 0) & 0xff;
    },
    u16: (mem, a) => ((ZRamReader.u8(mem, a) << 8) | ZRamReader.u8(mem, a + 1)) >>> 0,

    header: (mem) => {
        if (!mem) return null;
        var ver = ZRamReader.u8(mem, 0);
        if (ver < 1 || ver > 8) return null;
        return {
            version: ver,
            himem: ZRamReader.u16(mem, 4),
            dict: ZRamReader.u16(mem, 8),
            objTable: ZRamReader.u16(mem, 10),
            globals: ZRamReader.u16(mem, 12),
            staticMem: ZRamReader.u16(mem, 14),
            abbrev: ZRamReader.u16(mem, 24),
            entrySize: ver <= 3 ? 9 : 14,
            defaultsWords: ver <= 3 ? 31 : 63
        };
    },

    objectCount: (mem, h) => {
        h = h || ZRamReader.header(mem);
        if (!h) return 0;
        var first = h.objTable + h.defaultsWords * 2;
        var max = 0;
        for (var id = 1; id < 20000; id++) {
            var base = first + (id - 1) * h.entrySize;
            if (base + h.entrySize > (mem.byteLength || 0x7fffffff)) break;
            var parent, sibling, child, props;
            if (h.version <= 3) {
                parent = ZRamReader.u8(mem, base + 4);
                sibling = ZRamReader.u8(mem, base + 5);
                child = ZRamReader.u8(mem, base + 6);
                props = ZRamReader.u16(mem, base + 7);
            } else {
                parent = ZRamReader.u16(mem, base + 6);
                sibling = ZRamReader.u16(mem, base + 8);
                child = ZRamReader.u16(mem, base + 10);
                props = ZRamReader.u16(mem, base + 12);
            }
            if (!props || props >= (mem.byteLength || props + 1)) break;
            if (parent > 20000 || sibling > 20000 || child > 20000) break;
            max = id;
        }
        return max;
    },

    objectBase: (h, id) => h.objTable + h.defaultsWords * 2 + (id - 1) * h.entrySize,

    objectLinks: (mem, id) => {
        var h = ZRamReader.header(mem);
        if (!h || id < 1) return null;
        var count = ZRamReader.objectCount(mem, h);
        if (id > count) return null;
        var b = ZRamReader.objectBase(h, id);
        if (h.version <= 3) {
            return {
                id: id,
                parent: ZRamReader.u8(mem, b + 4),
                sibling: ZRamReader.u8(mem, b + 5),
                child: ZRamReader.u8(mem, b + 6),
                props: ZRamReader.u16(mem, b + 7),
                attrBytes: [ZRamReader.u8(mem, b), ZRamReader.u8(mem, b + 1), ZRamReader.u8(mem, b + 2), ZRamReader.u8(mem, b + 3)]
            };
        }
        return {
            id: id,
            parent: ZRamReader.u16(mem, b + 6),
            sibling: ZRamReader.u16(mem, b + 8),
            child: ZRamReader.u16(mem, b + 10),
            props: ZRamReader.u16(mem, b + 12),
            attrBytes: [
                ZRamReader.u8(mem, b), ZRamReader.u8(mem, b + 1), ZRamReader.u8(mem, b + 2),
                ZRamReader.u8(mem, b + 3), ZRamReader.u8(mem, b + 4), ZRamReader.u8(mem, b + 5)
            ]
        };
    },

    isLocationObject: (mem, id, playerId) => {
        if (!Number.isInteger(id) || id < 1 || id === playerId) return false;
        var obj = ZRamReader.objectLinks(mem, id);
        if (!obj) return false;
        var count = ZRamReader.objectCount(mem);
        if (id > count) return false;
        if ([obj.parent, obj.child, obj.sibling].some(function (v) { return v < 0 || v > count; })) return false;
        var name = ZRamReader.shortName(mem, id);
        if (String(name || "").charAt(0) === "(") return false;
        if (/^(class|object|routine|string|kind|nothing|compass|compassdirection|directions?)$/i.test(name)) return false;
        // Inform class instances are children of the actual Class metaclass.
        if (obj.parent && /^class$/i.test(ZRamReader.shortName(mem, obj.parent))) return false;
        return true;
    },

    enclosingRoom: (mem, playerId) => {
        var obj = ZRamReader.objectLinks(mem, playerId), seen = {};
        seen[playerId] = true;
        for (var depth = 0; obj && obj.parent && depth < 64; depth++) {
            var id = obj.parent;
            if (seen[id] || !ZRamReader.isLocationObject(mem, id, playerId)) return 0;
            seen[id] = true;
            obj = ZRamReader.objectLinks(mem, id);
            // Inform attribute positions are not the Infocom/ZIL ABI.
            // Preserve native containment unless this decoder's profile applies.
            if (!ZRamReader.isInformCompiled(mem)) return id;
            var attrs = ZRamReader.attrsFromObject(mem, id);
            if (!attrs.enterable || (!attrs.container && !attrs.supporter)) return id;
        }
        return 0;
    },

    // Inform tables.c: object properties, class IDs + zero, identifier count,
    // property-name packed strings, then 48 attribute-name packed strings.
    // Read declarations, never infer semantics from object names or played verbs.
    _attributeNamesCache: new WeakMap(),
    informAttributeNames: (mem) => {
        if (!mem || typeof mem !== "object") return null;
        // D192 (grok round 2): key the cache on the underlying BUFFER, not on
        // the DataView. ZRamProvider.getMem() constructs a new DataView on every
        // call, so a WeakMap keyed on `mem` never hit and this table was
        // re-parsed on every Refresh -- roughly a hundred times a turn -- while
        // the comment claimed it was cached per memory instance.
        var cacheKey = (mem && mem.buffer) || mem;
        if (ZRamReader._attributeNamesCache.has(cacheKey)) return ZRamReader._attributeNamesCache.get(cacheKey);
        var result = null;
        try {
            var h = ZRamReader.header(mem), len = mem.byteLength || mem.length || 0;
            if (!h || [4, 5, 8].indexOf(h.version) < 0 || !ZRamReader.isInformCompiled(mem)) return null;
            var firstObject = ZRamReader.objectBase(h, 1);
            var firstProps = ZRamReader.u16(mem, firstObject + 12);
            var count = (firstProps - firstObject) / h.entrySize, end = 0;
            if (!Number.isInteger(count) || count < 1 || count > 20000 || !len || h.globals >= len) return null;
            for (var id = 1; id <= count; id++) {
                var base = ZRamReader.objectBase(h, id);
                var ptr = ZRamReader.u16(mem, base + 12);
                if (ptr < firstProps || ptr >= h.globals) return null;
                var at = ptr + 1 + 2 * ZRamReader.u8(mem, ptr), previous = 64;
                while (at < h.globals && ZRamReader.u8(mem, at)) {
                    var first = ZRamReader.u8(mem, at++), num = first & 63;
                    if (!num || num >= previous) return null;
                    previous = num;
                    var size = (first & 128) ? (ZRamReader.u8(mem, at++) & 63) || 64 : (first & 64) ? 2 : 1;
                    at += size;
                }
                if (at >= h.globals) return null;
                end = Math.max(end, at + 1);
            }
            var classes = 0, seen = {};
            while (end + 2 <= h.globals) {
                var cls = ZRamReader.u16(mem, end); end += 2;
                if (!cls) break;
                if (cls > count || seen[cls] || ++classes > count) return null;
                seen[cls] = true;
            }
            var properties = ZRamReader.u16(mem, end);
            var namesAt = end + properties * 2;
            if (properties < 64 || namesAt + 96 > h.globals) return null;
            var scale = h.version === 8 ? 8 : 4;
            var decode = function (packed) {
                var address = packed * scale, stop = address;
                if (address < h.himem || address + 2 > len) return null;
                for (var words = 0; words < 40 && stop + 2 <= len; words++, stop += 2) {
                    if (ZRamReader.u8(mem, stop) & 128) return ZRamReader.decodeZsc(mem, address, words + 1);
                }
                return null;
            };
            if (decode(ZRamReader.u16(mem, end + 2)) !== "name") return null;
            var bits = {};
            for (var bit = 0; bit < 48; bit++) {
                var packed = ZRamReader.u16(mem, namesAt + bit * 2);
                if (!packed) continue;
                var entry = decode(packed);
                if (entry === "unknown attribute") continue;
                if (!entry) return null;
                // D193: one bit may carry several declared names. Inform's
                // symbols.c writes every alias for a position into a single
                // slash-separated string -- "door/nolook", "female/absent",
                // "clothing/npc_hidden", "animate/villain". Validating the
                // whole string as one identifier rejected the table outright
                // and sent 20 modules back to the standard profile, which is
                // exactly wrong for a shifted layout like HugeCave.
                var segments = String(entry).split("/");
                for (var seg = 0; seg < segments.length; seg++) {
                    var name = segments[seg];
                    // An empty segment means this string is not a name list;
                    // the table is then untrustworthy as a whole.
                    if (!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)) return null;
                    name = name.toLowerCase();
                    // Several names may share one bit -- that is what an alias
                    // is. One name may NOT claim two different bits: that is a
                    // misread table, not a declaration.
                    if (Object.prototype.hasOwnProperty.call(bits, name) && bits[name] !== bit) return null;
                    bits[name] = bit;
                }
            }
            // Require the complete action-relevant library contract, not an
            // accidental string run or a stripped/partial symbol table.
            // D193 item 2, settled: talkable, supporter and clothing stay OUT
            // of this set, and the measurement is recorded here so nobody has
            // to re-measure to leave them optional. All 225 decoded tables
            // declare all three (225/225), which was the plan's own trigger for
            // promoting them -- and adding them was implemented, audited and
            // REVERTED on grok's audit of 7f76a26. The reason: bitFor OMITS a
            // missing optional flag, which is the right failure for a dialect
            // or a stripped table -- keep the declared map you did parse and
            // leave supporter unset. REQUIRING them turns one missing name into
            // a whole-table reject and a PROFILE fallback, which is exactly the
            // harm D193 removed for HugeCave. 225/225 on this catalog is not a
            // format guarantee: the next shifted table declaring the nine but
            // not `clothing` would be thrown away. A silent omit on a rare
            // table is cheaper than PROFILE overwriting a correct shifted map.
            if (!["animate", "static", "scenery", "container", "open", "openable", "on", "switchable", "worn"].every(function (name) {
                return Object.prototype.hasOwnProperty.call(bits, name);
            })) return null;
            result = { bits: bits, address: namesAt, source: "inform-attribute-names" };
            return result;
        } catch (e) { return null; }
        finally { ZRamReader._attributeNamesCache.set(cacheKey, result); }
    },

    attr: (obj, n) => {
        if (!obj || !obj.attrBytes) return false;
        var byte = obj.attrBytes[Math.floor(n / 8)];
        if (byte === undefined) return false;
        return ((byte >> (7 - (n % 8))) & 1) === 1;
    },

    // ZSCII alphabet tables
    _a0: "abcdefghijklmnopqrstuvwxyz",
    _a1: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    _a2: " \n0123456789.,!?_#'\"/\\-:()",

    // D143: abbreviation expansions must NOT be trimmed.
    //
    // Z-machine abbreviations routinely carry their own surrounding spaces --
    // "small ", " the ", "Canyon " -- and this decoder recursed into itself to
    // expand them, so the inner call's .replace(/\s+/g," ").trim() ate those
    // spaces before they reached the caller. Every ZIL name built from an
    // abbreviation came out welded together: "smallmailbox", "CanyonView",
    // "YourRoom". Whitespace normalisation now happens ONCE, at the top level,
    // and the recursive expansion returns its text untouched.
    decodeZsc: (mem, addr, maxWords) => {
        return ZRamReader._decodeZscRaw(mem, addr, maxWords).replace(/\s+/g, " ").trim();
    },

    _decodeZscRaw: (mem, addr, maxWords) => {
        maxWords = maxWords || 8;
        var alph = 0;
        var out = "";
        var abbrev = false;
        var abbrevZ = 0;
        for (var w = 0; w < maxWords; w++) {
            var word = ZRamReader.u16(mem, addr + w * 2);
            var zchars = [(word >> 10) & 0x1f, (word >> 5) & 0x1f, word & 0x1f];
            for (var i = 0; i < 3; i++) {
                var z = zchars[i];
                if (abbrev) {
                    var h = ZRamReader.header(mem);
                    var table = h ? h.abbrev : 0;
                    var entry = ZRamReader.u16(mem, table + 2 * (32 * (abbrevZ - 1) + z));
                    out += ZRamReader._decodeZscRaw(mem, entry * 2, 12);
                    abbrev = false;
                    continue;
                }
                if (z === 0) { out += " "; continue; }
                if (z >= 1 && z <= 3) { abbrev = true; abbrevZ = z; continue; }
                if (z === 4) { alph = 1; continue; }
                if (z === 5) { alph = 2; continue; }
                if (z === 6 && alph === 2) {
                    // next two zchars form ZSCII - simplified skip
                    alph = 0;
                    continue;
                }
                var set = alph === 0 ? ZRamReader._a0 : (alph === 1 ? ZRamReader._a1 : ZRamReader._a2);
                var idx = z - 6;
                if (idx >= 0 && idx < set.length) out += set.charAt(idx);
                alph = 0;
            }
            if (word & 0x8000) break;
        }
        return out;
    },

    shortName: (mem, id) => {
        var obj = ZRamReader.objectLinks(mem, id);
        if (!obj || !obj.props) return "";
        var textLen = ZRamReader.u8(mem, obj.props);
        if (textLen <= 0 || textLen > 32) return "";
        return ZRamReader.decodeZsc(mem, obj.props + 1, textLen);
    },

    children: (mem, id) => {
        var obj = ZRamReader.objectLinks(mem, id);
        if (!obj || !obj.child) return [];
        var out = [];
        var cur = obj.child;
        var guard = 0;
        while (cur && guard++ < 512) {
            out.push(cur);
            var n = ZRamReader.objectLinks(mem, cur);
            cur = n ? n.sibling : 0;
        }
        return out;
    },

    // Inform-6 Standard Library 6.12.2 direction-property profile.
    // THIS IS A PROFILE, NOT A UNIVERSAL ABI.
    // PRODUCTION_PLAN.md / AttributeSchema.js: I7 / PunyInform / Infocom / $NUM_ATTR_BYTES
    // shift layouts. Do not guess a compass word for an unmapped property (D23).
    //
    // Numbering is declaration order in inform6lib 6.12.2 `linklpa.h`
    // (DavidGriffith/inform6lib). The compiler reserves properties 1-3
    // (`name` plus two internals); the library's first property is `before`=4,
    // so `n_to` is 7. The library itself asserts this:
    //   #Iffalse (7 >= n_to);
    // Live Advent.z5 (I6) End Of Road confirms: 7=n/forest, 8=s/valley,
    // 9=e/building, 10=w/hill, 15=u/hill, 16=d/valley, 17=in/building.
    // 6.12.2 order of diagonals is ne, nw, se, sw (nw before se; 6/10 had se before nw).
    directionProps: {
        SOURCE: "Inform 6 Standard Library 6.12.2 linklpa.h (https://github.com/DavidGriffith/inform6lib)",
        PROFILE_ID: "i6-lib-6.12.2-linklpa-dirs",
        PROFILE: {
            7: "north",
            8: "south",
            9: "east",
            10: "west",
            11: "northeast",
            12: "northwest",
            13: "southeast",
            14: "southwest",
            15: "up",
            16: "down",
            17: "in",
            18: "out"
        },
        // Scan window for object-valued props that may be exits even when the
        // stock profile does not name them (numbered/custom). Unmapped labels
        // stay "exit-N" rather than a guessed compass word.
        candidates: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
        // Per this file's own header comment: the ONLY documented variance
        // between known I6 library revisions is the nw/se diagonal order
        // (12/13 swapped -- ne=11 and sw=14 are stable either way). This is
        // NOT knowable in advance for an arbitrary story -- it must be
        // calibrated from real evidence (an actual typed move that
        // confirms which word reaches a known destination -- see
        // MapTopology.applyStateDelta / calibrateDiagonalFromTravel).
        // diagonalCalibrated is false until that evidence exists (this
        // session, or a prior session of the same exact game file --
        // see hydrateDiagonalCalibration/persistDiagonalCalibration).
        // While uncalibrated, directionLabelForProp deliberately does NOT
        // assert either compass word (D24/D25: never present a guess as if
        // it were confirmed) -- a wrong compass label is worse than an
        // honest "unconfirmed" one, especially because the map's compass
        // grid has exactly one fixed physical slot per direction and
        // cannot un-render a wrongly-placed box after the fact.
        diagonalSwapped: false,
        diagonalCalibrated: false,
        hydratedForGame: null
    },

    // Z-machine header release number (u16 @ $02) + 6-byte ASCII serial
    // (@ $12) identify this exact compiled game file -- the same signal
    // already used elsewhere for save/story identity. Used only to key a
    // LEARNED calibration (never to guess one); two different games never
    // share a key by coincidence in practice (release+serial is Inform's
    // own recommended unique-build identifier).
    gameIdentityKey: (mem) => {
        try {
            if (!mem) return null;
            var release = ZRamReader.u16(mem, 0x02);
            var serial = "";
            for (var i = 0; i < 6; i++) serial += String.fromCharCode(ZRamReader.u8(mem, 0x12 + i));
            if (!release && !/[0-9]/.test(serial)) return null;
            return release + "-" + serial;
        } catch (e) { return null; }
    },

    // Once per session per game file: if THIS exact game was ever
    // calibrated before (this session or a prior one, persisted below),
    // restore that real evidence immediately instead of starting neutral
    // again. This is what lets a "fresh copy" of an already-solved game
    // show the correct compass slot from the very first look, without
    // waiting for the player to happen to travel the right direction
    // again -- still 100% evidence-derived, just remembered across visits
    // to the same compiled file rather than rediscovered every time.
    hydrateDiagonalCalibration: (mem) => {
        var dp = ZRamReader.directionProps;
        var key = ZRamReader.gameIdentityKey(mem);
        if (!key || dp.hydratedForGame === key) return;
        dp.hydratedForGame = key;
        try {
            if (typeof localStorage === "undefined") return;
            var raw = localStorage.getItem("PL_DiagonalCalib_" + key);
            if (!raw) return;
            var saved = JSON.parse(raw);
            if (saved && typeof saved.swapped === "boolean") {
                dp.diagonalSwapped = saved.swapped;
                dp.diagonalCalibrated = true;
            }
        } catch (e) {}
    },

    persistDiagonalCalibration: (mem) => {
        try {
            if (typeof localStorage === "undefined") return;
            var key = ZRamReader.gameIdentityKey(mem);
            if (!key) return;
            localStorage.setItem("PL_DiagonalCalib_" + key, JSON.stringify({ swapped: ZRamReader.directionProps.diagonalSwapped }));
        } catch (e) {}
    },

    directionLabelForProp: (propNum) => {
        var dp = ZRamReader.directionProps || {};
        if ((propNum === 12 || propNum === 13) && !dp.diagonalCalibrated) {
            return "exit-" + propNum;
        }
        var profile = dp.PROFILE || {};
        var named = profile[propNum];
        if (dp.diagonalSwapped) {
            if (propNum === 12) named = profile[13];
            else if (propNum === 13) named = profile[12];
        }
        return named || ("exit-" + propNum);
    },

    // Called with LIVE evidence only: a real typed compass direction that
    // just moved the player to a specific destination room id, which is
    // the SAME destination prop 12 or 13 structurally resolves to on the
    // room they just left (destRoomId===hintedDestRoomId, never a name/
    // text match). Sets (not toggles) diagonalSwapped by comparing the
    // typed word against this file's raw, unswapped PROFILE baseline for
    // that prop, marks the story calibrated so future lookaheads assert a
    // real compass word instead of the neutral "exit-N" placeholder, and
    // persists the result keyed to this exact game file.
    calibrateDiagonalFromTravel: (propNum, typedDirectionLabel, destRoomId, hintedDestRoomId) => {
        if (propNum !== 12 && propNum !== 13) return false;
        if (destRoomId == null || hintedDestRoomId == null || String(destRoomId) !== String(hintedDestRoomId)) return false;
        var isDiagonalWord = typedDirectionLabel === "northwest" || typedDirectionLabel === "southeast";
        if (!isDiagonalWord) return false;
        var baseline = ZRamReader.directionProps.PROFILE[propNum];
        ZRamReader.directionProps.diagonalSwapped = (baseline !== typedDirectionLabel);
        ZRamReader.directionProps.diagonalCalibrated = true;
        try {
            if (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) {
                ZRamReader.persistDiagonalCalibration(ZRamProvider.getMem());
            }
        } catch (e) {}
        return true;
    },

    readProp: (mem, id, propNum) => {
        var obj = ZRamReader.objectLinks(mem, id);
        if (!obj || !obj.props) return null;
        var h = ZRamReader.header(mem);
        var addr = obj.props;
        var textLen = ZRamReader.u8(mem, addr);
        addr += 1 + textLen * 2;
        var guard = 0;
        while (guard++ < 64) {
            var sizebyte = ZRamReader.u8(mem, addr);
            if (sizebyte === 0) break;
            var num, sz, dataAddr;
            if (h.version <= 3) {
                num = sizebyte & 0x1f;
                sz = (sizebyte >> 5) + 1;
                dataAddr = addr + 1;
                addr = dataAddr + sz;
            } else {
                num = sizebyte & 0x3f;
                if (sizebyte & 0x80) {
                    var sizebyte2 = ZRamReader.u8(mem, addr + 1);
                    sz = sizebyte2 & 0x3f;
                    if (sz === 0) sz = 64;
                    dataAddr = addr + 2;
                    addr = dataAddr + sz;
                } else {
                    sz = (sizebyte & 0x40) ? 2 : 1;
                    dataAddr = addr + 1;
                    addr = dataAddr + sz;
                }
            }
            if (num === propNum) {
                if (sz === 1) return ZRamReader.u8(mem, dataAddr);
                if (sz >= 2) return ZRamReader.u16(mem, dataAddr);
                return null;
            }
        }
        return null;
    },

    listProps: (mem, id) => {
        var obj = ZRamReader.objectLinks(mem, id);
        if (!obj || !obj.props) return [];
        var h = ZRamReader.header(mem);
        var addr = obj.props;
        var textLen = ZRamReader.u8(mem, addr);
        addr += 1 + textLen * 2;
        var out = [];
        var guard = 0;
        while (guard++ < 64) {
            var sizebyte = ZRamReader.u8(mem, addr);
            if (sizebyte === 0) break;
            var num, sz, dataAddr;
            if (h.version <= 3) {
                num = sizebyte & 0x1f;
                sz = (sizebyte >> 5) + 1;
                dataAddr = addr + 1;
                addr = dataAddr + sz;
            } else {
                num = sizebyte & 0x3f;
                if (sizebyte & 0x80) {
                    var sizebyte2 = ZRamReader.u8(mem, addr + 1);
                    sz = sizebyte2 & 0x3f;
                    if (sz === 0) sz = 64;
                    dataAddr = addr + 2;
                    addr = dataAddr + sz;
                } else {
                    sz = (sizebyte & 0x40) ? 2 : 1;
                    dataAddr = addr + 1;
                    addr = dataAddr + sz;
                }
            }
            var value = null;
            if (sz === 1) value = ZRamReader.u8(mem, dataAddr);
            else if (sz >= 2) value = ZRamReader.u16(mem, dataAddr);
            out.push({ num: num, sz: sz, value: value, dataAddr: dataAddr });
        }
        return out;
    },

    // I7 individual-property table at obj.3 (Inform Technical Manual
    // IndivTable): word prop-num, byte length, then `length` data bytes.
    // Terminated by a zero prop-num word. Property 3 is a byte address,
    // not an object id — that is the indirect table-pointer.
    parseIndivTable: (mem, ptr) => {
        var len = (mem && (mem.byteLength || mem.length)) || 0;
        var out = {};
        if (!ptr || ptr < 16 || ptr + 3 >= len) return out;
        var x = ptr;
        var guard = 0;
        while (guard++ < 80) {
            if (x + 3 >= len) break;
            var propNum = ZRamReader.u16(mem, x);
            if (propNum === 0) break;
            var sz = ZRamReader.u8(mem, x + 2);
            if (sz > 64) break;
            var dataAddr = x + 3;
            if (dataAddr + sz > len) break;
            var val = null;
            if (sz === 1) val = ZRamReader.u8(mem, dataAddr);
            else if (sz >= 2) val = ZRamReader.u16(mem, dataAddr);
            out[propNum] = val;
            x += 3 + sz;
        }
        return out;
    },

    // True when ptr decoded as an I7 IndivTable (Inform: individual
    // properties are numbered from 64; common properties occupy 1-63).
    isIndivTable: (table) => {
        if (!table) return false;
        var keys = Object.keys(table);
        if (keys.length < 2) return false;
        for (var i = 0; i < keys.length; i++) {
            if ((+keys[i]) < 64) return false;
        }
        return true;
    },

    // Direction objects are the children of a compass-like parent:
    // many siblings, same kind (common prop 2), each carrying door_dir
    // (common prop 21) as a property number. No short-name matching.
    directionDoorDirs: (mem) => {
        var h = ZRamReader.header(mem);
        if (!h) return [];
        var count = ZRamReader.objectCount(mem, h);
        var best = [];
        var limit = Math.min(count, 96);
        for (var id = 1; id <= limit; id++) {
            var kids = ZRamReader.children(mem, id);
            if (kids.length < 8) continue;
            var slots = [];
            var seen = {};
            var kind0 = 0;
            var good = true;
            for (var i = 0; i < kids.length; i++) {
                var dd = ZRamReader.readProp(mem, kids[i], 21);
                var kind = ZRamReader.readProp(mem, kids[i], 2);
                if (!(dd >= 1 && dd <= 255) || !kind) { good = false; break; }
                if (!kind0) kind0 = kind;
                else if (kind !== kind0) { good = false; break; }
                if (!seen[dd]) {
                    seen[dd] = 1;
                    slots.push(dd);
                }
            }
            if (good && slots.length >= 8 && slots.length > best.length) best = slots;
        }
        return best;
    },

    // D35: validates a candidate door_dir DESTINATION purely structurally --
    // in range, its own property 3 decodes as a real I7 individual-property
    // table (isIndivTable: all keys >=64, the I7 common/individual boundary),
    // and that table shares at least one of the SAME numbered door_dir keys
    // the current room's own compass already uses. No parent check, no
    // name/short-name/compass-word matching, no reverse-edge requirement --
    // real live evidence found non-room in-range indiv values (e.g.
    // indiv[81]=Routine) that this must correctly refuse, and real rooms
    // whose own indiv table shares a door_dir key that this must accept.
    destIsMapRoom: (mem, id, count, doorDirs) => {
        if (!(id >= 1 && id <= count)) return false;
        var ptr = ZRamReader.readProp(mem, id, 3);
        var table = ZRamReader.parseIndivTable(mem, ptr);
        if (!ZRamReader.isIndivTable(table)) return false;
        var keys = Object.keys(table).map(Number);
        return (doorDirs || []).some(function (dd) { return keys.indexOf(dd) >= 0; });
    },

    // Inform 6/7 writes the compiler version at header $3C ("6.31").
    // Early Inform (curses 1995) leaves those bytes zero; Infocom v5
    // Hitchhik/Border Zone also have no stamp but encode compass words
    // as verbs (n flags=19). Unstamped files are Inform only when a
    // compass word is present and not verb-flagged.
    // D61: js/ZRamReader.js's whole direction-PROPERTY-NUMBER scanning
    // apparatus (directionProps.PROFILE 7-18, the wider `candidates`
    // range, the generic "any parent=0 object with children" fallback
    // loop, and the I7 door_dir/IndivTable convention) is entirely an
    // Inform-6/7 compiler convention -- none of it is part of the
    // Z-machine spec itself. A pre-Inform, ZIL-compiled classic Infocom
    // game (Zork 1/2/3, v3 header) uses a COMPLETELY different property
    // layout; live-confirmed on Zork1's West of House: properties 25/27/
    // 28/29/31 (well inside the assumed "candidates" range) coincidentally
    // hold valid-looking object ids for entirely unrelated reasons and
    // were misread as five bogus "exit-N" phantom exits, while the real
    // n/s/e/w properties (wherever ZIL actually puts them) are nowhere in
    // this range at all. This is not a per-story quirk to special-case --
    // it's a structural fact about the whole class of pre-Inform games,
    // so the fix is a single, generic, self-detecting gate: only trust
    // ANY Inform-specific property-number assumption once this exact game
    // file is structurally confirmed to be Inform-compiled (the same real
    // compiler-stamp signal `informDictionaryLayout` already established
    // for the D34 dictionary-verb work, generalized into its own reusable
    // check and cached once per game since it's a whole-file constant,
    // not a per-room/per-tick fact). A non-Inform game simply gets no
    // pre-travel exit hints from this mechanism (D24: honest absence, not
    // a guess) -- MapTopology's state-delta labeling (the real typed
    // command, confirmed by actual travel) already handles exit discovery
    // for ANY compiler, Inform or not, and is completely unaffected.
    // Cached per memory-buffer OBJECT (a WeakMap, not a single flag) --
    // this is a whole-game constant fact, safe to cache for repeated calls
    // against the SAME live mem view, but a single module-level flag would
    // incorrectly persist across a different game's mem buffer within the
    // same JS process (never an issue in the real browser, where each
    // `?story=` load is a fresh page/fresh module state, but a real
    // correctness risk for any test harness or multi-game process that
    // reuses this module against more than one mem buffer).
    _informCompiledCache: (typeof WeakMap !== "undefined") ? new WeakMap() : null,
    isInformCompiled: (mem) => {
        var cache = ZRamReader._informCompiledCache;
        if (cache && mem && cache.has(mem)) return cache.get(mem);
        var result = false;
        try {
            var a = ZRamReader.u8(mem, 0x3C);
            var b = ZRamReader.u8(mem, 0x3D);
            if ((a === 0x36 || a === 0x37) && b === 0x2E) {
                result = true;
            } else if (typeof ZRamReader.parseDictionary === "function") {
                var dict = ZRamReader.parseDictionary(mem);
                result = ZRamReader.informDictionaryLayout(mem, dict && dict.entries);
            }
        } catch (e) { result = false; }
        if (cache && mem) cache.set(mem, result);
        return result;
    },

    // D64: reverse dictionary lookup (word address -> lowercase text),
    // cached per memory buffer exactly like isInformCompiled -- a
    // whole-game constant, safe to reuse across calls against the same
    // live mem view.
    _reverseDictCache: (typeof WeakMap !== "undefined") ? new WeakMap() : null,
    // D142: object vocabulary for ANY compiler, not just Inform.
    //
    // D64's parserWords reads Inform's compiler-reserved property 1 and is
    // correctly gated to Inform (property numbering below 4 is an Inform fact).
    // That left the whole ZIL/Infocom catalog with aliases:[] -- no command
    // nouns, no disambiguation, no way to tell three same-named objects apart.
    //
    // This finds a word list WITHOUT assuming any property number, by using a
    // property that can verify itself: a ZIL/Inform vocabulary property is an
    // array of 2-byte DICTIONARY ADDRESSES, so every slot must land exactly on
    // a real dictionary entry. A property holding anything else -- a routine
    // address, a room number, a flag word -- fails that test almost immediately.
    // Nothing is assumed about which property number holds vocabulary; the data
    // proves it or it is ignored (D24/D61).
    parserWordsStructural: (mem, id) => {
        try {
            var rev = ZRamReader.reverseDictionary(mem);
            if (!rev) return [];
            var props = ZRamReader.listProps(mem, id) || [];
            var seen = {}, out = [];
            props.forEach(function (pr) {
                // Word lists are arrays of 2-byte entries. An odd length, or a
                // single byte, cannot be one.
                if (!pr || pr.sz < 2 || (pr.sz % 2) !== 0) return;
                var got = [];
                for (var k = 0; k < pr.sz; k += 2) {
                    var addr = ZRamReader.u16(mem, pr.dataAddr + k);
                    var w = rev[addr];
                    if (!w) return;                 // one bad slot disqualifies the whole property
                    got.push(String(w).toLowerCase());
                }
                got.forEach(function (w) {
                    if (w && !seen[w]) { seen[w] = 1; out.push(w); }
                });
            });
            return out;
        } catch (e) { return []; }
    },

    // Every real parser word for this object, whichever compiler built it.
    // Inform keeps its proven D64 path exactly; anything else gets the
    // self-verifying scan above instead of an empty list.
    parserWordsAny: (mem, id) => {
        var words = [];
        try { words = ZRamReader.parserWords(mem, id) || []; } catch (e) {}
        if (words && words.length) return words;
        return ZRamReader.parserWordsStructural(mem, id);
    },

    reverseDictionary: (mem) => {
        var cache = ZRamReader._reverseDictCache;
        if (cache && mem && cache.has(mem)) return cache.get(mem);
        var rev = {};
        try {
            var dict = ZRamReader.parseDictionary(mem);
            Object.keys(dict.words).forEach(function (w) { rev[dict.words[w]] = w; });
        } catch (e) {}
        if (cache && mem) cache.set(mem, rev);
        return rev;
    },

    // D64: an object's structural short-name (the Z-machine object-header
    // text `shortName` decodes) is a DISPLAY string only -- nothing in the
    // Z-machine spec or the Inform library guarantees it is itself real
    // parser vocabulary. The compiler-reserved property 1 (`name`, see the
    // directionProps comment above: "the compiler reserves properties 1-3")
    // is the actual list of dictionary words the parser will accept for
    // this object. Confirmed live on wump2ka.z5.js: an object's shortName
    // decodes to "scrawled note" (a real Z-machine string, but NOT in the
    // dictionary as those two words together) while its property-1 word
    // list includes "scrap", "of", "paper" -- exactly what the room's own
    // printed text calls it, and the only words the real parser accepts.
    // Property numbering below 4 is an Inform-specific compiler fact (same
    // gate already used for the direction-property apparatus), so this is
    // gated on isInformCompiled and returns [] for any other compiler,
    // an honest absence rather than a guess (D24).
    parserWords: (mem, id) => {
        if (!ZRamReader.isInformCompiled(mem)) return [];
        try {
            var props = ZRamReader.listProps(mem, id);
            var p1 = props.find(function (p) { return p.num === 1; });
            if (!p1 || !p1.sz) return [];
            var rev = ZRamReader.reverseDictionary(mem);
            var out = [];
            for (var off = 0; off < p1.sz; off += 2) {
                var addr = ZRamReader.u16(mem, p1.dataAddr + off);
                var w = rev[addr];
                if (w && out.indexOf(w) < 0) out.push(w);
            }
            return out;
        } catch (e) { return []; }
    },

    informDictionaryLayout: (mem, entries) => {
        if (!mem) return false;
        var a = ZRamReader.u8(mem, 0x3C);
        var b = ZRamReader.u8(mem, 0x3D);
        if ((a === 0x36 || a === 0x37) && b === 0x2E) return true;
        var compass = { n: 1, north: 1, s: 1, south: 1, e: 1, east: 1, w: 1, west: 1 };
        var sawNoun = false;
        var list = entries || [];
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (!e || !compass[e.word]) continue;
            if (e.flags & 0x01) return false;
            sawNoun = true;
        }
        return sawNoun;
    },

    // Dictionary parse: map lowercase text -> entry address.
    // Inform 6/7 v4+ packed entries are 6 text bytes + 3 data bytes
    // (entryLen === 9). Bit 0 of the first data byte is the generic
    // verb flag. Infocom layouts use those extra bytes differently, so
    // isVerb is only set when that Inform gate holds (D34 follow-up).
    parseDictionary: (mem) => {
        var h = ZRamReader.header(mem);
        if (!h || !h.dict) return { words: {}, entryLen: 0, count: 0, entries: [], informVerbFlags: false };
        var addr = h.dict;
        var nsep = ZRamReader.u8(mem, addr);
        addr += 1 + nsep;
        var entryLen = ZRamReader.u8(mem, addr);
        var nentries = ZRamReader.u16(mem, addr + 1);
        addr += 3;
        var words = {};
        var entries = [];
        var wordsCount = h.version <= 3 ? 2 : 3;
        var textBytes = wordsCount * 2;
        var maybeInform = h.version >= 4 && entryLen === 9;
        var max = Math.min(nentries, 4000);
        for (var i = 0; i < max; i++) {
            var eaddr = addr + i * entryLen;
            // first 4 or 6 bytes are encoded text (v3: 4 bytes / 2 words, v4+: 6 bytes / 3 words)
            var text = ZRamReader.decodeZsc(mem, eaddr, wordsCount).toLowerCase();
            if (text) words[text] = eaddr;
            if (maybeInform) {
                var word = String(text || "").trim();
                if (!word) continue;
                var flags = ZRamReader.u8(mem, eaddr + textBytes);
                entries.push({
                    word: word,
                    addr: eaddr,
                    flags: flags,
                    isVerb: !!(flags & 0x01)
                });
            }
        }
        var informVerbFlags = maybeInform && ZRamReader.informDictionaryLayout(mem, entries);
        if (!informVerbFlags) entries = [];
        return { words: words, entryLen: entryLen, count: nentries, entries: entries, informVerbFlags: informVerbFlags };
    },

    // D147: "is this word in the game's own dictionary?" -- the one question
    // that can be answered for EVERY compiler, because `words` above is built
    // from decoded entry text and needs no flag byte, unlike `entries`/isVerb
    // which only exist for the Inform layout. Measured: Enchanter (ZIL, v3)
    // yields 723 words, Anchorhead 2257, Advent 786.
    //
    // Cached per game file, because parseDictionary Z-decodes up to 4000
    // entries and the callers below run once per object per render.
    _dictWordCache: null,
    hasDictionaryWord: (mem, word) => {
        var w = String(word || "").toLowerCase().trim();
        if (!w || !mem) return false;
        try {
            var key = ZRamReader.gameIdentityKey ? ZRamReader.gameIdentityKey(mem) : "?";
            var cache = ZRamReader._dictWordCache;
            if (!cache || cache.key !== key) {
                var parsed = ZRamReader.parseDictionary(mem);
                var h = ZRamReader.header(mem);
                cache = ZRamReader._dictWordCache = {
                    key: key,
                    words: parsed.words || {},
                    // v3 stores 6 text characters per entry, v4+ stores 9.
                    cut: (h && h.version <= 3) ? 6 : 9
                };
            }
            if (Object.prototype.hasOwnProperty.call(cache.words, w)) return true;
            // A word longer than the stored entry matches its truncation, which
            // is exactly what the interpreter does to typed input (D144).
            if (w.length > cache.cut) {
                return Object.prototype.hasOwnProperty.call(cache.words, w.slice(0, cache.cut));
            }
            return false;
        } catch (e) { return false; }
    },

    // Find player: prefer global scan heuristics + name tokens
    findRoomsByName: (mem, name) => {
        var want = String(name || "").toLowerCase().replace(/^the\s+/, "").trim();
        if (!want) return [];
        // Reject non-room status tokens (game titles, prompts)
        if (/^(adventure|inform|score|turns|time|serial|release|would you|do you|press|type)$/i.test(want)) return [];
        var h = ZRamReader.header(mem);
        var count = ZRamReader.objectCount(mem, h);
        var hits = [];
        for (var id = 1; id <= count; id++) {
            var nm = (ZRamReader.shortName(mem, id) || "").toLowerCase().replace(/^the\s+/, "").trim();
            if (!nm || nm.charAt(0) === "(") continue;
            if (/^(class|object|compass|compassdirection|direction)$/i.test(nm)) continue;
            if (nm !== want && nm.indexOf(want) < 0 && want.indexOf(nm) < 0) continue;
            var obj = ZRamReader.objectLinks(mem, id);
            if (!obj) continue;
            var kids = ZRamReader.children(mem, id);
            var score = 0;
            if (nm === want) score += 10;
            if (kids.length) score += 20 + Math.min(kids.length, 10);
            if (obj.parent === 0) score += 3;
            if (obj.child) score += 5;
            hits.push({ id: id, name: nm, score: score, kids: kids.length });
        }
        hits.sort(function (a, b) { return b.score - a.score; });
        return hits;
    },

    // A current-location candidate must not be an animate actor (NPC/PC).
    // Confirmed live on Anchorhead: object 287 "Michael" (animate) briefly
    // outscored the real room during early globals scan and poisoned the
    // map as a fake room with a "move" edge -- breaking auto-pathing's
    // "first other room" selection and Known Rooms. Door objects can still
    // be exit destinations (D42); they are not animate.
    // D155: "can this object be the room I am IN, or route TO?" and "can an
    // exit POINT AT this object?" are two different questions, and conflating
    // them cost real exits.
    //
    // D134 was right that a door is never a destination room -- Anchorhead
    // routed auto-travel to "real estate office door" as though it were a
    // place -- and added a door rejection to isPlausibleMapRoom. But
    // MapTopology's exit-application path calls that same predicate, under a
    // comment that states the opposite contract outright: "Doors remain
    // allowed (D42)". Adding the rejection silently broke it, and measured on
    // Anchorhead the look-ahead produced six exits while the map kept two:
    // "east -> real estate office door" and "in -> real estate office door"
    // were discarded, so the door stopped existing as a way out.
    //
    // A door is exactly the thing an exit passes THROUGH, so it is a valid
    // exit target and an invalid room. This predicate answers the second
    // question; isPlausibleMapRoom still answers the first, unchanged.
    isPlausibleExitTarget: (mem, id) => {
        try {
            if (ZRamReader.isPlausibleMapRoom(mem, id)) return true;
            var attrs = ZRamReader.attrsFromObject(mem, id) || {};
            if (!attrs.door) return false;
            // Still refuse a door whose own short-name is meta/internal, so a
            // parenthesised compiler object cannot sneak in through this door.
            var nm = "";
            try { nm = ZRamReader.shortName(mem, id) || ""; } catch (eN) {}
            return !!nm && nm.charAt(0) !== "(";
        } catch (e) { return false; }
    },

    isPlausibleMapRoom: (mem, id, _depth) => {
        if (!(id >= 2)) return false;
        try {
            // D164: an object that sits INSIDE a room is furniture, an item or
            // an actor -- never itself a room. Rooms are the outermost named
            // places; nothing real is nested one inside another.
            //
            // Cutthroats starts the player in bed, and the bed survived every
            // other rejection here because its ZIL bits misread as `light`, so
            // the takeable rule never fired: object 146 "bed" (parent 183 "Your
            // Room", holding the player) was accepted as a room, and the map
            // grew a second "Your Room" node -- the very bug D139 was written
            // for, still live.
            //
            // Measured across the catalogue, this rejects only furniture and
            // items and no real room anywhere: Cutthroats 8 (chair in Lounge,
            // bunk in Crew's Quarters, table in The Shanty), Zork 1 28
            // (including "cretin", the player object itself, and the sword in
            // the Living Room), Enchanter 2 (loaf in oven, exex spell in
            // scroll), Anchorhead 0, 905 0.
            //
            // `_depth` stops the parent check from recursing further than one
            // level, so this stays O(1) on a hot path.
            if (!_depth) {
                var lk = ZRamReader.objectLinks(mem, id);
                if (lk && lk.parent > 0 && ZRamReader.isPlausibleMapRoom(mem, lk.parent, 1)) {
                    return false;
                }
            }
            // D54 / §3.4: Inform meta objects use parenthesized short-names
            // ("(Inform Library)", "(darkness object)" / thedark). These are
            // never player-facing rooms. findLikelyLocation already skips
            // them via isMeta; location MUST reject them here too so a
            // confirmed-global or parent hit cannot promote them into the
            // map (operator clean-run wump2ka: center box showed these
            // during the restore prompt / intro).
            var nm = "";
            try { nm = ZRamReader.shortName(mem, id) || ""; } catch (eN) {}
            if (!nm || nm.charAt(0) === "(") return false;
            if (/^(class|object|compass|compassdirection|direction|kind|nothing|thedark)$/i.test(nm)) {
                return false;
            }
            // wump2ka ships a non-place object literally named "The last room!"
            // (meta end-state marker, parent 0). Never treat it as a map room.
            if (/^the last room!?$/i.test(nm.trim())) return false;
            var attrs = ZRamReader.attrsFromObject(mem, id) || {};
            // Actors and worn/carried clothing are never the current room
            // (Anchorhead: "Michael" animate NPC; "Michael's pants" wearable).
            if (attrs.animate) return false;
            if (attrs.clothing || attrs.worn || attrs.wearable) return false;
            // Inventory-ish takeables without light are almost never rooms;
            // real rooms commonly carry the light bit (or are dark rooms with
            // light clear but still parent===0 containers of the player).
            // Prefer structural parent===0 when available.
            // D134 (operator-reported across modules): a DOOR is never a
            // destination room -- it is the thing an exit passes through.
            // Anchorhead routed auto-travel to "real estate office door" as
            // though it were a place. The old rule below explicitly exempted
            // doors from rejection, which let them in.
            if (attrs.door) return false;

            var obj = ZRamReader.objectLinks(mem, id);
            if (obj && obj.parent > 0 && attrs.takeable && !attrs.light) {
                return false;
            }
            // Structural containment test, compiler-agnostic. `attrs.takeable`
            // above is derived from an Inform-oriented attribute profile and
            // is not reliable for ZIL (D73 proved the bit meanings differ per
            // compiler), which is how Enchanter's "scribbled scroll" and
            // Zork3's "vial" became map rooms and auto-travel targets. But an
            // object SITTING INSIDE a place is an item, not a place --
            // whatever the compiler. Rooms themselves sit at the top level
            // (parent 0) in both ZIL and Inform 6, so a parent that is itself
            // top-level means "I am contained in a room".
            if (obj && obj.parent > 0) {
                var par = ZRamReader.objectLinks(mem, obj.parent);
                if (par && par.parent === 0) {
                    var pname = "";
                    try { pname = ZRamReader.shortName(mem, obj.parent) || ""; } catch (eP) {}
                    // Only when the parent really reads as a place, so a
                    // top-level container-of-rooms (an I7 region) cannot
                    // disqualify the rooms inside it.
                    if (pname && pname.charAt(0) !== "(") return false;
                }
            }
        } catch (e) { return false; }
        return true;
    },

    findLikelyLocation: (mem, playerId, textHint) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;

        // D84 keeps its precedence. Its slot is LEARNED from repeated,
        // contradiction-free observation of this exact game, which is stronger
        // evidence than a number read off the status row -- and the grok seat's
        // audit of D171 caught that returning the indexed room first made D84
        // unreachable for every story that has a compiled index, i.e. dead code
        // rather than a deliberate ordering. It is null on wump2ka today
        // (nothing confirmed for that identity), so this costs nothing there
        // and restores the learned path everywhere else.
        try {
            if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.confirmedLocationGlobal) {
                var learned = AttrCalibrator.confirmedLocationGlobal(mem);
                if (learned != null) {
                    var learnedVal = ZRamReader.u16(mem, h.globals + learned * 2);
                    if (learnedVal >= 2 && ZRamReader.isPlausibleMapRoom(mem, learnedVal)) {
                        return learnedVal;
                    }
                }
            }
        } catch (eL84) {}

        // D171: this is the path snapshot() actually uses, so the compiled
        // room index is consulted here as well as in findLocationGlobal.
        // A story that numbers its rooms in the object table and prints that
        // same number to the player has told us which room it is; see the
        // full reasoning on findLocationGlobal. Gated on the index existing,
        // so a story without one is untouched.
        try {
            var roomIdx = ZRamReader.compiledRoomIndex(mem);
            if (roomIdx && roomIdx.count) {
                var printedNo = ZRamReader.printedRoomNumber();
                var indexed = (printedNo != null) ? roomIdx.table[printedNo] : null;
                if (indexed != null && indexed >= 2) return indexed;
            }
        } catch (eRi) {}

        var count = ZRamReader.objectCount(mem, h);
        function isMeta(nm) {
            nm = String(nm || "");
            return !nm || nm.charAt(0) === "(" || /^(class|object|compass|compassdirection|direction|kind|nothing)$/i.test(nm);
        }
        // 1) Walk UP from the player, not just one step.
        //
        // D139 (found sweeping the catalog): parent(player) is only the room
        // when the player is standing directly in it. Start a game in bed, in
        // a vehicle, on a chair -- all common openings -- and the player's
        // parent is that furniture. Cutthroats opens with the chain
        // cretin -> bed -> YourRoom -> <unnamed>, and taking one step gave
        // "bed" as the room: the map recorded a bed, its exits were whatever
        // the bed happened to hold, and auto-travel had nothing to route on.
        //
        // Rooms are also NOT reliably top-level: Cutthroats parents its rooms
        // to an unnamed ZIL grouping object, so "parent === 0" is not the test
        // either. What holds across compilers is the shape of the chain --
        // furniture sits INSIDE the room, so among the plausible ancestors the
        // room is the outermost one. When the status line gives a name, that
        // settles it outright.
        if (playerId) {
            var chain = [];
            var walk = ZRamReader.objectLinks(mem, playerId);
            var guard = 0;
            while (walk && walk.parent > 1 && guard++ < 8) {
                var cid = walk.parent;
                var cn = ZRamReader.shortName(mem, cid) || "";
                if (!isMeta(cn) && ZRamReader.isPlausibleMapRoom(mem, cid)) {
                    var ck = ZRamReader.children(mem, cid);
                    if (ck.length) chain.push({ id: cid, name: cn });
                }
                walk = ZRamReader.objectLinks(mem, cid);
            }
            if (chain.length) {
                // The printed room name is decisive when we have one.
                var hintNow = String(textHint || "").trim().toLowerCase();
                if (hintNow) {
                    var squash = function (x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); };
                    var want = squash(hintNow);
                    for (var ci = 0; ci < chain.length; ci++) {
                        if (want && squash(chain[ci].name) === want) return chain[ci].id;
                    }
                }
                // Otherwise start at the INNERMOST plausible ancestor -- which
                // is the room itself in the ordinary case, and keeps every
                // already-correct game byte-identical -- and step outward only
                // while that candidate is something you can be IN or ON.
                // Furniture carries container/supporter; a room does not, so
                // this steps out of Cutthroats' bed without ever stepping past
                // a real room (measured: taking the outermost unconditionally
                // regressed Zork1 from 100% to 67% and started reporting the
                // internal name "CanyonView").
                var pick = 0;
                while (pick < chain.length - 1) {
                    var a = ZRamReader.attrsFromObject(mem, chain[pick].id) || {};
                    if (a.container || a.supporter || a.vehicle) pick++;
                    else break;
                }
                return chain[pick].id;
            }
        }
        // 2) Status / map / text hint via findRoomsByName
        var hint = String(textHint || "").trim();
        if (hint) {
            var hits = ZRamReader.findRoomsByName(mem, hint);
            if (hits && hits[0] && hits[0].score >= 15 && ZRamReader.isPlausibleMapRoom(mem, hits[0].id)) {
                return hits[0].id;
            }
            // Partial: match any room whose name tokens appear as a header line
            var hintL = hint.toLowerCase();
            var best = 0, bestSc = -1;
            for (var id = 1; id <= count; id++) {
                var nm = ZRamReader.shortName(mem, id) || "";
                if (isMeta(nm)) continue;
                if (!ZRamReader.isPlausibleMapRoom(mem, id)) continue;
                var obj = ZRamReader.objectLinks(mem, id);
                if (!obj || obj.parent !== 0) continue;
                var kids = ZRamReader.children(mem, id);
                if (!kids.length) continue;
                var nml = nm.toLowerCase();
                if (hintL.indexOf(nml) >= 0 || nml.indexOf(hintL) >= 0) {
                    var sc = 20 + kids.length;
                    if (sc > bestSc) { bestSc = sc; best = id; }
                }
            }
            if (best) return best;
        }
        // 3) Global location scan
        var loc = ZRamReader.findLocationGlobal(mem, playerId);
        if (loc && ZRamReader.isPlausibleMapRoom(mem, loc)) return loc;
        return 0;
    },

    // D79: for a game whose player object has NO parent at all (confirmed
    // live on wump2ka.z5.js: `parent(playerId) === 0` almost always, so this
    // fallback is that game's ONLY location signal, not a rare backup),
    // this used to be dominated by a flat "early global slot index" bonus
    // that had no real correlation with correctness -- confirmed live: after
    // a real, game-text-confirmed move to a new room, the WRONG candidate
    // (an unrelated object, most likely a cached exit-destination reference)
    // won purely because it happened to sit at global slot 3 (+40 bonus),
    // while the ACTUAL new room -- referenced by FOUR separate global slots
    // (16/37/38/41) versus the wrong answer's two (3/12) -- lost anyway.
    // The number of DISTINCT global slots that reference the same value is
    // real, structural, RAM-derived evidence: a game's own bookkeeping tends
    // to mirror "the current room" across several purpose-built globals
    // (current/previous/respawn/etc.), while an unrelated reference (an
    // exit destination, a decorative prop) is typically cached in only one
    // or two special-purpose slots. This is now the DOMINANT scoring term;
    // raw slot index is kept only as a small final tiebreaker, never able
    // to overturn a real reference-count difference the way it used to.
    // D171: a compiled room INDEX, for stories that number their rooms in the
    // object table. wump2ka compiles 121 objects named C_ROOMS_1..C_ROOMS_121
    // (measured: C_ROOMS_1 is object 25 and C_ROOMS_121 is object 145, so the
    // table is contiguous), and prints the same index to the player as
    // "Room #N". The name is the compiler's own, not prose, so this is
    // structural evidence in exactly the sense D24 requires -- and a compiled
    // name of C_ROOMS_n is itself proof the object IS a room, which matters
    // because the attribute-based plausibility gate cannot be trusted on this
    // story (D57/D58: it randomises attribute bits per session).
    ROOM_INDEX_NAME: /^C_ROOMS_(\d+)$/,
    _roomIndex: null,
    compiledRoomIndex: (mem) => {
        var key = "?";
        try { key = ZRamReader.gameIdentityKey ? ZRamReader.gameIdentityKey(mem) : "?"; } catch (e) {}
        var cached = ZRamReader._roomIndex;
        if (cached && cached.key === key) return cached;
        var table = {}, n = 0;
        try {
            var h = ZRamReader.header(mem);
            var count = ZRamReader.objectCount(mem, h);
            for (var id = 1; id <= count; id++) {
                var m = ZRamReader.ROOM_INDEX_NAME.exec(ZRamReader.shortName(mem, id) || "");
                if (!m) continue;
                table[parseInt(m[1], 10)] = id;
                n++;
            }
        } catch (e) {}
        cached = ZRamReader._roomIndex = { key: key, table: table, count: n };
        return cached;
    },

    // The room number the story itself prints in its status row. Read only to
    // SELECT among the compiled objects above -- it never becomes an id, is
    // never stored, and never names a room, so identity remains the RAM
    // ObjectId (D47) and the status row stays display-only (D54).
    printedRoomNumber: () => {
        try {
            if (typeof document === "undefined") return null;
            var el = document.querySelector(".GridWindow.reverse") || document.querySelector(".GridWindow");
            if (!el) return null;
            var m = /Room\s*#\s*(\d+)/i.exec(String(el.innerText || el.textContent || ""));
            return m ? parseInt(m[1], 10) : null;
        } catch (e) { return null; }
    },

    findLocationGlobal: (mem, playerId) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;

        // D171 (operator: Wumpus "does not want to underline exits or items").
        //
        // The scan below could not find the right room on this story, in two
        // distinct ways, both measured live at 412px:
        //
        //   printed #25  correct id 49: refs 2, kids 1 -> LOST to id 51 (refs 4)
        //   printed #10  correct id 34: refs 4, kids 5 -> REJECTED outright by
        //                isPlausibleMapRoom
        //
        // The second cannot be fixed by reweighting, because the correct room
        // was never an eligible candidate: the gate is attribute-based and this
        // story randomises attribute bits per session (D57/D58). A wrong room
        // means scopeObjects enumerates objects the player cannot see, so the
        // printed items have nothing to match and NOTHING underlines -- decided
        // at startup and persisting, exactly as reported.
        //
        // Adjudicated over 45 ticks in 5 sessions by asking which candidate's
        // objects actually appear in the text the game just printed: the two
        // agreed on 39, and of the 6 disagreements the compiled-index answer
        // described the visible room 6 times and the scan 0. D79's own entry
        // records the same mapping from the other side -- "You are in room #2"
        // with the correct RAM id 26, and C_ROOMS_2 is object 26.
        //
        // Gated on the story actually having a compiled room index, so a game
        // without one is untouched and falls through to the scan below.
        try {
            var idx = ZRamReader.compiledRoomIndex(mem);
            if (idx && idx.count) {
                var printed = ZRamReader.printedRoomNumber();
                var byIndex = (printed != null) ? idx.table[printed] : null;
                if (byIndex != null && byIndex >= 2) return byIndex;
            }
        } catch (eIdx) {}
        // D84: consult the per-game LEARNED, confirmed global slot (real,
        // repeated, contradiction-free observation via AttrCalibrator --
        // see js/AttrCalibrator.js confirmedLocationGlobal/_correlateLocation)
        // ahead of the raw scoring scan below. Falls through unchanged when
        // nothing is confirmed yet for this exact game. This is the piece
        // that was missing here -- the confirmed-slot data existed and was
        // being written, but nothing ever read it back, so every game fell
        // through to the raw (sometimes wrong, e.g. an NPC with many
        // children outscoring the real room) scoring scan every time.
        try {
            if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.confirmedLocationGlobal) {
                var slot = AttrCalibrator.confirmedLocationGlobal(mem);
                if (slot != null) {
                    var confirmedVal = ZRamReader.u16(mem, h.globals + slot * 2);
                    if (confirmedVal >= 2 && ZRamReader.isPlausibleMapRoom(mem, confirmedVal)) {
                        return confirmedVal;
                    }
                }
            }
        } catch (eCal) {}
        var count = ZRamReader.objectCount(mem, h);
        function isMeta(nm) {
            nm = String(nm || "");
            return !nm || nm.charAt(0) === "(" || /^(class|object|compass|compassdirection|direction|kind|nothing)$/i.test(nm);
        }
        // D79: raw slot index has no real correlation with correctness (a
        // wrong candidate at an early slot could outscore the true room
        // referenced by several slots further out -- confirmed live,
        // reproduced with precise evidence: the correct room, referenced by
        // FOUR distinct globals, lost to a wrong one referenced by only TWO,
        // purely because of slot-index weighting). A game's own bookkeeping
        // tends to mirror "the current room" across several purpose-built
        // globals (current/previous/respawn/etc.), while an unrelated
        // reference (a cached exit destination, an NPC's home room) is
        // typically held in only one or two special-purpose slots -- so the
        // number of DISTINCT global slots referencing the same value is
        // real, structural, RAM-derived evidence and is now the DOMINANT
        // scoring term. Raw slot index survives only as a small final
        // tiebreaker, never able to overturn a real reference-count
        // difference.
        var refCount = {};
        for (var g0 = 0; g0 < 200; g0++) {
            var v0 = ZRamReader.u16(mem, h.globals + g0 * 2);
            if (v0 < 2 || v0 > count) continue;
            if (playerId && v0 === playerId) continue;
            refCount[v0] = (refCount[v0] || 0) + 1;
        }
        var best = 0, bestScore = -1;
        var seenVal = {};
        for (var g = 0; g < 200; g++) {
            var val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val < 2 || val > count) continue;
            if (playerId && val === playerId) continue;
            if (seenVal[val]) continue; // score each distinct candidate value once
            seenVal[val] = true;
            var nm = ZRamReader.shortName(mem, val) || "";
            if (isMeta(nm)) continue;
            // Never treat an animate actor (NPC/PC) as the current room.
            if (!ZRamReader.isPlausibleMapRoom(mem, val)) continue;
            var obj = ZRamReader.objectLinks(mem, val);
            if (!obj) continue;
            var kids = ZRamReader.children(mem, val);
            if (!kids.length) continue;
            var score = Math.min(refCount[val] || 0, 8) * 15;
            // Raw slot index, reduced to a small final tiebreaker only.
            if (g <= 3) score += 3;
            else if (g <= 10) score += 2;
            else if (g <= 40) score += 1;
            if (obj.parent === 0) score += 8;
            score += Math.min(kids.length, 12);
            // Player contained in this room's tree?
            for (var i = 0; i < kids.length; i++) if (kids[i] === playerId) score += 50;
            if (score > bestScore) { bestScore = score; best = val; }
        }
        return bestScore >= 20 ? best : 0;
    },

    findPlayerId: (mem, dict) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        function isSelfObjectName(nm) {
            // Inform 6's default PC short-name is literally "(self object)".
            // That is the real player instance (Advent.z5.js id 20), not a
            // Class/meta marker. Rejecting every "(" name made playerId=0
            // and broke parent(player) room identity for those builds.
            return /^\(\s*self\s+object\s*\)$/i.test(String(nm || ""));
        }
        function isMetaName(nm) {
            nm = String(nm || "").toLowerCase();
            if (!nm) return true;
            if (isSelfObjectName(nm)) return false;
            if (nm.charAt(0) === "(") return true;
            return /^(class|object|routine|string|kind|nothing|compass|compassdirection|direction|room|thing|backdrop|region|door|directions)$/i.test(nm);
        }
        var best = 0, bestScore = -1;
        function consider(id, bonus) {
            if (id < 2 || id > count) return;
            var nm = ZRamReader.shortName(mem, id) || "";
            if (isMetaName(nm)) return;
            var obj = ZRamReader.objectLinks(mem, id);
            if (!obj) return;
            var score = bonus || 0;
            var low = nm.toLowerCase();
            if (isSelfObjectName(nm)) score += 40;
            else if (/^(yourself|cretin|grunk|body)$/.test(low)) score += 40;
            else if (/yourself|cretin|grunk|adventurer|player/.test(low)) score += 18;
            else return; // only strong PC-name candidates in full/global scan
            if (obj.parent > 1) {
                var pn = ZRamReader.shortName(mem, obj.parent) || "";
                if (!isMetaName(pn)) {
                    score += 10;
                    if (ZRamReader.children(mem, obj.parent).length) score += 8;
                }
            }
            var kids = ZRamReader.children(mem, id);
            if (kids.length && kids.length < 24) score += 3;
            if (score > bestScore) { bestScore = score; best = id; }
        }
        for (var g = 0; g < 160; g++) consider(ZRamReader.u16(mem, h.globals + g * 2), 5);
        for (var id = 1; id <= count; id++) consider(id, 0);
        return bestScore >= 18 ? best : 0;
    },


    // CRITICAL RECOVERY: this function (plus scopeObjects/lookAheadExits
    // below) was entirely missing from this file -- discovered live (a real
    // room's map going empty after a couple of moves) and confirmed via
    // harness/d22-post-move.js's real-browser run: "ZRamReader.scopeObjects
    // is not a function" inside this file's own snapshot(), meaning
    // ZRamProvider.collect() threw on every single real game load. Not
    // caused by any D88 work (mtime evidence places this file's break
    // before this session's edits) and not touched by D88's scope.
    //
    // A crude, name-text-heuristic version of attrsFromObject existed in
    // harness/_restore_zram_methods.js (a prior recovery attempt) but
    // that version guesses container/door/scenery from regex matches on
    // an object's NAME STRING -- exactly the "heuristic/text-mining
    // fallback" D24 permanently forbids for actionable/map/radial data.
    // This version instead delegates to AttributeSchema.applyTo(), the
    // real bit-accurate I6 attribute profile (js/AttributeSchema.js) that
    // was already correctly implemented but had ZERO live call sites
    // anywhere in the product until now -- scopeObjects is the missing
    // link that was always supposed to call it.
    attrsFromObject: (mem, id) => {
        try {
            var obj = ZRamReader.objectLinks(mem, id);
            if (!obj) return {};
            if (typeof AttributeSchema !== "undefined" && AttributeSchema.applyTo) {
                return AttributeSchema.applyTo({}, obj, mem);
            }
            return {};
        } catch (e) { return {}; }
    },

    // Real-RAM room-scope walk: this room's direct children plus, depth-
    // limited, into anything a REAL attribute bit (container/supporter/
    // openable, from attrsFromObject above -- never object name text)
    // marks as see-through. A nameless/class-marker child ("(...)") is not
    // itself pushed but is still walked through, since Inform sometimes
    // nests real objects one parentless-class hop down.
    //
    // D57/D68: an unnamed child is normally a transparent structural
    // wrapper and gets recursed into unconditionally -- correct for a
    // genuine anonymous organizational object, but a game's own player (or
    // any similarly-unnamed NPC) is ALSO often unnamed this way, and their
    // carried contents must not leak into someone else's room scope just
    // because they happen to be standing there unnamed. Fix: an unnamed
    // child that reads `attrs.animate` is not recursed into at all. And
    // separately, ANY object actually reached via that unnamed-wrapper
    // bypass (as opposed to a normal, directly-visible room/container
    // child) is never surfaced if its own `worn` bit is set -- a worn item
    // means "currently equipped by whatever it's parented under," never a
    // loose room object, regardless of whether that wrapper happened to
    // read as animate this session.
    scopeObjects: (mem, roomId, opts) => {
        opts = opts || {};
        var depth = typeof opts.depth === "number" ? opts.depth : 2;
        var out = [];
        var candidates = [];
        var seen = {};
        function walk(id, d, viaUnnamedBypass) {
            if (!id || seen[id] || d < 0) return;
            seen[id] = 1;
            ZRamReader.children(mem, id).forEach(function (cid) {
                var name = ZRamReader.shortName(mem, cid);
                if (!name || name.charAt(0) === "(") {
                    var wrapperAttrs = ZRamReader.attrsFromObject(mem, cid);
                    if (wrapperAttrs.animate) return; // D57: an unnamed animate being's own contents are not this room's scope
                    // D184: an object the compiler gave no printable name can
                    // still own real parser vocabulary -- wump2ka's food
                    // pellets are objects "(bar1)"/"(bar2)" carrying
                    // ["food","pellet","pellets",...] and printed to the player
                    // as "two food pellets".
                    //
                    // It is NOT named or pushed here. A first attempt did that
                    // and was reverted: measured across the catalog it renamed
                    // Anchorhead's rooms, LostPig's internals and 905's PLAYER
                    // object, because "which word" has no answer inside a RAM
                    // module. The candidate is only RECORDED; whether it is a
                    // real, visible object is decided in js/Actionable.js,
                    // against the text the game actually printed this turn.
                    // Behaviour here is unchanged for every existing consumer.
                    try {
                        var vocab = ZRamReader.parserWordsAny(mem, cid) || [];
                        if (vocab.length) candidates.push({ id: cid, parentId: id, aliases: vocab });
                    } catch (eV) {}
                    walk(cid, d - 1, true);
                    return;
                }
                var attrs = ZRamReader.attrsFromObject(mem, cid);
                // D68: any worn bit under an unnamed wrapper stays with the
                // wearer (including scenery+worn Glow Bar). Bits only.
                if (viaUnnamedBypass && attrs.worn) return;
                out.push({
                    id: cid,
                    name: name,
                    parentId: id,
                    attrs: attrs,
                    // D64: parser name-list words (scrap/paper) for underlines
                    aliases: ZRamReader.parserWordsAny(mem, cid),
                    confidence: 0.85,
                    discovered: true
                });
                // D25 closed-container gate: only recurse when canSeeInside
                // (open/transparent container or supporter), never merely
                // because container/openable bits are set.
                if (d > 0 && ZRamReader.canSeeInside(attrs)) walk(cid, d - 1, false);
            });
        }
        walk(roomId, depth, false);
        // D184: attached rather than returned, so every existing caller
        // keeps receiving exactly the array it always did.
        try { Object.defineProperty(out, "unnamedCandidates", { value: candidates, enumerable: false }); } catch (eC) {}
        return out;
    },

    // Direction/exit scan: the documented I6 direction-property profile
    // first (directionProps.PROFILE/.candidates, already defined and
    // calibrated elsewhere in this file), then a numbered-exit fallback for
    // object-valued properties the profile doesn't name (D55: an I7
    // numbered exit's own placeholder still resolves to a real target
    // object, just not one of the compass labels).
    //
    // D61: this entire apparatus (PROFILE 7-18, the wider `candidates` scan,
    // the numbered-exit fallback) is an Inform-6/7 compiler-declaration-order
    // convention, not part of the Z-machine spec. A non-Inform game (Zork1
    // and the rest of the original Infocom/ZIL catalog, which predate Inform
    // by years) has object-valued properties in this same numeric range for
    // reasons completely unrelated to exits -- confirmed live on Zork1's own
    // "West of House" once already: five bogus "exit-N" phantom directions,
    // none of them real. Gated to structurally-confirmed Inform-compiled
    // games only; a non-Inform game gets an honest empty pre-travel exit
    // list (D24), with MapTopology's own state-delta labeling (the real
    // typed command, confirmed by actual travel) as the correctly-working,
    // compiler-agnostic fallback every other case in this system already
    // uses.
    lookAheadExits: (mem, roomId) => {
        // D134: for a non-Inform game the Inform property convention below is
        // meaningless (D61), but that no longer means we know nothing. If
        // ExitCalibrator has LEARNED where this particular game keeps its
        // exits -- proven against real travel in several distinct rooms --
        // use that. Still an honest empty list until something has actually
        // been proven, and the Inform path below is untouched.
        if (!ZRamReader.isInformCompiled(mem)) {
            try {
                if (typeof ExitCalibrator !== "undefined" && ExitCalibrator.exitsFor) {
                    return ExitCalibrator.exitsFor(mem, roomId);
                }
            } catch (eEC) {}
            return [];
        }
        var CARD = {
            north: 1, south: 1, east: 1, west: 1, northeast: 1, northwest: 1, southeast: 1, southwest: 1,
            up: 1, down: 1, in: 1, out: 1, n: 1, s: 1, e: 1, w: 1, ne: 1, nw: 1, se: 1, sw: 1, u: 1, d: 1
        };
        var exits = [];
        var h = ZRamReader.header(mem);
        var count = ZRamReader.objectCount(mem, h);
        var seen = {};
        function pushExit(label, prop, val, opts) {
            var tname = ZRamReader.shortName(mem, val) || "";
            if (tname.charAt(0) === "(") return;
            opts = opts || {};
            // D54: internal compiler short-names (C_ROOMS_N) are not
            // player-facing. Keep the real destination ObjectId for
            // identity/travel, clear the display name so map/list never
            // seed placeholder nodes (MapTopology also defends).
            if (tname && /^c_rooms(_?\d+)?$/i.test(tname)) tname = "";
            // Allow dest-id-only exits (tname cleared) -- do not drop them.
            if (!tname && !(val >= 1)) return;
            var lab = String(label || ("exit-" + prop)).toLowerCase();
            var key = lab + "->" + val;
            if (seen[key]) return;
            seen[key] = 1;
            // isDoor/isLocked from real attribute bits on the destination
            // object (D25), never name-regex and never hardcoded false.
            var tAttrs = ZRamReader.attrsFromObject(mem, val) || {};
            // D55: command may differ from label (e.g. label "exit 1",
            // command "x1"). Default remains label for ordinary compass.
            var cmd = String((opts.command != null ? opts.command : lab) || lab).toLowerCase();
            exits.push({
                label: lab,
                command: cmd,
                prop: prop,
                targetRoomId: val,
                targetRoomName: tname,
                isDoor: !!tAttrs.door,
                isLocked: !!tAttrs.locked,
                isNonCardinal: !CARD[lab],
                ambiguousDiagonal: !!opts.ambiguousDiagonal,
                hinted: !tname,
                confidence: opts.ambiguousDiagonal ? 0.5 : (CARD[lab] ? 0.85 : 0.75)
            });
        }
        // D35: an honest, dest-less stub for a real, structurally-known
        // door_dir slot whose target failed destIsMapRoom's validation
        // (an in-range object with no indiv table of its own -- a real,
        // live-observed shape, e.g. indiv[81]=Routine -- never a real map
        // room). Never fabricates a destination; the label alone is
        // real (this door_dir slot genuinely exists on this room).
        function pushStub(label, prop, command) {
            var lab = String(label).toLowerCase();
            var key = lab + "->stub";
            if (seen[key]) return;
            seen[key] = 1;
            exits.push({
                label: lab,
                command: String(command != null ? command : lab).toLowerCase(),
                prop: prop,
                targetRoomId: null,
                targetRoomName: "",
                isNonCardinal: true,
                ambiguousDiagonal: false,
                hinted: true,
                confidence: 0.4
            });
        }
        // D49/D51: nw(12)/se(13) are the one documented point of real
        // variance between I6 library revisions and are handled BEFORE the
        // generic candidate loop, reading each property independently (a
        // room can genuinely have two real, DIFFERENT diagonal exits at
        // once -- conflating them onto whichever property the scan visits
        // first was a real, self-caught bug in this exact mechanism's first
        // draft). Uncalibrated: prop 12's real destination gets BOTH
        // candidate words (northwest and southeast), each `ambiguousDiagonal`
        // at reduced confidence -- never hidden (D51: an unconfirmed real
        // exit must stay visible), never asserted as one specific word
        // before real evidence exists (D49). If prop 13 points at a
        // genuinely different destination, it surfaces under the honest
        // neutral "exit-13" placeholder, never silently dropped. Calibrated
        // (real travel evidence via calibrateDiagonalFromTravel): each prop
        // resolves to its own single real, swap-aware word via
        // directionLabelForProp, no ambiguity flag.
        var dp = ZRamReader.directionProps || {};
        var val12 = ZRamReader.readProp(mem, roomId, 12);
        var val13 = ZRamReader.readProp(mem, roomId, 13);
        var has12 = val12 >= 1 && val12 <= count;
        var has13 = val13 >= 1 && val13 <= count;
        if (!dp.diagonalCalibrated) {
            // Uncalibrated: still expose BOTH candidate compass words in the
            // payload so the radial can offer NW and SE (D49/D51). MapTopology
            // collapses same-destination Exits[] to a single edge so the map
            // never draws two Alleys. Prefer listing southeast first when only
            // prop 12 is populated -- Anchorhead's printed prose names the
            // alley to the southeast; first Exits[] writer wins the map slot
            // after same-dest collapse (still tentative until travel).
            if (has12) {
                pushExit("southeast", 12, val12, { ambiguousDiagonal: true });
                pushExit("northwest", 12, val12, { ambiguousDiagonal: true });
            }
            if (has13 && val13 !== val12) {
                pushExit("exit-13", 13, val13, {});
            } else if (has13 && !has12) {
                pushExit("southeast", 13, val13, { ambiguousDiagonal: true });
                pushExit("northwest", 13, val13, { ambiguousDiagonal: true });
            }
        } else {
            if (has12) pushExit(ZRamReader.directionLabelForProp(12), 12, val12, {});
            if (has13) pushExit(ZRamReader.directionLabelForProp(13), 13, val13, {});
        }
        // D35/D55/D60: I7-style door_dir exits. Label is "exit N" (space)
        // and the real parser command is "xN", where N is the ordinal among
        // ONLY the door_dir slots POPULATED ON THIS ROOM (D55 -- never the
        // game-wide door_dir set index, which produced unusable "x13"/"exit 13"
        // labels on wump2ka). Never the raw door_dir property number.
        var doorDirs = ZRamReader.directionDoorDirs(mem);
        if (doorDirs.length) {
            var roomIndiv = ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, roomId, 3));
            var populatedDoorDirs = [];
            doorDirs.slice().sort(function (a, b) { return a - b; }).forEach(function (dd) {
                var val = roomIndiv[dd];
                if (!(val >= 1 && val <= count)) return;
                populatedDoorDirs.push({ dd: dd, val: val });
            });
            populatedDoorDirs.forEach(function (entry, idx) {
                var ordinal = idx + 1;
                var label = "exit " + ordinal;
                var command = "x" + ordinal;
                if (ZRamReader.destIsMapRoom(mem, entry.val, count, doorDirs)) {
                    pushExit(label, entry.dd, entry.val, { command: command });
                } else {
                    pushStub(label, entry.dd, command);
                }
            });
        }
        var cand = ((ZRamReader.directionProps && ZRamReader.directionProps.candidates) || []).filter(function (p) { return p !== 12 && p !== 13; });
        cand.forEach(function (propNum) {
            var val = ZRamReader.readProp(mem, roomId, propNum);
            if (!(val >= 1 && val <= count)) return;
            var mappedLabel = ZRamReader.directionLabelForProp(propNum);
            pushExit(mappedLabel, propNum, val, {});
        });
        for (var p = 1; p <= 48; p++) {
            if (cand.indexOf(p) >= 0) continue;
            var v = ZRamReader.readProp(mem, roomId, p);
            if (!(v >= 2 && v <= count)) continue;
            var o2 = ZRamReader.objectLinks(mem, v);
            if (!o2) continue;
            var k2 = ZRamReader.children(mem, v);
            var nm2 = ZRamReader.shortName(mem, v) || "";
            if (!nm2 || nm2.charAt(0) === "(") continue;
            if (o2.parent === 0 && k2.length >= 1) {
                pushExit("exit-" + p, p, v);
            }
        }
        // D138: a direction that has been PROVEN not to move the player out of
        // this room is not offered again, whatever compiled it. Without this
        // the router re-plans the same impossible route forever: deleting the
        // map edge is futile because MapTopology.applyExits recreates it from
        // this very list on the next turn. Evidence-based and self-healing --
        // really walking the exit clears the block (ExitCalibrator.observe).
        try {
            if (typeof ExitCalibrator !== "undefined" && ExitCalibrator.hydrate && ExitCalibrator.isBlocked) {
                var tbl = ExitCalibrator.hydrate(mem);
                exits = exits.filter(function (e) {
                    return !ExitCalibrator.isBlocked(tbl, roomId, ExitCalibrator.normalizeDir(e.label) || e.label);
                });
            }
        } catch (eB) {}
        return exits;
    },

    // Shared closed-container / supporter visibility gate (D25/D31).
    // Prefer AttributeSchema.canSeeInside when loaded; keep a local
    // equivalent so pure ZRamReader harnesses stay deterministic.
    canSeeInside: (attrs) => {
        if (typeof AttributeSchema !== "undefined" && typeof AttributeSchema.canSeeInside === "function") {
            return !!AttributeSchema.canSeeInside(attrs);
        }
        attrs = attrs || {};
        if (attrs.container) return !!(attrs.open || attrs.isOpen || attrs.transparent);
        return !!attrs.supporter;
    },

    // D31 nested inventory / room-scope walk: immediate children plus
    // depth-limited recursion through canSeeInside containers/supporters.
    // parentId is always the immediate container (never flattened to the
    // walk root). D57: unnamed animate wrappers are not tunneled. D68:
    // worn items reached only via an unnamed-wrapper bypass stay hidden
    // from room-scope discovery.
    // D148: can canSeeInside's answer be believed for THIS compiler? It reads
    // attrs.container/open, and D73/D145 established those bit meanings are an
    // Inform-6 mapping that genuinely differs on other compilers. Measured on
    // Enchanter (ZIL): the held spell book's bits decode as
    // openable/static/switchable with no container and no open, so canSeeInside
    // says no and all four spells inside it -- blorb, nitfol, frotz, gnusto --
    // never reach the payload at all. They are untappable, which is the whole
    // "use items like spells from your inventory" path.
    attrInsideTrusted: (mem) => {
        try {
            if (typeof ZRamReader.isInformCompiled !== "function") return true;
            if (ZRamReader.isInformCompiled(mem)) return true;          // Inform: unchanged
            if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.hasConfirmedFlag) {
                // Once this game's own opcodes confirm its container bit the
                // normal open/closed rule comes straight back (D73).
                return !!AttrCalibrator.hasConfirmedFlag(mem, "container");
            }
            return false;
        } catch (e) { return true; }
    },

    walkVisibleDescendants: (mem, rootId, depth, confidence) => {
        depth = typeof depth === "number" ? depth : 2;
        confidence = typeof confidence === "number" ? confidence : 0.9;
        var out = [];
        var seen = {};
        // Only relaxed for the inventory walk (its two callers both root at the
        // player), and only while the bits are undecidable. The trade is
        // deliberate and matches D145's: the worst case here is offering an
        // action on something the story then refuses ("The box is closed."),
        // a normal recoverable reply, whereas the status quo hides real held
        // objects from the player permanently.
        var insideTrusted = ZRamReader.attrInsideTrusted(mem);
        function walk(id, d, viaUnnamedBypass) {
            if (!id || seen[id] || d < 0) return;
            seen[id] = 1;
            ZRamReader.children(mem, id).forEach(function (cid) {
                var name = ZRamReader.shortName(mem, cid);
                if (!name || name.charAt(0) === "(") {
                    var wrapperAttrs = ZRamReader.attrsFromObject(mem, cid);
                    if (wrapperAttrs.animate) return;
                    walk(cid, d - 1, true);
                    return;
                }
                var attrs = ZRamReader.attrsFromObject(mem, cid);
                if (viaUnnamedBypass && attrs.worn) return;
                out.push({
                    id: cid,
                    name: name,
                    parentId: id,
                    attrs: attrs,
                    // D64: attach parser name-list so Actionable can underline
                    // printed synonyms (scrap/paper for "scribbled note").
                    aliases: ZRamReader.parserWordsAny(mem, cid),
                    confidence: confidence,
                    discovered: true
                });
                var canLookIn = ZRamReader.canSeeInside(attrs);
                if (!canLookIn && !insideTrusted && !attrs.container && !attrs.supporter
                    && ZRamReader.children(mem, cid).length) {
                    // A container bit that DID decode is always obeyed, open or
                    // closed -- a closed opaque bag must never spill its
                    // contents (D31/D68), and that holds whatever the compiler.
                    // This relaxes only the case where there is no container or
                    // supporter bit to obey at all, yet the object demonstrably
                    // holds children: nothing is being overridden, because
                    // nothing decoded. Enchanter's spell book is exactly that
                    // (bits read moved/openable/scored/static/switchable).
                    canLookIn = true;
                }
                if (d > 0 && canLookIn) walk(cid, d - 1, false);
            });
        }
        walk(rootId, depth, false);
        return out;
    },

    snapshot: (mem) => {
        var h = ZRamReader.header(mem);
        if (!h) return { ok: false, error: "bad-header" };
        var dict = ZRamReader.parseDictionary(mem);
        var playerId = ZRamReader.findPlayerId(mem, dict);
        var roomId = 0;
        var roomName = "";
        if (typeof ZRamReader.findLikelyLocation === "function") {
            roomId = ZRamReader.findLikelyLocation(mem, playerId, "");
        }
        // D171: a compiled C_ROOMS_<n> name is the compiler's own evidence that
        // this object IS a room, so the attribute-based plausibility gate must
        // not veto it -- that gate reads bits this story randomises per session
        // (D57/D58), and it was measured rejecting the correct room outright
        // (printed #10, id 34, refs 4, kids 5, plausible false).
        var indexedRoom = ZRamReader.ROOM_INDEX_NAME.test(ZRamReader.shortName(mem, roomId) || "");
        if (roomId && !indexedRoom && !ZRamReader.isPlausibleMapRoom(mem, roomId)) {
            roomId = 0;
        }
        if (roomId) roomName = ZRamReader.shortName(mem, roomId) || "";
        // D54: honest absence when the only short-name is meta/internal.
        // Never ship "(Inform Library)" / "(darkness object)" / C_ROOMS_* as
        // payload.roomName (map display uses refineRoomDisplayName later).
        //
        // D171: that is a rule about the NAME, but it was discarding the ID as
        // well -- and `scope` and `exits` below are both gated on roomId, so a
        // story whose rooms carry internal compiled names shipped NO objects
        // and NO exits at all. Measured: discoveredObjects 0 on a room whose
        // description was full of exits and items, which is the operator's
        // bare room. Identity is the RAM ObjectId (D47) and is not a display
        // concern, so an INDEXED room now keeps its id and loses only its name.
        // A genuinely meta object -- "(darkness object)", a Class -- is not a
        // room at all and still zeroes both, exactly as before.
        if (roomName && (roomName.charAt(0) === "("
            || /^(class|object|compass|kind|nothing|thedark)$/i.test(roomName)
            || /^c_rooms(_?\d+)?$/i.test(roomName))) {
            roomName = "";
            if (!indexedRoom) roomId = 0;
        }
        var scope = roomId ? ZRamReader.scopeObjects(mem, roomId, { depth: 2 }) : [];
        // D184: carried out of the walk before the meta-name filter discards
        // the wrappers they came from. Candidates only -- js/Actionable.js
        // decides whether any is a thing the player can actually see.
        var unnamedCandidates = (scope && scope.unnamedCandidates) || [];
        scope = (scope || []).filter(function (o) { return o && o.name && String(o.name).charAt(0) !== "("; });
        scope.forEach(function (o) {
            var key = (o.name || "").toLowerCase();
            if (key && dict.words && dict.words[key]) o.dictAddr = dict.words[key];
            var first = key.split(/\s+/)[0];
            if (first && dict.words && dict.words[first]) o.dictAddr = o.dictAddr || dict.words[first];
        });
        var exits = roomId ? ZRamReader.lookAheadExits(mem, roomId) : [];
        // D31: nested held containers keep real parentIds via the shared walk.
        var inventory = playerId ? ZRamReader.walkVisibleDescendants(mem, playerId, 2, 0.9) : [];
        return {
            ok: true,
            version: h.version,
            objectCount: ZRamReader.objectCount(mem, h),
            playerId: playerId,
            roomId: roomId,
            roomName: roomName,
            discoveredObjects: scope,
            unnamedCandidates: unnamedCandidates,
            inventory: inventory,
            exits: exits,
            dictCount: dict.count || 0,
            confidence: roomId && scope.length ? 0.94 : (roomId ? 0.6 : 0.3)
        };
    }
};
