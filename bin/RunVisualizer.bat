@echo off
setlocal enableextensions

set "MGVIEWBINPATH=%~dp0"
if "%MGVIEWBINPATH:~-1%"=="\" set "MGVIEWBINPATH=%MGVIEWBINPATH:~0,-1%"
for %%I in ("%MGVIEWBINPATH%\..") do set "MGVIEWPATH=%%~fI"
for %%I in ("%MGVIEWPATH%\..") do set "MGPATH=%%~fI"

set /p MGViewVersion=<"%MGVIEWBINPATH%\VERSION"

echo.
echo    ---------------------- Starting MGView %MGViewVersion% ----------------------
echo.
echo    Hit Ctrl + C at any time to quit.
echo    MGView browser tabs will stop working when you close this window.
echo.
echo    -------------------------------------------------------------------

timeout /t 1 /nobreak >nul

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo    ERROR: Node.js was not found on this computer.
  echo.
  echo    Install the official Node.js LTS release from:
  echo    https://nodejs.org/en/download
  echo.
  echo    After installing Node.js, close this window and run MGView again.
  echo.
  pause
  exit /b 1
)

start "" "http://localhost:8000/mgview/"

node "%MGVIEWBINPATH%\server.js"

endlocal
