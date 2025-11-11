# PowerShell script to run AI service tests with proper UTF-8 encoding
# Run this from the StudyStreak root directory or ai-service directory

Write-Host "AI Service Test Runner" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Set console to UTF-8 to avoid encoding errors
chcp 65001 | Out-Null
$env:PYTHONUTF8 = "1"

Write-Host "[INFO] Console set to UTF-8" -ForegroundColor Green
Write-Host "[INFO] PYTHONUTF8 environment variable set" -ForegroundColor Green
Write-Host ""

# Determine if we're in the ai-service directory or parent
$CurrentDir = Get-Location
$TestScript = ""

if (Test-Path ".\test_ai_service.py") {
    # We're already in ai-service directory
    $TestScript = ".\test_ai_service.py"
    Write-Host "[INFO] Running from ai-service directory" -ForegroundColor Green
} elseif (Test-Path ".\ai-service\test_ai_service.py") {
    # We're in parent directory
    $TestScript = ".\ai-service\test_ai_service.py"
    Write-Host "[INFO] Running from project root directory" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Cannot find test_ai_service.py" -ForegroundColor Red
    Write-Host "[ERROR] Please run this script from the StudyStreak root or ai-service directory" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
$VenvPath = ""
if (Test-Path ".\.venv\Scripts\python.exe") {
    $VenvPath = ".\.venv\Scripts\python.exe"
    Write-Host "[INFO] Using virtual environment: .venv" -ForegroundColor Green
} elseif (Test-Path ".\ai-service\.venv\Scripts\python.exe") {
    $VenvPath = ".\ai-service\.venv\Scripts\python.exe"
    Write-Host "[INFO] Using virtual environment: ai-service\.venv" -ForegroundColor Green
} else {
    Write-Host "[WARN] No virtual environment found, using system Python" -ForegroundColor Yellow
    $VenvPath = "python"
}

Write-Host ""
Write-Host "[INFO] Running tests..." -ForegroundColor Cyan
Write-Host "---------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Run the test script
& $VenvPath $TestScript

$ExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "---------------------------------------" -ForegroundColor Cyan
if ($ExitCode -eq 0) {
    Write-Host "[SUCCESS] All tests passed!" -ForegroundColor Green
} else {
    Write-Host "[FAILURE] Some tests failed (exit code: $ExitCode)" -ForegroundColor Red
}

exit $ExitCode
