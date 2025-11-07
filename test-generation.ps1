# AI Service Generation Testing Script
# Tests all generation endpoints with detailed timing and output

$headers = @{
    "x-api-key" = "a2UI5-jO7FzZ_JzpYjEdXDBofQUERuC3NlaCLHtlX1A"
    "Content-Type" = "application/json"
}

$testText = @"
Artificial intelligence is revolutionizing education through machine learning and natural language processing. Machine learning algorithms can analyze student performance data to identify learning patterns and predict areas where students might struggle. Natural language processing enables automated grading of essays and generation of personalized study materials. Deep learning models power intelligent tutoring systems that adapt to individual learning styles. Computer vision helps analyze handwritten work and provide instant feedback. These AI technologies are making education more accessible, personalized, and effective for students worldwide.
"@

Write-Output "`n========================================="
Write-Output "AI SERVICE GENERATION TESTING"
Write-Output "========================================="

# Test 1: Summary Generation
Write-Output "`n📝 TEST 1: Summary Generation (BART model)"
Write-Output "-----------------------------------------"
try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $body = @{ text = $testText } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:8000/generate/summary" -Method Post -Headers $headers -Body $body -TimeoutSec 120
    $sw.Stop()
    
    Write-Output "✅ SUCCESS ($($sw.Elapsed.TotalSeconds.ToString('F1'))s)"
    Write-Output "Summary: $($result.summary)"
    Write-Output "Word Count: $($result.word_count)"
    Write-Output "Confidence: $($result.confidence)"
} catch {
    Write-Output "❌ FAILED: $_"
}

# Test 2: Keypoints Extraction
Write-Output "`n🔑 TEST 2: Keypoints Extraction (BART model)"
Write-Output "-----------------------------------------"
try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $body = @{ text = $testText } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:8000/generate/keypoints" -Method Post -Headers $headers -Body $body -TimeoutSec 120
    $sw.Stop()
    
    Write-Output "✅ SUCCESS ($($sw.Elapsed.TotalSeconds.ToString('F1'))s)"
    Write-Output "Key Points ($($result.count)):"
    $result.keypoints | ForEach-Object { Write-Output "  • $_" }
    Write-Output "Confidence: $($result.confidence)"
} catch {
    Write-Output "❌ FAILED: $_"
}

# Test 3: Quiz Generation
Write-Output "`n❓ TEST 3: Quiz Generation (T5 model)"
Write-Output "-----------------------------------------"
try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $body = @{ text = $testText } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:8000/generate/quiz?num_questions=3" -Method Post -Headers $headers -Body $body -TimeoutSec 120
    $sw.Stop()
    
    Write-Output "✅ SUCCESS ($($sw.Elapsed.TotalSeconds.ToString('F1'))s)"
    Write-Output "Generated $($result.count) questions:"
    $i = 1
    $result.questions | ForEach-Object {
        Write-Output "`nQ$($i): $($_.question)"
        Write-Output "   Options: $($_.options -join ', ')"
        Write-Output "   Answer: $($_.correct_answer)"
        $i++
    }
    Write-Output "Confidence: $($result.confidence)"
} catch {
    Write-Output "❌ FAILED: $_"
}

# Test 4: Flashcards Generation
Write-Output "`n📇 TEST 4: Flashcards Generation (T5 model)"
Write-Output "-----------------------------------------"
try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $body = @{ text = $testText } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:8000/generate/flashcards?num_cards=5" -Method Post -Headers $headers -Body $body -TimeoutSec 120
    $sw.Stop()
    
    Write-Output "✅ SUCCESS ($($sw.Elapsed.TotalSeconds.ToString('F1'))s)"
    Write-Output "Generated $($result.count) flashcards:"
    $i = 1
    $result.flashcards | ForEach-Object {
        Write-Output "`nCard $($i):"
        Write-Output "   Front: $($_.front)"
        Write-Output "   Back: $($_.back)"
        $i++
    }
    Write-Output "Confidence: $($result.confidence)"
} catch {
    Write-Output "❌ FAILED: $_"
}

Write-Output "`n========================================="
Write-Output "TESTING COMPLETE"
Write-Output "========================================="
Write-Output "`nNote: First run will download models (~3GB)."
Write-Output "Subsequent runs will be much faster (models cached)."
