@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."

echo Bu islem sadece yerel lisans kaydini temizler.
echo Mukkellef verileri ve klasorler korunur.
echo.
set /p CONFIRM=Devam etmek icin EVET yazin: 

if /I not "%CONFIRM%"=="EVET" (
  echo Islem iptal edildi.
  popd
  pause
  exit /b 0
)

node tools\domizan-access-tool.cjs clear-license
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Lisans temizleme sirasinda hata olustu.
) else (
  echo Yerel lisans kaydi temizlendi.
)

popd
pause
