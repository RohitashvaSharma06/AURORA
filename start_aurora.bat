@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>&1 || (echo ERROR: Python 3.10+ is required.& exit /b 1)
python -c "import fastapi,uvicorn" >nul 2>&1 || (echo ERROR: Backend dependencies missing. Run: python -m pip install -r requirements.txt& exit /b 1)
netstat -ano | findstr /r /c:":8000 .*LISTENING" >nul 2>&1 && (echo ERROR: Port 8000 is already in use. Stop the existing server or choose another port.& exit /b 1)
set "AURORA_URL=http://127.0.0.1:8000"
findstr /i /c:"127.0.0.1 aurora.test" "%SystemRoot%\System32\drivers\etc\hosts" >nul 2>&1
if errorlevel 1 (
  echo NOTE: aurora.test is not mapped. Run scripts\setup-aurora-hosts.ps1 as Administrator once to use it.
) else (
  set "AURORA_URL=http://aurora.test:8000"
)
echo Starting Aurora Control Center...
echo GUI:       %AURORA_URL%
echo API:       %AURORA_URL%/api/health
echo WebSocket: ws://%AURORA_URL:http://=%/ws/simulation
echo Press Ctrl+C to stop Aurora.
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
