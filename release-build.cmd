@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Simple release build: password once, Enter on second = same password.
rem Keystore lives outside the repo (your usual file).

set "PARCHLOCK_KEYSTORE=C:\Users\hymlo\ParchLock-release.jks"
if not exist "%PARCHLOCK_KEYSTORE%" (
  echo ERROR: Keystore not found:
  echo   %PARCHLOCK_KEYSTORE%
  echo Put your release .jks there, or edit PARCHLOCK_KEYSTORE in this file.
  exit /b 1
)

if "%PARCHLOCK_KEY_ALIAS%"=="" set "PARCHLOCK_KEY_ALIAS=parchlock"

echo.
echo Release keystore: %PARCHLOCK_KEYSTORE%
echo Key alias:        %PARCHLOCK_KEY_ALIAS%
echo (Set PARCHLOCK_KEY_ALIAS first if your alias is different.)
echo.

set /p "PARCHLOCK_STORE_PASSWORD=Keystore password: "
if "%PARCHLOCK_STORE_PASSWORD%"=="" (
  echo ERROR: Password required.
  exit /b 1
)

set /p "PARCHLOCK_KEY_PASSWORD=Key password (Enter = same): "
if "%PARCHLOCK_KEY_PASSWORD%"=="" set "PARCHLOCK_KEY_PASSWORD=%PARCHLOCK_STORE_PASSWORD%"

set "EAMON_TEST_TRUST="
set "MAKE_DIST_ALLOW_DIRTY="

echo.
echo Building release (clean tree required)...
call "%~dp0build-android.bat" release
set "ERR=%ERRORLEVEL%"

rem Do not leave passwords in this window's environment if you type "set"
set "PARCHLOCK_STORE_PASSWORD="
set "PARCHLOCK_KEY_PASSWORD="

exit /b %ERR%
