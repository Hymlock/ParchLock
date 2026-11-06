/* pm_vm_probe.h - portable VM probe ABI (MSVC + Emscripten).
 * Shipped as lib/pm_vm_probe.{js,wasm}. No machine-local paths.
 */
#ifndef PM_VM_PROBE_H
#define PM_VM_PROBE_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
#  ifdef PM_VM_PROBE_BUILD
#    define PM_API __declspec(dllexport)
#  else
#    define PM_API __declspec(dllimport)
#  endif
#else
#  define PM_API __attribute__((visibility("default")))
#endif

#define PM_VM_PROBE_ABI_VERSION 2

typedef struct PmVmProbeInfo {
  int abi_version;
  int supports_zmachine;
  int supports_glulx;
  int supports_heap_view;
  const char *build_id;
} PmVmProbeInfo;

/* Compact Z-machine object-table summary from a story image (not live HEAP). */
typedef struct PmZObjectSummary {
  int version;
  int object_table;
  int object_count;
  int object_entry_size;
  int defaults_words;
  int sample_count;
  int sample_ids[16];
  int sample_parents[16];
  int sample_childs[16];
  int sample_siblings[16];
} PmZObjectSummary;

PM_API const PmVmProbeInfo *pm_vm_probe_info(void);

/* Returns object-table address for Z, 0 for Glulx, -1 on failure. */
PM_API int pm_vm_probe_scan_stub(const unsigned char *bytes, int length);

/* Fill Z object-table summary. Returns object_count or -1. */
PM_API int pm_vm_probe_z_summary(const unsigned char *bytes, int length, PmZObjectSummary *out);

#ifdef __cplusplus
}
#endif

#endif /* PM_VM_PROBE_H */