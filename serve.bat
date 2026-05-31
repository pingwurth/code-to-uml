@echo off
set "PORT=%~1"
if "%PORT%"=="" set "PORT=5401"
node serve.js %PORT%
