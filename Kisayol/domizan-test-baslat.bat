@echo off
chcp 65001 >nul
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"

cd /d "%APP_DIR%" || (
  echo Proje klasorune gecilemedi.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm bulunamadi. Once Node.js ve npm kurulumu yapilmali.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules bulunamadi. npm install calisiyor...
  call npm.cmd install || goto :error
)

echo Domizan gelistirme modu baslatiliyor...
call npm.cmd run dev
if errorlevel 1 goto :error
goto :eof

:error
echo.
echo Baslatma sirasinda hata olustu.
pause
exit /b 1
