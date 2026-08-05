@echo off
title AI-Nexus - Production Service Launcher
color 0A

set ROOT=D:\AI-Nexus
set LOGS=%ROOT%\logs

:: Create logs directory if it doesn't exist
if not exist "%LOGS%" mkdir "%LOGS%"

echo =====================================================
echo           AI-Nexus Production Launcher
echo =====================================================
echo Started : %date% %time%
echo Logs    : %LOGS%
echo =====================================================
echo.

:: =====================================================
:: Backend API
:: =====================================================
echo [1/4] Starting Backend...
start "AI-Nexus Backend" cmd /k "cd /d %ROOT%\AI-Nexus-backend && npm run start:prod >> "%LOGS%\backend.log" 2>&1"

timeout /t 2 >nul

:: =====================================================
:: Frontend
:: =====================================================
echo [2/4] Starting Frontend...
start "AI-Nexus Frontend" cmd /k "cd /d %ROOT%\AI-Nexus-frontend && npm run start >> "%LOGS%\frontend.log" 2>&1"

timeout /t 2 >nul

:: =====================================================
:: Flowise UI
:: =====================================================
echo [3/4] Starting Flowise UI...
start "Flowise UI" cmd /k "cd /d %ROOT%\AI-Nexus-flowise && npm run start:ui:prod >> "%LOGS%\flowise-ui.log" 2>&1"

timeout /t 2 >nul

:: =====================================================
:: Flowise Backend
:: =====================================================
echo [4/4] Starting Flowise Backend...
start "Flowise Backend" cmd /k "cd /d %ROOT%\AI-Nexus-flowise && pnpm run start:prod >> "%LOGS%\flowise-backend.log" 2>&1"

echo.
echo =====================================================
echo All production services started successfully.
echo Logs are available in:
echo %LOGS%
echo =====================================================

pause