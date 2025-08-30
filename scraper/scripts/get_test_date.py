#!/usr/bin/env python3
from datetime import datetime, timedelta

def get_test_date():
    """GitHub Actions用のテスト日付を生成する（3か月先の日付）"""
    future_date = datetime.now() + timedelta(days=90)
    return future_date.strftime('%Y-%m-%d')

if __name__ == "__main__":
    print(get_test_date())