"""
スクレイピングビジネスロジックサービス
"""
from datetime import datetime
from typing import Dict, List, Optional, Type
from ..scrapers.base import BaseScraper
from ..scrapers.ensemble_studio import EnsembleStudioScraper
from ..scrapers.meguro import MeguroScraper
from ..repositories.cosmos_repository import CosmosWriter
from .target_date_service import TargetDateService


class ScrapeService:
    """スクレイピングのビジネスロジックを管理"""
    
    # 施設名とスクレイパークラスのマッピング
    SCRAPERS = {
        'ensemble': EnsembleStudioScraper,
        'ensemble_studio': EnsembleStudioScraper,
        'あんさんぶるStudio': EnsembleStudioScraper,
        'meguro': MeguroScraper,
        '目黒区': MeguroScraper,
        '目黒': MeguroScraper,
    }
    
    def __init__(
        self,
        cosmos_writer: Optional[CosmosWriter] = None,
        target_date_service: Optional[TargetDateService] = None
    ):
        """
        初期化
        
        Args:
            cosmos_writer: CosmosWriterインスタンス（DIパターン）
            target_date_service: TargetDateServiceインスタンス（DIパターン）
        """
        self.cosmos_writer = cosmos_writer or CosmosWriter()
        self.target_date_service = target_date_service or TargetDateService()
    
    def scrape_facility(
        self,
        facility_name: str,
        date: Optional[str] = None
    ) -> Dict:
        """
        特定施設の予約状況をスクレイピング
        
        Args:
            facility_name: 施設名またはキー
            date: YYYY-MM-DD形式の日付（省略時はtarget_dateを使用）
        
        Returns:
            結果を含む辞書
        """
        # スクレイパークラスを取得
        scraper_class = self._get_scraper_class(facility_name)
        if not scraper_class:
            return {
                'status': 'error',
                'message': f'Unknown facility: {facility_name}',
                'error_type': 'INVALID_FACILITY'
            }
        
        # 日付を決定
        target_date = self.target_date_service.get_single_date_to_scrape(date)
        
        # スクレイピング実行
        try:
            print(f"\n[ScrapeService] Starting {facility_name} scraping for date: {target_date}")
            scraper = scraper_class()
            result = scraper.scrape_and_save(target_date)
            
            # 結果にfacility情報を追加
            if result.get('status') == 'success':
                result['facility'] = facility_name
                result['date'] = target_date
            
            return result
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Scraping failed for {facility_name}',
                'error_type': 'SCRAPING_ERROR',
                'details': str(e)
            }
    
    def scrape_all_facilities(
        self,
        dates: Optional[List[str]] = None
    ) -> Dict:
        """
        全施設の予約状況をスクレイピング
        
        Args:
            dates: YYYY-MM-DD形式の日付リスト（省略時はtarget_datesを使用）
        
        Returns:
            結果を含む辞書
        """
        # 日付リストを決定
        target_dates = self.target_date_service.get_dates_to_scrape(dates)
        
        results = []
        success_count = 0
        error_count = 0
        
        # 各日付・各施設でスクレイピング
        for date in target_dates:
            date_results = {
                'date': date,
                'facilities': []
            }
            
            for facility_key in self.SCRAPERS.keys():
                # ensemble系は重複するので最初の1つだけ実行
                if facility_key in ['ensemble_studio', 'あんさんぶるStudio']:
                    continue
                
                result = self.scrape_facility(facility_key, date)
                
                if result.get('status') == 'success':
                    success_count += 1
                    # 成功時のデータ整形
                    if date in result.get('data', {}):
                        date_results['facilities'].extend(result['data'][date])
                else:
                    error_count += 1
                    date_results['facilities'].append({
                        'facility': facility_key,
                        'status': 'error',
                        'error': result.get('message', 'Unknown error')
                    })
            
            results.append(date_results)
        
        return {
            'status': 'success' if error_count == 0 else 'partial',
            'total_dates': len(target_dates),
            'total_facilities': len(self.SCRAPERS),
            'success_count': success_count,
            'error_count': error_count,
            'results': results
        }
    
    def scrape_with_dates(
        self,
        dates: List[str],
        facility: Optional[str] = None
    ) -> Dict:
        """
        指定された日付リストでスクレイピング
        
        Args:
            dates: YYYY-MM-DD形式の日付リスト
            facility: 施設名（省略時は全施設）
        
        Returns:
            結果を含む辞書
        """
        if facility:
            # 特定施設の複数日付スクレイピング
            results = []
            for date in dates:
                result = self.scrape_facility(facility, date)
                results.append(result)
            
            success_count = sum(1 for r in results if r.get('status') == 'success')
            error_count = len(results) - success_count
            
            return {
                'status': 'success' if error_count == 0 else 'partial',
                'facility': facility,
                'total_dates': len(dates),
                'success_count': success_count,
                'error_count': error_count,
                'results': results
            }
        else:
            # 全施設の複数日付スクレイピング
            return self.scrape_all_facilities(dates)
    
    def _get_scraper_class(self, facility_name: str) -> Optional[Type[BaseScraper]]:
        """
        施設名から対応するスクレイパークラスを取得
        
        Args:
            facility_name: 施設名またはキー
        
        Returns:
            スクレイパークラスまたはNone
        """
        # 小文字に変換して検索
        facility_lower = facility_name.lower()
        
        for key, scraper_class in self.SCRAPERS.items():
            if key.lower() == facility_lower:
                return scraper_class
        
        # 部分一致でも検索
        for key, scraper_class in self.SCRAPERS.items():
            if key.lower() in facility_lower or facility_lower in key.lower():
                return scraper_class
        
        return None
    
    def get_available_facilities(self) -> List[str]:
        """
        利用可能な施設名のリストを取得
        
        Returns:
            施設名のリスト
        """
        # 重複を除いた施設名リスト
        return list(set([
            'ensemble'  # 現在はあんさんぶるStudioのみ
        ]))