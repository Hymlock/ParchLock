@echo off
cd /d C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main
set G1CACHE=C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main\work\investigations\grok1\batch\cache-scenery5
set G1TEXT=4000&& set PROOT=C:\Users\hymlo\Downloads\Projects\Parchmap-main\wt-g1L-cand
for %%K in (%*) do node work\investigations\grok1\batch\g1-batch.cjs run %%K C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main\work\investigations\grok1\batch\cache-scenery5\plan-%%K-scenery.json > C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main\work\investigations\grok1\batch\cache-scenery5\log-%%K.txt 2>&1
