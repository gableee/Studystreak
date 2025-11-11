# AI Service Startup Script
# Loads .env file and starts the service with environment variables

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "Loading environment variables from .env file..." -ForegroundColor Cyan

# Read and set environment variables from .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        # Skip empty lines and comments
        if ($line -and !$line.StartsWith("#")) {
            if ($line -match '^([^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                $value = $value -replace '^["'']|["'']$', ''
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
                Write-Host "  Set $name" -ForegroundColor Green
            }
        }
    }
    Write-Host "Environment variables loaded successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`nStarting AI Service..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the service`n" -ForegroundColor Yellow

# Start uvicorn
& ".\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8001
