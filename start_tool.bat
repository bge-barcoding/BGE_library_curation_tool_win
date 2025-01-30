@echo off
REM Start the Node.js server
start "" node\node.exe server.js

REM Wait for the server to start
timeout /t 5 >nul

REM Open the tool in the default browser
start http://localhost:3000

pause