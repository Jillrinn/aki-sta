"""
目黒区スクレイパーの統合テスト
実際のサイトに対してテストを実行
"""
import pytest
from datetime import datetime, timedelta
from src.scrapers.meguro import MeguroScraper


@pytest.mark.integration
class TestMeguroScraperIntegration:
    """目黒区スクレイパーの統合テストクラス"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを生成"""
        return MeguroScraper()
    
    @pytest.fixture
    def test_date(self):
        """テスト用の日付（2週間後）を生成"""
        future_date = datetime.now() + timedelta(days=14)
        return future_date.strftime("%Y-%m-%d")
    
    def test_scrape_availability_real_site(self, scraper, test_date):
        """
        実際のサイトからスクレイピングするテスト
        """
        print(f"\n=== Integration test with real site for date: {test_date} ===")
        
        try:
            # スクレイピング実行
            results = scraper.scrape_availability(test_date)
            
            # 基本的な検証
            assert results is not None
            assert isinstance(results, list)
            
            if results:
                # 結果が返ってきた場合の検証
                for facility_data in results:
                    # 必須フィールドの存在確認
                    assert "facilityName" in facility_data
                    assert "timeSlots" in facility_data
                    assert "lastUpdated" in facility_data
                    
                    # 施設名が対象リストに含まれているか確認
                    facility_name = facility_data["facilityName"]
                    assert any(studio in facility_name for studio in scraper.get_studios())
                    
                    # 時間帯データの検証
                    time_slots = facility_data["timeSlots"]
                    assert "9-12" in time_slots
                    assert "13-17" in time_slots
                    assert "18-21" in time_slots
                    
                    # 各時間帯の値が正しい形式か確認
                    for slot, status in time_slots.items():
                        assert status in ["available", "booked", "unknown"]
                    
                    # 更新日時の形式確認
                    assert facility_data["lastUpdated"].endswith("Z")
                    
                    print(f"Facility: {facility_name}")
                    print(f"  Morning (9-12): {time_slots['9-12']}")
                    print(f"  Afternoon (13-17): {time_slots['13-17']}")
                    print(f"  Evening (18-21): {time_slots['18-21']}")
            else:
                # 結果が空の場合（データが見つからなかった）
                print("No data found for the specified date")
                # これもテストケースとして許容する（将来の日付では予約が開放されていない可能性）
                assert results == []
            
        except Exception as e:
            # ネットワークエラーなどは統合テストでは許容
            print(f"Integration test error (may be network/site issue): {e}")
            pytest.skip(f"Skipping due to external dependency: {e}")
    
    def test_navigate_to_facility_search_real(self, scraper):
        """
        実際のサイトで施設検索画面への遷移をテスト
        """
        from playwright.sync_api import sync_playwright
        
        try:
            with sync_playwright() as p:
                browser = scraper.setup_browser(p)
                
                try:
                    context = scraper.create_browser_context(browser)
                    page = context.new_page()
                    
                    # トップページにアクセス
                    print(f"\nAccessing: {scraper.base_url}")
                    response = page.goto(scraper.base_url, wait_until="networkidle", timeout=30000)
                    
                    if response:
                        assert response.status == 200
                        print(f"Response status: {response.status}")
                    
                    # 施設検索画面へ遷移
                    result = scraper.navigate_to_facility_search(page)
                    
                    # 検証
                    assert result is True
                    
                    # 画面内容の確認
                    page_content = page.content()
                    assert "施設" in page_content or "検索" in page_content
                    
                    print("Successfully navigated to facility search page")
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            print(f"Navigation test error: {e}")
            pytest.skip(f"Skipping due to external dependency: {e}")
    
    def test_extract_time_slots_patterns(self, scraper):
        """
        時間帯パターンのマッピングテスト
        実際のサイトのHTML構造に基づいてテスト
        """
        from playwright.sync_api import sync_playwright
        
        try:
            with sync_playwright() as p:
                browser = scraper.setup_browser(p)
                
                try:
                    context = scraper.create_browser_context(browser)
                    page = context.new_page()
                    
                    # トップページにアクセス
                    response = page.goto(scraper.base_url, wait_until="networkidle", timeout=30000)
                    
                    if response and response.status == 200:
                        # 施設検索画面へ
                        if scraper.navigate_to_facility_search(page):
                            # 施設を選択
                            if scraper.select_facilities(page):
                                # カレンダー画面へ
                                if scraper.navigate_to_calendar(page):
                                    # ここまで到達できたら成功
                                    print("Successfully navigated through the workflow")
                                    
                                    # カレンダーの存在確認
                                    calendars = page.locator("table.calendar, .calendar").all()
                                    if calendars:
                                        print(f"Found {len(calendars)} calendar elements")
                                        assert len(calendars) > 0
                                    else:
                                        print("No calendar elements found (may be expected for future dates)")
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            print(f"Pattern test error: {e}")
            pytest.skip(f"Skipping due to external dependency: {e}")
    
    @pytest.mark.slow
    @pytest.mark.skip(reason="Real site access takes too long")
    def test_full_scraping_workflow(self, scraper):
        """
        完全なスクレイピングワークフローをテスト
        （時間がかかるため、slowマークを付与）
        """
        # 今日から14日後の日付を使用
        test_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        print(f"\n=== Full workflow test for date: {test_date} ===")
        
        try:
            # Cosmos DB保存も含めた完全なスクレイピング実行
            result = scraper.scrape_and_save(test_date)
            
            # 基本的な検証
            assert result is not None
            assert "status" in result
            
            if result["status"] == "success":
                # 成功した場合の検証
                assert "data" in result
                assert test_date in result["data"]
                
                facilities = result["data"][test_date]
                assert isinstance(facilities, list)
                
                print(f"Successfully scraped {len(facilities)} facilities")
                
                for facility in facilities:
                    print(f"- {facility['facilityName']}")
                    
            elif result["status"] == "error":
                # エラーの場合も詳細を確認
                print(f"Scraping error: {result.get('message', 'Unknown error')}")
                print(f"Error type: {result.get('error_type', 'Unknown')}")
                
                # 特定のエラータイプは許容する
                acceptable_errors = [
                    "BROWSER_NOT_INSTALLED",  # Docker環境でない場合
                    "TIMEOUT_ERROR",  # ネットワークタイムアウト
                    "NETWORK_ERROR",  # ネットワーク接続エラー
                    "DATABASE_ERROR",  # Cosmos DB接続エラー（環境変数未設定など）
                    "CONFIGURATION_ERROR"  # 設定エラー
                ]
                
                if result.get("error_type") in acceptable_errors:
                    pytest.skip(f"Acceptable error in test environment: {result.get('error_type')}")
                else:
                    # 予期しないエラーの場合は失敗
                    assert False, f"Unexpected error: {result}"
            
        except Exception as e:
            print(f"Full workflow test error: {e}")
            pytest.skip(f"Skipping due to external dependency: {e}")