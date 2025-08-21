"""
スクレイパーのメインエントリーポイント
"""
import argparse
import sys
from datetime import datetime
from pathlib import Path

# srcディレクトリをパスに追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.scraper import EnsembleStudioScraper


def main():
    """メイン処理"""
    # コマンドライン引数の処理
    parser = argparse.ArgumentParser(
        description='あんさんぶるスタジオの予約状況をスクレイピング'
    )
    parser.add_argument(
        '--date',
        type=str,
        default=datetime.now().strftime("%Y-%m-%d"),
        help='スクレイピング対象日付 (YYYY-MM-DD形式)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='出力ファイルパス（省略時は../shared-data/availability.json）'
    )
    
    args = parser.parse_args()
    
    # 日付フォーマットの検証
    try:
        datetime.strptime(args.date, "%Y-%m-%d")
    except ValueError:
        print(f"エラー: 日付は YYYY-MM-DD 形式で指定してください: {args.date}")
        sys.exit(1)
    
    print(f"スクレイピング開始: {args.date}")
    
    # スクレイピング実行
    scraper = EnsembleStudioScraper()
    
    try:
        result = scraper.scrape_and_save(args.date, args.output)
        
        # 結果を表示
        if args.date in result.get("data", {}):
            facilities = result["data"][args.date]
            print(f"\n取得したデータ ({args.date}):")
            for facility in facilities:
                print(f"\n{facility['facilityName']}:")
                for time_slot, status in facility['timeSlots'].items():
                    status_symbol = "○" if status == "available" else "×" if status == "booked" else "?"
                    print(f"  {time_slot}: {status_symbol} ({status})")
        
        print(f"\n保存先: {args.output or '../shared-data/availability.json'}")
        print("スクレイピング完了")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()