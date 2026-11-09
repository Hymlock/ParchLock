@echo off
setlocal EnableExtensions

rem ParchLock PUBLIC build (D283): only the releasable stories (release\public-games.txt:
rem GAMES_INCLUDED.md KEEP titles minus Glulx), menu lists only those, and every per-game
rem fact for all titles still ships so a story the player imports later is recognised.
rem Output goes to ParchLock-dist-public with "-public" APK names, never over the full build.
rem Usage: build-android-public.bat dev ^| release   (release needs the same signing variables)
rem The full build (all stories) stays build-android.bat, unchanged.

set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
set "PARCHLOCK_GAMES_LIST=%SRC%\release\public-games.txt"
if not defined PARCHLOCK_PC_DIST set "PARCHLOCK_PC_DIST=C:\Users\hymlo\Downloads\ParchLock-dist-public"
set "PARCHLOCK_APK_SUFFIX=-public"
if not exist "%PARCHLOCK_GAMES_LIST%" (
  echo ERROR: missing %PARCHLOCK_GAMES_LIST% ^(run: node tools\public-games.js list^)
  exit /b 1
)
call "%SRC%\build-android.bat" %*
exit /b %ERRORLEVEL%
