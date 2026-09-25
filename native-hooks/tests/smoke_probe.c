#include <stdio.h>
#include <string.h>
#include "pm_vm_probe.h"

int main(void) {
  const PmVmProbeInfo *info = pm_vm_probe_info();
  unsigned char sample[1024];
  PmZObjectSummary sum;
  int r, n;
  if (!info || info->abi_version != PM_VM_PROBE_ABI_VERSION) {
    fprintf(stderr, "FAIL: abi\n");
    return 1;
  }
  memset(sample, 0, sizeof(sample));
  sample[0] = 5; /* Z5: 63 default words, 14-byte objects */
  sample[10] = 0x00; sample[11] = 64;   /* object table */
  sample[12] = 0x02; sample[13] = 0x00; /* globals @ 512 — room for defaults+objects */
  r = pm_vm_probe_scan_stub(sample, (int)sizeof(sample));
  if (r != 64) { fprintf(stderr, "FAIL: scan %d\n", r); return 1; }
  n = pm_vm_probe_z_summary(sample, (int)sizeof(sample), &sum);
  if (n <= 0) { fprintf(stderr, "FAIL: summary %d\n", n); return 1; }
  printf("PASS: pm_vm_probe abi=%d build=%s objs=%d entry=%d\n",
         info->abi_version, info->build_id, sum.object_count, sum.object_entry_size);
  return 0;
}