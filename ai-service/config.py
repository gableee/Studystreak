"""
Configuration for AI service.
Holds model paths, vector dimensions, and API keys.
"""

import os
from pathlib import Path

# Optional: device selection for Torch/Transformers/CLIP
# USE_GPU options: "auto" | "cpu" | "cuda" | "1"/"0" | "true"/"false"
USE_GPU = os.getenv("USE_GPU", "auto").lower()
CUDA_DEVICE = int(os.getenv("CUDA_DEVICE", "0"))
TORCH_HOME = os.getenv("TORCH_HOME", str(Path("./model_cache/torch").resolve()))
HF_HOME = os.getenv("HF_HOME", str(Path("./model_cache/hf").resolve()))

os.environ.setdefault("TORCH_HOME", TORCH_HOME)
os.environ.setdefault("HF_HOME", HF_HOME)

# AI Service Settings
AI_SERVICE_HOST = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
API_KEY = os.getenv("AI_SERVICE_API_KEY", None)

# HuggingFace API Token (for Inference API or private models)
HF_API_TOKEN = os.getenv("HF_API_TOKEN", None)

# Model Settings
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
VECTOR_DIMENSIONS = 384  # all-MiniLM-L6-v2 produces 384-dim vectors

SUMMARY_MODEL = "facebook/bart-large-cnn"
KEYPOINTS_MODEL = "facebook/bart-large-cnn"
QUIZ_MODEL = "t5-base"  # TODO: Fine-tune for question generation
FLASHCARD_MODEL = "t5-base"

# Model Cache Directory (avoid conflict with models/ Python package)
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", "./model_cache"))
MODEL_CACHE_DIR.mkdir(exist_ok=True)

# Request Limits
# Removed hard MAX_TEXT_LENGTH limit - chunking handles long texts
# Allow up to 1M chars but rely on summarizer chunking for safe processing
MAX_TEXT_LENGTH = 1000000  # characters (soft limit, chunking handles actual processing)
MAX_BATCH_SIZE = 32

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = Path("./logs/ai_service.log")
LOG_FILE.parent.mkdir(exist_ok=True)


def get_device() -> str:
	"""Return a torch device string based on USE_GPU and availability.

	Returns:
		e.g. "cuda:0" or "cpu"
	"""
	# Avoid importing torch at module import for speed in non-ML code paths
	try:
		import torch  # type: ignore
	except Exception:
		return "cpu"

	if USE_GPU in {"cpu", "0", "false"}:
		return "cpu"

	# auto | cuda | 1 | true
	if torch.cuda.is_available():
		return f"cuda:{CUDA_DEVICE}"
	return "cpu"


def get_hf_pipeline_device_id() -> int:
	"""Return the device id for HuggingFace pipelines.

	-1 for CPU, >=0 GPU index.
	"""
	dev = get_device()
	if dev.startswith("cuda:"):
		try:
			return int(dev.split(":", 1)[1])
		except Exception:
			return 0
	return -1
