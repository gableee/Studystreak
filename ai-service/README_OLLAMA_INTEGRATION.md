# StudyStreak AI Service - Ollama Integration

## Overview

This implementation provides a complete pipeline for processing uploaded learning materials and generating educational content using **Ollama (Qwen3-VL)** running locally.

## Architecture

```
User Upload → Supabase Storage → Python AI Service → Ollama (Local) → Educational Content
                    ↓                      ↓
              PHP Backend ← ─ ─ ─ ─ ─ ─ ─ ┘
                    ↓
              React Frontend
```

## Components

### 1. **Document Extraction** (`extractors/document_extractor.py`)
- Extracts text from PDFs (pypdf, pdfplumber, pdfminer.six)
- Extracts text from PPTX (python-pptx)
- Extracts text from DOCX (python-docx)
- OCR support for images (pytesseract + Tesseract)

### 2. **Supabase Storage Integration** (`utils/supabase_client.py`)
- Fetches files from `learning-materials-v2` bucket
- Downloads files by path
- Lists files with prefix filtering
- Checks file existence

### 3. **Ollama Client** (`utils/ollama_client.py`)
- Wrapper for Ollama HTTP API
- Supports text generation and chat modes
- JSON-structured output generation
- Model availability checking

### 4. **StudyTools Generator** (`models/studytools_generator.py`)
- **Summary**: Concise 3-5 paragraph academic summary
- **Keypoints**: Structured terms with definitions and importance levels
- **Quiz**: Multiple choice questions with answers, explanations, difficulty
- **Flashcards**: Q&A pairs with categories

### 5. **FastAPI Routes** (`routes/generation.py`)
- `POST /generate/studytools` - Complete package
- `POST /generate/summary` - Summary only
- `POST /generate/keypoints` - Keypoints only
- `POST /generate/quiz` - Quiz only
- `POST /generate/flashcards` - Flashcards only
- `POST /generate/upload-and-generate` - Direct file upload

### 6. **PHP Backend Controller** (`php-backend/src/Controllers/AIStudyToolsController.php`)
- Proxies requests from frontend to Python AI service
- Error handling and validation
- Response formatting for frontend

## Setup Instructions

### Prerequisites

1. **Ollama installed and running**
   ```powershell
   # Install Ollama from https://ollama.ai
   
   # Pull Qwen3-VL model
   ollama pull qwen3-vl:8b
   
   # Or use 4b variant for lower memory
   ollama pull qwen3-vl:4b
   
   # Verify Ollama is running
   ollama list
   ```

2. **Python 3.9+**
3. **Tesseract OCR** (optional, for image OCR)
   ```powershell
   # Install from: https://github.com/UB-Mannheim/tesseract/wiki
   # Add to PATH: C:\Program Files\Tesseract-OCR
   ```

### Installation

1. **Install Python dependencies**
   ```powershell
   cd ai-service
   pip install -r requirements.txt
   ```

2. **Configure environment**
   ```powershell
   # Copy .env.example to .env
   cp .env.example .env
   
   # Edit .env and add your Supabase credentials
   ```

3. **Start the AI service**
   ```powershell
   cd ai-service
   python main.py
   ```
   
   Service will start on `http://localhost:8000`

4. **Test the service**
   ```powershell
   # Health check
   curl http://localhost:8000/health
   
   # API documentation
   # Open: http://localhost:8000/docs
   ```

### PHP Backend Configuration

Add to `php-backend/.env`:
```
AI_SERVICE_URL=http://localhost:8000
```

## Usage Examples

### 1. Generate StudyTools from Supabase File

**Python API:**
```python
import requests

response = requests.post('http://localhost:8000/generate/studytools', json={
    'supabase_file_path': 'user123/lecture-notes.pdf',
    'assignment': 'Generate comprehensive study materials',
    'num_quiz_questions': 10,
    'num_flashcards': 15
})

studytools = response.json()['studytools']
```

**PHP API:**
```php
POST /api/ai/generate/studytools
Content-Type: application/json

{
    "supabase_file_path": "user123/lecture-notes.pdf",
    "assignment": "Generate comprehensive study materials",
    "num_quiz_questions": 10,
    "num_flashcards": 15
}
```

### 2. Generate from Direct Text Content

```json
POST /generate/studytools
{
    "content": "Long text content here...",
    "assignment": "Create quiz and flashcards",
    "num_quiz_questions": 5,
    "num_flashcards": 10
}
```

### 3. Upload File Directly

```bash
curl -X POST http://localhost:8000/generate/upload-and-generate \
  -F "file=@lecture.pdf" \
  -F "assignment=Generate study materials" \
  -F "num_quiz_questions=8"
```

## Response Format

```json
{
    "success": true,
    "studytools": {
        "summary": {
            "content": "Concise summary...",
            "word_count": 250,
            "reading_time": "2 min"
        },
        "keypoints": [
            {
                "topic": "Main Concepts",
                "terms": [
                    {
                        "term": "Key Term",
                        "definition": "Definition here.",
                        "importance": "high"
                    }
                ]
            }
        ],
        "quiz": [
            {
                "question": "What is...?",
                "options": ["A", "B", "C", "D"],
                "answer": "A",
                "explanation": "Because...",
                "difficulty": "normal",
                "time_estimate": "2 minutes",
                "userAnswer": null,
                "score": null
            }
        ],
        "flashcards": [
            {
                "Q": "Question?",
                "A": "Answer.",
                "category": "Topic"
            }
        ],
        "metadata": {
            "total_score": "0/5",
            "completion_time": "15 min",
            "difficulty_level": "normal",
            "progress": "0/4 sections complete",
            "next_steps": [
                "Review the summary and keypoints",
                "Test your knowledge with the quiz"
            ]
        }
    }
}
```

## Troubleshooting

### Ollama Not Available

```powershell
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama (it should auto-start on Windows)
# If not, run: ollama serve
```

### Model Not Found

```powershell
# Pull the required model
ollama pull qwen3-vl:8b

# Or use a smaller variant
ollama pull qwen3-vl:4b
```

### OCR Not Working

```powershell
# Install Tesseract OCR
# Download: https://github.com/UB-Mannheim/tesseract/wiki

# Add to PATH or set in code:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

### Slow Generation

- Use smaller model: `qwen3-vl:4b` instead of `8b`
- Reduce `num_quiz_questions` and `num_flashcards`
- Increase timeout in PHP controller
- Use GPU if available (configure in ollama_client.py)

### Memory Issues

- Use smaller Ollama model
- Reduce context length (truncate content to ~15000 chars)
- Close other applications
- Consider cloud-based Ollama deployment

## Performance Optimization

1. **Caching**: Consider caching generated content in database
2. **Async Processing**: Use background tasks for long generations
3. **Content Chunking**: Split large documents into smaller chunks
4. **Model Selection**: Balance between quality (8b) and speed (4b)

## Security Considerations

1. **API Authentication**: Add authentication to FastAPI endpoints
2. **Rate Limiting**: Implement rate limiting for generation endpoints
3. **Input Validation**: Validate file types and sizes
4. **Sanitization**: Sanitize extracted text before processing
5. **CORS**: Configure CORS appropriately for production

## Next Steps

1. Add authentication middleware
2. Implement caching layer (Redis)
3. Add background job processing (Celery)
4. Create frontend UI components
5. Add monitoring and analytics
6. Deploy to production (Docker container)

## Support

For issues or questions:
- Check logs in `ai-service/logs/ai-service.log`
- Review Ollama logs
- Test endpoints using FastAPI docs at `/docs`
