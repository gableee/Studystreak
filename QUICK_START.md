# 🚀 Quick Start Guide - StudyStreak AI with Ollama

## Start in 3 Steps

### 1️⃣ Start Ollama
```powershell
# Verify Ollama is running
ollama list

# If needed, pull the model
ollama pull qwen3-vl:8b
```

### 2️⃣ Start AI Service
```powershell
cd ai-service
python main.py

# Service runs on: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### 3️⃣ Test It
```powershell
# Run tests
python test_ai_service.py

# Try example client
python example_client.py
```

---

## 📞 API Usage

### From Python
```python
import requests

response = requests.post('http://localhost:8000/generate/studytools', json={
    'supabase_file_path': 'user123/notes.pdf',
    'num_quiz_questions': 5,
    'num_flashcards': 10
})

studytools = response.json()['studytools']
```

### From PHP
```php
$ch = curl_init('http://localhost:8000/generate/studytools');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'supabase_file_path' => 'user123/notes.pdf',
    'num_quiz_questions' => 5,
    'num_flashcards' => 10
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);
```

### From curl
```bash
curl -X POST http://localhost:8000/generate/studytools \
  -H "Content-Type: application/json" \
  -d '{"content": "Your text here", "num_quiz_questions": 5}'
```

---

## 📁 File Structure

```
ai-service/
├── main.py                    # FastAPI app (start here)
├── config.py                  # Configuration
├── requirements.txt           # Dependencies
├── .env                       # Your environment variables
├── start.ps1                  # Startup script
├── test_ai_service.py        # Test suite
├── example_client.py         # Usage examples
├── extractors/
│   └── document_extractor.py # PDF/DOCX/PPTX/OCR extraction
├── models/
│   └── studytools_generator.py # AI content generation
├── routes/
│   └── generation.py         # API endpoints
└── utils/
    ├── ollama_client.py      # Ollama API wrapper
    └── supabase_client.py    # Supabase storage client
```

---

## 🔧 Configuration (.env)

```bash
# Supabase (required for file fetching)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-key-here

# Ollama (optional, defaults shown)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-vl:8b

# Service (optional)
PORT=8000
```

---

## 🎯 Available Endpoints

| Endpoint | What It Does |
|----------|--------------|
| `POST /generate/studytools` | All: summary + keypoints + quiz + flashcards |
| `POST /generate/summary` | Summary only |
| `POST /generate/keypoints` | Keypoints only |
| `POST /generate/quiz` | Quiz only |
| `POST /generate/flashcards` | Flashcards only |
| `POST /generate/upload-and-generate` | Upload file directly |
| `GET /health` | Check service + Ollama status |

---

## 💡 Tips

**Faster Generation:**
- Use smaller model: `ollama pull qwen3-vl:4b`
- Reduce question/card counts

**Better Quality:**
- Use larger model: `qwen3-vl:8b`
- Provide specific `assignment` descriptions

**Debugging:**
- Check logs: `ai-service/logs/ai-service.log`
- Use `/health` endpoint to verify Ollama
- Visit `/docs` for interactive API testing

---

## ⚠️ Common Issues

**"Ollama not available"**
→ Start Ollama or check if it's on port 11434

**"Model not found"**
→ Run `ollama pull qwen3-vl:8b`

**"Empty JSON response"**
→ Known issue with vision models, fallback handling is implemented

**"Timeout"**
→ Increase timeout in config or use smaller model

---

## 📚 Full Documentation

- Setup: `README_OLLAMA_INTEGRATION.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`
- API Docs: http://localhost:8000/docs (when running)

---

**Ready to Go!** 🎉

Start the service and begin generating educational content from your uploaded materials!
