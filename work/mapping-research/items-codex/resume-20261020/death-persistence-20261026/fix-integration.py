from pathlib import Path
p=Path('harness/death-persistence/stat-integration.cjs');s=p.read_text();s=s.replace("S.settleEnding({request:{},line:true});", "if(kind==='win')S.collectEnding([{text:'Would you like to RESTART, RESTORE a saved game or QUIT?'}]);S.settleEnding({request:{},line:true});");p.write_text(s)
