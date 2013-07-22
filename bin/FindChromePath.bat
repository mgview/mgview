@echo off
echo Finding Chrome Path

for /f "tokens=*" %%a in (
'where /F /R %LOCALAPPDATA% chrome.exe'
) do (
set ChromePath=%%a
)

IF NOT DEFINED ChromePath for /f "tokens=*" %%a in (
'where /F /R "C:\Program Files (x86)\Google\Chrome" chrome.exe'
) do (
set ChromePath=%%a
)


echo "ChromePath"=%ChromePath%

echo Copying to file...
echo %ChromePath% > %MGVIEWBINPATH%\ChromePath.txt


