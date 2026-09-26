@echo off
title ChangeGuard AI - Backend (port 5000)
cd /d "%~dp0backend"
echo.
echo  Shield  ChangeGuard AI Backend
echo  Starting on http://localhost:5000
echo  Press Ctrl+C to stop
echo.
node src/server.js
pause
