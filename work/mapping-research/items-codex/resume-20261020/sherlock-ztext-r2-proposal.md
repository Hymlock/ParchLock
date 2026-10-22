# R2: correct escape decoding and recognize the actual compiler sentinel

R1 is REVISE, not accepted: paired M12 base12/0 vs candidate7/5 reproduced twice; independent offline actual-memory audit confirms deterministic rejection in WiR2 and Warbler. Original immutable R1 trees/partial gate/logs remain preserved. Only Codex-owned runner PID39348 and children were stopped; bus remains authenticated.

Cause: R1 properly decodes ASCII60/62 around an attribute-name placeholder, exposing `<unknown attribute>` where the old decoder accidentally returned `unknown attribute`. Existing informAttributeNames skips only the latter incorrectly decoded string, then rejects the actual sentinel as an invalid identifier. informPropertyNames depends on that validator, breaking direct room names.

Primary compiler source corroborates the exact sentinel and its use to initialize unnamed attribute slots: https://raw.githubusercontent.com/DavidKinder/Inform6/master/symbols.c write_the_identifier_names, lines538–548 in accessed source. This supports format semantics, not an exact recompilation claim for these stories. Original compiled strings WiR2 address313872 and Warbler313232 share18bytes `14c17353427472601b395dc76b2a14c1f8a5` and decode to the same sentinel.

Propose replacing the existing exact wrongly-decoded placeholder comparison with exact `<unknown attribute>` recognition in informAttributeNames only. Retain all other identifier/alias/duplicate/required-name checks. No punctuation stripping, broad angle-bracket allowance, global text exception, old-decoder shim, classifier activation or metadata shortcut. Correct two-unit escape handling remains unchanged.

Add original-memory WiR2/Warbler sentinel, complete declared attribute/property table and exact direct room-name checks to the permanent harness; test that a different malformed sentinel/name still rejects the table. Then require corrected focused M12 on both trees, prior tests/operator0FAIL, independent prefreeze/current-source review, and a fresh immutable R2 full309x2 gate. R1 partial run cannot certify R2. Before-code adversarial consensus required.
