#!/usr/bin/env python
"""
Scraper runner for Azure Container Instances execution
Production deployment entry point
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Add scraper directory to path (parent of src)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.scrapers.ensemble_studio import EnsembleStudioScraper

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ContainerScraperRunner:
    """コンテナ環境用スクレイパー実行管理クラス"""
    
    def __init__(self):
        """初期化"""
        self.scraper = EnsembleStudioScraper()
        
    def get_target_dates(self) -> List[str]:
        """スクレイピング対象日付の取得"""
        # 環境変数から取得、または2-3ヶ月先までのデフォルト設定
        target_dates_env = os.getenv('TARGET_DATES', '')
        
        if target_dates_env:
            # カンマ区切りで指定された日付を使用
            dates = [date.strip() for date in target_dates_env.split(',') if date.strip()]
            logger.info(f"Using dates from environment: {dates}")
            return dates
        else:
            # デフォルト: 今日から90日先までの土日
            dates = []
            start_date = datetime.now()
            end_date = start_date + timedelta(days=90)
            
            current = start_date
            while current <= end_date:
                # 土曜日(5)または日曜日(6)の場合
                if current.weekday() in [5, 6]:
                    dates.append(current.strftime('%Y-%m-%d'))
                current += timedelta(days=1)
            
            # 最大20日分に制限
            limited_dates = dates[:20]
            logger.info(f"Using default weekend dates: {limited_dates}")
            return limited_dates
    
    def run(self) -> Dict[str, Any]:
        """スクレイピング実行"""
        try:
            logger.info("=== Starting container scraper execution ===")
            
            # 対象日付の取得
            target_dates = self.get_target_dates()
            
            if not target_dates:
                logger.warning("No target dates found")
                return {
                    "status": "success",
                    "timestamp": datetime.now().isoformat(),
                    "message": "No target dates to process"
                }
            
            logger.info(f"Processing {len(target_dates)} dates")
            
            # 結果格納用
            all_results = []
            success_count = 0
            error_count = 0
            error_details = []
            
            # 各日付でスクレイピング実行
            for date in target_dates:
                try:
                    logger.info(f"Scraping data for {date}")
                    
                    # scrape_and_save メソッドを使用（既存のロジックを活用）
                    result = self.scraper.scrape_and_save(date)
                    
                    if result and result.get('status') == 'success':
                        # 成功した場合
                        data = result.get('data', {}).get(date, [])
                        all_results.extend(data)
                        success_count += 1
                        logger.info(f"Successfully scraped {len(data)} facilities for {date}")
                    else:
                        # エラーの場合
                        error_msg = result.get('message', 'Unknown error')
                        logger.warning(f"Failed to scrape {date}: {error_msg}")
                        error_count += 1
                        error_details.append({
                            "date": date,
                            "error": error_msg
                        })
                        
                except Exception as e:
                    logger.error(f"Exception while scraping {date}: {str(e)}")
                    error_count += 1
                    error_details.append({
                        "date": date,
                        "error": str(e)
                    })
            
            # 実行結果サマリ
            status = "success" if error_count == 0 else "partial" if success_count > 0 else "error"
            
            summary = {
                "status": status,
                "timestamp": datetime.now().isoformat(),
                "total_dates": len(target_dates),
                "success_count": success_count,
                "error_count": error_count,
                "scraped_data_count": len(all_results),
                "processed_dates": target_dates
            }
            
            if error_details:
                summary["errors"] = error_details
            
            logger.info(f"=== Scraping completed ===")
            logger.info(f"Status: {status}")
            logger.info(f"Success: {success_count}/{len(target_dates)}")
            logger.info(f"Total data scraped: {len(all_results)} facility records")
            
            return summary
            
        except Exception as e:
            logger.error(f"Fatal error during scraping: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }


def main():
    """メイン実行関数"""
    logger.info("=== Container Scraper Starting ===")
    
    # 環境変数の確認
    required_env_vars = ['COSMOS_ENDPOINT', 'COSMOS_KEY', 'COSMOS_DATABASE']
    missing_vars = []
    
    for var in required_env_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            # 値の一部をマスクしてログ出力
            masked_value = value[:10] + "..." if len(value) > 10 else "***"
            logger.info(f"Environment {var}: {masked_value}")
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        logger.error("Please set the following environment variables:")
        for var in missing_vars:
            logger.error(f"  - {var}")
        sys.exit(1)
    
    # スクレイパー実行
    runner = ContainerScraperRunner()
    result = runner.run()
    
    # 結果を標準出力に出力（Azure Container Instancesのログ用）
    print("\n" + "="*60)
    print("EXECUTION RESULT:")
    print("="*60)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("="*60 + "\n")
    
    # 終了ステータスを決定
    exit_code = 0
    if result['status'] == 'error':
        exit_code = 1
    elif result['status'] == 'partial':
        exit_code = 2
    
    logger.info(f"Exiting with code: {exit_code}")
    sys.exit(exit_code)


if __name__ == '__main__':
    main()