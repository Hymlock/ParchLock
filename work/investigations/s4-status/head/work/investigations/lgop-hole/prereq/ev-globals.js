(()=>{const m=ZRamProvider.getMem();const Z=ZRamReader;const u16=a=>m.getUint16(a);const gt=u16(0x0c);
const G=v=>u16(gt+2*(v-16));
const dec=pk=>{const a=pk*2;let w=0;while(w<200&&!(m.getUint8(a+2*w)&128))w++;return Z.decodeZsc(m,a,w+1);};
const props=id=>(Z.listProps(m,id)||[]).map(q=>{const b=Array.from({length:q.sz},(_,i)=>m.getUint8(q.dataAddr+i));const r={n:q.num,sz:q.sz,b};if(q.sz===2){const w=(b[0]<<8)|b[1];r.asPackedString=(w*2<m.byteLength)?dec(w):null;}return r;});
let sod=null;const N=Z.objectCount?Z.objectCount(m):255;for(let i=1;i<=255;i++){try{if(Z.shortName(m,i)==='sod'||Z.shortName(m,i)==='patch of sod'){sod=i;break}}catch(e){}}
const bit=(id,b)=>{const a=Z.objectLinks(m,id).attrBytes;return !!(a[b>>3]&(128>>(b&7)));};
const sdescOthers={};for(let i=1;i<=255;i++){try{const p=(Z.listProps(m,i)||[]).find(q=>q.num===16&&q.sz===2);if(p){const w=m.getUint16(p.dataAddr);sdescOthers[i]=Z.shortName(m,i)+' => '+(w?dec(w):'(0)');}}catch(e){}}
return {here:Z.objectLinks(m,200).parent,G16_HERE:G(16),G144_LONG_CORRIDOR_LOC:G(144),G160_HOLE_OPEN:G(160),globalTable:gt,sod,sodName:sod&&Z.shortName(m,sod),sodMUNGBIT12:sod&&bit(sod,12),hole83:props(83),prop16AllObjects:sdescOthers,tail:document.querySelector('#windowport').innerText.slice(-500)};})()
