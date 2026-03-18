@echo off
echo.
echo  =============================================
echo   GramSathi AI - Quick Start (Windows)
echo  =============================================
echo.

node --version >nul 2>&1 || (echo Node.js not found. Install from https://nodejs.org && pause && exit /b 1)
echo Node.js found.

cd /d "%~dp0backend"
if not exist "node_modules\" ( echo Installing backend deps... && npm install )
if not exist ".env" ( copy .env.example .env && echo Created .env — add GROQ_API_KEY optionally )

echo Starting backend on port 5000...
start "GramSathi Backend" cmd /k "npm start"
timeout /t 5 /nobreak >nul

cd /d "%~dp0frontend"
if not exist "node_modules\" ( echo Installing frontend deps... && npm install --legacy-peer-deps )

echo Starting frontend on port 5173...
start "GramSathi Frontend" cmd /k "npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  =============================================
echo   GramSathi AI is running!
echo.
echo   App:    http://localhost:5173
echo   API:    http://localhost:5000/api/v1
echo.
echo   Admin:       9000000000 / Admin@123
echo   Member:      9111111111 / Member@123
echo   Coordinator: 9222222222 / Coord@123
echo   Bank Officer:9333333333 / Bank@123
echo  =============================================
pause
