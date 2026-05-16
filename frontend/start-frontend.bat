@echo off
title Online Tolk - frontend
cd /d "%~dp0"

if not exist "node_modules" call npm install

echo.
echo Dev-server starten. Wacht tot je "Ready" ziet.
echo.
call npm run dev

echo.
echo De dev-server is gestopt.
pause
