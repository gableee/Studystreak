"""Helper runner to start the StudyStreak AI service from the repository root.

Why: the service code lives in a folder named `ai-service` which contains a hyphen.
Python cannot import modules where the directory name contains a hyphen, so running
`uvicorn ai-service.main:app` fails with ModuleNotFoundError. This small script
adds the `ai-service` folder to sys.path and launches uvicorn with the module
`main:app` (the `main.py` inside the `ai-service` folder).

Usage:
    # from repo root
    python run_ai_service.py

This is equivalent to:
    cd ai-service
    python -m uvicorn main:app --reload --port 8000

"""
import sys
import pathlib
import uvicorn

ROOT = pathlib.Path(__file__).parent
AI_SERVICE_DIR = ROOT / "ai-service"

# Insert ai-service directory at front of sys.path so we can import `main` from there
sys.path.insert(0, str(AI_SERVICE_DIR.resolve()))

if __name__ == "__main__":
    # Default host/port; allow overrides via environment variables
    host = "127.0.0.1"
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run("main:app", host=host, port=port, reload=True)
