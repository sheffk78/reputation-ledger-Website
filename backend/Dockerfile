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

# Expose default port (Railway overrides via PORT env var)
EXPOSE 8000

# Start uvicorn - Railway sets PORT dynamically
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
