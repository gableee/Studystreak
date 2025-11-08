# Use CUDA 12.1 base image with Python 3.11
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Set working directory
WORKDIR /app

# Install Python 3.11 and system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    build-essential \
    curl \
    ca-certificates \
    poppler-utils \
    tesseract-ocr \
    git \
    libgl1 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3.11 /usr/bin/python

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .

# Environment and cache dirs for model downloads
ENV TORCH_HOME=/app/model_cache/torch \
    HF_HOME=/app/model_cache/hf \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install PyTorch 2.5+ with CUDA 12.1 support (supports sm_120 for RTX 5060)
# Then install other requirements (filtering torch to avoid conflicts)
RUN pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
    grep -iEv "^\s*torch(\s|=|>|<|$)" requirements.txt > /tmp/req_no_torch.txt || cp requirements.txt /tmp/req_no_torch.txt && \
    pip3 install --no-cache-dir -r /tmp/req_no_torch.txt

# Copy application code
COPY . .

# Create models directory for caching
RUN mkdir -p /app/models /app/model_cache/torch /app/model_cache/hf

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run FastAPI with uvicorn
# --host 0.0.0.0 makes server accessible outside container
# --reload enables auto-reload on code changes (development)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
