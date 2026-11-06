@echo off
cd /d "C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main"
set ROOT=C:\Users\hymlo\Downloads\Projects\Parchmap-main\wt-g2-p4-base
set OUT=C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main\work\investigations\zil-titles\audit-p4\base-0.jsonl
set GLULX=1
set SHARD=0/4
node work\investigations\regression-gate.cjs
