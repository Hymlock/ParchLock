import subprocess,pathlib,json
root=pathlib.Path.cwd();d=root/'work/mapping-research/items-codex/resume-20261020/death-persistence-20261026';r=json.loads((d/'shared-r2/production-commit.json').read_text());bad=[]
actual=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',r['commit']],cwd=root,text=True).splitlines()
assert set(actual)==set(r['files']) and len(actual)==13
for f in actual:
 committed=subprocess.check_output(['git','show',r['commit']+':'+f],cwd=root)
 executed=(root/f).read_bytes()
 if committed.replace(b'\r\n',b'\n')!=executed.replace(b'\r\n',b'\n'):bad.append(f)
print(json.dumps({'scopedCommitFiles':len(actual),'LFNormalizedMismatches':bad}));assert not bad
