@echo off
echo Starting Trump-Zelensky Negotiation Simulator...
echo.

rem Start the server in a new window
start cmd /k "cd /d %~dp0server && node cjs-server.js"

rem Give the server a moment to start
timeout /t 2 /nobreak > nul

rem Open the simulation in the default browser
start "" "c:\Users\kmond\diplomai\minimal-test\trump-simulation.html"

echo.
echo Server started in a new window.
echo Browser page should open automatically.
echo.
echo Press any key to exit this window...
pause > nul
