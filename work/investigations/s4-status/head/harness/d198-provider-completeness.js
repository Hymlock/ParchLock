const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const providerNames = [
    'z-ram', 'grammar-ram', 'buffer-tap', 'dark-scope',
    'graphics-dock', 'glk-tap', 'remglk'
];

function load() {
    const provider = name => ({ name, collect: () => ({ sources: [{ name }] }) });
    const sandbox = {
        console,
        ZRamProvider: { collect: () => ({}) },
        GrammarProvider: { collect: () => ({}) },
        BufferTapProvider: { collect: () => ({}) },
        DarkScope: { collect: () => ({}) },
        GraphicsDock: { collect: () => ({}) },
        GlkTapProvider: provider('glk-tap'),
        EmglkenProvider: provider('remglk')
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'WorldModel.js'), 'utf8'), sandbox);
    return sandbox.WorldModel;
}

for (let mask = 0; mask < (1 << providerNames.length); mask++) {
    const world = load();
    const existing = providerNames
        .filter((_name, index) => mask & (1 << index))
        .reverse()
        .map(name => ({ name, collect: () => ({ existing: name }) }));
    const sentinels = existing.slice();
    world.providers = existing.slice();
    world.ensureProviders();

    assert.deepEqual(
        world.providers.slice(0, sentinels.length),
        sentinels,
        'existing provider order and object identity are preserved for mask ' + mask
    );
    assert.equal(new Set(world.providers.map(item => item.name)).size, providerNames.length);
    assert.deepEqual(
        new Set(world.providers.map(item => item.name)),
        new Set(providerNames),
        'every known provider exists exactly once for mask ' + mask
    );

    const snapshot = world.providers.slice();
    world.ensureProviders();
    assert.deepEqual(world.providers, snapshot, 'second repair is idempotent for mask ' + mask);
}

console.log('PASS D198 provider completeness: all 128 partial registries, stable order, no replacement, idempotent');
