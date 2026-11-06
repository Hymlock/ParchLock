// Minimal Z-machine disassembler for one routine (stage1b static check). node dis.cjs GAMEFILE packedHex [n]
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let buf=Buffer.from(src.slice(src.indexOf("'")+1,src.lastIndexOf("'")),'base64');
const zi=buf.indexOf('ZCOD');if(buf.slice(0,4).toString()==='FORM'&&zi>0)buf=buf.slice(zi+8);
const v=buf[0],mult=v===8?8:4,pk=parseInt(process.argv[3],16);let pc=pk*mult;const nl=buf[pc++];if(v<5)pc+=2*nl;
console.log('v',v,'routine 0x'+pk.toString(16),'byte 0x'+(pk*mult).toString(16),'locals',nl);
const N2=['?','je','jl','jg','dec_chk','inc_chk','jin','test','or','and','test_attr','set_attr','clear_attr','store','insert_obj','loadw','loadb','get_prop','get_prop_addr','get_next_prop','add','sub','mul','div','mod','call_2s','call_2n','set_colour','throw'];
const N1=['jz','get_sibling','get_child','get_parent','get_prop_len','inc','dec','print_addr','call_1s','remove_obj','print_obj','ret','jump','print_paddr','load','call_1n'];
const N0=['rtrue','rfalse','print','print_ret','nop','save','restore','restart','ret_popped','pop','quit','new_line','show_status','verify','ext','piracy'];
const NV=['call_vs','storew','storeb','put_prop','read','print_char','print_num','random','push','pull','split_window','set_window','call_vs2','erase_window','erase_line','set_cursor','get_cursor','set_text_style','buffer_mode','output_stream','input_stream','sound_effect','read_char','scan_table','not','call_vn','call_vn2','tokenise','encode_text','copy_table','print_table','check_arg_count'];
const ST=new Set(['or','and','loadw','loadb','get_prop','get_prop_addr','get_next_prop','add','sub','mul','div','mod','call_2s','get_sibling','get_child','get_parent','get_prop_len','load','call_1s','call_vs','random','call_vs2','read_char','scan_table','not','get_cursor']);
const BR=new Set(['je','jl','jg','dec_chk','inc_chk','jin','test','test_attr','jz','get_sibling','get_child','check_arg_count','scan_table']);
const opn=(t)=>{if(t===0){const x=buf.readUInt16BE(pc);pc+=2;return '#'+x;}if(t===1)return '#'+buf[pc++];if(t===2){const x=buf[pc++];return x===0?'sp':x<16?'L'+(x-1):'G'+(x-16);}return null;};
for(let i=0;i<(+process.argv[4]||20);i++){const at=pc;const b=buf[pc++];let name,ops=[];
 if(b===0xBE){const o=buf[pc++];const tb=buf[pc++];for(let s=6;s>=0;s-=2){const t=(tb>>s)&3;if(t===3)break;ops.push(opn(t));}name='ext'+o;}
 else if(b<0x80){name=N2[b&31];ops.push(opn(b&0x40?2:1),opn(b&0x20?2:1));}
 else if(b<0xC0){const t=(b>>4)&3;if(t===3){name=N0[b&15];if(name==='print'||name==='print_ret'){while(!(buf.readUInt16BE(pc)&0x8000))pc+=2;pc+=2;}}else{name=N1[b&15];ops.push(opn(t));}}
 else {name=(b&0x20)?NV[b&31]:N2[b&31];const tb=buf[pc++];let tb2=null;if(name==='call_vs2'||name==='call_vn2')tb2=buf[pc++];for(const T of [tb,tb2]){if(T==null)continue;for(let s=6;s>=0;s-=2){const t=(T>>s)&3;if(t===3)break;ops.push(opn(t));}}}
 let st='';if(ST.has(name)){const x=buf[pc++];st=' -> '+(x===0?'sp':x<16?'L'+(x-1):'G'+(x-16));}
 let br='';if(BR.has(name)){const x=buf[pc++];if(!(x&0x40))pc++;br=' ?br';}
 console.log('0x'+at.toString(16),name,ops.join(' ')+st+br);if(['ret','rtrue','rfalse','ret_popped','print_ret','jump'].includes(name)&&i>3&&process.argv[5]!=='all')break;}
