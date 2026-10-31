@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ParchLock runtime and corresponding-source builder.
rem Runtime and source roots are allow-listed. Story copying remains unchanged
rem by operator policy; the operator removes any stories before release.

set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
if "%~1"=="" (set "DEST=C:\Users\hymlo\Downloads\ParchLock-dist") else (set "DEST=%~1")
set "SOURCE_STAGE=%TEMP%\ParchLock-source-%RANDOM%-%RANDOM%"
set "SOURCE_ZIP=%DEST%\ParchLock-source.zip"
set "ROBO=/E /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1"

echo === ParchLock clean distribution ===
echo Source: %SRC%
echo Dest:   %DEST%

if not exist "%SRC%\play.html" exit /b 1
if exist "%DEST%" rmdir /s /q "%DEST%"
if exist "%DEST%" (
  echo ERROR: Could not replace "%DEST%".
  exit /b 1
)
mkdir "%DEST%" || exit /b 1

for %%D in (css img js lib games user licenses) do mkdir "%DEST%\%%D" 2>nul

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
  copy /y "%SRC%\%%F" "%DEST%\%%F" >nul || goto :fail
)

rem Runtime directory allow-list. Markdown, source maps and staging notes do
rem not match these declarations and therefore cannot ship.
robocopy "%SRC%\css" "%DEST%\css" ParchLock.css CharCell.css parchment.css Tutorial.css LearnedWords.css RobotoMono-ExtraLight.ttf RobotoMono-OFL.txt /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\img" "%DEST%\img" *.png *.svg *.ico *.css *.js /E /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\js" "%DEST%\js" *.js /E /XF EmglkenHost.js EmglkenProvider.js HostEmglkenBridge.js /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\lib" "%DEST%\lib" *.js *.wasm *.json *.html *.css *.gif /E /XD emglken parchment-modern /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail
robocopy "%SRC%\licenses" "%DEST%\licenses" *.txt /E /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :fail

rem D97: story behavior deliberately remains unchanged. Rights review and
rem removal before release are the operator's manual responsibility.
if exist "%SRC%\games" robocopy "%SRC%\games" "%DEST%\games" *.* %ROBO% >nul
if errorlevel 8 goto :fail
if exist "%SRC%\user\_user-files-go-here.txt" copy /y "%SRC%\user\_user-files-go-here.txt" "%DEST%\user\" >nul

echo Building PC launcher...
call "%SRC%\build-pc-launcher.bat" || goto :fail
copy /y "%SRC%\ParchLock.exe" "%DEST%\ParchLock.exe" >nul || goto :fail

for %%F in (
  play.html index.html manifest.json service-worker.js
  ParchLock.exe
  js\ProductInfo.js js\ModuleLibrary.js js\MobileLayout.js js\Input.js
  js\Qol.js js\Actionable.js js\ParchLock.js css\ParchLock.css
  js\StatTracker.js js\StatusGridDecoder.js js\EquipmentUI.js
  js\LearnedWords.js css\LearnedWords.css
  css\RobotoMono-ExtraLight.ttf lib\main.js
) do if not exist "%DEST%\%%F" (
  echo ERROR: Runtime allow-list missed %%F
  goto :fail
)

rem Build the exact-version corresponding-source archive from a separate
rem non-story allow-list. Never include games, AI/internal docs, build output,
rem generated Android assets, secrets or signing material.
mkdir "%SOURCE_STAGE%" || goto :fail
for %%F in (
  index.html play.html manifest.json service-worker.js
  make-dist.bat build-android.bat build-pc-launcher.bat package.json package-lock.json capacitor.config.json
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
for %%F in (patch-android-tts.cjs test-android-tts.cjs) do (
  if not exist "%SRC%\tools\%%F" goto :sourcefail
  copy /y "%SRC%\tools\%%F" "%SOURCE_STAGE%\tools\%%F" >nul || goto :sourcefail
)
robocopy "%SRC%\pc-launcher" "%SOURCE_STAGE%\pc-launcher" *.cs /NFL /NDL /NJH /NJS /NC /NS /NP /R:1 /W:1 >nul
if errorlevel 8 goto :sourcefail
mkdir "%SOURCE_STAGE%\vendor\emglken-stage" 2>nul
for %%F in (package.json package-lock.json README.md smoke.mjs smoke.cjs) do if exist "%SRC%\vendor\emglken-stage\%%F" copy /y "%SRC%\vendor\emglken-stage\%%F" "%SOURCE_STAGE%\vendor\emglken-stage\%%F" >nul
robocopy "%SRC%\android" "%SOURCE_STAGE%\android" *.* %ROBO% /XD .gradle build "%SRC%\android\app\build" "%SRC%\android\app\src\main\assets" /XF *.apk *.jks *.keystore local.properties >nul
if errorlevel 8 goto :sourcefail
mkdir "%SOURCE_STAGE%\android\app\src\main\assets" 2>nul
copy /y "%SRC%\android\app\src\main\assets\capacitor.plugins.json" "%SOURCE_STAGE%\android\app\src\main\assets\capacitor.plugins.json" >nul || goto :sourcefail
powershell -NoProfile -Command "Compress-Archive -Path '%SOURCE_STAGE%\*' -DestinationPath '%SOURCE_ZIP%' -Force" || goto :sourcefail
powershell -NoProfile -Command "$target=[IO.Path]::GetFullPath('%SOURCE_STAGE%'); $prefix=Join-Path ([IO.Path]::GetFullPath($env:TEMP)) 'ParchLock-source-'; if(-not $target.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe source staging path'}; if((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unexpected staging link'}; if(@(Get-ChildItem -LiteralPath $target -Recurse -Force -Attributes ReparsePoint -ErrorAction Stop).Count){throw 'Unexpected link inside staging tree'}; Remove-Item -LiteralPath $target -Recurse -Force" || exit /b 1

echo Runtime and ParchLock-source.zip created successfully.
exit /b 0

:sourcefail
if exist "%SOURCE_STAGE%" powershell -NoProfile -Command "$target=[IO.Path]::GetFullPath('%SOURCE_STAGE%'); $prefix=Join-Path ([IO.Path]::GetFullPath($env:TEMP)) 'ParchLock-source-'; if(-not $target.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe source staging path'}; if((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unexpected staging link'}; if(@(Get-ChildItem -LiteralPath $target -Recurse -Force -Attributes ReparsePoint -ErrorAction Stop).Count){throw 'Unexpected link inside staging tree'}; Remove-Item -LiteralPath $target -Recurse -Force"
:fail
echo ERROR: ParchLock distribution build failed.
exit /b 1
