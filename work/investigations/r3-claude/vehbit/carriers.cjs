const {story}=require('../../zil-attr-analyzer.js');
const T={'Zork2-TheWizardofFrobozz.z3.js':27,'Hitchhik.z5.js':28,'Planetfall.z3.js':30,'Infidel.z3.js':14,'Sorcerer.z3.js':29,'Deadline.z3.js':12};
const u16=(m,a)=>(m[a]<<8)|m[a+1];
const out={};
for(const [t,bit] of Object.entries(T)){const m=story(t),v=m[0],ot=u16(m,10);const dw=v<=3?31:63,es=v<=3?9:14;const first=ot+dw*2;
const pp=o=>u16(m,first+(o-1)*es+(v<=3?7:12));const n=(pp(1)-first)/es|0;
const name=o=>{const a=pp(o);const len=m[a];let s='';let p=a+1;const A='abcdefghijklmnopqrstuvwxyz',B='ABCDEFGHIJKLMNOPQRSTUVWXYZ',C=' \n0123456789.,!?_#\'"/\-:()';let al=0,res=[];for(let i=0;i<len;i++){const w=u16(m,p);p+=2;for(const z of [(w>>10)&31,(w>>5)&31,w&31])res.push(z);}
let out='';for(let i=0;i<res.length;i++){const z=res[i];if(z===0)out+=' ';else if(z===4)al=1;else if(z===5)al=2;else if(z>=6){if(al===2&&z===6){out+=String.fromCharCode((res[i+1]<<5)|res[i+2]);i+=2;}else out+=[A,B,C][al][z-6];al=0;}else{i++;}}return out;};
const par=o=>v<=3?m[first+(o-1)*es+4]:u16(m,first+(o-1)*es+6);
const attr=(o,b)=>(m[first+(o-1)*es+(b>>3)]>>(7-(b&7)))&1;
out[t]={bit,n,carriers:[]};for(let o=1;o<=n;o++)if(attr(o,bit))out[t].carriers.push({id:o,name:name(o),parent:par(o),parentName:par(o)?name(par(o)):''});}
console.log(JSON.stringify(out,null,1));
