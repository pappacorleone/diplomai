@echo off
echo Starting Direct Trump-Zelensky Negotiation Server...
echo.

cd /d %~dp0server
node direct-server.js

echo.
pause
