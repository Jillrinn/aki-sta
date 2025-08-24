# E2Eテスト

## 概要
空きスタサーチくんのEnd-to-Endテスト

## 🚀 Playwright環境分離システム（バージョン競合完全解決）

このプロジェクトでは、Python（スクレイパー）とNode.js（E2E）で異なるバージョンのPlaywrightを使用しても**バージョン不整合によるエラーが発生しない**包括的な解決策を実装しています。

### ❌ 解決する問題
- Python Playwright (1.41.0) と Node.js Playwright (1.55.0) の競合
- ブラウザキャッシュの共有による実行可能ファイル不一致
- `Executable doesn't exist` エラー

### ✅ 解決策の特徴
1. **環境分離**: 別々のブラウザキャッシュディレクトリを使用
2. **自動修復**: ブラウザが見つからない場合の自動インストール
3. **バージョン独立**: どちらの環境を先に実行しても影響なし
4. **透過的**: 既存のコマンドはそのまま使用可能

## 🔧 初回セットアップ（推奨）

```bash
# プロジェクトルートで実行
./setup-playwright-environments.sh
```

このスクリプトは以下を自動実行します：
- Python/Node.js両方の環境検証
- 分離されたブラウザキャッシュディレクトリの作成
- 各環境でのPlaywrightブラウザインストール
- 動作確認

## 📂 環境分離の仕組み

### ディレクトリ構造
```
~/.cache/
├── playwright-python/    # Python Playwright (1.41.0)
└── playwright-node/      # Node.js Playwright (1.55.0)
```

### 環境設定ファイル
- **e2e/.env.playwright**: Node.js用環境設定
- **scraper/.env.playwright**: Python用環境設定

### 自動ロード機能
- すべてのPlaywrightコマンド実行前に自動で環境設定を読み込み
- 適切なブラウザキャッシュディレクトリを設定

## テストの実行

```bash
# 通常のテスト実行（環境分離・自動修復付き）
npm test

# ヘッドモードでのテスト
npm run test:headed

# UIモードでのテスト
npm run test:ui

# 環境設定の手動ロード
npm run load-env

# ブラウザの手動確認・インストール
npm run ensure-browsers

# 完全セットアップ（環境設定 + ブラウザインストール）
npm run setup-env
```

## 🔧 内部コンポーネント

### scripts/load-env.js
- `.env.playwright`から環境変数を自動読み込み
- `PLAYWRIGHT_BROWSERS_PATH`を設定して環境分離を実現

### scripts/ensure-browsers.js
- 環境設定を読み込んでからブラウザチェック
- 指定されたキャッシュディレクトリでブラウザ存在確認
- 見つからない場合は`--with-deps`で自動インストール

### .env.playwright
- Node.js Playwright専用の環境設定
- `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/playwright-node"`

## 🐍 Python側との連携

### Python実行方法
```bash
# スクレイパーディレクトリで
./run-playwright.sh src/scraper.py

# ブラウザ自動インストール付き
./run-playwright.sh --install-browsers src/scraper.py

# ブラウザタイプ指定
./run-playwright.sh --browser webkit src/scraper.py
```

### 環境独立性の確認
```bash
# Python環境でスクレイピング実行
cd ../scraper
./run-playwright.sh src/scraper.py

# Node.js環境でE2Eテスト実行（影響なし）
cd ../e2e  
npm test
```

## 🚨 トラブルシューティング

### ⚠️ 既知のエラーと自動対処

**エラー**: `Executable doesn't exist at ...chromium_headless_shell-1187/chrome-mac/headless_shell`
**自動対処**: `ensure-browsers.js`が検出して自動インストール

**エラー**: `PLAYWRIGHT_BROWSERS_PATH`設定エラー  
**自動対処**: デフォルトパス（`~/.cache/playwright-node`）にフォールバック

### 🔧 手動修復方法

1. **完全リセット**
   ```bash
   # すべてのPlaywrightキャッシュをクリア
   rm -rf ~/.cache/playwright-*
   rm -rf ~/Library/Caches/ms-playwright
   
   # 再セットアップ
   ./setup-playwright-environments.sh
   ```

2. **個別環境の修復**
   ```bash
   # Node.js環境のみ
   npm run setup-env
   
   # Python環境のみ
   cd ../scraper
   ./run-playwright.sh --install-browsers src/scraper.py
   ```

3. **強制インストール**
   ```bash
   # Node.js
   npx playwright install --with-deps --force
   
   # Python  
   cd ../scraper && source venv/bin/activate
   python -m playwright install webkit --with-deps
   ```

### 🏥 ヘルスチェック

```bash
# 環境分離状況の確認
ls -la ~/.cache/playwright-*

# Node.js Playwright動作確認
npm run load-env && npx playwright --version

# Python Playwright動作確認（scraperディレクトリで）
cd ../scraper && ./run-playwright.sh --help
```