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
        '--facility',
        type=str,
        default='ensemble',
        choices=['ensemble', 'meguro'],
        help='スクレイピング対象施設 (ensemble: あんさんぶるスタジオ, meguro: 目黒区施設)'
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
    else:
        print("対象施設: あんさんぶるスタジオ")
        scraper = EnsembleStudioScraper()
    
    try:
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