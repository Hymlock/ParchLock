const j=require(require('path').resolve(process.argv[2]));console.log('count',j.final.count,'room',j.final.room,'player',j.final.player);
for(const s of j.steps)console.log('>',s.cmd,'::',s.reply.split('> ➤')[0].replace(/\s+/g,' ').slice(0,260),'\n   ',JSON.stringify(s.diff.map(d=>[d.id,d.n,'C'+d.after.c,'O'+d.before.o+'>'+d.after.o,d.before.p+'>'+d.after.p])));
