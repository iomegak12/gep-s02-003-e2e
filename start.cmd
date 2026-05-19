@echo off
REM Launch the GEP DevOps interactive menu (PowerShell Core).
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\devops.ps1" %*
