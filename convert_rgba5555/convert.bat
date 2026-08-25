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
set "workdir=%TEMP%\fp_rgba5555_convert"
if not exist "!workdir!" mkdir "!workdir!" >nul 2>&1

for /f "delims=" %%F in ('dir /b /a-d "*.png" 2^>nul') do (
	call :convertone "%%~fF"
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
exit /b 0

:convertone
set /a found+=1
echo Converting %~nx1 ...

set "srcW="
set "srcH="
set "outW="
set "outH="
call :pngsize "%~1" srcW srcH
if not defined srcW (
	echo FAILED: could not read size of %~nx1
	set /a failed+=1
	exit /b 0
)
echo   source size: !srcW!x!srcH!

set "tmp=!workdir!\%~n1.__tp.png"
if exist "!tmp!" del /f /q "!tmp!" >nul 2>&1

TexturePacker --format spritesheet-only --sheet "!tmp!" --texture-format png --opt RGBA5555 --dither-type FloydSteinberg --trim-mode None --disable-rotation --padding 0 --shape-padding 0 --border-padding 0 --extrude 0 --size-constraints AnySize --scale 1 --width !srcW! --height !srcH! --algorithm Basic --disable-auto-alias --force-publish "%~1"
if errorlevel 1 (
	echo FAILED: %~nx1
	set /a failed+=1
	if exist "!tmp!" del /f /q "!tmp!" >nul 2>&1
	exit /b 0
)

call :pngsize "!tmp!" outW outH
if not "!outW!x!outH!"=="!srcW!x!srcH!" (
	echo FAILED: %~nx1 was resized from !srcW!x!srcH! to !outW!x!outH!
	set /a failed+=1
	if exist "!tmp!" del /f /q "!tmp!" >nul 2>&1
	exit /b 0
)

move /y "!tmp!" "%~1" >nul
if errorlevel 1 (
	echo FAILED to replace: %~nx1
	set /a failed+=1
	exit /b 0
)

set /a converted+=1
exit /b 0

:pngsize
set "%~2="
set "%~3="
for /f "usebackq tokens=1,2" %%A in (`powershell -NoProfile -Command "$b=[IO.File]::ReadAllBytes('%~1'); Write-Output (([BitConverter]::ToUInt32([byte[]]($b[19],$b[18],$b[17],$b[16]),0)).ToString()+' '+([BitConverter]::ToUInt32([byte[]]($b[23],$b[22],$b[21],$b[20]),0)).ToString())"`) do (
	set "%~2=%%A"
	set "%~3=%%B"
)
exit /b 0
