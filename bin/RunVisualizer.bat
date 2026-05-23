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

start "" "http://localhost:8000/MGView/Examples.html"

if exist "%MGVIEWBINPATH%\node.exe" (
  "%MGVIEWBINPATH%\node.exe" "%MGVIEWBINPATH%\server.js"
) else (
  node "%MGVIEWBINPATH%\server.js"
)

endlocal
