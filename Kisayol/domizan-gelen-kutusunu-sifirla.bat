@echo off
chcp 65001 >nul
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%\.."

echo Domizan gelen kutusu temizleniyor...
node tools\domizan-access-tool.cjs clear-inbox

echo.
echo Islem tamamlandi.
pause
popd
