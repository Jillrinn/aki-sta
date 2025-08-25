#!/bin/bash
# Python Playwright Execution Wrapper
# This script ensures proper environment setup for Python Playwright execution

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.playwright"

# Load environment variables if .env.playwright exists
if [[ -f "$ENV_FILE" ]]; then
    echo "Loading Playwright environment configuration..."
    set -a  # Export all variables
    source "$ENV_FILE"
    set +a
    echo "Environment loaded from $ENV_FILE"
else
    echo "Warning: $ENV_FILE not found, using default configuration"
    # Set default configuration
    export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/playwright-python"
    export PLAYWRIGHT_BROWSER="webkit"
fi

# Print environment info
echo "Playwright Configuration:"
echo "  PLAYWRIGHT_BROWSERS_PATH: ${PLAYWRIGHT_BROWSERS_PATH:-default}"
echo "  PLAYWRIGHT_BROWSER: ${PLAYWRIGHT_BROWSER:-webkit}"
echo "  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: ${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-0}"

# Check if virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo "Warning: No virtual environment detected"
    if [[ -d "$SCRIPT_DIR/venv" ]]; then
        echo "Activating local virtual environment..."
        source "$SCRIPT_DIR/venv/bin/activate"
    else
        echo "No local virtual environment found. Consider creating one with:"
        echo "  python -m venv venv"
        echo "  source venv/bin/activate"
        echo "  pip install -r requirements.txt"
    fi
else
    echo "Virtual environment: $VIRTUAL_ENV"
fi

# Check if Playwright is installed
if ! python -c "import playwright" 2>/dev/null; then
    echo "Error: Playwright not found in Python environment"
    echo "Please install with: pip install playwright"
    exit 1
fi

# If no arguments provided, show usage
if [[ $# -eq 0 ]]; then
    echo ""
    echo "Usage: $0 [options] <python_script> [script_args...]"
    echo ""
    echo "Options:"
    echo "  --install-browsers    Install Playwright browsers before running"
    echo "  --browser <browser>   Override browser type (webkit, chromium, firefox)"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 src/main.py"
    echo "  $0 src/main.py --date 2025-11-15"
    echo "  $0 --install-browsers src/main.py"
    echo "  $0 --browser chromium src/main.py --date 2025-11-15"
    echo ""
    exit 0
fi

# Parse command line options
INSTALL_BROWSERS=false
OVERRIDE_BROWSER=""
PYTHON_SCRIPT=""
SCRIPT_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --install-browsers)
            INSTALL_BROWSERS=true
            shift
            ;;
        --browser)
            OVERRIDE_BROWSER="$2"
            shift 2
            ;;
        --help)
            exec "$0"  # Show usage
            ;;
        -*)
            # If we already have a Python script, pass this as an argument to it
            if [[ -n "$PYTHON_SCRIPT" ]]; then
                SCRIPT_ARGS+=("$1")
                shift
            else
                echo "Unknown option: $1"
                exit 1
            fi
            ;;
        *)
            # First non-option argument is the Python script
            if [[ -z "$PYTHON_SCRIPT" ]]; then
                PYTHON_SCRIPT="$1"
            else
                SCRIPT_ARGS+=("$1")
            fi
            shift
            ;;
    esac
done

# Override browser if specified
if [[ -n "$OVERRIDE_BROWSER" ]]; then
    export PLAYWRIGHT_BROWSER="$OVERRIDE_BROWSER"
    echo "Browser override: $PLAYWRIGHT_BROWSER"
fi

# Validate Python script exists
if [[ ! -f "$PYTHON_SCRIPT" ]]; then
    echo "Error: Python script not found: $PYTHON_SCRIPT"
    exit 1
fi

# Install browsers if requested
if [[ "$INSTALL_BROWSERS" == "true" ]]; then
    echo "Installing Playwright browsers..."
    python -m playwright install "${PLAYWRIGHT_BROWSER:-webkit}" --with-deps
fi

# Create browsers directory if it doesn't exist
if [[ -n "$PLAYWRIGHT_BROWSERS_PATH" ]]; then
    mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
    echo "Browsers will be stored in: $PLAYWRIGHT_BROWSERS_PATH"
fi

# Run the Python script
echo ""
echo "Executing: python $PYTHON_SCRIPT ${SCRIPT_ARGS[*]}"
echo "==========================================>"
exec python "$PYTHON_SCRIPT" "${SCRIPT_ARGS[@]}"