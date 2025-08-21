#!/bin/bash

# Pythonスクレイパーテスト実行スクリプト

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🐍 Python Scraper Tests${NC}"
echo "========================"

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# Python仮想環境のチェック
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# 仮想環境のアクティベート
source venv/bin/activate

# 依存関係のインストール（必要な場合）
echo "Checking dependencies..."
pip install -q -r requirements.txt

# テスト実行
echo -e "\n${YELLOW}Running tests...${NC}"
python -m pytest tests/ -v

# テスト結果の保存
TEST_RESULT=$?

# 仮想環境のディアクティベート
deactivate

# 結果の表示
echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi