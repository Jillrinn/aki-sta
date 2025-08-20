# 空きスタサーチくん

音楽団体向けのスタジオ予約空き状況一元管理システム

## 🎯 概要
複数のスタジオ・施設の予約空き状況を一画面で確認できるWebアプリケーション。
20人程度の音楽団体が効率的に練習場所を見つけられるよう支援します。

## 📊 開発状況
**MVP v1.0** 進行中（Day 1/4 完了）
- ✅ バックエンドAPI実装
- ⏳ フロントエンド実装
- ⏳ 統合テスト

## 🔧 技術スタック
- **バックエンド**: Azure Functions (Node.js)
- **フロントエンド**: React + TypeScript
- **データベース**: Cosmos DB（v3.0以降）
- **テスト**: Jest + React Testing Library

## 📚 ドキュメント
- [CLAUDE.md](./CLAUDE.md) - 開発作業ガイド
- [統合開発仕様書](./unified_development_spec.md) - 詳細技術仕様

## 🚀 ローカル開発
```bash
# バックエンド起動
cd functions
func start

# テスト実行
cd functions
npm test

# フロントエンド起動（実装後）
cd frontend
npm start
```

## 📝 ライセンス
Private Project

---
*空きスタサーチくん - 練習場所探しをもっと簡単に*