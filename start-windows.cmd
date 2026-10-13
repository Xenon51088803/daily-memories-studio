@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 goto missing_node
if exist "node_modules\next\dist\bin\next" goto launch
echo Installing dependencies. Please wait...
call npm ci
if errorlevel 1 goto failed
:launch
echo Opening the web editor. Please wait...
node scripts\start-studio.mjs %*
if errorlevel 1 goto failed
echo.
echo Web editor: http://127.0.0.1:3310/studio
echo If no browser window appeared, copy the address above into Chrome.
if /I "%~1"=="--no-open" exit /b 0
pause
exit /b 0
:missing_node
echo Please install Node.js 24 LTS from https://nodejs.org/ and try again.
pause
exit /b 1
:failed
echo Startup failed. Please keep the error message above.
pause
exit /b 1
