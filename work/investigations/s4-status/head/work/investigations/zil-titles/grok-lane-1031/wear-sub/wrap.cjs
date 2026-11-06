// grok wrapper: node wrap.cjs <cmdsFile.json> <game> <route> <n> <pat> <bit> <out>
const fs=require('fs'),path=require('path');
const [cf,G,R,N,P,B,O]=process.argv.slice(2);
process.argv=[process.argv[0],'probe',G,R,N,P,B,O,fs.readFileSync(cf,'utf8')];
require(path.resolve(__dirname,'../../../grok2/wear-concealed/cache-claude-wear/probe.cjs'));
