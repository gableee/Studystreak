@echo off
cd /d "%~dp0"

REM Load environment variables from .env file
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
    )
)

REM Start the AI service
.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001

pause
