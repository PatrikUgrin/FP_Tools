@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "PATH=%ProgramFiles%\CodeAndWeb\TexturePacker\bin;%ProgramFiles(x86)%\CodeAndWeb\TexturePacker\bin;%PATH%"

where TexturePacker >nul 2>&1
if errorlevel 1 (
	echo TexturePacker was not found.
	echo Install TexturePacker, then use File / Install Command Line Tool.
	echo Typical path: %ProgramFiles%\CodeAndWeb\TexturePacker\bin
	echo.
	pause
	exit /b 1
)

set "converted=0"
set "failed=0"
set "found=0"

for /f "delims=" %%F in ('dir /b /a-d "*.png" 2^>nul') do (
	set /a found+=1
	echo Converting %%F ...
	set "tmp=!TEMP!\tp_rgba5555_%%~nF_!RANDOM!.png"
	TexturePacker --format spritesheet-only --sheet "!tmp!" --texture-format png --opt RGBA5555 --dither-type FloydSteinberg --trim-mode None --disable-rotation --padding 0 --extrude 0 --size-constraints AnySize --max-size 16384 --disable-auto-alias --force-publish "%%~fF"
	if errorlevel 1 (
		echo FAILED: %%F
		set /a failed+=1
		if exist "!tmp!" del /f /q "!tmp!" >nul 2>&1
	) else (
		move /y "!tmp!" "%%~fF" >nul
		if errorlevel 1 (
			echo FAILED to replace: %%F
			set /a failed+=1
		) else (
			set /a converted+=1
		)
	)
)

echo.
if !found! equ 0 (
	echo No .png files found in this folder.
	echo Place PNG files next to convert.bat and run it again.
) else (
	echo Converted: !converted!
	if !failed! gtr 0 echo Failed: !failed!
)
echo.
pause
endlocal
