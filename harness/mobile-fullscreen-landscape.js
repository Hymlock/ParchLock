/**
 * D93 portrait-primary regression (formerly "mobile-fullscreen-landscape",
 * which asserted the OPPOSITE of what D93 requires -- kept as the same
 * filename/harness slot per docs/mobile-ui-plan-d93.md G19, rewritten to
 * fail if any landscape-lock/first-gesture-fullscreen behavior reappears).
 *
 * Verifies: MobileLayout.requestFullscreenLandscape and the first-gesture
 * touchend/click wiring no longer exist at all; isCompact() no longer flips
 * on `pointer: coarse` alone (G26 -- a touchscreen desktop must not get the
 * mobile shell at a desktop-sized viewport); apply() always leaves
 * #pl-rotate-hint hidden, never repurposed to nag for landscape (G7/L1).
 *
 * Usage: node harness/mobile-fullscreen-landscape.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js", "MobileLayout.js"), "utf8");

function makeSandbox(opts) {
    opts = opts || {};
    const handlers = {};
    const style = {};
    const hint = {
        hidden: false,
        _attrs: {},
        setAttribute: function (k, v) { hint._attrs[k] = v; }
    };
    const doc = {
        readyState: "complete",
        documentElement: { style: { setProperty: function (k, v) { style[k] = v; } } },
        body: { classList: { _set: {}, toggle: function (name, on) { this._set[name] = !!on; } } },
        getElementById: function (id) { return id === "pl-rotate-hint" ? hint : null; },
        querySelector: function () { return null; },
        addEventListener: function (evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
        removeEventListener: function (evt, fn) {
            handlers[evt] = (handlers[evt] || []).filter(function (h) { return h !== fn; });
        }
    };
    const sandbox = {
        console, setTimeout, clearTimeout,
        document: doc,
        window: {
            matchMedia: function (q) {
                if (opts.compact === false) return { matches: false };
                if (q.indexOf("pointer") !== -1) return { matches: !!opts.coarsePointerOnly };
                return { matches: true };
            },
            innerWidth: opts.compact === false ? 1400 : 375,
            innerHeight: opts.compact === false ? 900 : 667,
            addEventListener: function () {},
            visualViewport: null
        },
        screen: {}
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    return { sandbox, doc, handlers, hint };
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("PASS:", msg); } else { fail++; console.error("FAIL:", msg); } }

function run() {
    // --- The landscape-lock mechanism must not exist at all anymore ---
    {
        const { sandbox } = makeSandbox({ compact: true });
        ok(typeof sandbox.MobileLayout.requestFullscreenLandscape !== "function",
            "MobileLayout.requestFullscreenLandscape no longer exists (D93 deletion, not a disable)");
        ok(sandbox.MobileLayout._fullscreenAttempted === undefined,
            "no _fullscreenAttempted state remains from the deleted mechanism");
    }

    // --- init() must not register any first-gesture fullscreen listener ---
    {
        const { sandbox, handlers } = makeSandbox({ compact: true });
        sandbox.MobileLayout.init();
        const touchendCount = (handlers.touchend || []).length;
        const clickCount = (handlers.click || []).length;
        ok(touchendCount === 0, "init() registers no touchend gesture-stealing listener");
        ok(clickCount === 0, "init() registers no click gesture-stealing listener");
        ok(!handlers.fullscreenchange && !handlers.webkitfullscreenchange,
            "init() registers no fullscreenchange re-arm listener (nothing left to re-arm)");
    }

    // --- G26: pointer:coarse alone must not flip isCompact (desktop-touchscreen leak) ---
    {
        const { sandbox } = makeSandbox({ compact: false, coarsePointerOnly: true });
        ok(sandbox.MobileLayout.isCompact() === false,
            "isCompact() ignores pointer:coarse when width/height are desktop-sized (G26 fix)");
    }
    {
        const { sandbox } = makeSandbox({ compact: true });
        ok(sandbox.MobileLayout.isCompact() === true,
            "isCompact() still correctly reports compact on an actual narrow/short viewport");
    }

    // --- The rotate hint must always end up hidden, never shown for portrait ---
    {
        const { sandbox, hint } = makeSandbox({ compact: true });
        sandbox.MobileLayout.apply();
        ok(hint.hidden === true, "#pl-rotate-hint stays hidden on a compact/portrait-shaped viewport (D93 supersedes D92's nag)");
        ok(hint._attrs["aria-hidden"] === "true", "#pl-rotate-hint's aria-hidden stays true");
    }
    {
        const { sandbox, hint } = makeSandbox({ compact: false });
        sandbox.MobileLayout.apply();
        ok(hint.hidden === true, "#pl-rotate-hint stays hidden on a desktop viewport too");
    }

    console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
    if (fail) {
        console.error("FAIL: mobile-fullscreen-landscape (" + fail + " failed, " + pass + " passed)");
        process.exit(1);
    }
    console.log("PASS: mobile-fullscreen-landscape (" + pass + " passed)");
}

run();
