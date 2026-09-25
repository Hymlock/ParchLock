const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("js/ModuleLibrary.js", "utf8");

function makeContext() {
    const storage = new Map();
    const context = {
        console,
        Uint8Array,
        Int32Array,
        DataView,
        ArrayBuffer,
        Promise,
        TextDecoder,
        DOMParser: function () {},
        localStorage: {
            getItem: key => storage.has(key) ? storage.get(key) : null,
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: key => storage.delete(key)
        },
        navigator: {},
        GameList: [],
        window: null,
        CustomEvent: function () {},
        atob: value => Buffer.from(value, "base64").toString("binary"),
        btoa: value => Buffer.from(value, "binary").toString("base64")
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(source, context);
    return context;
}

(async function () {
    const ctx = makeContext();
    const ml = ctx.ModuleLibrary;
    assert.strictEqual(
        ml.sha256Fallback(new Uint8Array([])),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert.strictEqual(
        ml.sha256Fallback(new Uint8Array(Buffer.from("abc"))),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    const z3 = new Uint8Array(64);
    z3[0] = 3;
    const inspected = ml.inspect(z3, "sample.z3");
    assert.strictEqual(inspected.format, "z3");
    assert.strictEqual(inspected.compat, "full Z-machine features");
    assert.throws(() => ml.inspect(Uint8Array.from([6, 0, 0]), "bad.z6"), /Unsupported/);
    assert(ml.localPathPattern.test("local/" + "a".repeat(64) + ".z5.js"));
    assert(!ml.localPathPattern.test("local/../bad.z5.js"));
    const local = "local/" + "a".repeat(64) + ".z5.js";
    assert.strictEqual(ml.canonicalLocalPath(local), local);
    assert.strictEqual(ml.canonicalLocalPath(local + "?cache=1"), null);
    assert.strictEqual(ml.canonicalLocalPath(local + "#fragment"), null);
    console.log("d98 ModuleLibrary core: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
