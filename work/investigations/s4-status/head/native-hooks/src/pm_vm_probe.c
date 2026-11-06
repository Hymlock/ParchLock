#include "pm_vm_probe.h"
#include <string.h>

static const PmVmProbeInfo g_info = {
  PM_VM_PROBE_ABI_VERSION,
  1,
  1,
  0,
  "parchmap-native-hooks-0.2.0-zobj"
};

static unsigned short rd_u16(const unsigned char *b, int off) {
  return (unsigned short)((b[off] << 8) | b[off + 1]);
}

const PmVmProbeInfo *pm_vm_probe_info(void) {
  return &g_info;
}

int pm_vm_probe_scan_stub(const unsigned char *bytes, int length) {
  if (!bytes || length < 64) return -1;
  if (bytes[0] >= 1 && bytes[0] <= 8) {
    int obj = rd_u16(bytes, 10);
    if (obj > 0 && obj < length) return obj;
    return 0;
  }
  if (length >= 4 && bytes[0]=='G' && bytes[1]=='l' && bytes[2]=='u' && bytes[3]=='l') {
    return 0;
  }
  return -1;
}

int pm_vm_probe_z_summary(const unsigned char *bytes, int length, PmZObjectSummary *out) {
  int ver, obj_table, globals, defaults_words, entry_size, first_obj, span, count, i, max_sample;
  if (!bytes || !out || length < 64) return -1;
  memset(out, 0, sizeof(*out));
  ver = bytes[0];
  if (ver < 1 || ver > 8) return -1;

  obj_table = rd_u16(bytes, 10);
  globals = rd_u16(bytes, 12);
  if (obj_table <= 0 || obj_table >= length) return -1;
  if (globals <= obj_table || globals > length) return -1;

  if (ver <= 3) {
    defaults_words = 31;
    entry_size = 9;
  } else {
    defaults_words = 63;
    entry_size = 14;
  }

  first_obj = obj_table + defaults_words * 2;
  if (first_obj >= globals) return -1;
  span = globals - first_obj;
  if (span < entry_size) return -1;
  count = span / entry_size;
  /* Sanity clamp: Inform games rarely exceed a few thousand objects */
  if (count > 65535) count = 65535;

  out->version = ver;
  out->object_table = obj_table;
  out->object_count = count;
  out->object_entry_size = entry_size;
  out->defaults_words = defaults_words;

  max_sample = count < 16 ? count : 16;
  out->sample_count = max_sample;
  for (i = 0; i < max_sample; ++i) {
    int id = i + 1;
    int base = first_obj + i * entry_size;
    int parent, sibling, child;
    if (base + entry_size > length) break;
    if (ver <= 3) {
      /* attrs 4, parent/sibling/child bytes at 4,5,6; props at 7..8 */
      parent = bytes[base + 4];
      sibling = bytes[base + 5];
      child = bytes[base + 6];
    } else {
      /* attrs 6, parent/sibling/child words at 6,8,10 */
      parent = rd_u16(bytes, base + 6);
      sibling = rd_u16(bytes, base + 8);
      child = rd_u16(bytes, base + 10);
    }
    out->sample_ids[i] = id;
    out->sample_parents[i] = parent;
    out->sample_siblings[i] = sibling;
    out->sample_childs[i] = child;
  }
  return count;
}