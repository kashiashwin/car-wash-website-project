@echo off
title Car Wash Application
echo =======================================================
echo   Starting Car Wash Application (Frontend + Backend)
echo =======================================================
echo.

cd /d "%~dp0"

:: 1. Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [ERROR] Node.js was not found in your system PATH!
  echo Please install Node.js from https://nodejs.org/ and try again.
  echo.
  pause
  exit /b 1
)

:: 2. Release port 5500 if an old background process is still holding it
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5500 " ^| findstr "LISTENING"') do (
  echo [Notice] Freeing busy port 5500 (PID %%a)...
  taskkill /f /pid %%a >nul 2>&1
)

:: 3. Launch combined server (which automatically boots backend and opens your browser)
echo [Info] Launching servers and opening your browser...
node serve.js

if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERROR] Server stopped with error code %ERRORLEVEL%.
  pause
)
