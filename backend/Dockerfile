FROM python:3.13-slim

WORKDIR /app

# Install updated, modern system dependencies for image processing and neural rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglx-mesa0 \
    libglib2.0-0 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip

# Pull dependencies directly from the backend subdirectory
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy backend application data and expose
COPY backend/ .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]