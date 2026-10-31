const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function b64(bytes) {
    return Buffer.from(bytes).toString('base64');
}

function z3(seed) {
    const out = Buffer.alloc(96, 0);
    out[0] = 3;
    out[2] = 0;
    out[3] = seed;
    Buffer.from('260929').copy(out, 18);
    out[64] = seed;
    return new Uint8Array(out);
}

function blorb(exec, marker) {
    const ridxLength = 16;
    const ridxOffset = 12;
    const zcodOffset = ridxOffset + 8 + ridxLength;
    const extraLength = 1;
    const total = zcodOffset + 8 + exec.length + 8 + extraLength + 1;
    const out = Buffer.alloc(total, 0);
    out.write('FORM', 0);
    out.writeUInt32BE(total - 8, 4);
    out.write('IFRS', 8);
    out.write('RIdx', ridxOffset);
    out.writeUInt32BE(ridxLength, ridxOffset + 4);
    out.writeUInt32BE(1, ridxOffset + 8);
    out.write('Exec', ridxOffset + 12);
    out.writeUInt32BE(0, ridxOffset + 16);
    out.writeUInt32BE(zcodOffset, ridxOffset + 20);
    out.write('ZCOD', zcodOffset);
    out.writeUInt32BE(exec.length, zcodOffset + 4);
    Buffer.from(exec).copy(out, zcodOffset + 8);
    const extra = zcodOffset + 8 + exec.length;
    out.write('AUTH', extra);
    out.writeUInt32BE(extraLength, extra + 4);
    out[extra + 8] = marker;
    return new Uint8Array(out);
}

function manualZcod(bytes) {
    const data = Buffer.from(bytes);
    assert.equal(data.toString('ascii', 0, 4), 'FORM');
    assert.equal(data.toString('ascii', 8, 12), 'IFRS');
    for (let pos = 12; pos + 8 <= data.length;) {
        const type = data.toString('ascii', pos, pos + 4);
        const length = data.readUInt32BE(pos + 4);
        if (type === 'RIdx') {
            const count = data.readUInt32BE(pos + 8);
            for (let i = 0; i < count; i++) {
                const entry = pos + 12 + i * 12;
                if (data.toString('ascii', entry, entry + 4) !== 'Exec') continue;
                const chunk = data.readUInt32BE(entry + 8);
                assert.equal(data.toString('ascii', chunk, chunk + 4), 'ZCOD');
                const size = data.readUInt32BE(chunk + 4);
                return new Uint8Array(data.subarray(chunk + 8, chunk + 8 + size));
            }
        }
        pos += 8 + length + (length & 1);
    }
    throw new Error('No ZCOD resource');
}

async function main() {
    let nextResponse = '';
    const originalAjax = () => Promise.resolve(nextResponse);
    function jq() { return { off() { return this; }, on() { return this; } }; }
    jq.ajax = originalAjax;
    jq.Deferred = () => { throw new Error('local IndexedDB path is not used in this fixture'); };

    const sandbox = {
        console,
        Promise,
        Uint8Array,
        DataView,
        TextDecoder,
        DOMParser: function () {
            this.parseFromString = () => ({ getElementsByTagName: () => [] });
        },
        atob: value => Buffer.from(value, 'base64').toString('binary'),
        btoa: value => Buffer.from(value, 'binary').toString('base64'),
        localStorage: { getItem: () => null, setItem() {} },
        navigator: {},
        window: { GameList: [], addEventListener() {} },
        jQuery: jq,
        $: jq
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'ModuleLibrary.js'), 'utf8'), sandbox);

    const exec = z3(7);
    const packageA = blorb(exec, 1);
    const packageB = blorb(exec, 2);
    const expected = crypto.createHash('sha256').update(exec).digest('hex');

    nextResponse = b64(packageA);
    const deliveredA = await sandbox.jQuery.ajax({ dataType: 'jsonp', url: 'games/a.zblorb.js' });
    assert.equal(deliveredA, nextResponse, 'adapter returns the exact original story response');
    const identityA = await sandbox.ModuleLibrary.whenExecutableIdentityReady();
    assert.equal(identityA.digest, expected, 'identity hashes executable ZCOD, not its container');
    assert.equal(identityA.bytes, undefined, 'identity summary does not carry the whole executable (b747e425 summary contract)');
    assert.deepEqual(Array.from(sandbox.ModuleLibrary.currentExecutableBytes()), Array.from(exec), 'opt-in bytes exactly match executable ZCOD');
    assert.deepEqual(identityA.header, Array.from(exec.subarray(0, 64)), 'summary header matches executable ZCOD header');

    nextResponse = b64(packageB);
    await sandbox.jQuery.ajax({ dataType: 'jsonp', url: 'games/b.zblorb.js' });
    const identityB = sandbox.ModuleLibrary.currentExecutableIdentity();
    assert.equal(identityB.digest, expected, 'different Blorb containers share executable identity');
    assert.notEqual(
        await sandbox.ModuleLibrary.hash(packageA),
        await sandbox.ModuleLibrary.hash(packageB),
        'container/module identities remain distinct'
    );

    const bytesB = sandbox.ModuleLibrary.currentExecutableBytes();
    bytesB[0] = 8;
    assert.equal(sandbox.ModuleLibrary.currentExecutableBytes()[0], 3, 'public bytes getter cannot mutate retained bytes');
    assert.ok(Object.isFrozen(identityB) && Object.isFrozen(identityB.header), 'public identity summary is immutable');

    assert.equal(
        sandbox.ModuleLibrary.currentExecutableIdentity('games/a.zblorb.js').digest,
        expected,
        'path-keyed identity survives a later story capture'
    );

    const differentExec = z3(8);
    nextResponse = b64(differentExec);
    await sandbox.jQuery.ajax({ dataType: 'jsonp', url: 'games/different.z3.js' });
    assert.notEqual(
        sandbox.ModuleLibrary.currentExecutableIdentity('games/different.z3.js').digest,
        expected,
        'different executable ZCOD bytes never share D198 identity'
    );

    nextResponse = b64(exec);
    const deliveredRaw = await sandbox.jQuery.ajax({ dataType: 'jsonp', url: 'games/raw.z3' });
    assert.equal(deliveredRaw, nextResponse, 'raw Z-code URL without .js is captured without changing delivery');
    assert.equal(sandbox.ModuleLibrary.currentExecutableIdentity('games/raw.z3').digest, expected);

    const cryptoFailure = { subtle: { digest: () => Promise.reject(new Error('digest unavailable')) } };
    sandbox.window.crypto = cryptoFailure;
    sandbox.crypto = cryptoFailure;
    nextResponse = b64(z3(9));
    const deliveredOnFailure = await sandbox.jQuery.ajax({ dataType: 'jsonp', url: 'games/fail.z3.js' });
    assert.equal(deliveredOnFailure, nextResponse, 'identity failure never blocks the story response');
    assert.equal(sandbox.ModuleLibrary.currentExecutableIdentity('games/fail.z3.js'), null, 'identity fails closed');

    nextResponse = b64(new Uint8Array([9, 0, 0, 0]));
    const deliveredInvalid = await sandbox.jQuery.ajax({ dataType: 'jsonp', url: 'games/invalid.z3.js' });
    assert.equal(deliveredInvalid, nextResponse, 'inspection failure also leaves story delivery to the VM');
    assert.equal(sandbox.ModuleLibrary.currentExecutableIdentity('games/invalid.z3.js'), null);

    sandbox.window.crypto = null;
    sandbox.crypto = null;
    const localPath = 'local/' + 'a'.repeat(64) + '.z3.js';
    const localExec = z3(11);
    const localRecord = { path: localPath, bytes: localExec.buffer.slice(0) };
    const fakeDb = {
        objectStoreNames: { contains: () => true },
        transaction() {
            return {
                objectStore() {
                    return {
                        get() {
                            const request = {};
                            queueMicrotask(() => {
                                request.result = localRecord;
                                if (request.onsuccess) request.onsuccess();
                            });
                            return request;
                        }
                    };
                }
            };
        }
    };
    const fakeIndexedDb = {
        open() {
            const request = {};
            queueMicrotask(() => {
                request.result = fakeDb;
                if (request.onsuccess) request.onsuccess();
            });
            return request;
        }
    };
    sandbox.window.indexedDB = fakeIndexedDb;
    sandbox.indexedDB = fakeIndexedDb;
    jq.Deferred = () => {
        let resolve, reject;
        const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
        return {
            resolve,
            reject,
            promise(extra) { return Object.assign(promise, extra || {}); }
        };
    };
    const localDelivered = await sandbox.jQuery.ajax({ dataType: 'jsonp', url: localPath });
    assert.equal(localDelivered, b64(localExec), 'local IndexedDB branch returns its exact stored bytes');
    assert.equal(
        sandbox.ModuleLibrary.currentExecutableIdentity(localPath).digest,
        crypto.createHash('sha256').update(localExec).digest('hex'),
        'local IndexedDB branch records executable identity before delivery'
    );

    const realName = 'PerrysWorld.zblorb.js';
    const wrapper = fs.readFileSync(path.join(__dirname, '..', 'games', realName));
    const match = wrapper.toString('utf8').match(/^processBase64Zcode\(\s*(['"])([A-Za-z0-9+/=]+)\1\s*\)\s*;?\s*$/);
    assert(match, 'real catalog zblorb wrapper is recognized');
    const realContainer = new Uint8Array(Buffer.from(match[2], 'base64'));
    const realInspected = sandbox.ModuleLibrary.inspect(wrapper, realName);
    assert.deepEqual(
        Array.from(realInspected.executableBytes),
        Array.from(manualZcod(realContainer)),
        'real catalog Blorb executable slice matches an independent RIdx/ZCOD extraction'
    );
    console.log('PASS D198 loader identity: exact response, pre-VM executable digest, container separation, immutable getter');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
