@echo off
echo Stopping any running instances of the server...
taskkill /f /im node.exe > nul 2>&1

echo.
echo Starting Trump-Zelensky Negotiation Server with Gemini AI...
echo.
echo When the server is running, navigate to:
echo http://localhost:3001
echo.

cd /d C:\Users\kmond\diplomai\server
node direct-server.js

pause
