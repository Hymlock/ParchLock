import gzip, re, collections, sys, json
# usage: route.py <AdventureDir> <from> <to>   -- plain exits plus door/gates (artifact 1000+uid), noting keys.
import os
# EAMON_DATA: the built package's data folder (the work dir's data/), as the app loads it.
d = os.path.join(os.environ.get('EAMON_DATA', 'data'), 'Adventures', sys.argv[1]) + '/'
def rd(p):
    b = open(d + p, 'rb').read(); return (gzip.decompress(b) if b[:2] == b'\x1f\x8b' else b).decode('utf8', 'replace')
t = rd('ROOMS.DAT'); a = rd('ARTIFACTS.DAT')
D = ['', 'n', 's', 'e', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw', 'in', 'out']
g = {}; names = {}; lit = {}
for c in re.findall(r'<Simple name="LightLvl" value="(\w+)" />[\s\S]*?<SingleArray name="Dirs">([\s\S]*?)</SingleArray>\s*<Simple name="Uid" value="(\d+)"[\s\S]*?name="Name" value="([^"]*)"', t):
    g[int(c[2])] = [int(x) for x in re.findall(r'value="(-?\d+)"', c[1])]; names[int(c[2])] = c[3]; lit[int(c[2])] = c[0]
arts = {}
for rec in re.split(r'<Complex type="[^"]*Artifact,', a)[1:]:
    u = re.search(r'name="Uid" value="(\d+)"', rec); n = re.search(r'name="Name" value="([^"]*)"', rec); l = re.search(r'name="Location" value="(-?\d+)"', rec)
    if not u: continue
    uid = int(u.group(1)); ty = re.findall(r'name="Type" value="(\w+)"', rec)
    door = 'DoorGate' in ty
    fields = re.findall(r'name="Field(\d)" value="(-?\d+)"', rec)
    arts[uid] = {'name': n.group(1) if n else '?', 'loc': int(l.group(1)) if l else 0, 'door': door, 'fields': fields}
def door_info(x):
    art = arts.get(x - 1000, {}); f = dict(art.get('fields', []))
    # DoorGate: Field1 = room beyond, Field2 = key uid (0 none, -1 can't), Field3 = open (0) / closed
    return art.get('name'), int(f.get('1', 0)), int(f.get('2', 0)), int(f.get('3', 0))
src, dst = int(sys.argv[2]), int(sys.argv[3])
q = collections.deque([(src, [], [src])]); seen = {src}; found = None
while q:
    r, p, rr = q.popleft()
    if r == dst: found = (p, rr); break
    for i, x in enumerate(g.get(r, [])):
        if not i or x == 0: continue
        step = [D[i]]
        if x >= 1000:
            name, beyond, key, closed = door_info(x)
            if key == -1 or beyond <= 0: continue
            step = (['open ' + name.split()[-1]] if closed else []) + [D[i]]
            if key > 0: step = ['(needs key ' + arts.get(key, {}).get('name', str(key)) + ' at ' + str(arts.get(key, {}).get('loc')) + ')'] + step
            x = beyond
        elif x < 0: continue
        if x not in seen: seen.add(x); q.append((x, p + step, rr + [x]))
if found:
    print(json.dumps(found[0])); print('dark:', [r for r in found[1] if lit.get(r) != 'Light'])
else:
    print('no route'); print('reachable:', sorted(seen))
