"""
あんさんぶるStudioスクレイパーの統合テスト
実際のWebページにアクセスしてテストを実行
"""
import pytest
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright, Browser, Page
from src.scrapers.ensemble_studio import EnsembleStudioScraper


class TestEnsembleStudioIntegration:
    """実際のWebページを使用した統合テスト"""
    
    @pytest.fixture(scope="class")
    def browser(self):
        """実際のブラウザインスタンスを作成（環境に応じて自動選択）"""
        import os
        import platform
        
        with sync_playwright() as p:
            # 環境変数を優先的にチェック（Docker/Azure環境用）
            platform_override = os.environ.get('PLATFORM_OVERRIDE')
            system = platform_override if platform_override else platform.system()
            
            # Azure Web Appやコンテナ環境を明示的に判定
            is_container = os.environ.get('CONTAINER_ENV') == 'true'
            is_azure = os.environ.get('WEBSITE_INSTANCE_ID') is not None
            
            if is_azure or is_container or system == "Linux":
                # Azure/Docker/Linuxでは必ずChromiumを使用
                print("Using Chromium browser for testing (Docker/Linux environment)")
                browser = p.chromium.launch(headless=True)
            elif system == "Darwin":  # macOS
                # macOSではWebKitを使用（GPUクラッシュ回避）
                print("Using WebKit browser for testing (macOS environment)")
                browser = p.webkit.launch(headless=True)
            else:  # Windows/その他
                # その他の環境ではChromiumが安定
                print(f"Using Chromium browser for testing ({system} environment)")
                browser = p.chromium.launch(headless=True)
            
            yield browser
            browser.close()
    
    @pytest.fixture
    def page(self, browser: Browser):
        """新しいページを作成"""
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = context.new_page()
        yield page
        context.close()
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを作成"""
        return EnsembleStudioScraper()
    
    @pytest.fixture
    def test_date(self):
        """テスト用の未来日付（3ヶ月後）"""
        future_date = datetime.now() + timedelta(days=90)
        return future_date.strftime('%Y-%m-%d')
    
    @pytest.fixture
    def test_date_parts(self, test_date):
        """テスト日付を年、月、日に分解"""
        date_obj = datetime.strptime(test_date, '%Y-%m-%d')
        return {
            'year': date_obj.year,
            'month': date_obj.month,
            'day': date_obj.day,
            'year_month': f"{date_obj.year}年{date_obj.month}月"
        }

    @pytest.mark.slow
    def test_multiple_dates_scraping(self, browser: Browser, scraper: EnsembleStudioScraper):
        """複数日付のスクレイピングテスト（時間がかかるため slow マーク）"""
        # 今日から3日分の日付を生成
        dates = []
        for i in range(3):
            date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
            dates.append(date)
        
        results = {}
        
        # 統合テストでは各日付で新しいコンテキストを使用
        for date in dates:
            print(f"Scraping {date}...")
            
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = context.new_page()
            
            try:
                # ページアクセス
                url = scraper.get_base_url()
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # カレンダーを検出
                calendars = scraper.find_studio_calendars(page)
                
                # 日付をパース
                target_date = datetime.strptime(date, '%Y-%m-%d')
                target_day = target_date.day
                
                date_results = []
                for studio_name, calendar in calendars:
                    # 月へナビゲート（今月の場合はスキップ）
                    current_month = datetime.now().strftime('%Y年%m月')
                    target_month = target_date.strftime('%Y年%m月')
                    
                    if current_month != target_month:
                        if not scraper.navigate_to_month(page, calendar, target_date):
                            print(f"Could not navigate to {target_month} for {studio_name}")
                            continue
                        
                        # カレンダーを再取得
                        page.wait_for_timeout(1000)
                        calendars_after = scraper.find_studio_calendars(page)
                        for name, cal in calendars_after:
                            if name == studio_name:
                                calendar = cal
                                break
                    
                    # 日付セルを探す
                    date_cell = scraper.find_date_cell(calendar, target_day)
                    if date_cell:
                        # 時間帯情報を抽出
                        time_slots = scraper.extract_time_slots(date_cell)
                        date_results.append({
                            'facilityName': studio_name,
                            'timeSlots': time_slots
                        })
                
                results[date] = date_results
            finally:
                context.close()
            
            # レート制限対策
            import time
            time.sleep(2)
        
        # 各結果が適切な形式であることを確認
        for date, result in results.items():
            # 結果はリストまたは辞書（エラー時）
            if isinstance(result, list):
                print(f"{date}: {len(result)} facilities found")
                # リストの場合は各施設のデータを確認
                for facility in result:
                    assert 'facilityName' in facility
                    assert 'timeSlots' in facility
            elif isinstance(result, dict):
                # エラーレスポンスの場合
                assert 'status' in result
                print(f"{date}: status={result['status']}")
            else:
                # 予期しない型
                assert False, f"Unexpected result type: {type(result)}"


if __name__ == "__main__":
    # 単体実行用
    pytest.main([__file__, "-v", "-s"])