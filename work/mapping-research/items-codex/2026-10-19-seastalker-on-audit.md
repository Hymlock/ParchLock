# Seastalker on19 independent audit (existing committed fact only)

Digest502e5c8e4cb82726ab61683f4d92afbb31f90fcb98b9b3dc3dbd4f97841c5582 current attributeMap.on19. Scoped semantic state fact ACCEPT; not general switchable capability or full module acceptance.

Raw recorder distinction required by lead4296: original-scene walkthrough pzseastalker3, named player startup Codex/Audit/yes handled before commands, no insert_obj. Do NOT use pk-seastalker/pzseastalker/pzseastalker2: they are stuck in name-confirmation and have no actual command ops. g1-ssO microphone attempt is refused not-held, so that record is not a successful microphone transition.

Good native pzseastalker3:
- step3 TURN ON VIDEOPHONE141: test19false, set19, after attrs byte2 bit16set; native picture/sound +scorepoint.
- step6 TURN ON MICROPHONE62 (held by194): test19false, set19; native microphone nowon, postattrs19set.
- step13 TURN ON COMPUTESTOR91: test19false,set19; native readyforquestions, postattrs19set.
- step41 TURN REACTOR ON227: test19false,set19; electricalsystemsactivated, postattrs19set.
- Original g1-ssO step0 TURN ON LOGBOOK195: target19false, native cannotturnon, postbit19absent. Distinct negative in correctscene.

Author source ss-src/verbs.zil2325-2354 separates ON?BIT capability from ONBIT state, preserving distinction. Source state predicate plus actual target-specific set/postmemory transitions establish19 rather than treating any testedbit as success. Original precondition failure records explicitly excluded.

Complete selected raw records archived in2026-10-19-seastalker-on-native.json with input SHA256; underlying current flag consumer unchanged. Integrator can attach independent audit to existing on19 C cell, retaining required gate provenance. No new runtime code or gate requested.
