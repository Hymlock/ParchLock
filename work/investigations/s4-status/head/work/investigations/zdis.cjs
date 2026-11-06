// Minimal Z-machine (v5/v8) forward disassembler for M04-B research (Codex
// #2736). Diagnostic only, no product code. Linear sweep of Inform's code
// area: routines are laid out contiguously from the high-memory mark, each
// starting with a local-count byte (v5+: no initial values), padded with zero
// bytes to the packed-address boundary. A routine ends at a terminating
// instruction past every branch/jump target seen in it.
//   node work/investigations/zdis.cjs <memdump.bin> <hexOrDecConstant> [contextRoutineCount]
// Prints every routine whose decoded instructions use the constant as an
// operand, with its full forward disassembly.
const fs = require('fs');
const mem = fs.readFileSync(process.argv[2]);
const target = Number(process.argv[3]);
const u8 = a => mem[a], u16 = a => (mem[a] << 8) | mem[a + 1];
const version = u8(0), himem = u16(4), scale = version === 8 ? 8 : 4;
if (version !== 5 && version !== 8) { console.log('unsupported version', version); process.exit(2); }
const OP2 = { 1: 'je b', 2: 'jl b', 3: 'jg b', 4: 'dec_chk b', 5: 'inc_chk b', 6: 'jin b', 7: 'test b', 8: 'or s', 9: 'and s', 10: 'test_attr b', 11: 'set_attr', 12: 'clear_attr', 13: 'store', 14: 'insert_obj', 15: 'loadw s', 16: 'loadb s', 17: 'get_prop s', 18: 'get_prop_addr s', 19: 'get_next_prop s', 20: 'add s', 21: 'sub s', 22: 'mul s', 23: 'div s', 24: 'mod s', 25: 'call_2s s', 26: 'call_2n', 27: 'set_colour', 28: 'throw' };
const OP1 = { 0: 'jz b', 1: 'get_sibling sb', 2: 'get_child sb', 3: 'get_parent s', 4: 'get_prop_len s', 5: 'inc', 6: 'dec', 7: 'print_addr', 8: 'call_1s s', 9: 'remove_obj', 10: 'print_obj', 11: 'ret T', 12: 'jump J', 13: 'print_paddr', 14: 'load s', 15: 'call_1n' };
const OP0 = { 0: 'rtrue T', 1: 'rfalse T', 2: 'print X', 3: 'print_ret XT', 4: 'nop', 7: 'restart T', 8: 'ret_popped T', 9: 'catch s', 10: 'quit T', 11: 'new_line', 12: 'show_status', 13: 'verify b', 15: 'piracy b' };
const VAR = { 0: 'call_vs s', 1: 'storew', 2: 'storeb', 3: 'put_prop', 4: 'aread s', 5: 'print_char', 6: 'print_num', 7: 'random s', 8: 'push', 9: 'pull', 10: 'split_window', 11: 'set_window', 12: 'call_vs2 s2', 13: 'erase_window', 14: 'erase_line', 15: 'set_cursor', 16: 'get_cursor', 17: 'set_text_style', 18: 'buffer_mode', 19: 'output_stream', 20: 'input_stream', 21: 'sound_effect', 22: 'read_char s', 23: 'scan_table sb', 24: 'not s', 25: 'call_vn', 26: 'call_vn2 2', 27: 'tokenise', 28: 'encode_text', 29: 'copy_table', 30: 'print_table', 31: 'check_arg_count b' };
const EXT = { 0: 'save s', 1: 'restore s', 2: 'log_shift s', 3: 'art_shift s', 4: 'set_font s', 9: 'save_undo s', 10: 'restore_undo s', 11: 'print_unicode', 12: 'check_unicode s', 13: 'set_true_colour' };
function varName(v) { return v === 0 ? 'sp' : v < 16 ? 'L' + (v - 1) : 'G' + (v - 16); }
function decode(pc) {
    const start = pc; const b = u8(pc++); let name, types = [], ops = [];
    if (b === 0xBE) { const e = u8(pc++); name = EXT[e]; if (!name) return null; const t = u8(pc++); for (let i = 6; i >= 0; i -= 2) { const ty = (t >> i) & 3; if (ty === 3) break; types.push(ty); } }
    else if (b < 0x80) { name = OP2[b & 0x1F]; if (!name) return null; types = [(b & 0x40) ? 2 : 1, (b & 0x20) ? 2 : 1]; }
    else if (b < 0xC0) { const ty = (b >> 4) & 3; if (ty === 3) { name = OP0[b & 0x0F]; if (!name) return null; } else { name = OP1[b & 0x0F]; if (!name) return null; types = [ty]; } }
    else { const isVar = b & 0x20; name = isVar ? VAR[b & 0x1F] : OP2[b & 0x1F]; if (!name) return null;
        const two = /call_vs2|call_vn2/.test(name); const t1 = u8(pc++), t2 = two ? u8(pc++) : 0xFF;
        for (const t of [t1, t2]) for (let i = 6; i >= 0; i -= 2) { const ty = (t >> i) & 3; if (ty === 3) { i = -1; break; } types.push(ty); } }
    for (const ty of types) { if (ty === 0) { ops.push({ k: 'L', v: u16(pc) }); pc += 2; } else if (ty === 1) { ops.push({ k: 'S', v: u8(pc++) }); } else { ops.push({ k: 'V', v: u8(pc++) }); } }
    const flags = name.split(' ')[1] || ''; const op = name.split(' ')[0];
    let store = null, branch = null, text = false, term = /T/.test(flags), jumpTarget = null;
    if (/s/.test(flags)) store = u8(pc++);
    if (/b/.test(flags)) { const b1 = u8(pc++); let off; if (b1 & 0x40) off = b1 & 0x3F; else { off = ((b1 & 0x3F) << 8) | u8(pc++); if (off & 0x2000) off -= 0x4000; } branch = { onTrue: !!(b1 & 0x80), off, target: null }; branch.endPc = pc; if (off !== 0 && off !== 1) branch.target = pc + off - 2; }
    if (/X/.test(flags)) { text = true; while (pc + 1 < mem.length) { const w = u16(pc); pc += 2; if (w & 0x8000) break; } }
    if (/J/.test(flags)) { if (ops[0].k === 'V') jumpTarget = null; else { let o = ops[0].v; if (ops[0].k === 'L' && o & 0x8000) o -= 0x10000; jumpTarget = pc + o - 2; } }
    if (pc > mem.length) return null; // truncated instruction
    return { start, end: pc, op, ops, store, branch, text, term, jumpTarget };
}
function fmt(ins) {
    const o = ins.ops.map(x => x.k === 'V' ? varName(x.v) : (x.k === 'L' ? '#' + x.v : '#' + x.v)).join(' ');
    return ins.start + ': ' + ins.op + ' ' + o + (ins.store != null ? ' -> ' + varName(ins.store) : '') + (ins.branch ? ' ?' + (ins.branch.onTrue ? '' : '~') + (ins.branch.target != null ? ins.branch.target : (ins.branch.off ? 'rtrue' : 'rfalse')) : '') + (ins.jumpTarget != null ? ' ->' + ins.jumpTarget : '');
}
// Linear sweep.
const routines = []; let pc = himem; let guard = 0;
while (pc < mem.length - 2 && guard++ < 200000) {
    while (pc % scale) pc++;
    const locals = u8(pc); if (locals > 15) break;
    const rstart = pc; pc++; const instrs = []; let maxT = pc, ok = true;
    for (;;) { const ins = decode(pc); if (!ins) { ok = false; break; } instrs.push(ins); pc = ins.end;
        if (ins.branch && ins.branch.target != null) maxT = Math.max(maxT, ins.branch.target);
        if (ins.jumpTarget != null) maxT = Math.max(maxT, ins.jumpTarget);
        if ((ins.term || ins.op === 'jump') && pc > maxT) {
            // End only if zero padding to the boundary is followed by a valid
            // routine header; Inform can emit unreachable code (e.g. rtrue)
            // after a return, which belongs to this routine.
            let p2 = pc; while (p2 % scale && mem[p2] === 0) p2++;
            if (p2 % scale === 0 && mem[p2] <= 15) break;
        }
        if (instrs.length > 20000) { ok = false; break; } }
    if (!ok) break;
    routines.push({ start: rstart, locals, instrs });
}
console.log('version', version, 'himem', himem, 'routines decoded', routines.length, 'stopped at', pc);
// Only routines that use the constant as the BASE (first operand) of loadw/storew.
const hits = routines.filter(r => r.instrs.some(i => (i.op === 'loadw' || i.op === 'storew') && i.ops[0] && i.ops[0].k === 'L' && i.ops[0].v === target));
console.log('routines using #' + target + ':', hits.map(r => r.start + ' (packed ' + (r.start / scale) + ')').join(', '));
for (const r of hits) { console.log('\n=== routine ' + r.start + ' locals ' + r.locals); r.instrs.forEach(i => console.log('  ' + fmt(i))); }

// Call-site and callee checks (Codex #2750).
if (process.argv[4]) {
    const callee = Number(process.argv[4]);
    const callers = [];
    routines.forEach(r => r.instrs.forEach(i => { if (/^call/.test(i.op) && i.ops[0] && i.ops[0].k === 'L' && i.ops[0].v * scale === callee) callers.push(r.start + '@' + i.start + ' ' + i.op); }));
    console.log('callers of routine ' + callee + ' (packed ' + (callee / scale) + '):', callers.join(', ') || 'none');
}
if (process.argv[5]) {
    const r = routines.find(x => x.start === Number(process.argv[5]));
    console.log('=== routine ' + process.argv[5] + (r ? ' locals ' + r.locals : ' NOT at a decoded routine boundary'));
    if (r) r.instrs.forEach(i => console.log('  ' + fmt(i)));
}
