#!/usr/bin/env pwsh
# Quiz History Integration Script
# Run this from the studystreak directory

Write-Host "🚀 Quiz History Component Integration" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Recharts
Write-Host "📦 Step 1: Installing Recharts..." -ForegroundColor Yellow
npm install recharts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Recharts" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Recharts installed successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Backup original QuizTab
Write-Host "💾 Step 2: Backing up original QuizTab.tsx..." -ForegroundColor Yellow
$originalFile = "src/Features/LearningMaterials/StudyTools/QuizTab.tsx"
$backupFile = "src/Features/LearningMaterials/StudyTools/QuizTab.backup.tsx"
$enhancedFile = "src/Features/LearningMaterials/StudyTools/QuizTabEnhanced.tsx"

if (Test-Path $originalFile) {
    Copy-Item $originalFile $backupFile -Force
    Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green
} else {
    Write-Host "⚠️  Original QuizTab.tsx not found at $originalFile" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Replace with enhanced version
Write-Host "🔄 Step 3: Installing enhanced QuizTab..." -ForegroundColor Yellow

if (Test-Path $enhancedFile) {
    Copy-Item $enhancedFile $originalFile -Force
    Write-Host "✅ QuizTab.tsx updated with history integration" -ForegroundColor Green
} else {
    Write-Host "❌ QuizTabEnhanced.tsx not found at $enhancedFile" -ForegroundColor Red
    Write-Host "   Make sure you're running this from the studystreak directory" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 Integration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 What was installed:" -ForegroundColor Cyan
Write-Host "  ✓ QuizHistoryView component (src/components/QuizHistoryView.tsx)"
Write-Host "  ✓ Enhanced QuizTab with history mode"
Write-Host "  ✓ Recharts library for data visualization"
Write-Host ""
Write-Host "🧪 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start dev server: npm run dev"
Write-Host "  2. Navigate to any material's Quiz tab"
Write-Host "  3. Click 'History' button to view quiz history"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  - Full docs: docs/QUIZ_HISTORY_COMPONENT.md"
Write-Host "  - Summary: QUIZ_HISTORY_IMPLEMENTATION.md"
Write-Host ""
Write-Host "⚠️  Backend Requirement:" -ForegroundColor Yellow
Write-Host "  Ensure endpoint exists: GET /api/materials/{id}/quiz-attempts/history"
Write-Host "  See documentation for expected response format"
Write-Host ""
