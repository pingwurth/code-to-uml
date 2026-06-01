@echo off
setlocal enabledelayedexpansion
set "PORT=%~1"
if "%PORT%"=="" set "PORT=5401"

for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /R /C:":%PORT% .*LISTENING"') do (
	if not "%%P"=="0" (
		echo Port %PORT% is occupied by PID %%P. Stopping it...
		taskkill /F /PID %%P >nul 2>nul
	)
)

node serve.js %PORT%
