@echo off
setlocal EnableExtensions

rem Builds ParchLock.exe with the Windows .NET Framework C# compiler (csc).
rem The exe must sit next to play.html; it serves http://127.0.0.1 and opens
rem Chrome or Edge full screen so microphone permission can persist.

set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (
  echo ERROR: C# compiler not found.
  exit /b 1
)
if not exist "%SRC%\pc-launcher\ParchLockLauncher.cs" (
  echo ERROR: pc-launcher\ParchLockLauncher.cs missing.
  exit /b 1
)

if exist "%SRC%\img\favicon.ico" (
  "%CSC%" /nologo /target:winexe /optimize+ /r:System.Windows.Forms.dll /r:System.Drawing.dll /win32icon:"%SRC%\img\favicon.ico" /out:"%SRC%\ParchLock.exe" "%SRC%\pc-launcher\ParchLockLauncher.cs"
) else (
  "%CSC%" /nologo /target:winexe /optimize+ /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"%SRC%\ParchLock.exe" "%SRC%\pc-launcher\ParchLockLauncher.cs"
)
if errorlevel 1 exit /b 1
echo Built "%SRC%\ParchLock.exe"
exit /b 0
