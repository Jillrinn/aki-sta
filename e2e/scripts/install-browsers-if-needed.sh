#!/bin/bash

# Playwrightのブラウザインストールチェックスクリプト
# Python側のPlaywright使用後にe2eテストを実行する際の問題を解決

echo "🔍 Checking Playwright browsers..."

# Playwrightのキャッシュディレクトリ
CACHE_DIR="$HOME/Library/Caches/ms-playwright"

# ブラウザの存在をチェック
if [ ! -d "$CACHE_DIR" ]; then
    echo "❌ Playwright cache directory not found"
    NEEDS_INSTALL=true
elif ! ls "$CACHE_DIR" | grep -q "chromium"; then
    echo "❌ Chromium browser not found in cache"
    NEEDS_INSTALL=true
else
    # 実行可能ファイルの存在も確認
    CHROMIUM_DIR=$(ls -d "$CACHE_DIR"/chromium* 2>/dev/null | head -n 1)
    if [ -z "$CHROMIUM_DIR" ]; then
        echo "❌ No chromium directory found"
        NEEDS_INSTALL=true
    elif [ ! -f "$CHROMIUM_DIR/chrome-mac/Chromium.app/Contents/MacOS/Chromium" ] && \
         [ ! -f "$CHROMIUM_DIR/chrome-mac/headless_shell" ]; then
        echo "❌ Chromium executable not found"
        NEEDS_INSTALL=true
    else
        echo "✅ Playwright browsers are already installed"
        NEEDS_INSTALL=false
    fi
fi

# 必要に応じてインストール
if [ "$NEEDS_INSTALL" = true ]; then
    echo "📦 Installing Playwright browsers..."
    npx playwright install
    
    if [ $? -eq 0 ]; then
        echo "✅ Playwright browsers installed successfully"
    else
        echo "❌ Failed to install Playwright browsers"
        exit 1
    fi
fi