const fs=require('fs');const a=JSON.parse(fs.readFileSync(process.argv[2]));const b=JSON.parse(fs.readFileSync(process.argv[3]));const out=[];
function d(x,y,p){if(JSON.stringify(x)===JSON.stringify(y))return;if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)){for(const k of new Set([...Object.keys(x),...Object.keys(y)]))d(x[k],y[k],p+'.'+k);return;}out.push(p+': '+JSON.stringify(x)+' -> '+JSON.stringify(y));}
d(a,b,'');console.log(out.length);for(const o of out.slice(0,80))console.log(o.slice(0,220));
