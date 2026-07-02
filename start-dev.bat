@echo off
setlocal
set "ROOT=%~dp0"

where npm >nul 2>nul
if not errorlevel 1 goto npmfound

if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%PATH%;%ProgramFiles%\nodejs"
if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "PATH=%PATH%;%ProgramFiles(x86)%\nodejs"
if exist "%LocalAppData%\Programs\nodejs\npm.cmd" set "PATH=%PATH%;%LocalAppData%\Programs\nodejs"
if exist "%AppData%\npm\npm.cmd" set "PATH=%PATH%;%AppData%\npm"

:npmfound
where npm >nul 2>nul
if errorlevel 1 (
  echo Could not find npm on this machine automatically.
  echo Please open the "Node.js command prompt" from the Start Menu instead,
  echo cd into this folder, and run this script from there.
  pause
  exit /b 1
)

echo ===============================================
echo   AI Mode - Installing dependencies and launching
echo ===============================================

echo.
echo [1/4] Installing backend dependencies...
cd /d "%ROOT%server"
call npm install
if errorlevel 1 (
  echo Backend npm install failed. See errors above.
  pause
  exit /b 1
)

if not exist "%ROOT%server\.env" (
  copy "%ROOT%server\.env.example" "%ROOT%server\.env" >nul
  echo Created server\.env from template - no API keys yet, app will run on mock data.
)

echo.
echo [2/4] Installing frontend dependencies...
cd /d "%ROOT%web"
call npm install
if errorlevel 1 (
  echo Frontend npm install failed. See errors above.
  pause
  exit /b 1
)

echo.
echo [3/4] Starting backend on http://localhost:8787 ...
start "AI Mode - Backend (8787)" /D "%ROOT%server" cmd /k npm run dev

echo [4/4] Starting frontend on http://localhost:5173 ...
start "AI Mode - Frontend (5173)" /D "%ROOT%web" cmd /k npm run dev

echo.
echo Waiting for servers to boot...
timeout /t 8 /nobreak > nul

start "" "http://localhost:5173"

echo.
echo Done. Backend and frontend are running in separate windows - close those windows to stop them.
pause
