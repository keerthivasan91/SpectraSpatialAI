# Use a clean, production-ready Python runtime slim layer
FROM python:3.13-slim

# Set environment system layer optimizations
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

WORKDIR /app

# Install system dependencies needed for compiling image utilities and networking tests
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements layer first to maximize Docker layer caching compilation speeds
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy application source code trees
COPY . .

# Expose FastAPI default network communication port tracking channel
EXPOSE 8000

# Standalone execution runtime entrypoint command line
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]