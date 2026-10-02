@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. https://nodejs.org/ adresinden Node.js LTS kur.
  pause
  exit /b 1
)
echo.
echo ========================================
echo        NeuroArcade baslatiliyor
echo ========================================
echo.
echo Bos bir localhost portu otomatik secilecek.
echo Tarayici da otomatik acilacak.
echo.
node server.mjs
pause
