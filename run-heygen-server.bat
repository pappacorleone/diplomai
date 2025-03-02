@echo off
echo Starting Trump-Zelensky Negotiation Simulator with HeyGen Avatar...
echo.
echo This server integrates with the HeyGen API to provide an animated Trump avatar.
echo Uses port 3003 to avoid conflicts with other servers.
echo.
echo When the server starts, navigate to: http://localhost:3003
echo.

cd /d C:\Users\kmond\diplomai\server
node heygen-server.cjs

pause
