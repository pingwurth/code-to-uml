@echo off
setlocal enabledelayedexpansion
set "PORT=%~1"
if "%PORT%"=="" set "PORT=5401"
set "MODE=%~2"
if "%MODE%"=="" set "MODE=--bg"
set "LOG_FILE=%TEMP%\code-to-uml-serve-%PORT%.log"
set "PID_FILE=%TEMP%\code-to-uml-serve-%PORT%.pid"

for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /R /C:":%PORT% .*LISTENING"') do (
	if not "%%P"=="0" (
		echo Port %PORT% is occupied by PID %%P. Stopping it...
		taskkill /F /PID %%P >nul 2>nul
	)
)

if /I "%MODE%"=="--fg" (
	echo Starting in foreground on http://localhost:%PORT%
	node serve.js %PORT%
	exit /b %ERRORLEVEL%
)

echo Starting in background on http://localhost:%PORT%
echo Log: %LOG_FILE%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p=Start-Process -FilePath node -ArgumentList 'serve.js %PORT%' -WorkingDirectory '%CD%' -WindowStyle Hidden -PassThru;" ^
  "$p.Id | Out-File -Encoding ascii '%PID_FILE%';" ^
  "'Started. PID=' + $p.Id"
if errorlevel 1 (
	echo Failed to start background server.
	exit /b 1
)
