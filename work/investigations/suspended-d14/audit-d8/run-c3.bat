@echo off
cd /d "C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main"
set ROOT=C:\Users\hymlo\Downloads\Projects\Parchmap-main\wt-g2-d8-cand
set OUT=C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main\work\investigations\suspended-d14\audit-d8\cand-3.jsonl
set GLULX=1
set SHARD=3/4
node work\investigations\regression-gate.cjs
