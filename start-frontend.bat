@echo off
title ChangeGuard AI - Frontend (port 5173)
cd /d "%~dp0frontend"
echo.
echo  ChangeGuard AI Frontend
echo  Starting on http://localhost:5173
echo  (Backend must already be running on port 5000)
echo  Press Ctrl+C to stop
echo.
npm run dev
pause
