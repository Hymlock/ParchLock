# Sherlock grok lane index (native 2+1 packets)

Generator: probes/mk-sherlock-packets.cjs sha256 2b528062253639aafea53599409ad1ddcbc8cd16161ebf11d35a778e2f2bac33. Helper g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc.

PASS (single seed-0 run group), all 10: transparent 2, container 9, supporter 16, door 8, opened 5, locked 15, openable 44, animate 40 (+PERSON 47, dog/pigeon ALIVE-not-PERSON), talkable 47, enterable/vehicle 1.
UPDATE 03:13 ET (after bus notice #5994-5996): transparent 2 is now PASS (single run 071202-21732, plan plan-sh-wax44e.json): wax pool 179 and melted wax axe 259 (charles.zil:199 runtime FSET via test-step GET AX + MELT AX WITH TORCH) both read bit2=1 via EXAMINE TORCH THROUGH <obj>; pipe 218 reads 0. The run-combination ruling is no longer needed. Reviewers: please review the new transparent packet sha.

- PACKET-sherlock-animate.md sha256 d29966050b7bd900139efd691ea97288bb64118837b74afd710c56a18bf39d44
- PACKET-sherlock-container.md sha256 2512c457cf3f5bfec372a8b9eef60ca52f8c38b15731f9a144729eb3549f5d80
- PACKET-sherlock-door.md sha256 e85b2a7d4bc3c40ee999a69c841d321da097661cc1a92ddecc1e051c3512bfcc
- PACKET-sherlock-enterable-vehicle.md sha256 f153bad3ed24c41ad95d338412bbd14ae9e6da21c8ec2978908db6f361909a81
- PACKET-sherlock-locked.md sha256 066f0bf163166ff2e26282f14749b00da2cc9a815604c5b688b8e6beba221b78
- PACKET-sherlock-openable.md sha256 1ef3c40042d555adf4114b44f65f6ce28f9e6c6528e03641647d4ddf51cec542
- PACKET-sherlock-opened.md sha256 c432e7369f969afa8522d2325a81faa5b85dfbd50c495057aa265de01a818dc9
- PACKET-sherlock-supporter.md sha256 c75f27784be544478b68095a80c8a0bd8c001b1be05468dbfffa696d7508b8ac
- PACKET-sherlock-talkable.md sha256 c8fe7d5a0cf2940d5e4439bd080c20e06e5a527681fab08262b5eb53d485a184
- PACKET-sherlock-transparent.md sha256 325fa9113826e986b93a7a0a7e5fed4cc69b01d1eaf5f4dc27bb6f91250cf660 (replaces b3bea59c SPLIT version)
