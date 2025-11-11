"""
Configuration settings for AI service.
Loads environment variables and provides configuration constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', SUPABASE_KEY)
SUPABASE_BUCKET = os.getenv('SUPABASE_BUCKET', 'learning-materials-v2')

# Ollama Configuration
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen3-vl:8b')
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '120'))

# Service Configuration
PORT = int(os.getenv('PORT', '8000'))
HOST = os.getenv('HOST', '0.0.0.0')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

# Generation Defaults
DEFAULT_NUM_QUIZ_QUESTIONS = 5
DEFAULT_NUM_FLASHCARDS = 10
MAX_QUIZ_QUESTIONS = 20
MAX_FLASHCARDS = 50

# Content Processing
MAX_CONTENT_LENGTH = 20000  # Characters to send to model
MIN_CONTENT_LENGTH = 100    # Minimum required content

# File Upload
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'}

# Paths
BASE_DIR = Path(__file__).parent
LOGS_DIR = BASE_DIR / 'logs'
MODEL_CACHE_DIR = BASE_DIR / 'model_cache'
TEMP_DIR = BASE_DIR / 'tmp'

# Create directories if they don't exist
LOGS_DIR.mkdir(exist_ok=True)
MODEL_CACHE_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)
