# Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables BEFORE installing Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PYTHONUNBUFFERED=1
# コンテナ環境を明示的に示す
ENV CONTAINER_ENV=true
ENV PLATFORM_OVERRIDE=Linux

# Install Playwright browsers (Chromium only for size optimization)
# Install Chromium browser without dependencies (already installed via apt-get)
RUN playwright install chromium

# Copy application code
COPY . .

# Azure Web Apps expects port 8000 by default
EXPOSE 8000

# Start Flask app with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--timeout", "600", "--workers", "1", "app:app"]