@echo off
chcp 65001 >nul
setlocal

set "DESKTOP_DIR=%USERPROFILE%\Desktop\Domizan"
set "APPDATA_DIR=%APPDATA%\domizan"
set "APPDATA_DIR_ALT=%APPDATA%\Domizan"
set "LOCALAPPDATA_DIR=%LOCALAPPDATA%\domizan"
set "LOCALAPPDATA_DIR_ALT=%LOCALAPPDATA%\Domizan"
set "PROGRAMDATA_DIR=%PROGRAMDATA%\Domizan"

echo Bu islem yerel Domizan test verilerini silecektir.
echo.
echo Silinecek klasorler:
echo - %DESKTOP_DIR%
echo - %APPDATA_DIR%
echo - %APPDATA_DIR_ALT%
echo - %LOCALAPPDATA_DIR%
echo - %LOCALAPPDATA_DIR_ALT%
echo - %PROGRAMDATA_DIR%
echo.
set /p CONFIRM=Devam etmek icin EVET yazin: 

if /I not "%CONFIRM%"=="EVET" (
  echo Islem iptal edildi.
  pause
  exit /b 0
)

for %%D in ("%DESKTOP_DIR%" "%APPDATA_DIR%" "%APPDATA_DIR_ALT%" "%LOCALAPPDATA_DIR%" "%LOCALAPPDATA_DIR_ALT%" "%PROGRAMDATA_DIR%") do (
  if exist "%%~D" (
    echo Siliniyor: %%~D
    rd /s /q "%%~D"
  )
)

echo.
echo Yerel Domizan verileri temizlendi.
echo Kaynak kod klasoru korunmustur.
pause

