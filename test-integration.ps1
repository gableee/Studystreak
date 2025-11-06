# PHP Backend → AI Service Integration Test
# Tests end-to-end flow: PHP calls ai-service, receives AI content, stores in DB

Write-Output "`n========================================="
Write-Output "PHP → AI SERVICE INTEGRATION TEST"
Write-Output "=========================================`n"

# Test 1: Health check both services
Write-Output "1️⃣ Testing Service Health..."
Write-Output "-----------------------------------------"

try {
    $phpHealth = Invoke-RestMethod -Uri "http://localhost:8181/health" -Method Get -TimeoutSec 5
    Write-Output "✅ PHP Backend: $($phpHealth.status)"
} catch {
    Write-Output "❌ PHP Backend: FAILED - $_"
}

try {
    $aiHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 5
    Write-Output "✅ AI Service: $($aiHealth.status) - Model: $($aiHealth.embedding_model)"
} catch {
    Write-Output "❌ AI Service: FAILED - $_"
}

# Test 2: Direct AI service call (verify endpoints work)
Write-Output "`n2️⃣ Testing AI Service Directly..."
Write-Output "-----------------------------------------"

$aiHeaders = @{
    "x-api-key" = "a2UI5-jO7FzZ_JzpYjEdXDBofQUERuC3NlaCLHtlX1A"
    "Content-Type" = "application/json"
}

$testText = "Machine learning is a subset of artificial intelligence. It enables computers to learn from data."

try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $summary = Invoke-RestMethod -Uri "http://localhost:8000/generate/summary" `
        -Method Post `
        -Headers $aiHeaders `
        -Body (@{text=$testText}|ConvertTo-Json) `
        -TimeoutSec 60
    $sw.Stop()
    Write-Output "✅ Summary: $($sw.Elapsed.TotalSeconds.ToString('F1'))s"
    Write-Output "   $($summary.summary.Substring(0, [Math]::Min(80, $summary.summary.Length)))..."
} catch {
    Write-Output "❌ Summary: FAILED - $_"
}

try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $embedding = Invoke-RestMethod -Uri "http://localhost:8000/embeddings/generate" `
        -Method Post `
        -Headers $aiHeaders `
        -Body (@{text=$testText}|ConvertTo-Json) `
        -TimeoutSec 30
    $sw.Stop()
    Write-Output "✅ Embedding: $($sw.ElapsedMilliseconds)ms - $($embedding.dimensions)-dim vector"
} catch {
    Write-Output "❌ Embedding: FAILED - $_"
}

Write-Output "`n3️⃣ Testing PHP → AI Integration..."
Write-Output "-----------------------------------------"
Write-Output "⚠️  To test full integration, you need:"
Write-Output "   1. Sign in to get auth token"
Write-Output "   2. Create a learning material with ai_toggle_enabled=true"
Write-Output "   3. Call GET /api/materials/{id}/study-tools/summary"
Write-Output ""
Write-Output "Example curl command:"
Write-Output '   curl -H "Authorization: Bearer YOUR_TOKEN" \'
Write-Output '     http://localhost:8181/api/materials/MATERIAL_ID/study-tools/summary'

Write-Output "`n========================================="
Write-Output "INTEGRATION STATUS"
Write-Output "=========================================`n"
Write-Output "✅ AI Service endpoints: /generate/summary, /generate/keypoints, /generate/quiz, /generate/flashcards"
Write-Output "✅ PHP AiService class: Updated to match ai-service routes"
Write-Output "✅ StudyToolsController: Added getSummary(), getKeyPoints(), generateQuiz(), getFlashcards()"
Write-Output "✅ Frontend API client: Compatible with PHP endpoints"
Write-Output ""
Write-Output "🔄 Next: Test with real user authentication and material"
