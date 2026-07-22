@echo off
setlocal enabledelayedexpansion

REM Verificar privilegios de admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando privilegios de Administrador...
    echo.
    REM Tentar elevar com PowerShell (janela oculta)
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath cmd.exe -ArgumentList '/c \"%~f0\"' -Verb RunAs -WindowStyle Hidden"
    exit /b
)

REM Se chegou aqui, está como admin
cls
cd /d "%~dp0"

echo ============================================================
echo ATUALIZANDO SERVICO EnterpriseApi
echo ============================================================
echo.

REM Definir variavel de ambiente indicando que ja esta como admin
set RUNNING_AS_ADMIN=1

REM Executar updater (preferencialmente exe)
if exist "%~dp0service_updater.exe" (
    service_updater.exe
) else (
    where py >nul 2>&1
    if %errorlevel%==0 (
        py service_updater.py
    ) else (
        python service_updater.py
    )
)

if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo ERRO: Falha ao atualizar servico
    echo ============================================================
    timeout /t 5 /nobreak >nul
    exit /b 1
)

echo.
echo ============================================================
echo SUCESSO: Servico atualizado com sucesso!
echo ============================================================
echo.
REM Janela fecha automaticamente apos 2 segundos
timeout /t 2 /nobreak >nul
exit /b 0

