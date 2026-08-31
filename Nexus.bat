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
echo [1/5] Starting Backend...
start "AI-Nexus Backend" cmd /k "cd /d %ROOT%\AI-Nexus-backend && npm run start:prod >> "%LOGS%\backend.log" 2>&1"

timeout /t 2 >nul

:: =====================================================
:: Frontend
:: =====================================================
echo [2/5] Starting Frontend...
start "AI-Nexus Frontend" cmd /k "cd /d %ROOT%\AI-Nexus-frontend && npm run start >> "%LOGS%\frontend.log" 2>&1"

timeout /t 2 >nul

:: =====================================================
:: International Site (Next.js :3003)
:: =====================================================
echo [3/5] Starting International Site...
start "AI-Nexus International" cmd /k "cd /d %ROOT%\ai-international-site && npm run start >> "%LOGS%\international.log" 2>&1"

timeout /t 2 >nul

:: =====================================================
:: Flowise UI
:: =====================================================
echo [4/5] Starting Flowise UI...
start "Flowise UI" cmd /k "cd /d %ROOT%\AI-Nexus-flowise && npm run start:ui:prod >> "%LOGS%\flowise-ui.log" 2>&1"

timeout /t 2 >nul

:: =====================================================
:: Flowise Backend
:: =====================================================
echo [5/5] Starting Flowise Backend...
start "Flowise Backend" cmd /k "cd /d %ROOT%\AI-Nexus-flowise && npm run start:api:prod >> "%LOGS%\flowise-backend.log" 2>&1"

echo.
echo =====================================================
echo All production services started successfully.
echo Logs are available in:
echo %LOGS%
echo =====================================================

pause
