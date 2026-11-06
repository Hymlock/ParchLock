const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("js/ModuleLibrary.js", "utf8");

function makeContext(ajax) {
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
    if(ajax)context.jQuery={ajax};
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
    const glul=Buffer.alloc(36);glul.write('Glul');glul.writeUInt32BE(0x00030103,4);
    const blorb=Buffer.alloc(80);blorb.write('FORM');blorb.writeUInt32BE(72,4);blorb.write('IFRS',8);blorb.write('RIdx',12);blorb.writeUInt32BE(16,16);blorb.writeUInt32BE(1,20);blorb.write('Exec',24);blorb.writeUInt32BE(36,32);blorb.write('GLUL',36);blorb.writeUInt32BE(36,40);glul.copy(blorb,44);
    let response='',fetches=0;const seam=makeContext(()=>{fetches++;return Promise.resolve(response);});
    for(const [file,bytes,format]of [['games/seam.ulx.js',glul,'ulx'],['games/seam.gblorb.js',blorb,'gblorb']]){
        response=bytes.toString('base64');const returned=await seam.jQuery.ajax({url:file});const identity=seam.ModuleLibrary.currentExecutableIdentity(file);
        assert.strictEqual(returned,response,'loader receives exact original response');assert(identity,'identity exists before loader continuation');assert.strictEqual(identity.format,format);assert.strictEqual(identity.digest,require('crypto').createHash('sha256').update(glul).digest('hex'),'hash executable GLUL, not container');assert.strictEqual(identity.byteLength,36);assert(Object.isFrozen(identity) && Object.isFrozen(identity.header), 'identity summary and header are immutable');assert.strictEqual(identity.header[0],0x47);assert.strictEqual(seam.ModuleLibrary.currentExecutableIdentity(file),identity,'identity summary is memoized');assert(!('bytes' in identity),'full bytes stay off hot path');const copy=seam.ModuleLibrary.currentExecutableBytes(file);copy[0]=0;assert.strictEqual(seam.ModuleLibrary.currentExecutableBytes(file)[0],0x47,'explicit full bytes are defensive copies');
    }
    assert.strictEqual(fetches,2,'one story request per loader response, no second fetch');
    console.log("d98 ModuleLibrary core and GLUL response identity: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
