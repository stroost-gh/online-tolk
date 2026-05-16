@echo off
title Online Tolk - backend
cd /d "%~dp0"

if not exist ".venv" python -m venv .venv

call .venv\Scripts\activate.bat

echo Pakketten controleren en zo nodig installeren...
pip install -r requirements.txt

echo.
echo Server starten. De eerste keer worden de taalmodellen gedownload;
echo dit duurt enkele minuten. Wacht tot "Tolk-dienst luistert op poort 8765".
echo.
python server.py

echo.
echo De server is gestopt.
pause
