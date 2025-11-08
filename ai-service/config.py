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

# Reviewer Style Prompts (for student-friendly output)
REVIEWER_STYLE_PROMPT = """
You are generating study reviewers for students.
Break long text into concise, scannable sections.
Keep technical accuracy but improve readability and recall.
Highlight key ideas in bullet form, use emojis or short labels for sections.
Organize content by topic, not just sequentially.
"""

SUMMARY_STYLE_PROMPT = """
Generate a clear, organized summary for students.
Use sections with descriptive headings.
Focus on main concepts, not minor details.
Keep sentences short and direct (15-20 words max).
"""

KEYPOINTS_STYLE_PROMPT = """
Extract key concepts as bullet points.
Each point should be one concise idea (1-2 sentences).
Use term-definition format when appropriate.
Focus on testable, memorable information.
"""

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
		# Quick runtime probe: try a tiny CUDA op to detect ABI/arch incompatibilities
		try:
			dev_str = f"cuda:{CUDA_DEVICE}"
			# allocate a tiny tensor on the device to surface kernel compatibility errors early
			t = torch.tensor([1.0], device=dev_str)
			t *= 2.0
			return dev_str
		except Exception as probe_err:
			# If CUDA is present but the current PyTorch build can't run kernels on this GPU
			# (e.g. "no kernel image is available for execution on the device"),
			# fall back to CPU and log a helpful message.
			try:
				import logging
				logging.getLogger(__name__).warning(
					"CUDA probe failed; falling back to CPU. Error: %s", str(probe_err)
				)
			except Exception:
				pass
			return "cpu"
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
