import json, re, sys, glob, os
# Reads the st_<i>_<mode>.eval files of "run-contracts.sh status" and checks each against the game's own printed STATUS
# (plan section 11 item 11; Grok #3558 C1 and C2). Prints one line per run and exits 1 on any mismatch.
out = sys.argv[1]
bad = 0
for f in sorted(glob.glob(os.path.join(out, 'st_*.eval'))):
    raw = open(f, encoding='utf8').read().strip()
    try: r = json.loads(raw.splitlines()[-1])
    except Exception: print(os.path.basename(f), 'NO RESULT', raw[:200]); bad += 1; continue
    t = r.get('statusText') or ''
    c = r.get('card') or {}
    pos = r['mode'] == 'positive'
    errs = []
    if not t: errs.append('no STATUS output')
    if any(p.find('error') >= 0 for p in r.get('probe', [])): errs.append('inject error ' + str(r['probe']))
    num = lambda rx: (lambda m: int(m.group(1)) if m else None)(re.search(rx, t))
    name = r['name']
    if name.startswith('The Vile'):
        p = num(r'You are at (\d+) percent health')
        if p != c.get('healthPct'): errs.append('health%% card %s game %s' % (c.get('healthPct'), p))
        game = [x for x, rx in (('Paralyzed', r'paralyzed at this time'), ('Agility impaired', r'agility impaired at this time')) if re.search(rx, t)]
        # The card is the state after the whole turn: a condition the game ends later in the same turn ("Your paralysis
        # has worn off prematurely.") is gone from it, as from the next STATUS.
        now = [x for x in game if not (x == 'Paralyzed' and re.search(r'paralysis has worn off', t))]
        if now != (c.get('conditions') or []): errs.append('conditions card %s game %s' % (c.get('conditions'), now))
        if pos and len(game) != 2: errs.append('positive run without both conditions')
        if not pos and game: errs.append('negative run shows conditions')
    else:
        for k, rx in (('intellect', r'Intellect:\s*(\d+)'), ('charisma', r'Charisma:\s*(\d+)'), ('hardiness', r'Hardiness:\s*(\d+)'),
                      ('agility', r'Agility\s*:\s*(\d+)'), ('gold', r'Gold:\s*(-?\d+)'), ('bank', r'In bank:\s*(-?\d+)')):
            g = num(rx)
            if g is not None and c.get(k) != g: errs.append('%s card %s game %s' % (k, c.get(k), g))
        boost = bool(re.search(r'Hardiness:\s*\d+\s*\+5', t))
        if boost != bool(c.get('hardinessBoost')): errs.append('dagger boost card %s game %s' % (c.get('hardinessBoost'), boost))
        x2 = bool(re.search(r'Agility\s*:\s*\d+\s*x2', t))
        if x2 != (c.get('agilityNow') is not None): errs.append('speed x2 card %s game %s' % (c.get('agilityNow'), x2))
        fire = 'Trollsfire is alight' in t
        if fire != ('Trollsfire is alight' in (c.get('effects') or [])): errs.append('Trollsfire card %s game %s' % (c.get('effects'), fire))
        branch = {'magic dagger +5': boost, 'speed spell': x2, 'Trollsfire alight': fire}.get(r['branch'])
        if branch is not None and branch != pos: errs.append('%s run: branch shown = %s' % (r['mode'], branch))
    # C2: the status card has one row per figure; nothing parsed from the typed STATUS duplicates an engine row.
    rows = r.get('rows') or []
    labels = {}
    for row in rows:
        if row['key'].startswith(('condition', 'effect')): continue  # one row per condition or effect, each labelled as the game words it
        labels.setdefault((row.get('label') or row['key']).lower(), []).append(row)
    dup = {l: [x['key'] + '/' + str(x.get('source')) for x in v] for l, v in labels.items() if len(v) > 1}
    if dup: errs.append('duplicate rows ' + json.dumps(dup))
    other = [x['key'] for x in rows if x.get('source') != 'eamon-native' and x['key'] in ('hardiness', 'agility', 'charisma', 'intellect', 'health', 'gold', 'bank', 'weight', 'armor expertise')]
    if other: errs.append('engine figures also from another source: ' + ', '.join(other))
    if errs: bad += 1
    print('%-32s %-8s %-30s %s' % (name, r['mode'], r['branch'], 'MISMATCH ' + '; '.join(errs) if errs else 'matches (%d rows)' % len(rows)))
print('TOTAL mismatching runs:', bad)
sys.exit(1 if bad else 0)
