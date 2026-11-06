from pathlib import Path
p=Path('js/SaveState.js');s=p.read_bytes();a=b'// Save-owned event history. Current VM readings remain StatTracker-owned.';b=b'// Save-owned cumulative history: older saves select their playthrough without\r\n// rewinding its death/win totals. Current VM readings remain StatTracker-owned.';assert s.count(a)==1;p.write_bytes(s.replace(a,b))
p=Path('service-worker.js');s=p.read_bytes();a=b'// Build 72:';b=b'// Save-linked cumulative playthrough history; Build 72:';assert s.count(a)==1;p.write_bytes(s.replace(a,b))
