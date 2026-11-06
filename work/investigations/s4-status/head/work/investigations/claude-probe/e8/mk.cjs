const W=require('../../2026-10-11-jericho-walkthroughs.json').zork3.slice(0,29);
W.push('WAITUNTIL:to "I"', 'TOUCH TABLE','E');
require('fs').writeFileSync(__dirname+'/z3-ladder-route.json',JSON.stringify({zork3:W}));console.log(W.slice(-3));
