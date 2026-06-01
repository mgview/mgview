@echo off
setlocal enableextensions

set "MGVIEWBINPATH=%~dp0"
if "%MGVIEWBINPATH:~-1%"=="\" set "MGVIEWBINPATH=%MGVIEWBINPATH:~0,-1%"
for %%I in ("%MGVIEWBINPATH%\..") do set "MGVIEWPATH=%%~fI"
for %%I in ("%MGVIEWPATH%\..") do set "MGPATH=%%~fI"

set "PORT=8000"
set "OPEN_BROWSER=1"
set "WORKSPACE_DIR="
set "INVOCATION_DIR=%CD%"

if not "%~1"=="" goto parse_args
goto args_done

:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--help" goto show_help
if /i "%~1"=="-h" goto show_help
if /i "%~1"=="--version" goto show_version
if /i "%~1"=="-v" goto show_version
if /i "%~1"=="--port" goto parse_port
if /i "%~1"=="-p" goto parse_port
if /i "%~1"=="--workspace" goto parse_workspace
if /i "%~1"=="-w" goto parse_workspace
if /i "%~1"=="--no-open" set "OPEN_BROWSER=0" & shift & goto parse_args
if /i "%~1"=="--no-browser" set "OPEN_BROWSER=0" & shift & goto parse_args
echo.
echo    ERROR: Unknown option: %~1
echo.
goto show_help_err

:parse_port
shift
if "%~1"=="" (
  echo.
  echo    ERROR: --port requires a value.
  echo.
  exit /b 1
)
set "PORT=%~1"
shift
goto parse_args

:parse_workspace
shift
if "%~1"=="" (
  echo.
  echo    ERROR: --workspace requires a value.
  echo.
  exit /b 1
)
pushd "%INVOCATION_DIR%" >nul 2>&1
if errorlevel 1 goto workspace_not_found
if not exist "%~1\" goto workspace_pop_not_found
for %%I in ("%~1") do set "WORKSPACE_DIR=%%~fI"
popd >nul
shift
goto parse_args

:workspace_pop_not_found
popd >nul
:workspace_not_found
echo.
echo    ERROR: workspace directory not found: %~1
echo.
exit /b 1

:args_done
call :validate_port %PORT%
if errorlevel 1 exit /b 1

set "MGVIEW_URL=http://localhost:%PORT%/mgview/"

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

set /p MGViewVersion=<"%MGVIEWBINPATH%\VERSION"

echo.
echo    ---------------------- Starting MGView %MGViewVersion% ----------------------
echo.
echo    Serving MGView at %MGVIEW_URL%
if defined WORKSPACE_DIR echo    Workspace: %WORKSPACE_DIR%
echo.
echo    Hit Ctrl + C at any time to quit.
echo    MGView browser tabs will stop working when you close this window.
echo.
echo    -------------------------------------------------------------------

timeout /t 1 /nobreak >nul

cd /d "%MGPATH%"

if "%OPEN_BROWSER%"=="1" start "" "%MGVIEW_URL%"

if defined WORKSPACE_DIR (
  node "%MGVIEWBINPATH%\server.js" --port %PORT% --workspace "%WORKSPACE_DIR%"
) else (
  node "%MGVIEWBINPATH%\server.js" --port %PORT%
)

endlocal
exit /b %ERRORLEVEL%

:show_help
echo.
echo Usage: RunMGViewWindows.bat [options]
echo        bin\RunVisualizer.bat [options]
echo.
echo Options:
echo   -p, --port PORT         HTTP port (default: 8000)
echo   -w, --workspace PATH    Workspace directory (saved for future runs)
echo       --no-open           Do not open a browser tab on startup
echo   -h, --help          Show this help
echo   -v, --version       Print MGView version and exit
echo.
echo Examples:
echo   RunMGViewWindows.bat --port 9000
echo   bin\RunVisualizer.bat -p 9000 --no-open
echo   RunMGViewWindows.bat --workspace C:\simulations
echo.
exit /b 0

:show_help_err
call :show_help
exit /b 1

:show_version
type "%MGVIEWBINPATH%\VERSION"
exit /b 0

:validate_port
set "CHECK_PORT=%~1"
echo %CHECK_PORT%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 goto invalid_port
if %CHECK_PORT% LSS 1 goto invalid_port
if %CHECK_PORT% GTR 65535 goto invalid_port
exit /b 0

:invalid_port
echo.
echo    ERROR: invalid port '%CHECK_PORT%' (use 1-65535).
echo.
exit /b 1
