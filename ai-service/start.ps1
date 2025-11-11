# StudyStreak AI Service Startup Script
# This script starts the FastAPI AI service for educational content generation

Write-Host "🚀 Starting StudyStreak AI Service..." -ForegroundColor Green
Write-Host ""

# Check if Ollama is running
Write-Host "Checking Ollama availability..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Ollama is running" -ForegroundColor Green
    
    # Parse and show available models
    $data = $response.Content | ConvertFrom-Json
    $models = $data.models | ForEach-Object { $_.name }
    Write-Host "Available models: $($models -join ', ')" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "❌ Ollama is not running!" -ForegroundColor Red
    Write-Host "Please start Ollama first:" -ForegroundColor Yellow
    Write-Host "  1. Ollama should auto-start on Windows" -ForegroundColor Yellow
    Write-Host "  2. Or run: ollama serve" -ForegroundColor Yellow
    Write-Host "  3. Pull required model: ollama pull qwen3-vl:8b" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if required model exists
Write-Host "Checking for required model (qwen3-vl:8b)..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    $hasModel = $data.models | Where-Object { $_.name -like "qwen3-vl*" }
    
    if ($hasModel) {
        Write-Host "✅ qwen3-vl model found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  qwen3-vl model not found" -ForegroundColor Yellow
        Write-Host "Run: ollama pull qwen3-vl:8b" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "⚠️  Could not check models" -ForegroundColor Yellow
    Write-Host ""
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Using defaults." -ForegroundColor Yellow
    Write-Host "For Supabase integration, create .env with:" -ForegroundColor Yellow
    Write-Host "  SUPABASE_URL=your-url" -ForegroundColor Yellow
    Write-Host "  SUPABASE_KEY=your-key" -ForegroundColor Yellow
    Write-Host ""
}

# Check if dependencies are installed
Write-Host "Checking Python dependencies..." -ForegroundColor Cyan
try {
    python -c "import fastapi, uvicorn, httpx, pypdf, pptx, docx" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        throw "Dependencies not found"
    }
} catch {
    Write-Host "❌ Missing dependencies. Installing..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Start the service
Write-Host "Starting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
Write-Host "="*50 -ForegroundColor Gray
Write-Host ""

# Run the service
python main.py
