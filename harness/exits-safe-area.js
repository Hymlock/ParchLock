// D121 (supersedes D116): the top chrome region is now a real reflow BAND,
// not an overlay with a corrected `top`.
//
// D116 tried twice to fix "the top of the screen isn't touchable" by shifting
// #exits .row.horizontal.top down past the safe-area inset and then past the
// in-app Glk status banner. Both shipped; neither worked. Moving `top` was
// the wrong shape of fix: #exits has z-index:auto while #windowport is
// z-index:3, so shifting the strip DOWN moved it INTO #windowport's rect
// where it is painted over and hit-tested away -- and it still knew nothing
// about MapBeautify's non-cardinal spokes or the note icon, so all three
// piled up on each other and on the story text.
//
// The band instead: #exits becomes a fixed flex column anchored under the
// status banner, its measured height is published as --pl-band-h, and the
// story buffer reserves exactly that as padding-top. Add a line, the text
// moves down; show nothing, it collapses to 0px.
//
// This remains a static source-text check -- a real hit-test assertion needs
// a browser (see harness/d96-menu-handle-map-tab.js for the live-geometry
// pattern). Recording why that matters: a static check alone is precisely
// what let D116 pass CI twice while broken on the device, because it only
// ever asserted that a `top:` string existed, never that the result was
// reachable. The assertions below are therefore written against the
// structural properties that make the band work (stacking, pointer-events,
// collapse-to-zero, the reserve) rather than against literal offsets.
const fs = require("fs");
const path = require("path");
const css = fs.readFileSync(path.resolve(__dirname, "..", "css", "ParchLock.css"), "utf8");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// --- desktop base rules must be untouched ------------------------------
assert(/#exits\s*\.row\.horizontal\.top\s*\{\s*top:\s*0;?\s*\}/.test(css), "desktop's base #exits .row.horizontal.top rule is untouched (still plain top: 0)");
assert(/#exits\s*\.row\.horizontal\s*>\s*div\s*\{\s*width:\s*33vw;\s*height:\s*100vh;?\s*\}/.test(css), "desktop's base 33vw/100vh exit cells are untouched");
assert(/#current-room-notes\s*\{[^}]*top:\s*20px;?/.test(css), "desktop's base #current-room-notes rule is untouched (still plain top: 20px)");

// --- the band itself ---------------------------------------------------
const band = css.match(/body\.pl-mobile\s+#exits\s*\{([^}]*)\}/);
assert(!!band, "a body.pl-mobile #exits band rule exists");
if (band) {
    const b = band[1];
    assert(/position:\s*fixed/.test(b), "the band is fixed-positioned");
    assert(/flex-direction:\s*column/.test(b), "the band stacks its content sources vertically, so a new row pushes the next one down instead of overlapping it");
    assert(/top:\s*calc\([^)]*var\(--pl-safe-top\)[^)]*var\(--pl-statusbar-h[^)]*\)/.test(b), "the band is anchored below BOTH the OS safe-area inset and the in-app Glk status banner");
    assert(/z-index:\s*24/.test(b), "the band is lifted to the documented exit-rail tier (24), above #windowport's 3 -- this is what D116 never did");
    assert(/pointer-events:\s*none/.test(b), "the band itself is transparent to taps so its full-width rows cannot swallow taps meant for the story");
    assert(/background:\s*var\(--pl-bg/.test(b) && /box-shadow:\s*0\s+4px\s+0\s+var\(--pl-bg/.test(b), "the dynamic band paints its own opaque protector plus breathing edge");
}

// --- the compass row reflows instead of overlapping --------------------
const row = css.match(/body\.pl-mobile\s+#exits\s+\.row\.horizontal\.top\s*\{([^}]*)\}/);
assert(!!row && /flex-wrap:\s*wrap/.test(row[1]), "the compass row wraps, so chips that do not fit move to a new line rather than overlapping each other");
assert(/body\.pl-mobile\s+#exits\s+\.row\.horizontal\.top\s*>\s*\.exit\s*\{[^}]*height:\s*auto/.test(css), "the 33vw x 100vh desktop cell is neutralised in the band (it would otherwise be a full-screen tap-eater and hold the band open at viewport height)");
assert(/\.row\.horizontal\.top\s*>\s*\.exit:not\(\.shown\)\s*\{\s*display:\s*none/.test(css), "unused exits are display:none in the band, not just opacity:0 -- this is the collapse-to-zero guarantee");
assert(/body\.pl-mobile\s+#exits\s+\.row\.horizontal\.top\s+\.room-name\s*\{[^}]*text-overflow:\s*ellipsis/.test(css), "a long destination name is capped and ellipsized instead of overflowing its cell into the neighbouring chip");
assert(/\.row\.horizontal\.top\s+\.dir-name,[\s\S]{0,200}?pointer-events:\s*auto/.test(css), "the compass labels take pointer events back");

// --- all three content sources are band members ------------------------
assert(/#exits\s+\.pl-noncardinal\s*\{[^}]*flex-wrap:\s*wrap/.test(css), "MapBeautify's non-cardinal spokes have real CSS (they had NONE) and wrap as the band's second line");
assert(/#exits\s+\.pl-noncardinal:empty\s*\{\s*display:\s*none/.test(css), "an empty spoke row contributes no height");
assert(/#exits\s+\.pl-exit-noncardinal\s*\{/.test(css), "the spoke buttons are styled rather than rendering as default UA buttons");
const notes = css.match(/body\.pl-mobile\s+#current-room-notes\s*\{([^}]*)\}/);
assert(!!notes && /z-index:\s*24/.test(notes[1]), "the notation icon is lifted to the band's tier too (it was z-index:2, i.e. under #windowport's 3, which is why it never took a tap either)");

// --- the reserve: this is what "pushes the text display window down" ---
assert(/body\.pl-mobile\s+#windowport\s+\.BufferWindow\s*\{[^}]*padding-top:\s*calc\(var\(--pl-band-h/.test(css), "the story buffer reserves the band's real measured height as padding-top -- the text is pushed down rather than overlapped");
assert(/body\.pl-mobile\s+#windowport::before\s*\{\s*content:\s*none/.test(css), "the old windowport-fixed protector is retired so dark-room filters cannot rebase it into story text");
assert(/html\.pl-dark-scope\s+#windowport\s*\{\s*filter:/.test(css), "the dark-room filter that creates the fixed-position containing block remains present, so the regression condition is explicitly covered");
assert(/--pl-band-h:\s*0px/.test(css), "--pl-band-h defaults to 0px, so desktop and any engine without ResizeObserver reserve nothing");

// --- overlay ownership and left-edge reachability ---------------------
assert(/body\.pl-mobile\.native-dialog-open\s+#exits[\s\S]{0,500}?visibility:\s*hidden\s*!important/.test(css), "native dialogs suppress the entire exit layer instead of losing a stacking-context contest");
assert(/body\.pl-mobile\.app-dialog-open\s+#exits/.test(css), "app dialogs suppress the same exit layer");
assert(/body\.pl-mobile:has\(#dialog_frame\)\s+#exits/.test(css), "native-dialog DOM presence closes the frame before the lifecycle class is published");
assert(/body\.pl-mobile\s+#exits\s+\.row\.vertical\.left\s*\{[^}]*left:\s*calc\(8px\s*\+\s*var\(--pl-safe-left/.test(css), "the left rail clears the OS safe inset and edge-gesture zone");
assert(/\.row\.vertical\.left\s+\.exit\.shown\s+\.dir-name,[\s\S]{0,180}?min-height:\s*32px/.test(css), "left-rail labels have a 32px cross-axis touch target");

// --- D203: one truthful horizontal geometry ----------------------------
assert(/--pl-mobile-shell-left:\s*calc\([^;]*--pl-left-rail-target[^;]*--pl-mobile-cell-padding/.test(css), "mobile shell left edge is derived from the rail target and shared cell padding");
assert(/--pl-mobile-shell-width:\s*calc\(100vw\s*-\s*var\(--pl-mobile-shell-left\)\s*-\s*var\(--pl-mobile-shell-right\)\)/.test(css), "mobile shell width is derived from its published left/right edges");
assert(/--pl-map-tab-width:\s*18px/.test(css), "mobile Map tab width is published for D96 right-edge arbitration");
assert(/--pl-mobile-shell-right:\s*calc\(var\(--pl-safe-right\)\s*\+\s*var\(--pl-mobile-edge-gutter\)\)/.test(css), "D203 keeps the historical 8px right gutter (left clearance must not steal right width)");
assert(/@media\s*\(min-width:\s*340px\)\s*and\s*\(max-width:\s*850px\)[\s\S]{0,180}?--pl-mobile-shell-right:\s*calc\(var\(--pl-safe-right\)\s*\+\s*var\(--pl-map-tab-width\)\)/.test(css), "D203 reserves the full Map-tab strip where width permits while preserving the 320px fallback");
assert(/body\.pl-mobile\s+#parchment,[\s\S]{0,180}?left:\s*var\(--pl-mobile-shell-left\)[\s\S]{0,100}?width:\s*var\(--pl-mobile-shell-width\)/.test(css), "visible and hidden Glk panes consume the same D203 shell rectangle");
assert(/\.Input\.LineInput,[\s\S]{0,260}?left:\s*var\(--pl-mobile-readable-left\)/.test(css), "fixed line input starts at the shared readable boundary");
assert(/\.Input\.CharInput,[\s\S]{0,280}?left:\s*var\(--pl-mobile-readable-left\)/.test(css), "fixed character input starts at the shared readable boundary");
const charCell = fs.readFileSync(path.resolve(__dirname, "..", "css", "CharCell.css"), "utf8");
assert(/--pl-cell-fit:\s*calc\(\(var\(--pl-mobile-shell-width\)[^;]*--pl-mobile-cell-padding/.test(charCell), "CharCell fit derives from the same published shell width and padding");
assert(!/--pl-cell-fit:[^;]*100vw/.test(charCell), "CharCell no longer carries a parallel viewport-width formula");

// --- the measured values must be REAL, not fallbacks -------------------
const ml = fs.readFileSync(path.resolve(__dirname, "..", "js", "MobileLayout.js"), "utf8");
assert(/ResizeObserver/.test(ml) && /--pl-band-h/.test(ml), "--pl-band-h is written from a real ResizeObserver on the band, not hardcoded");
assert(/Math\.ceil\(el\.getBoundingClientRect\(\)\.height\)/.test(ml), "fractional band heights round outward so the story reserve cannot clip by one pixel");
assert(/MutationObserver[\s\S]{0,400}windowport/.test(ml) || /windowport[\s\S]{0,400}MutationObserver/.test(ml), "#windowport is watched so --pl-statusbar-h is re-measured when the Glk status banner appears -- it is created on story load, long after every event apply() previously listened to, so the value was 0px for the whole session");
assert(/GridWindow\.reverse/.test(ml) && /--pl-statusbar-h/.test(ml), "MobileLayout still measures the real GridWindow.reverse element rather than guessing the banner height");
assert(/offsetParent\s*!==\s*null/.test(ml), "measurements only count elements that are actually rendered (offsetParent check), so a hidden band/banner contributes 0 rather than a stale height");
assert(/requestAnimationFrame/.test(ml), "band measurement is coalesced to one read per frame (MapBeautify revisits the spokes ~5x/second)");

// --- the spoke rebuild must not thrash the band ------------------------
const mb = fs.readFileSync(path.resolve(__dirname, "..", "js", "MapBeautify.js"), "utf8");
assert(/data-pl-sig/.test(mb), "nonCardinalSpokes no-ops when its content is unchanged instead of tearing down and rebuilding the band ~5x/second");
assert(!/setAttribute\("style"/.test(mb), "the spoke wrapper no longer carries an inline style attribute (it is a styled band member now)");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
