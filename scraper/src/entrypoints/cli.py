"""
スクレイパーのメインエントリーポイント
"""
import argparse
import sys
import os
from datetime import datetime, date
from pathlib import Path
from dotenv import load_dotenv

# root .envファイルを読み込み（COSMOS設定）
root_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(root_env_path)

# playwright環境設定ファイルを読み込み
playwright_env_path = Path(__file__).parent.parent / '.env.playwright'
load_dotenv(playwright_env_path)

# scraperディレクトリをパスに追加（srcの親ディレクトリ）
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.scrapers.ensemble_studio import EnsembleStudioScraper
from src.scrapers.meguro import MeguroScraper
from src.scrapers.shibuya import ShibuyaScraper


def main():
    """メイン処理"""
    # コマンドライン引数の処理
    parser = argparse.ArgumentParser(
        description='施設の予約状況をスクレイピング'
    )
    parser.add_argument(
        '--date',
        type=str,
        default=datetime.now().strftime("%Y-%m-%d"),
        help='スクレイピング対象日付 (YYYY-MM-DD または YYYY/MM/DD 形式)'
    )
    parser.add_argument(
        '--dates',
        type=str,
        nargs='+',
        help='複数日付を指定 (YYYY-MM-DD または YYYY/MM/DD 形式)。例: --dates 2025-09-20 2025-09-21'
    )
    parser.add_argument(
        '--facility',
        type=str,
        default='ensemble',
        choices=['ensemble', 'meguro', 'shibuya'],
        help='スクレイピング対象施設 (ensemble: あんさんぶるStudio, meguro: 目黒区施設, shibuya: 渋谷区施設)'
    )
    
    args = parser.parse_args()
    
    # 複数日付モードか単一日付モードかを判定
    if args.dates:
        # 複数日付モード
        dates_to_process = []
        today = date.today()
        
        for date_str in args.dates:
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
            
            # 過去日付チェック
            if parsed_date.date() < today:
                print(f"警告: 過去の日付はスキップされます: {date_str}")
                continue
            
            dates_to_process.append(parsed_date.strftime("%Y-%m-%d"))
        
        if not dates_to_process:
            print("エラー: 有効な日付が指定されていません。")
            sys.exit(1)
        
        print(f"スクレイピング開始 (複数日付モード): {', '.join(dates_to_process)}")
        
    else:
        # 単一日付モード（既存の処理）
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
        
        # 過去日付チェック
        today = date.today()
        if parsed_date.date() < today:
            print(f"エラー: 過去の日付は指定できません。")
            print(f"指定された日付: {normalized_date}")
            print(f"今日の日付: {today.strftime('%Y-%m-%d')}")
            sys.exit(1)
        
        print(f"スクレイピング開始: {normalized_date}")
    
    # 施設に応じたスクレイパーを選択
    if args.facility == 'meguro':
        print("対象施設: 目黒区施設")
        scraper = MeguroScraper()
    elif args.facility == 'shibuya':
        print("対象施設: 渋谷区施設")
        scraper = ShibuyaScraper()
    else:
        print("対象施設: あんさんぶるStudio")
        scraper = EnsembleStudioScraper()
    
    try:
        if args.dates:
            # 複数日付モード: scrape_multiple_datesを使用
            result = scraper.scrape_multiple_dates(dates_to_process)
            
            # 結果を表示
            if result.get("status") == "success":
                data = result.get("data", {})
                print(f"\n取得したデータ (複数日付):")
                
                for date_str in dates_to_process:
                    if date_str in data:
                        facilities = data[date_str]
                        print(f"\n=== {date_str} ===")
                        for facility in facilities:
                            room_name = facility.get('roomName', '')
                            if room_name:
                                print(f"\n{facility['facilityName']} - {room_name}:")
                            else:
                                print(f"\n{facility['facilityName']}:")
                            for time_slot, status in facility['timeSlots'].items():
                                status_symbol = "○" if status == "available" else "×" if status == "booked" else "?"
                                print(f"  {time_slot}: {status_symbol} ({status})")
                    else:
                        print(f"\n=== {date_str} ===")
                        print("  データ取得失敗またはデータなし")
            else:
                print(f"エラー: {result.get('message', '不明なエラー')}")
                
        else:
            # 単一日付モード（既存の処理）
            result = scraper.scrape_and_save(normalized_date)
            
            # 結果を表示
            if normalized_date in result.get("data", {}):
                facilities = result["data"][normalized_date]
                print(f"\n取得したデータ ({normalized_date}):")
                for facility in facilities:
                    room_name = facility.get('roomName', '')
                    if room_name:
                        print(f"\n{facility['facilityName']} - {room_name}:")
                    else:
                        print(f"\n{facility['facilityName']}:")
                    for time_slot, status in facility['timeSlots'].items():
                        status_symbol = "○" if status == "available" else "×" if status == "booked" else "?"
                        print(f"  {time_slot}: {status_symbol} ({status})")
        
        # Cosmos DB保存のため、出力パス表示は削除（scraper.py内でログ出力済み）
        print("\nスクレイピング完了")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()