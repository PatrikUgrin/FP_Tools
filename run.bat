@echo off
setlocal
cd /d "%~dp0"

set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
	echo Node.js is required for the baker.
	echo Install the LTS build from https://nodejs.org then double-click run.bat again.
	echo.
	pause
	exit /b 1
)

node "scripts\start-baker.js" --idle
echo.
pause
endlocal
