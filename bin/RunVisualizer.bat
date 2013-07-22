@echo off
setlocal enableextensions

set MGPATH=C:\MotionGenesis
set MGVIEWPATH=%MGPATH%\MGView
set MGVIEWBINPATH=%MGPATH%\MGView\bin

for /f "tokens=*" %%a in (
'type %MGVIEWPATH%\VERSION'
) do ( 
set MGViewVersion=%%a
)

echo.
echo    ---------------------- Starting MGView %MGViewVersion% ----------------------
echo.
echo    Hit Ctrl + C at any time to quit.
echo    MGView tabs in Chrome will stop working when you close this window.
echo.
echo    -------------------------------------------------------------------

timeout 5

IF NOT EXIST %MGVIEWBINPATH%\ChromePath.txt call %MGVIEWBINPATH%\FindChromePath.bat

for /f "tokens=*" %%a in (
'type %MGVIEWBINPATH%\ChromePath.txt'
) do ( 
set CHROMEPATH=%%a
)

echo CHROMEPATH=%CHROMEPATH%
call %CHROMEPATH% --visit-urls "localhost:8000/MGView/Examples.html"

%MGVIEWBINPATH%\node.exe %MGVIEWBINPATH%\server.js 

endlocal

