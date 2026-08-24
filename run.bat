@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\" (
	echo Installing npm packages...
	call npm install
	if errorlevel 1 (
		echo npm install failed.
		pause
		exit /b 1
	)
)

echo.
echo Baker: http://127.0.0.1:3456
echo Leave this window open. Press Ctrl+C to stop.
echo PNGs write to export\png\
echo.

start "" cmd /c "timeout /t 5 /nobreak >nul && start http://127.0.0.1:3456/"
call npm start

echo.
pause
endlocal
