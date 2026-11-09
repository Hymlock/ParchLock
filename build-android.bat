@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ParchLock Android and desktop distribution builder.
rem Usage: build-android.bat dev ^| release
rem Release signing material must remain outside this repository.

set "MODE=%~1"
if "%MODE%"=="" set "MODE=dev"
if /I not "%MODE%"=="dev" if /I not "%MODE%"=="release" (
  echo Usage: build-android.bat dev ^| release
  exit /b 2
)

set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
cd /d "%SRC%" || exit /b 1
if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
set "CAP_WWW=%SRC%\capacitor-www"
rem D283: build-android-public.bat sets PARCHLOCK_PC_DIST / PARCHLOCK_APK_SUFFIX so the public build
rem never overwrites the full one. Unset = the original folder and APK names.
set "PC_DIST=C:\Users\hymlo\Downloads\ParchLock-dist"
if defined PARCHLOCK_PC_DIST set "PC_DIST=%PARCHLOCK_PC_DIST%"
set "APK_WEB=%SRC%\android\app\src\main\assets\public"

if /I "%MODE%"=="release" (
  for %%V in (PARCHLOCK_KEYSTORE PARCHLOCK_STORE_PASSWORD PARCHLOCK_KEY_ALIAS PARCHLOCK_KEY_PASSWORD) do if not defined %%V (
    echo ERROR: %%V is required for a release build.
    exit /b 1
  )
  if not exist "%PARCHLOCK_KEYSTORE%" (
    echo ERROR: PARCHLOCK_KEYSTORE does not exist.
    exit /b 1
  )
)

echo === ParchLock %MODE% build ===
echo [1/4] Building clean desktop distribution and source archive...
call "%SRC%\make-dist.bat" "%PC_DIST%" || exit /b 1

echo [2/4] Building clean Capacitor web assets...
call "%SRC%\make-dist.bat" "%CAP_WWW%" || exit /b 1
if exist "%CAP_WWW%\ParchLock-source.zip" del /q "%CAP_WWW%\ParchLock-source.zip"
if exist "%CAP_WWW%\ParchLock.exe" del /q "%CAP_WWW%\ParchLock.exe"

echo [3/4] Copying assets into Android...
if exist "%APK_WEB%" rmdir /s /q "%APK_WEB%"
if exist "%APK_WEB%" (
  echo ERROR: Could not clear generated Android web assets.
  exit /b 1
)
call npx cap copy android || exit /b 1
set "CAP_PLUGINS=%SRC%\android\app\src\main\assets\capacitor.plugins.json"
if not exist "%CAP_PLUGINS%" (
  echo ERROR: capacitor.plugins.json missing; run "npx cap sync android" once.
  exit /b 1
)
for %%P in (@capacitor-community/text-to-speech @capacitor-community/speech-recognition @capacitor/app @capacitor/filesystem @capacitor/share) do (
  findstr /c:"\"%%P\"" "%CAP_PLUGINS%" >nul || (
    echo ERROR: capacitor.plugins.json does not register %%P.
    exit /b 1
  )
)
for %%F in (play.html manifest.json js\ProductInfo.js js\ModuleLibrary.js js\ParchLock.js css\ParchLock.css) do if not exist "%APK_WEB%\%%F" (
  echo ERROR: Android asset missing: %%F
  exit /b 1
)
if exist "%APK_WEB%\ParchLock-source.zip" (
  echo ERROR: source archive must not be embedded in the APK.
  exit /b 1
)
if exist "%APK_WEB%\ParchLock.exe" (
  echo ERROR: PC launcher must not be embedded in the APK.
  exit /b 1
)
if not exist "%PC_DIST%\ParchLock.exe" (
  echo ERROR: Desktop launcher missing from %PC_DIST%.
  exit /b 1
)

echo [4/4] Building Android APK...
if /I "%MODE%"=="release" (
  call "%SRC%\android\gradlew.bat" -p "%SRC%\android" clean assembleRelease --console=plain || exit /b 1
  set "APK_SRC=%SRC%\android\app\build\outputs\apk\release\app-release.apk"
  set "APK_OUT=%PC_DIST%\ParchLock%PARCHLOCK_APK_SUFFIX%.apk"
) else (
  call "%SRC%\android\gradlew.bat" -p "%SRC%\android" assembleDebug --console=plain || exit /b 1
  set "APK_SRC=%SRC%\android\app\build\outputs\apk\debug\app-debug.apk"
  set "APK_OUT=%PC_DIST%\ParchLock%PARCHLOCK_APK_SUFFIX%-dev.apk"
)
if not exist "%APK_SRC%" (
  echo ERROR: Gradle did not produce %APK_SRC%.
  exit /b 1
)
copy /y "%APK_SRC%" "%APK_OUT%" >nul || exit /b 1

set "SDK_ROOT=%ANDROID_HOME%"
if not defined SDK_ROOT if exist "%SRC%\android\local.properties" for /f "tokens=1,* delims==" %%K in ('findstr /b "sdk.dir=" "%SRC%\android\local.properties"') do set "SDK_ROOT=%%L"
if defined SDK_ROOT set "SDK_ROOT=!SDK_ROOT:\:=:!"
if defined SDK_ROOT set "SDK_ROOT=!SDK_ROOT:/=\!"
if /I "%MODE%"=="release" (
  set "APKSIGNER="
  for /f "delims=" %%A in ('where apksigner.bat 2^>nul') do if not defined APKSIGNER set "APKSIGNER=%%A"
  rem Android SDK: ANDROID_HOME, else sdk.dir from android\local.properties. dir /s cannot take a
  rem wildcard in the middle of a path, so walk build-tools\* with for /d (highest version wins).
  if not defined APKSIGNER if defined SDK_ROOT for /d %%D in ("!SDK_ROOT!\build-tools\*") do if exist "%%D\apksigner.bat" set "APKSIGNER=%%D\apksigner.bat"
  if not defined APKSIGNER (
    echo ERROR: apksigner.bat was not found; release verification is mandatory.
    exit /b 1
  )
  call "!APKSIGNER!" verify --verbose --print-certs "%APK_OUT%" || exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SRC%\tools\package-complete.ps1" -Distribution "%PC_DIST%" -Apk "%APK_OUT%" || exit /b 1

echo Done: %APK_OUT%
echo Desktop distribution: %PC_DIST%
echo Source archive: %PC_DIST%\ParchLock-source.zip
exit /b 0
