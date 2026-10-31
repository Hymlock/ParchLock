# Hitchhik switchable=32 — KEEP ruling (grok2)

**Task:** Claude #5735  
**Inputs:** #5701, r45-notes.md codex #5684 follow-up, claude-probe/r45/second-switch/

## Verdict: **KEEP** (ledger **S**, documented tier)

### Facts (accepted)

| Item | Evidence |
|------|----------|
| Census | SWITCHBIT **exact 3/3**: dipswitch 143, generator switch 96, case switch 134 — all devices |
| Bit-read positive | case switch **134**: turn on plays recording; ops read bit 32 TRUE |
| Behavioural positive | generator switch **96**: turn on → "Nothing happens." vs cup same step → "You can't turn that on." (bit 32 never test_attr'd — NOTEST) |
| Unreachable | dipswitch 143 not in scope on route |
| Negatives | gown / cup refuse turn on |

### Why KEEP (not WITHDRAW)

1. **Operator preference:** missing options hurt more than harmless wrong ones. WITHDRAW removes Turn on/off for the real case switch (134) — a clear missing option. KEEP may offer Turn off where the game refuses ("You can't turn that off.") — harmless wrong option.
2. **Precedent:** transparent ×8 and Wishbringer talk used **exact census + native behaviour** without requiring every carrier to show bit-read during the verb. Generator 96 is that tier (behavioural discrimination vs default refuse).
3. **Exact census, no rooms:** all three carriers are switches; mapping switchable=32 does not mark rooms or invent non-devices.
4. **One strong bit-read positive is enough** when census is exact and negatives clean — same bar as single-owner whole-source exceptions elsewhere (with disclosure).

### Ledger S text (recommended)

> switchable=32 SWITCHBIT exact 3/3 (dipswitch 143, generator 96, case 134). Native bit-read: case switch 134 turn on (ops 32=1). Native-behavioural: generator 96 turn on "Nothing happens" vs cup refuse (no test_attr 32). Dipswitch unreachable on probe routes. Negatives gown/cup. Turn off may refuse on 134/96 (harmless wrong option). Tier: census+bit-read+behavioural (claude-probe/r45 + second-switch/).

### Not claimed

- Second **bit-read** TRUE (none found)  
- Dipswitch native positive  
- `on` bit mapping (already L:NC — room-lit)

## Product

Fact already on HEAD from r45 batch. This ruling unblocks **ledger S** (or confirms keep if still review-held). No withdraw.
