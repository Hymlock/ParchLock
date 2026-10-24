// node mk.cjs key N 'idx:cmd|cmd;idx:cmd' > file   (inserted cmds go AFTER walkthrough index idx; idx -1 = before start)
const j=require(process.cwd()+'/work/investigations/2026-10-11-jericho-walkthroughs.json');const [k,N,ins]=process.argv.slice(2);const w=j[k];const a=Array.isArray(w)?w:(w.walkthrough||w.commands||String(w).split('/'));
const m={};(ins||'').split(';').filter(Boolean).forEach(s=>{const i=s.indexOf(':');m[+s.slice(0,i)]=s.slice(i+1).split('|');});
const o=[...(m[-1]||[])];for(let i=0;i<=+N;i++){o.push(a[i]);o.push(...(m[i]||[]));}console.log(o.join('\n'));
