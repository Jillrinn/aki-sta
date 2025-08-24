#!/bin/bash
# Playwright Test Runner with Environment Isolation
# Ensures proper environment setup and handles cleanup

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.playwright"

# Load environment variables
if [[ -f "$ENV_FILE" ]]; then
    echo "Loading Playwright environment configuration..."
    set -a  # Export all variables
    source "$ENV_FILE"
    set +a
    # Manually expand ${HOME} since it might not be expanded in all cases
    if [[ "$PLAYWRIGHT_BROWSERS_PATH" == *'${HOME}'* ]]; then
        export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH/\$\{HOME\}/$HOME}"
    fi
    echo "Environment loaded: PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"
else
    echo "Warning: $ENV_FILE not found, using default configuration"
    export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/playwright-node"
fi

# Parse command line arguments
PLAYWRIGHT_ARGS=("$@")

# If no arguments provided, use default test settings
if [[ $# -eq 0 ]]; then
    PLAYWRIGHT_ARGS=("--reporter=list")
fi

# Ensure browsers directory exists
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"

echo "Starting Playwright tests..."
echo "Browser cache: $PLAYWRIGHT_BROWSERS_PATH"

# Run Playwright with proper environment
exec npx playwright test "${PLAYWRIGHT_ARGS[@]}"