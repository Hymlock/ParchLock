// Extend the bounded producer with explicit natural lamp readiness, without rewriting its failed capture.
const fs=require('fs'),path=require('path'),Module=require('module');
let s=fs.readFileSync(__dirname+'/lapel-native-bounded.cjs','utf8');
const a="labels:typeof EquipmentUI",b="lamp:(()=>{const l=ZRamReader.objectLinks(ZRamProvider.getMem(),166);return{parent:l.parent,on:ZRamReader.attr(l,38)}})(),labels:typeof EquipmentUI";
if(!s.includes(a))throw Error('Producer anchor changed');s=s.replace(a,b);
const g="if(t.requireText&&!new RegExp(t.requireText,'i').test(text))";
if(!s.includes(g))throw Error('Guard anchor changed');
s=s.replace(g,"if(t.requireLamp&&!(row.inventory.lamp.parent===232&&row.inventory.lamp.on===true)){out.stopped='Natural lamp readiness failed: '+t.cmd;break;} "+g);
const m=new Module(path.resolve(__dirname+'/lapel-native-bounded.cjs'),module);m.filename=path.resolve(__dirname+'/lapel-native-bounded.cjs');m.paths=module.paths;m._compile(s,m.filename);
