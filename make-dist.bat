@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ParchLock runtime and corresponding-source builder.
rem Runtime and source roots are allow-listed. Story copying remains unchanged
rem by operator policy; the operator removes any stories before release.
rem
rem B1 (OPEN_WORK): build into a temp runtime stage; replace DEST only on success.
rem B2 (OPEN_WORK): refuse a dirty git tree for runtime-critical paths unless
rem MAKE_DIST_ALLOW_DIRTY=1 (loud override for local experiments).

set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
if "%~1"=="" (set "DEST=C:\Users\hymlo\Downloads\ParchLock-dist") else (set "DEST=%~1")
set "RUNTIME_STAGE=%TEMP%\ParchLock-runtime-%RANDOM%-%RANDOM%"
set "SOURCE_STAGE=%TEMP%\ParchLock-source-%RANDOM%-%RANDOM%"
set "SOURCE_ZIP_STAGE=%TEMP%\ParchLock-source-zip-%RANDOM%-%RANDOM%.zip"
set "ROBO=/E /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1"

echo === ParchLock clean distribution ===
echo Source: %SRC%
echo Dest:   %DEST%
echo Stage:  %RUNTIME_STAGE%

if not exist "%SRC%\play.html" exit /b 1

rem --- B2: dirty-tree guard (runtime-critical paths only) -----------------
set "DIRTY_HIT="
if exist "%SRC%\.git" (
  pushd "%SRC%" >nul
  for /f "delims=" %%L in ('git status --porcelain -- "js" "css" "index.html" "play.html" "service-worker.js" "manifest.json" "lib" 2^>nul') do (
    set "DIRTY_HIT=1"
    echo DIRTY: %%L
  )
  popd >nul
)
if defined DIRTY_HIT (
  if /I "%MAKE_DIST_ALLOW_DIRTY%"=="1" (
    echo WARNING: B2 override MAKE_DIST_ALLOW_DIRTY=1 — shipping a dirty runtime tree.
  ) else (
    echo ERROR: B2 dirty-tree guard: js/ css/ index.html play.html service-worker.js manifest.json lib must be clean.
    echo ERROR: Commit or stash those paths, or set MAKE_DIST_ALLOW_DIRTY=1 to override ^(not for release^).
    exit /b 2
  )
)

rem --- B1: build into temp runtime stage ---------------------------------
if exist "%RUNTIME_STAGE%" rmdir /s /q "%RUNTIME_STAGE%"
mkdir "%RUNTIME_STAGE%" || exit /b 1
for %%D in (css img js lib games user licenses) do mkdir "%RUNTIME_STAGE%\%%D" 2>nul

rem Explicit runtime root allow-list.
for %%F in (
  index.html play.html tutorial.html manifest.json service-worker.js
  LICENSE NOTICE README.md USER_GUIDE.md RELEASE_NOTES.md PRIVACY.md
  CREDITS.md THIRD_PARTY_NOTICES.md SOURCE_BUILD.md GAMES_INCLUDED.md
) do (
  if not exist "%SRC%\%%F" (
    echo ERROR: Required runtime file missing: %%F
    goto :fail
  )
  copy /y "%SRC%\%%F" "%RUNTIME_STAGE%\%%F" >nul || goto :fail
)

rem Runtime directory allow-list. Markdown, source maps and staging notes do
rem not match these declarations and therefore cannot ship.
robocopy "%SRC%\css" "%RUNTIME_STAGE%\css" ParchLock.css CharCell.css parchment.css Tutorial.css LearnedWords.css RobotoMono-ExtraLight.ttf RobotoMono-OFL.txt /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\img" "%RUNTIME_STAGE%\img" *.png *.svg *.ico *.css *.js /E /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\js" "%RUNTIME_STAGE%\js" *.js /E /XF EmglkenHost.js EmglkenProvider.js HostEmglkenBridge.js /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\lib" "%RUNTIME_STAGE%\lib" *.js *.wasm *.json *.html *.css *.gif /E /XD emglken parchment-modern /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\licenses" "%RUNTIME_STAGE%\licenses" *.txt /E /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail

rem D97: story behavior deliberately remains unchanged. Rights review and
rem removal before release are the operator's manual responsibility.
rem D283: PARCHLOCK_GAMES_LIST (public build) copies only the listed stories and replaces the
rem staged js\GameList.js (copied above) with the matching subset. Per-game facts are not
rem filtered, so later imports are still recognised. Unset = every story, exactly as before.
if defined PARCHLOCK_GAMES_LIST (
  if not exist "%PARCHLOCK_GAMES_LIST%" (
    echo ERROR: PARCHLOCK_GAMES_LIST not found: %PARCHLOCK_GAMES_LIST%
    goto :fail
  )
  echo Public story list: %PARCHLOCK_GAMES_LIST%
  for /f "usebackq eol=# delims=" %%G in ("%PARCHLOCK_GAMES_LIST%") do (
    if not exist "%SRC%\games\%%G" (
      echo ERROR: listed story missing: games\%%G
      goto :fail
    )
    copy /y "%SRC%\games\%%G" "%RUNTIME_STAGE%\games\" >nul || goto :fail
  )
  node "%SRC%\tools\public-games.js" gamelist "%PARCHLOCK_GAMES_LIST%" "%RUNTIME_STAGE%\js\GameList.js" || goto :fail
) else (
  if exist "%SRC%\games" robocopy "%SRC%\games" "%RUNTIME_STAGE%\games" *.* %ROBO% >nul
  if errorlevel 8 goto :fail
)
if exist "%SRC%\user\_user-files-go-here.txt" copy /y "%SRC%\user\_user-files-go-here.txt" "%RUNTIME_STAGE%\user\" >nul

echo Building PC launcher...
call "%SRC%\build-pc-launcher.bat" || goto :fail
copy /y "%SRC%\ParchLock.exe" "%RUNTIME_STAGE%\ParchLock.exe" >nul || goto :fail

for %%F in (
  play.html index.html manifest.json service-worker.js
  ParchLock.exe
  js\ProductInfo.js js\ModuleLibrary.js js\MobileLayout.js js\Input.js
  js\Qol.js js\Actionable.js js\ParchLock.js css\ParchLock.css
  js\StatTracker.js js\StatusGridDecoder.js js\EquipmentUI.js
  js\LearnedWords.js css\LearnedWords.css
  css\RobotoMono-ExtraLight.ttf lib\main.js
) do if not exist "%RUNTIME_STAGE%\%%F" (
  echo ERROR: Runtime allow-list missed %%F
  goto :fail
)

rem Build the exact-version corresponding-source archive from a separate
rem non-story allow-list. Never include games, AI/internal docs, build output,
rem generated Android assets, secrets or signing material.
mkdir "%SOURCE_STAGE%" || goto :fail
for %%F in (
  index.html play.html manifest.json service-worker.js
  make-dist.bat build-android.bat build-android-public.bat build-pc-launcher.bat package.json package-lock.json capacitor.config.json
  LICENSE NOTICE README.md USER_GUIDE.md RELEASE_NOTES.md PRIVACY.md
  CREDITS.md THIRD_PARTY_NOTICES.md SOURCE_BUILD.md GAMES_INCLUDED.md
) do copy /y "%SRC%\%%F" "%SOURCE_STAGE%\%%F" >nul || goto :sourcefail
for %%D in (css img js lib licenses) do (
  robocopy "%SRC%\%%D" "%SOURCE_STAGE%\%%D" *.* %ROBO% /XF *.map README.md >nul
  if errorlevel 8 goto :sourcefail
)
robocopy "%SRC%\native-hooks" "%SOURCE_STAGE%\native-hooks" *.* %ROBO% /XD build /XF *.log >nul
if errorlevel 8 goto :sourcefail
mkdir "%SOURCE_STAGE%\tools" 2>nul
for %%F in (patch-android-tts.cjs test-android-tts.cjs public-games.js) do (
  if not exist "%SRC%\tools\%%F" goto :sourcefail
  copy /y "%SRC%\tools\%%F" "%SOURCE_STAGE%\tools\%%F" >nul || goto :sourcefail
)
mkdir "%SOURCE_STAGE%\release" 2>nul
copy /y "%SRC%\release\public-games.txt" "%SOURCE_STAGE%\release\public-games.txt" >nul || goto :sourcefail
robocopy "%SRC%\pc-launcher" "%SOURCE_STAGE%\pc-launcher" *.cs /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :sourcefail
mkdir "%SOURCE_STAGE%\vendor\emglken-stage" 2>nul
for %%F in (package.json package-lock.json README.md smoke.mjs smoke.cjs) do if exist "%SRC%\vendor\emglken-stage\%%F" copy /y "%SRC%\vendor\emglken-stage\%%F" "%SOURCE_STAGE%\vendor\emglken-stage\%%F" >nul
robocopy "%SRC%\android" "%SOURCE_STAGE%\android" *.* %ROBO% /XD .gradle build "%SRC%\android\app\build" "%SRC%\android\app\src\main\assets" /XF *.apk *.jks *.keystore local.properties >nul
if errorlevel 8 goto :sourcefail
mkdir "%SOURCE_STAGE%\android\app\src\main\assets" 2>nul
copy /y "%SRC%\android\app\src\main\assets\capacitor.plugins.json" "%SOURCE_STAGE%\android\app\src\main\assets\capacitor.plugins.json" >nul || goto :sourcefail
powershell -NoProfile -Command "Compress-Archive -Path '%SOURCE_STAGE%\*' -DestinationPath '%SOURCE_ZIP_STAGE%' -Force" || goto :sourcefail
powershell -NoProfile -Command "$target=[IO.Path]::GetFullPath('%SOURCE_STAGE%'); $prefix=Join-Path ([IO.Path]::GetFullPath($env:TEMP)) 'ParchLock-source-'; if(-not $target.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe source staging path'}; if((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unexpected staging link'}; if(@(Get-ChildItem -LiteralPath $target -Recurse -Force -Attributes ReparsePoint -ErrorAction Stop).Count){throw 'Unexpected link inside staging tree'}; Remove-Item -LiteralPath $target -Recurse -Force" || goto :fail

rem Place the source zip inside the runtime stage BEFORE touching DEST so nothing
rem can fail after the swap (claude peer review #6044).
copy /y "%SOURCE_ZIP_STAGE%" "%RUNTIME_STAGE%\ParchLock-source.zip" >nul || goto :fail
del /f /q "%SOURCE_ZIP_STAGE%" >nul 2>nul
set "SOURCE_ZIP_STAGE="

rem --- B1: atomic-ish swap — only now touch DEST ---------------------------
if exist "%DEST%" (
  set "DEST_OLD=%DEST%.old-%RANDOM%-%RANDOM%"
  move "%DEST%" "!DEST_OLD!" >nul || (
    echo ERROR: Could not move existing "%DEST%" aside.
    goto :fail
  )
)
mkdir "%DEST%" 2>nul
robocopy "%RUNTIME_STAGE%" "%DEST%" *.* /E /MOVE /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 (
  echo ERROR: Failed to promote runtime stage into "%DEST%".
  goto :fail
)
if defined DEST_OLD if exist "!DEST_OLD!" rmdir /s /q "!DEST_OLD!" >nul 2>nul
if exist "%RUNTIME_STAGE%" rmdir /s /q "%RUNTIME_STAGE%" >nul 2>nul

echo Runtime and ParchLock-source.zip created successfully.
exit /b 0

:sourcefail
if exist "%SOURCE_STAGE%" powershell -NoProfile -Command "$target=[IO.Path]::GetFullPath('%SOURCE_STAGE%'); $prefix=Join-Path ([IO.Path]::GetFullPath($env:TEMP)) 'ParchLock-source-'; if(-not $target.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe source staging path'}; if((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unexpected staging link'}; if(@(Get-ChildItem -LiteralPath $target -Recurse -Force -Attributes ReparsePoint -ErrorAction Stop).Count){throw 'Unexpected link inside staging tree'}; Remove-Item -LiteralPath $target -Recurse -Force"
:fail
rem If DEST was already moved aside, restore it and drop any partial new DEST.
if defined DEST_OLD if exist "!DEST_OLD!" (
  if exist "%DEST%" rmdir /s /q "%DEST%" >nul 2>nul
  move "!DEST_OLD!" "%DEST%" >nul 2>nul
)
if exist "%RUNTIME_STAGE%" rmdir /s /q "%RUNTIME_STAGE%" >nul 2>nul
if defined SOURCE_ZIP_STAGE if exist "%SOURCE_ZIP_STAGE%" del /f /q "%SOURCE_ZIP_STAGE%" >nul 2>nul
echo ERROR: ParchLock distribution build failed. Prior DEST restored when a swap had started.
exit /b 1
