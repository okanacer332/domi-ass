@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

echo Bu islem deneme suresini aninda bitmis olarak isaretler.
echo Sonraki acilista Domizan kilitli moda dusecektir.
echo.
set /p CONFIRM=Devam etmek icin EVET yazin: 

if /I not "%CONFIRM%"=="EVET" (
  echo Islem iptal edildi.
  popd
  pause
  exit /b 0
)

node tools\domizan-access-tool.cjs expire-trial
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Deneme suresi guncellenirken hata olustu.
) else (
  echo Deneme suresi bitmis olarak ayarlandi.
)

popd
pause
