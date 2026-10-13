@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
node scripts\publish-pages.mjs %*
set "publishExit=%errorlevel%"
echo.
if "%publishExit%"=="0" (
  echo SUCCESS: Operation completed.
) else (
  echo FAILED: See the message above and .publish-state\pages.log
)
if /I "%~1"=="--check" exit /b %publishExit%
if /I "%~1"=="--no-pause" exit /b %publishExit%
pause
exit /b %publishExit%
:missing_node
echo Please install Node.js 24 LTS from https://nodejs.org/
pause
exit /b 1
