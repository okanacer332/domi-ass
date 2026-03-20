@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

echo Bu islem trial kaydini temizler.
echo Deneme daha baslatilmamis gorunur hale gelir.
echo.
set /p CONFIRM=Devam etmek icin EVET yazin: 

if /I not "%CONFIRM%"=="EVET" (
  echo Islem iptal edildi.
  popd
  pause
  exit /b 0
)

node tools\domizan-access-tool.cjs reset-trial
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Trial sifirlama sirasinda hata olustu.
) else (
  echo Trial kaydi temizlendi.
)

popd
pause
