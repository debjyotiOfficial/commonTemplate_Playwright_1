@echo off
REM ==============================================================================
REM Claude Time Hook - Windows Setup Launcher
REM ==============================================================================
REM Double-click this file to run the PowerShell setup script.
REM ==============================================================================

echo Starting Claude Time Hook Setup...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

pause
