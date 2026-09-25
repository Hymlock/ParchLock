/* D38 P2 Map_Storage hunter — research only. No product files. No GlulxRamProvider.
 *
 * FINDINGS (static GLUL scan of CounterfeitMonkey.gblorb.js, 2026-09-12):
 *   dest=Sigil Street 5523697 appears 7 times; src=Back Alley 5524017 appears 5.
 *   ROM hits (723196, 1229184, 1229220, 1551692) are code immediates, not arrays
 *     (neighbor words are junk like 70320177 / 1223754801, not object pointers).
 *   RAM hits (3643284 dest, 3643348 src) sit in Counterfeit Monkey's game-specific
 *     p82_local_map (pid 334, values 58/59) cluster — 89% zeros, nDir~16 sliding
 *     windows. That is NOT generic I7 Map_Storage and must not be used by P3.
 *   Length-prefix hunt for nRooms*{12,16,20,24} found 0 hits.
 *   Per-direction 1D arrays indexed by IK1_Count also only hit the local_map cluster.
 *   IK1_Count (pid 25) is a real unique room index (Back Alley=3, Sigil Street=2)
 *     but does not index any dest-pointer rectangle in this image.
 *
 * Exits remain the open P2 hole. Do not treat local_map as the answer.
 *
 * Usage:
 *   node harness/_d38_p2_mapstore.js
 *   node harness/_d38_p2_mapstore.js --live [story.js]
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const SRC = 5524017;  // Back Alley (from live P2 probes)
const DEST = 5523697; // Sigil Street after north
const SRC_KEY = 3;    // IK1_Count pid 25
const DEST_KEY = 2;
const N_ROOMS = 106;

function decodeStory(storyJs) {
    const text = fs.readFileSync(path.join(ROOT, storyJs), "utf8");
    const m = text.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*)['"]\s*\)/);
    if (!m) throw new Error("no processBase64Zcode in " + storyJs);
    return Buffer.from(m[1].replace(/\s+/g, ""), "base64");
}

function findChunk(buf, id) {
    if (buf.toString("ascii", 0, 4) !== "FORM") return null;
    let p = 12;
    while (p + 8 <= buf.length) {
        const name = buf.toString("ascii", p, p + 4);
        const size = buf.readUInt32BE(p + 4);
        if (name === id) return { off: p + 8, size };
        p += 8 + size + (size & 1);
    }
    return null;
}

function collectHits(buf, off, size, val) {
    const out = [];
    const hi = off + size;
    for (let a = off; a + 4 <= hi; a += 4) {
        if (buf.readUInt32BE(a) === val) out.push(a - off);
    }
    return out;
}

function scoreRow(buf, baseOff, rowAddr, nDir, ramstart, endmem, markVal, markName) {
    const words = [];
    let rooms = 0, junk = 0, zeros = 0, markCol = -1;
    for (let c = 0; c < nDir; c++) {
        const addr = rowAddr + c * 4;
        if (addr < 0 || baseOff + addr + 4 > buf.length) return null;
        const w = buf.readUInt32BE(baseOff + addr);
        if (!w) { zeros++; continue; }
        const inRam = w >= ramstart && w < endmem;
        if (inRam) rooms++;
        else junk++;
        if (w === markVal) markCol = c;
        words.push({ c, w, inRam, mark: w === markVal });
    }
    return { rooms, junk, zeros, markCol, words, markName };
}

function hunt(buf) {
    const glul = findChunk(buf, "GLUL");
    if (!glul) throw new Error("no GLUL chunk");
    const ramstart = buf.readUInt32BE(glul.off + 8);
    const extstart = buf.readUInt32BE(glul.off + 12);
    const endmem = buf.readUInt32BE(glul.off + 16);
    const magic = buf.toString("ascii", glul.off, glul.off + 4);
    const destRel = collectHits(buf, glul.off, glul.size, DEST);
    const srcRel = collectHits(buf, glul.off, glul.size, SRC);

    const nDirs = [12, 20, 16, 24, 8, 10, 11, 13];
    const found = [];
    for (const nDir of nDirs) {
        for (const zero of [true, false]) {
            const sIdx = zero ? SRC_KEY : SRC_KEY - 1;
            const dIdx = zero ? DEST_KEY : DEST_KEY - 1;
            if (sIdx < 0 || dIdx < 0) continue;
            for (const at of destRel) {
                for (let col = 0; col < nDir; col++) {
                    const b = at - (sIdx * nDir + col) * 4;
                    if (b < 36) continue;
                    const srcRow = b + sIdx * nDir * 4;
                    const destRow = b + dIdx * nDir * 4;
                    if (srcRow < 0 || destRow < 0) continue;
                    if (buf.readUInt32BE(glul.off + srcRow + col * 4) !== DEST) continue;
                    const srcS = scoreRow(buf, glul.off, srcRow, nDir, ramstart, endmem, DEST, "dest");
                    const destS = scoreRow(buf, glul.off, destRow, nDir, ramstart, endmem, SRC, "src");
                    if (!srcS || !destS) continue;
                    if (srcS.junk > 2 || destS.junk > 2) continue;
                    const destHasSrc = destS.markCol >= 0;
                    const score = (destHasSrc ? 50 : 0) + srcS.rooms + destS.rooms - 5 * (srcS.junk + destS.junk) + (nDir === 12 ? 5 : 0);
                    found.push({
                        nDir, zeroBased: zero, col, base: b,
                        destHasSrc, destCol: destS.markCol,
                        srcRooms: srcS.rooms, srcJunk: srcS.junk, srcZeros: srcS.zeros,
                        destRooms: destS.rooms, destJunk: destS.junk,
                        score, srcWords: srcS.words, destWords: destS.words,
                        inRom: b < ramstart
                    });
                }
            }
        }
    }
    found.sort((a, b) => b.score - a.score);
    const seen = new Set();
    const unique = [];
    found.forEach((h) => {
        const k = [h.nDir, h.zeroBased, h.base].join(":");
        if (seen.has(k)) return;
        seen.add(k);
        unique.push(h);
    });

    // Length-prefix hunt: Array Map_Storage --> N  stores N at (array-4).
    const lens = [];
    [12, 20, 16, 24].forEach((nDir) => {
        [N_ROOMS, N_ROOMS + 1, N_ROOMS - 1].forEach((nr) => {
            lens.push({ nDir, nWords: nr * nDir, nRooms: nr });
        });
    });
    const prefixHits = [];
    const want = new Map();
    lens.forEach((L) => {
        if (!want.has(L.nWords)) want.set(L.nWords, []);
        want.get(L.nWords).push(L);
    });
    for (let a = glul.off + 36; a + 8 <= glul.off + glul.size; a += 4) {
        const n = buf.readUInt32BE(a);
        const Ls = want.get(n);
        if (!Ls) continue;
        const data = a + 4 - glul.off;
        Ls.forEach((L) => {
            const sIdx0 = SRC_KEY;
            const sIdx1 = SRC_KEY - 1;
            [sIdx0, sIdx1].forEach((sIdx, zi) => {
                if (sIdx < 0) return;
                const row = data + sIdx * L.nDir * 4;
                if (row < 0 || glul.off + row + L.nDir * 4 > buf.length) return;
                let destCol = -1;
                for (let c = 0; c < L.nDir; c++) {
                    if (buf.readUInt32BE(glul.off + row + c * 4) === DEST) destCol = c;
                }
                if (destCol < 0) return;
                prefixHits.push({
                    nDir: L.nDir, nWords: L.nWords, nRooms: L.nRooms,
                    lengthAt: a - glul.off, base: data, zeroBased: zi === 0,
                    sIdx, destCol, inRom: data < ramstart
                });
            });
        });
    }

    return {
        magic, ramstart, extstart, endmem, glulSize: glul.size,
        destHits: destRel.length, srcHits: srcRel.length,
        destHitSample: destRel.slice(0, 16),
        srcHitSample: srcRel.slice(0, 16),
        recip: unique.filter((h) => h.destHasSrc).slice(0, 12),
        best: unique.slice(0, 12),
        prefixHits: prefixHits.slice(0, 16)
    };
}

function neighborhood(buf, glulOff, rel, ramstart, endmem, span) {
    span = span || 16;
    const words = [];
    for (let i = -span; i <= span; i++) {
        const relA = rel + i * 4;
        if (relA < 0) continue;
        const w = buf.readUInt32BE(glulOff + relA);
        const inRam = w >= ramstart && w < endmem;
        const isSrc = w === SRC;
        const isDest = w === DEST;
        words.push({ i, rel: relA, w, inRam, isSrc, isDest });
    }
    return words;
}

function mainStatic() {
    const buf = decodeStory("games/CounterfeitMonkey.gblorb.js");
    const r = hunt(buf);
    const glul = findChunk(buf, "GLUL");
    const destN = r.destHitSample.map((rel) => ({
        rel,
        inRom: rel < r.ramstart,
        words: neighborhood(buf, glul.off, rel, r.ramstart, r.endmem, 12)
    }));
    const srcN = r.srcHitSample.map((rel) => ({
        rel,
        inRom: rel < r.ramstart,
        words: neighborhood(buf, glul.off, rel, r.ramstart, r.endmem, 12)
    }));
    r.destNeighborhoods = destN;
    r.srcNeighborhoods = srcN;

    function dumpRecords(rel, strideWords, nRec) {
        const recs = [];
        for (let rix = 0; rix < nRec; rix++) {
            const words = [];
            for (let c = 0; c < strideWords; c++) {
                const relA = rel + (rix * strideWords + c) * 4;
                if (relA < 0 || glul.off + relA + 4 > buf.length) break;
                const w = buf.readUInt32BE(glul.off + relA);
                words.push({
                    w,
                    inRam: w >= r.ramstart && w < r.endmem,
                    isSrc: w === SRC,
                    isDest: w === DEST
                });
            }
            recs.push(words);
        }
        return recs;
    }
    r.stride9_at_1229184 = dumpRecords(1229184, 9, 12);
    r.stride9_at_723196 = dumpRecords(723196, 9, 8);

    // Density hunt anchored at dest hits: treat dest as a cell in an nDir-wide
    // row, then score a N_ROOMS-row rectangle whose row 0..N contains that cell.
    const density = [];
    [12, 20, 16, 24].forEach((nDir) => {
        r.destHitSample.forEach((at) => {
            for (let col = 0; col < nDir; col++) {
                const rowStart = at - col * 4;
                for (const rowIndex of [0, SRC_KEY, SRC_KEY - 1, DEST_KEY, DEST_KEY - 1, 10, 20, 50, 58, 59]) {
                    if (rowIndex < 0) continue;
                    const base = rowStart - rowIndex * nDir * 4;
                    if (base < 36) continue;
                    const nWords = N_ROOMS * nDir;
                    if (base + nWords * 4 > glul.size) continue;
                    let zeros = 0, objs = 0, junk = 0, hasSrc = false, hasDest = false;
                    const objSample = [];
                    for (let i = 0; i < nWords; i++) {
                        const w = buf.readUInt32BE(glul.off + base + i * 4);
                        if (!w) zeros++;
                        else if (w >= r.ramstart && w < r.endmem) {
                            objs++;
                            if (w === SRC) hasSrc = true;
                            if (w === DEST) hasDest = true;
                            if (objSample.length < 8) objSample.push({ i, w });
                        } else {
                            junk++;
                            if (junk > 40) break;
                        }
                    }
                    if (junk > 40 || objs < 15 || !(hasSrc && hasDest)) continue;
                    const zeroRate = zeros / nWords;
                    density.push({
                        base, nDir, col, rowIndex, zeros, objs, junk,
                        hasSrc, hasDest, inRom: base < r.ramstart,
                        zeroRate: Math.round(zeroRate * 100), objSample
                    });
                }
            }
        });
    });
    density.sort((a, b) => a.junk - b.junk || b.objs - a.objs);
    r.density = density.slice(0, 16);

    // Per-direction 1D arrays (older I7): dest stored at base + IK1_Count*4,
    // one array per direction, length ~= nRooms. Nearby sibling arrays hold src.
    const oneD = [];
    r.destHitSample.forEach((at) => {
        [SRC_KEY, SRC_KEY - 1, DEST_KEY, DEST_KEY - 1, 0, 1].forEach((idx) => {
            if (idx < 0) return;
            const base = at - idx * 4;
            if (base < 36) return;
            let zeros = 0, objs = 0, junk = 0, srcAt = -1;
            const objsList = [];
            for (let i = 0; i < N_ROOMS + 2; i++) {
                const w = buf.readUInt32BE(glul.off + base + i * 4);
                if (!w) zeros++;
                else if (w >= r.ramstart && w < r.endmem) {
                    objs++;
                    if (w === SRC) srcAt = i;
                    if (objsList.length < 10) objsList.push({ i, w, isDest: w === DEST, isSrc: w === SRC });
                } else junk++;
            }
            if (junk > 4 || objs < 3) return;
            oneD.push({
                destAt: at, idx, base, zeros, objs, junk, srcAt,
                inRom: base < r.ramstart, objsList
            });
        });
    });
    r.oneD = oneD.slice(0, 16);

    const outPath = path.join(ROOT, "harness", "_d38_p2_mapstore.out.json");
    fs.writeFileSync(outPath, JSON.stringify(r, null, 2));
    console.log("wrote", outPath);
    console.log("destHits", r.destHits, "srcHits", r.srcHits, "ramstart", r.ramstart);
    console.log("recip", r.recip.length, "best", r.best.length, "prefix", r.prefixHits.length);
    destN.forEach((n) => {
        const nearby = n.words.filter((w) => w.inRam || w.isSrc || w.isDest).map((w) => w.i + ":" + w.w + (w.isDest ? "*D" : "") + (w.isSrc ? "*S" : ""));
        console.log("DEST", n.rel, n.inRom ? "ROM" : "RAM", nearby.join(" "));
    });
    srcN.forEach((n) => {
        const nearby = n.words.filter((w) => w.inRam || w.isSrc || w.isDest).map((w) => w.i + ":" + w.w + (w.isDest ? "*D" : "") + (w.isSrc ? "*S" : ""));
        console.log("SRC ", n.rel, n.inRom ? "ROM" : "RAM", nearby.join(" "));
    });
    console.log("density", r.density.length);
    (r.density || []).slice(0, 6).forEach((d) => console.log(" DENS", JSON.stringify({ base: d.base, nDir: d.nDir, col: d.col, rowIndex: d.rowIndex, objs: d.objs, junk: d.junk, zeroRate: d.zeroRate, inRom: d.inRom })));
    console.log("stride9@1229184 rec0", JSON.stringify(r.stride9_at_1229184[0]));
    console.log("oneD", r.oneD.length);
    (r.oneD || []).slice(0, 8).forEach((d) => console.log(" 1D", JSON.stringify({ destAt: d.destAt, idx: d.idx, base: d.base, objs: d.objs, junk: d.junk, srcAt: d.srcAt, inRom: d.inRom, sample: d.objsList })));
}

async function mainLive(story) {
    const { chromium } = require("playwright");
    const { pathToFileURL } = require("node:url");
    const staticResult = hunt(decodeStory(story));
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME || undefined,
        headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    await page.goto(pathToFileURL(path.resolve(ROOT, "play.html")).href + "?story=" + story);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    async function hasInput() { return (await page.locator(".Input.LineInput").count()) > 0; }
    async function inject(cmd) {
        if (!(await hasInput())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(700);
        return true;
    }
    async function bufferTail() {
        return page.evaluate(() => {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-800);
        });
    }
    for (let i = 0; i < 40 && !(await hasInput()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(180);
    }
    for (let i = 0; i < 36; i++) {
        const tail = await bufferTail();
        const stillTalk = /Can you hear me|remember our name|half person|I was Alex|You were|need you on form|unrecognizable|synthesis|Have you played interactive fiction/i.test(tail);
        const playable = /This alley runs|letter-remover|You can see|You are carrying|obvious exits/i.test(tail) && !stillTalk;
        if (playable && await hasInput()) break;
        if (!(await hasInput())) { await page.keyboard.press("Space"); await page.waitForTimeout(180); continue; }
        if (stillTalk || /Please answer yes or no|Can you hear me|Are you|Shall I|ready\?/i.test(tail)) {
            await inject("yes"); continue;
        }
        await inject("look");
    }
    await inject("look");

    const CARD = ["north","northeast","northwest","south","southeast","southwest","east","west","up","down","in","out"];
    const live = await page.evaluate(({ CARD, staticResult }) => {
        const rb = (a) => Quixe.ReadByte(a) & 0xff;
        const rw = (a) => ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
        const ramstart = rw(8);
        const endmem = rw(16);
        function isObj(a) { return !!(a && a >= ramstart && a < endmem && rb(a) === 0x70); }
        const internals = Quixe.get_vm_internals ? Quixe.get_vm_internals() : {};
        const accel = internals.accel_params ? Array.from(internals.accel_params) : [];
        const numAttr = (accel[7] | 0) || 7;
        const classAddr = accel[2] | 0;
        const OFF_NEXT = 1 + numAttr;
        const OFF_NAME = OFF_NEXT + 4;
        const OFF_PROPS = OFF_NAME + 4;
        const OFF_PARENT = OFF_PROPS + 4;
        const OFF_SIBLING = OFF_PARENT + 4;
        const OFF_CHILD = OFF_SIBLING + 4;
        function decodeDictWord(ptr) {
            if (!ptr || rb(ptr) !== 0x60) return null;
            let s = "";
            for (let i = 1; i <= 12; i++) {
                const c = rb(ptr + i); if (!c) break;
                if (c >= 32 && c < 127) s += String.fromCharCode(c);
            }
            return s;
        }
        function parseProps(ptr) {
            if (!ptr) return [];
            const n = rw(ptr); if (n < 0 || n > 800) return [];
            const out = [];
            for (let i = 0; i < n; i++) {
                const base = ptr + 4 + i * 10;
                const id = (rb(base) << 8) | rb(base + 1);
                const len = (rb(base + 2) << 8) | rb(base + 3);
                const data = rw(base + 4);
                const words = [];
                for (let w = 0; w < Math.min(len, 8); w++) words.push(rw(data + w * 4));
                out.push({ id, len, data, words });
            }
            return out;
        }
        function dictWords(addr) {
            const out = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                if (p.id !== 1) return;
                p.words.forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
            });
            return out;
        }
        function children(addr) {
            const kids = [];
            let c = rw(addr + OFF_CHILD);
            for (let i = 0; i < 80 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
            return kids;
        }
        const all = [];
        const seen = new Set();
        if (isObj(classAddr)) {
            let a = classAddr;
            for (let i = 0; i < 30000; i++) {
                if (!isObj(a) || seen.has(a)) break;
                seen.add(a); all.push(a);
                const next = rw(a + OFF_NEXT);
                if (!next) break;
                a = next;
            }
        }
        let compass = 0;
        for (let i = 0; i < all.length; i++) {
            // name pointer decode skipped; identify compass by child dicts
            const kids = children(all[i]);
            if (kids.length < 8) continue;
            const names = kids.slice(0, 4).map((k) => dictWords(k)[0] || "");
            if (names[0] === "north" && names[1] === "northeast") { compass = all[i]; break; }
        }
        const dirs = compass ? children(compass).map((addr, i) => ({ i, addr, dict: dictWords(addr).slice(0, 3) })) : [];
        const cand = (staticResult.recip[0] || staticResult.best[0] || staticResult.prefixHits[0] || null);
        let row = null;
        let exits = [];
        if (cand && cand.base != null && cand.nDir) {
            const sIdx = cand.zeroBased ? 3 : 2;
            const rowAddr = cand.base + sIdx * cand.nDir * 4;
            row = [];
            for (let c = 0; c < cand.nDir; c++) {
                const w = rw(rowAddr + c * 4);
                const dict = isObj(w) ? dictWords(w).slice(0, 4) : [];
                const label = (dirs[c] && dirs[c].dict[0]) || CARD[c] || ("dir-" + c);
                row.push({ c, w, isObj: isObj(w), dict, label });
                if (isObj(w) && w) {
                    exits.push({
                        id: w,
                        label,
                        destId: w,
                        destName: dict.filter((d) => d !== "rooms").join(" "),
                        confidence: 0.9
                    });
                }
            }
        }
        return {
            internalsKeys: Object.keys(internals || {}),
            ramstart, endmem, objectCount: all.length,
            compass, nDirs: dirs.length,
            dirs: dirs.slice(0, 24),
            locDict: dictWords(5524017),
            destDict: dictWords(5523697),
            locParentOk: true,
            candidate: cand,
            row, exits
        };
    }, { CARD, staticResult });

    await browser.close();
    const out = { errors, staticResult, live };
    const outPath = path.join(ROOT, "harness", "_d38_p2_mapstore.live.json");
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log("wrote", outPath);
    console.log("dirs", live.nDirs, "exits", (live.exits || []).map((e) => e.label + "->" + e.destName).join(", "));
}

(async () => {
    const live = process.argv.includes("--live");
    if (live) {
        const story = process.argv.find((a) => a.endsWith(".js") && a.indexOf("mapstore") < 0) || "games/CounterfeitMonkey.gblorb.js";
        await mainLive(story);
    } else {
        mainStatic();
    }
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
