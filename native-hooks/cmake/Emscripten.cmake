# Emscripten toolchain for pm_vm_probe.wasm
# Usage (after emsdk_env):
#   cmake --preset wasm -DCMAKE_TOOLCHAIN_FILE=cmake/Emscripten.cmake
#   cmake --build --preset wasm

if(NOT DEFINED ENV{EMSDK})
  message(FATAL_ERROR "EMSDK not set. Run emsdk_env.bat first (see Projects\\emsdk).")
endif()

set(EMSCRIPTEN_ROOT_PATH "$ENV{EMSDK}/upstream/emscripten")
include("${EMSCRIPTEN_ROOT_PATH}/cmake/Modules/Platform/Emscripten.cmake")