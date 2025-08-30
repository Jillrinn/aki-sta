#!/usr/bin/env python3
"""
GitHub Actions用のテスト日付取得スクリプト
TargetDateProviderを使用して動的に日付を取得し、
GitHub Actions で使用可能な形式で出力する
"""
import sys
import os

# scraperモジュールのパスを追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.date_provider import TargetDateProvider

def get_test_date():
    """
    GitHub Actions で使用するテスト日付を取得
    
    Returns:
        str: YYYY-MM-DD形式の日付文字列
    """
    dates = TargetDateProvider.get_target_dates()
    
    # 最初の日付を使用（通常は1週間後の日付）
    if dates:
        return dates[0]
    
    # フォールバック：デフォルト日付を直接取得
    default_dates = TargetDateProvider._get_default_dates()
    return default_dates[0] if default_dates else None

def main():
    """
    メインエントリーポイント
    GitHub Actionsで使用する形式で日付を出力
    """
    test_date = get_test_date()
    
    if test_date:
        # GitHub Actions の set-output 形式で出力
        print(test_date)
        sys.exit(0)
    else:
        print("Error: Could not get test date", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()