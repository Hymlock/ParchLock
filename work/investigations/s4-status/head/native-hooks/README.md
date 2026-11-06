# native-hooks

C ABI stub for future Emglken/Bocfel VM RAM introspection.

## Build (uses SKSEDevKit CMake + Ninja + MSVC)

```powershell
cd native-hooks
.\build.ps1
```

Successful smoke print:

```text
PASS: pm_vm_probe abi=1 build=parchmap-native-hooks-0.1.0-stub ...
```

## Next

1. Add Emscripten toolchain file when `emcc` is available.
2. Link against Bocfel/Glulxe object tables once Emglken host is in-tree.
3. Expose the same ABI to JS via `HEAPU8` / wasm exports.
