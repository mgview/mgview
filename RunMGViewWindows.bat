@echo off
setlocal enableextensions
set "DIR=%~dp0"
call "%DIR%bin\RunVisualizer.bat" %*
endlocal
exit /b %ERRORLEVEL%
