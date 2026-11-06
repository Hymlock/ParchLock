(()=>{const m=ZRamProvider.getMem();const Z=ZRamReader;const pl=Z.objectLinks(m,200);const h=Z.objectLinks(m,83);
const P=window.WorldModel&&WorldModel.lastPayload||{};
const props=(Z.listProps(m,pl.parent)||[]).map(q=>({n:q.num,sz:q.sz,d:q.data?Array.from(q.data):undefined}));
const T=document.querySelector('#windowport').innerText;
const links=[...document.querySelectorAll('#windowport [data-obj], #windowport .pl-underline, #windowport u, #windowport a')].slice(-40).map(e=>e.textContent+'|'+(e.className||'')+'|'+JSON.stringify(e.dataset));
let ls=null;try{ls=Z.localScopeObjects(m,pl.parent,200)}catch(e){ls='ERR '+e.message}
return {here:pl.parent,hereName:Z.shortName(m,pl.parent),hole:{name:Z.shortName(m,83),parent:h.parent,attr:Array.from(h.attrBytes).map(x=>x.toString(16).padStart(2,'0')).join(''),words:Z.parserWordsAny?Z.parserWordsAny(m,83):null,props:(Z.listProps(m,83)||[]).map(q=>q.num)},holderParent:Z.objectLinks(m,h.parent).parent,roomProps:props,localScope:ls,disc:(P.discoveredObjects||[]).map(o=>o.id+':'+o.name),inv:(P.inventory||[]).map(o=>o.id+':'+o.name),unnamed:(P.unnamedCandidates||[]).map(o=>o.id+':'+o.name),tail:T.slice(-1800),links};})()
