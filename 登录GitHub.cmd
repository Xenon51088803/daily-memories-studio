@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
node scripts\login-github.mjs
set "loginExit=%errorlevel%"
pause
exit /b %loginExit%
