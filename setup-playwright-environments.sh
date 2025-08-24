#!/bin/bash
# Playwright Environment Setup Script
# Sets up separate Playwright browser environments for Python and Node.js to prevent version conflicts

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_DIR="$PROJECT_ROOT/scraper"
E2E_DIR="$PROJECT_ROOT/e2e"

echo "🚀 Setting up Playwright environments for version conflict resolution"
echo "Project root: $PROJECT_ROOT"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo "======================================"
    echo "$1"
    echo "======================================"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_section "1. Environment Validation"

# Check required tools
echo "Checking required tools..."
if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js: $(node --version)"

if ! command_exists npm; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi
echo "✅ npm: $(npm --version)"

if ! command_exists python || ! command_exists python3; then
    if command_exists python3; then
        alias python=python3
    elif command_exists python; then
        : # python exists
    else
        echo "❌ Python not found. Please install Python first."
        exit 1
    fi
fi
echo "✅ Python: $(python --version)"

print_section "2. Creating Browser Cache Directories"

# Create separate cache directories
PYTHON_CACHE="$HOME/.cache/playwright-python"
NODE_CACHE="$HOME/.cache/playwright-node"

echo "Creating Python Playwright cache: $PYTHON_CACHE"
mkdir -p "$PYTHON_CACHE"

echo "Creating Node.js Playwright cache: $NODE_CACHE"  
mkdir -p "$NODE_CACHE"

echo "✅ Cache directories created"

print_section "3. Setting up Python Environment"

if [[ ! -d "$PYTHON_DIR" ]]; then
    echo "❌ Python directory not found: $PYTHON_DIR"
    exit 1
fi

cd "$PYTHON_DIR"
echo "Working in: $(pwd)"

# Check for virtual environment
if [[ ! -d "venv" ]]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✅ Virtual environment activated"

# Install Python dependencies if requirements.txt exists
if [[ -f "requirements.txt" ]]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    echo "✅ Python dependencies installed"
else
    echo "⚠️  requirements.txt not found, skipping dependency installation"
fi

# Load Python Playwright environment
if [[ -f ".env.playwright" ]]; then
    echo "Loading Python Playwright configuration..."
    set -a
    source .env.playwright
    set +a
    echo "✅ Python Playwright environment loaded"
else
    echo "⚠️  Python .env.playwright not found"
fi

# Install Python Playwright browsers
echo "Installing Python Playwright browsers (webkit)..."
python -m playwright install webkit --with-deps
echo "✅ Python Playwright browsers installed"

print_section "4. Setting up Node.js Environment"

cd "$E2E_DIR"
echo "Working in: $(pwd)"

# Install Node.js dependencies
if [[ -f "package.json" ]]; then
    echo "Installing Node.js dependencies..."
    npm install
    echo "✅ Node.js dependencies installed"
else
    echo "⚠️  package.json not found, skipping dependency installation"
fi

# Load Node.js Playwright environment
if [[ -f ".env.playwright" ]]; then
    echo "Loading Node.js Playwright configuration..."
    set -a
    source .env.playwright  
    set +a
    echo "✅ Node.js Playwright environment loaded"
else
    echo "⚠️  Node.js .env.playwright not found"
fi

# Install Node.js Playwright browsers
echo "Installing Node.js Playwright browsers..."
npx playwright install --with-deps
echo "✅ Node.js Playwright browsers installed"

print_section "5. Environment Verification"

cd "$PROJECT_ROOT"

echo "Verifying Python Playwright setup..."
cd "$PYTHON_DIR"
source venv/bin/activate
set -a
source .env.playwright 2>/dev/null || true
set +a
if python -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); print('✅ Python Playwright working'); p.stop()" 2>/dev/null; then
    echo "✅ Python Playwright environment verified"
else
    echo "❌ Python Playwright verification failed"
fi

echo ""
echo "Verifying Node.js Playwright setup..."
cd "$E2E_DIR"  
set -a
source .env.playwright 2>/dev/null || true
set +a
if npx playwright --version >/dev/null 2>&1; then
    echo "✅ Node.js Playwright environment verified"
else
    echo "❌ Node.js Playwright verification failed"
fi

print_section "6. Setup Complete"

cd "$PROJECT_ROOT"

echo "🎉 Playwright environment setup complete!"
echo ""
echo "Browser cache directories:"
echo "  Python: $PYTHON_CACHE"
echo "  Node.js: $NODE_CACHE"
echo ""
echo "Usage:"
echo "  Python scraping:"
echo "    cd scraper && ./run-playwright.sh src/scraper.py"
echo ""
echo "  E2E testing:"
echo "    cd e2e && npm test"
echo ""
echo "Environment files created:"
echo "  $PYTHON_DIR/.env.playwright"
echo "  $E2E_DIR/.env.playwright"
echo ""
echo "To troubleshoot issues, run this setup script again."