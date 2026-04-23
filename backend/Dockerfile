FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway sets PORT dynamically - start script reads it
RUN echo '#!/bin/sh\nexec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}' > /app/run.sh && chmod +x /app/run.sh

EXPOSE 8000
CMD ["/app/run.sh"]
