#!/usr/bin/env pwsh
# Test script for AI reviewer generation flow
# Run from StudyStreak root directory

Write-Host "=== AI Reviewer Generation Test ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if services are running
Write-Host "Step 1: Checking services..." -ForegroundColor Yellow
$frontendRunning = $false
$backendRunning = $false
$aiServiceRunning = $false

try {
    $frontendTest = Invoke-WebRequest -Uri "http://localhost:5173" -Method HEAD -TimeoutSec 2 -ErrorAction SilentlyContinue
    $frontendRunning = $true
} catch {}

try {
    $backendTest = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    $backendRunning = $true
} catch {}

try {
    $aiServiceTest = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    $aiServiceRunning = $true
} catch {}

Write-Host "  Frontend (React):    " -NoNewline
if ($frontendRunning) { Write-Host "✓ Running" -ForegroundColor Green } else { Write-Host "✗ Not running" -ForegroundColor Red }

Write-Host "  Backend (PHP):       " -NoNewline
if ($backendRunning) { Write-Host "✓ Running" -ForegroundColor Green } else { Write-Host "✗ Not running" -ForegroundColor Red }

Write-Host "  AI Service (Python): " -NoNewline
if ($aiServiceRunning) { Write-Host "✓ Running" -ForegroundColor Green } else { Write-Host "✗ Not running" -ForegroundColor Red }

Write-Host ""

if (-not ($frontendRunning -and $backendRunning -and $aiServiceRunning)) {
    Write-Host "⚠️  Not all services are running. Start them first:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Terminal 1: cd studystreak; npm run dev" -ForegroundColor Gray
    Write-Host "  Terminal 2: cd php-backend; php -S localhost:8080 -t public" -ForegroundColor Gray
    Write-Host "  Terminal 3: cd ai-service; python main.py" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Step 2: Check database migration
Write-Host "Step 2: Checking database migration..." -ForegroundColor Yellow
Write-Host "  ℹ️  Run migration in Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host "     php-backend/migrations/2025_11_08_01_create_ai_jobs.sql" -ForegroundColor Gray
Write-Host ""

# Step 3: Test worker script
Write-Host "Step 3: Testing worker script..." -ForegroundColor Yellow
Write-Host "  Running worker once..." -ForegroundColor Gray

$workerOutput = php ".\php-backend\scripts\ai_job_worker.php" 2>&1
Write-Host $workerOutput -ForegroundColor Gray

if ($workerOutput -match "Starting AI job worker") {
    Write-Host "  ✓ Worker script runs successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Worker script failed" -ForegroundColor Red
    Write-Host "  Check error above" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Instructions for manual testing
Write-Host "Step 4: Manual testing steps" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Upload a PDF in the frontend:" -ForegroundColor White
Write-Host "   - Go to http://localhost:5173/learning-materials" -ForegroundColor Gray
Write-Host "   - Click 'Add Material' and upload a PDF" -ForegroundColor Gray
Write-Host "   - Enable 'AI Toggle' in material settings" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Queue reviewer generation:" -ForegroundColor White
Write-Host "   - Backend should auto-generate when AI toggle enabled" -ForegroundColor Gray
Write-Host "   - Or POST to: /api/materials/{id}/generate-reviewer" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Check job status:" -ForegroundColor White
Write-Host "   - GET /api/materials/{id}/ai-status?job_type=reviewer" -ForegroundColor Gray
Write-Host "   - Should return: {status: 'pending' | 'processing' | 'completed'}" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Start worker to process jobs:" -ForegroundColor White
Write-Host "   - Run: while (\$true) { php php-backend\scripts\ai_job_worker.php; Start-Sleep 5 }" -ForegroundColor Gray
Write-Host ""

Write-Host "5. View full-screen PDF:" -ForegroundColor White
Write-Host "   - In material preview modal, click 'Full screen' button" -ForegroundColor Gray
Write-Host "   - Test zoom controls and scroll tracking" -ForegroundColor Gray
Write-Host ""

Write-Host "6. View generated reviewer:" -ForegroundColor White
Write-Host "   - Go to Study Tools page for the material" -ForegroundColor Gray
Write-Host "   - Check reviewer tab for cleaned, organized content" -ForegroundColor Gray
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 See REVIEWER_IMPLEMENTATION_GUIDE.md for full documentation" -ForegroundColor Green
