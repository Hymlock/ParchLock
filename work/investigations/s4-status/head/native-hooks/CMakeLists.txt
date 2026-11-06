cmake_minimum_required(VERSION 3.21)

project(pm_vm_probe VERSION 0.1.0 LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

option(PL_BUILD_WASM "Build for Emscripten/WASM" OFF)

if(EMSCRIPTEN OR PL_BUILD_WASM)
  # Emscripten: build a modular JS/WASM module (not a Windows DLL).
  add_executable(pm_vm_probe src/pm_vm_probe.c)
  target_include_directories(pm_vm_probe PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
  target_compile_definitions(pm_vm_probe PRIVATE PL_VM_PROBE_BUILD)
  set_target_properties(pm_vm_probe PROPERTIES
    OUTPUT_NAME "pm_vm_probe"
    SUFFIX ".js"
  )
  target_link_options(pm_vm_probe PRIVATE
    "SHELL:-s EXPORTED_FUNCTIONS=['_pm_vm_probe_info','_pm_vm_probe_scan_stub','_pm_vm_probe_z_summary','_malloc','_free']"
    "SHELL:-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','getValue','setValue','HEAPU8']"
    "SHELL:-s MODULARIZE=1"
    "SHELL:-s EXPORT_NAME=createPmVmProbe"
    "SHELL:-s ENVIRONMENT=web,node"
  )
else()
  add_library(pm_vm_probe SHARED src/pm_vm_probe.c)
  target_include_directories(pm_vm_probe PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
  target_compile_definitions(pm_vm_probe PRIVATE PL_VM_PROBE_BUILD)
  if(MSVC)
    target_compile_options(pm_vm_probe PRIVATE /W4 /permissive- /utf-8)
  endif()

  add_executable(pm_vm_probe_smoke tests/smoke_probe.c)
  target_link_libraries(pm_vm_probe_smoke PRIVATE pm_vm_probe)
  target_include_directories(pm_vm_probe_smoke PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/include")
  enable_testing()
  add_test(NAME smoke COMMAND pm_vm_probe_smoke)
endif()