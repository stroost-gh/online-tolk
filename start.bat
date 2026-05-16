@echo off
title Online Tolk
cd /d "%~dp0"

echo ==================================================
echo   Online Tolk starten
echo ==================================================
echo.
echo De backend en frontend worden in twee aparte
echo vensters gestart. De eerste keer duurt dit enkele
echo minuten, omdat pakketten en taalmodellen gedownload
echo worden.
echo.

start "Online Tolk - backend" "%~dp0backend\start-backend.bat"
start "Online Tolk - frontend" "%~dp0frontend\start-frontend.bat"

REM Lokaal netwerkadres opzoeken (voor een tablet of telefoon).
set "LANIP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    if not defined LANIP set "LANIP=%%a"
)
set "LANIP=%LANIP: =%"
if defined LANIP (
    set "BASIS=http://%LANIP%:3000"
) else (
    set "BASIS=http://localhost:3000"
)

:menu
echo.
echo ==================================================
echo   Wacht tot beide vensters klaar zijn, kies dan:
echo ==================================================
echo.
echo   [1] Hoofdscherm openen
echo   [2] Tweede scherm openen op deze pc
echo   [3] Adres voor een tablet of telefoon tonen
echo   [0] Dit venster sluiten - de servers blijven draaien
echo.
set /p keuze="Maak een keuze en druk op Enter: "

if "%keuze%"=="1" (
    start "" "%BASIS%"
    goto menu
)
if "%keuze%"=="2" (
    start "" "%BASIS%/scherm"
    goto menu
)
if "%keuze%"=="3" (
    echo.
    if defined LANIP (
        echo Open op de tablet of telefoon op hetzelfde wifi-netwerk:
        echo.
        echo     %BASIS%/scherm
        echo.
        echo Scan daarna de QR-code van het hoofdscherm of voer de
        echo koppelcode handmatig in.
    ) else (
        echo Kon het netwerkadres niet automatisch vinden.
        echo Zoek het zelf op met het commando ipconfig.
    )
    goto menu
)
if "%keuze%"=="0" exit

echo Onbekende keuze, probeer opnieuw.
goto menu
