# Map visual implementation audit ? 2026-10-09

Plan consensus2057/2061/2076; canonical D215 recorded2074. Implementation accepted2080 after B1 specificity correction2079.

CSS only:44px native Map controls/Notes summaries with chevrons and inset contents; decorative10px current-location pip; themed known-room chip; mobile sheet ends above unchanged controls; World toolbar44px targets and compact two-row layout. Preserve node boxes/graph/pathing/interactive Back/Go/notes sibling/handles/input.

Validation: native12 map/world width-theme screenshots320/390/1280 without horizontal overflow; native centered and browsed pip geometry clear of names/neighbor/viewport; world-map-ui52/0, panel-reflow29/0, exit0. Peer independently reran guards and verified corrected summary padding/clipping.

Separate pre-existing issue: browsed Back/Go24px icons cover the long name at all3widths; reported2077, separate proposal2080 rejected2082 pending safer placement. Long-name spill320 also deferred under D202 geometry. No APK or physical-phone claim. Shell144.
