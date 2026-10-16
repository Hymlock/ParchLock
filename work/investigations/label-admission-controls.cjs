const s=require('fs').readFileSync(process.argv[2],'utf8');
const grab=n=>{const i=s.indexOf('    '+n+': function');let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(s.indexOf('function',i),k+1);}}};
const Actionable={};Actionable.listingRows=eval('('+grab('listingRows')+')');Actionable.inventoryLineLabel=eval('('+grab('inventoryLineLabel')+')');
const o=(id,name,al)=>({id,name,structuralName:name,aliases:al||[]});
const C=o(1,'cube'),T=[
 ['numbered cube',C,[C],'You are carrying:\n  a "1" cube\n  a spell book','cube','"1" cube'],
 ['bread',o(2,'loaf of bread'),[o(2,'loaf of bread')],'You are carrying:\n  A partially eaten loaf of bread','loaf of bread','partially eaten loaf of bread'],
 ['troll prose',C,[C],'You are empty-handed.\nA troll drops a cube.','cube',''],
 ['prose alongside header',C,[C],'You are carrying:\n  a lamp\n\nA troll drops a cube.','cube',''],
 ['X1 header+row then unindented prose',C,[C,o(9,'sword')],'You are carrying:\n  a sword\nA troll drops a cube.','cube',''],
 ['X2 Warning: header',C,[C],'Warning:\n  A troll drops a cube.','cube',''],
 ['X3 generic contains',C,[C],'The monster contains a red cube.','cube',''],
 ['X4 AND compound, structural book',o(4,'book'),[o(4,'book')],'You are carrying a tourist guide and phrase book.','book','tourist guide and phrase book'],
 ['AND real list',o(4,'book'),[o(4,'book'),o(5,'lamp')],'You are carrying a lamp and a red book.','book','red book'],
 ['wishbringer sentence',o(175,'thick blanket'),[o(175,'thick blanket')],"You're holding a thick blanket.",'thick blanket',''],
 ['sentence descriptor',o(3,'blanket'),[o(3,'blanket')],"You're holding a thick blanket.",'blanket','thick blanket'],
 ['and-name full',o(4,'tourist guide and phrase book'),[o(4,'tourist guide and phrase book')],'You have a tourist guide and phrase book, a document.','tourist guide and phrase book',''],
 ['long HHG name',o(5,"thing your aunt gave you which you don't know what it is"),[o(5,"thing your aunt gave you which you don't know what it is")],"You have:\n  a thing your aunt gave you which you don't know what it is","thing your aunt gave you which you don't know what it is",''],
 ['identical cubes',C,[C,o(6,'cube')],'You are carrying:\n  a "1" cube\n  a "2" cube','cube',''],
 ['duplicate rows',C,[C],'You are carrying:\n  a red cube\n  a blue cube','cube',''],
 ['other-alias clash',C,[C,o(7,'box',['red'])],'You are carrying:\n  a red cube','cube',''],
 ['known container sentence',o(8,'frock'),[o(8,'frock'),o(9,'reticule')],'It seems that your reticule contains a cotton frock, a missive and a banknote.','frock','cotton frock'],
 ['known container header',o(10,'water'),[o(10,'water'),o(11,'jug')],'You are carrying:\n  A jug\n  The jug contains:\n    A quantity of water','water','quantity of water'],
];
let f=0;for(const [n,seed,pool,txt,sd,exp] of T){const got=Actionable.inventoryLineLabel(seed,pool,txt,sd);const ok=got===exp;if(!ok)f++;console.log(ok?'PASS':'FAIL',n,JSON.stringify(got),'expect',JSON.stringify(exp));}
console.log(T.length-f,'PASS /',f,'FAIL');
