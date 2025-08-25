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
        help='スクレイピング対象日付 (YYYY-MM-DD または YYYY/MM/DD 形式)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='出力ファイルパス（省略時は../../shared-data/availability.json）'
    )
    
    args = parser.parse_args()
    
    # 日付フォーマットの検証と正規化
    date_str = args.date
    parsed_date = None
    
    # YYYY/MM/DD または YYYY-MM-DD 形式をサポート
    for fmt in ["%Y/%m/%d", "%Y-%m-%d"]:
        try:
            parsed_date = datetime.strptime(date_str, fmt)
            break
        except ValueError:
            continue
    
    if parsed_date is None:
        print(f"エラー: 日付は YYYY-MM-DD または YYYY/MM/DD 形式で指定してください: {date_str}")
        sys.exit(1)
    
    # 正規化された日付文字列 (YYYY-MM-DD形式)
    normalized_date = parsed_date.strftime("%Y-%m-%d")
    
    print(f"スクレイピング開始: {normalized_date}")
    
    # スクレイピング実行
    scraper = EnsembleStudioScraper()
    
    try:
        result = scraper.scrape_and_save(normalized_date, args.output)
        
        # 結果を表示
        if normalized_date in result.get("data", {}):
            facilities = result["data"][normalized_date]
            print(f"\n取得したデータ ({normalized_date}):")
            for facility in facilities:
                print(f"\n{facility['facilityName']}:")
                for time_slot, status in facility['timeSlots'].items():
                    status_symbol = "○" if status == "available" else "×" if status == "booked" else "?"
                    print(f"  {time_slot}: {status_symbol} ({status})")
        
        print(f"\n保存先: {args.output or '../../shared-data/availability.json'}")
        print("スクレイピング完了")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()