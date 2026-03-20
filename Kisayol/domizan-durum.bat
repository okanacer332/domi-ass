@echo off
chcp 65001 >nul
setlocal

pushd "%~dp0.."
node tools\domizan-access-tool.cjs status
popd
pause
