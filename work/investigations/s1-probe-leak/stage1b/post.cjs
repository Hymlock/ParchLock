// Text printed outside any action-routine-from-dispatcher span per command.
const d=JSON.parse(require('fs').readFileSync(__dirname+'/'+process.argv[2]+'.trace.json'));
for(const o of d.out){const st=[];const spans=[];for(const e of o.ev){if(e.k==='E'){st.push(e);}else{const s=st.pop();if(s&&s.acts&&s.d===6)spans.push([s.o,e.o]);}}
 let out='',c=0;for(const [a,b] of spans.sort((x,y)=>x[0]-y[0])){out+=o.text.slice(c,a);c=Math.max(c,b);}out+=o.text.slice(c);
 console.log(o.cmd,'spans',JSON.stringify(spans),'outside:',JSON.stringify(out.replace(/\r>$/,'')).slice(0,300));}
