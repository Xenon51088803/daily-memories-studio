@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
node scripts\publish-pages.mjs --check
set "checkExit=%errorlevel%"
pause
exit /b %checkExit%
