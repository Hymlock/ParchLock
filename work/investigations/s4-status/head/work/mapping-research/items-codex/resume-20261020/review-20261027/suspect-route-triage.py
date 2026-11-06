from pathlib import Path
import re,json,hashlib,collections
root=Path('C:/Users/hymlo/AppData/Local/Temp/hs-src/suspect/historicalsource-suspect-a18e100');text=(root/'places.zil').read_text();rooms={}
for m in re.finditer(r'(?m)^<ROOM\s+([A-Z0-9-]+)',text):
 end=re.search(r'(?m)^<',text[m.end():]);end=m.end()+end.start() if end else len(text);chunk=text[m.start():end]
 edges=re.findall(r'\((NORTH|SOUTH|EAST|WEST|NE|NW|SE|SW|UP|DOWN|IN|OUT) TO ([A-Z0-9-]+)\)',chunk)
 rooms[m.group(1)]={'line':text[:m.start()].count('\n')+1,'edges':edges}
q=collections.deque([('BALLROOM-9',[])]);seen={'BALLROOM-9'};found={}
while q:
 name,route=q.popleft()
 if name in ['HALLWAY-1','HALLWAY-7','OFFICE']:found[name]=route
 for direction,dest in rooms.get(name,{}).get('edges',[]):
  if dest not in seen:seen.add(dest);q.append((dest,route+[{'from':name,'direction':direction,'to':dest,'sourceLine':rooms[name]['line']}]))
d=Path('work/mapping-research/items-codex/resume-20261020/review-20261027');result={'tier':'SOURCE-ONLY unconditional-exit BFS, no native accessibility/timing claim','source':str(root/'places.zil'),'sha256':hashlib.sha256((root/'places.zil').read_bytes()).hexdigest(),'routes':found,'limits':'Conditional exits and NPC movement not resolved by BFS. I-SPILL queues at2 and starts Veronica goal; arrival and I-ALICIA-SNEAKS2 must be proven before native launch. Need startup timing-safe path, not blind waiting.'};(d/'suspect-unconditional-route-triage.json').write_text(json.dumps(result,indent=2));print(json.dumps({'routes':{k:[e['direction']+' '+e['to'] for e in v] for k,v in found.items()},'reachableRooms':len(seen)}))
