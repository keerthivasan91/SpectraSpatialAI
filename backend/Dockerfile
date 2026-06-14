FROM python:3.13-slim

WORKDIR /app

# 1. Install system utilities and Git
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglx-mesa0 \
    libglib2.0-0 \
    netcat-openbsd \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip

# 2. Clone your code inside the container where network paths are 100% reliable
# (This isolates the code pull completely from Dokploy's workspace layer)
RUN git clone https://github.com/keerthivasan91/SpectraSpatialAI.git /tmp/repo && \
    cp -r /tmp/repo/backend/* /app/ && \
    rm -rf /tmp/repo

# 3. Process requirements from the now local flat app layer
RUN pip install -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]