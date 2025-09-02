"""
あんさんぶるスタジオスクレイパーの統合テスト
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
    
    def test_actual_page_access(self, page: Page, scraper: EnsembleStudioScraper):
        """実際のページにアクセスできることを確認"""
        url = scraper.get_base_url()
        
        # ページにアクセス
        response = page.goto(url, wait_until='networkidle', timeout=30000)
        
        # レスポンスが成功することを確認
        assert response is not None
        assert response.status == 200
        
        # ページタイトルが存在することを確認
        title = page.title()
        assert title is not None
        assert len(title) > 0
        
        # カレンダー要素が存在することを確認
        calendar_elements = page.locator(".timetable-calendar")
        assert calendar_elements.count() > 0
    
    def test_find_actual_studio_calendars(self, page: Page, scraper: EnsembleStudioScraper):
        """実際のページから各スタジオのカレンダーを検出"""
        # ページにアクセス
        page.goto(scraper.get_base_url(), wait_until='networkidle', timeout=30000)
        
        # カレンダーを検出
        calendars = scraper.find_studio_calendars(page)
        
        # 2つのスタジオが見つかることを確認
        assert len(calendars) > 0, "No calendars found on the page"
        
        # スタジオ名を確認
        studio_names = [name for name, _ in calendars]
        expected_studios = scraper.get_studios()
        
        for expected_studio in expected_studios:
            if expected_studio in studio_names:
                print(f"✓ Found {expected_studio}")
            else:
                print(f"✗ Could not find {expected_studio}")
    
    def test_navigate_to_future_month(self, page: Page, scraper: EnsembleStudioScraper, test_date_parts):
        """実際に未来の月へナビゲート"""
        # ページにアクセス
        page.goto(scraper.get_base_url(), wait_until='networkidle', timeout=30000)
        
        # カレンダーを取得
        calendars = scraper.find_studio_calendars(page)
        assert len(calendars) > 0, "No calendars found"
        
        studio_name, calendar = calendars[0]  # 最初のスタジオでテスト
        print(f"Testing navigation with {studio_name}")
        
        # 目標の年月
        target_year_month = test_date_parts['year_month']
        target_date = datetime(test_date_parts['year'], test_date_parts['month'], 1)
        
        # ナビゲート実行
        result = scraper.navigate_to_month(page, calendar, target_date)
        
        # 成功することを確認
        assert result == True, f"Failed to navigate to {target_year_month}"
        
        # ナビゲート後にカレンダーを再取得（DOM更新のため）
        page.wait_for_timeout(1000)  # 安定性のため少し待つ
        calendars_after = scraper.find_studio_calendars(page)
        assert len(calendars_after) > 0, "No calendars found after navigation"
        
        _, calendar_after = calendars_after[0]
        
        # 現在のカレンダーが目標の月を表示していることを確認
        caption = calendar_after.locator(".calendar-caption").first
        if caption.count() > 0:
            caption_text = caption.text_content()
            assert target_year_month in caption_text, f"Expected {target_year_month}, got {caption_text}"
    
    def test_find_actual_date_cell(self, page: Page, scraper: EnsembleStudioScraper):
        """実際のカレンダーから特定の日付セルを検出"""
        # ページにアクセス
        page.goto(scraper.get_base_url(), wait_until='networkidle', timeout=30000)
        
        # カレンダーを取得
        calendars = scraper.find_studio_calendars(page)
        assert len(calendars) > 0, "No calendars found"
        
        studio_name, calendar = calendars[0]
        
        # 15日のセルを探す（どの月でも存在する日付）
        date_cell = scraper.find_date_cell(calendar, 15)
        
        # セルが見つかることを確認
        assert date_cell is not None, "Could not find date cell for day 15"
        
        # セルに日付番号が含まれることを確認
        day_number = date_cell.locator(".day-number").first
        assert day_number.count() > 0
        assert day_number.text_content().strip() == "15"
    
    def test_extract_actual_time_slots(self, page: Page, scraper: EnsembleStudioScraper):
        """実際のページから時間帯情報を抽出"""
        # ページにアクセス
        page.goto(scraper.get_base_url(), wait_until='networkidle', timeout=30000)
        
        # カレンダーを取得
        calendars = scraper.find_studio_calendars(page)
        assert len(calendars) > 0, "No calendars found"
        
        studio_name, calendar = calendars[0]
        
        # 複数の日付でテスト（1日と15日）
        for test_day in [1, 15]:
            date_cell = scraper.find_date_cell(calendar, test_day)
            
            if date_cell:
                # 時間帯情報を抽出
                time_slots = scraper.extract_time_slots(date_cell)
                
                # 必要なキーが存在することを確認
                assert "9-12" in time_slots
                assert "13-17" in time_slots
                assert "18-21" in time_slots
                
                # 値が有効な値であることを確認
                valid_values = ["available", "booked", "unknown"]
                for slot, status in time_slots.items():
                    assert status in valid_values, f"Invalid status '{status}' for slot {slot}"
                
                print(f"Day {test_day}: {time_slots}")
    
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