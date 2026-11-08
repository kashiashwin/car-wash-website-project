@echo off
title Car Wash Application
echo =======================================================
echo   Starting Car Wash Application (Frontend + Backend)
echo =======================================================
echo.
cd /d "%~dp0"

:: Open default browser after a brief pause
start "" http://127.0.0.1:5500/

:: Start the combined server
node serve.js
pause

