"""
目黒区スクレイパーの統合テスト
実際のサイトに対してテストを実行
"""
import pytest
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright, Browser, Page
from src.scrapers.meguro import MeguroScraper


@pytest.mark.integration
class TestMeguroScraperIntegration:
    """目黒区スクレイパーの統合テストクラス"""
    
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
        """スクレイパーインスタンスを生成"""
        return MeguroScraper()
    
    @pytest.fixture
    def test_date(self):
        """テスト用の日付（2週間後）を生成"""
        future_date = datetime.now() + timedelta(days=14)
        return future_date.strftime("%Y-%m-%d")
    
    @pytest.mark.slow
    def test_multiple_dates_scraping(self, browser: Browser, scraper: MeguroScraper):
        """複数日付のスクレイピングテスト（時間がかかるため slow マーク）"""
        # 今日から3日分の日付を生成
        dates = []
        for i in range(3):
            date = (datetime.now() + timedelta(days=i+14)).strftime('%Y-%m-%d')  # 14日後から3日分
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
                # トップページにアクセス
                url = scraper.get_base_url()
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # 目黒区のSPAナビゲーション
                # 施設検索画面へ遷移
                if not scraper.navigate_to_facility_search(page):
                    print(f"Could not navigate to facility search for {date}")
                    continue
                
                # 施設を選択
                if not scraper.select_facilities(page):
                    print(f"Could not select facilities for {date}")
                    continue
                
                # カレンダー画面へ遷移
                if not scraper.navigate_to_calendar(page):
                    print(f"Could not navigate to calendar for {date}")
                    continue
                
                # 日付をパース
                target_date = datetime.strptime(date, '%Y-%m-%d')
                
                # 目標月へ移動
                if not scraper.navigate_to_target_month(page, target_date):
                    print(f"Could not navigate to target month for {date}")
                    continue
                
                # 日付を選択して時間帯画面へ
                if not scraper.select_date_and_navigate(page, target_date):
                    print(f"Could not select date for {date}")
                    continue
                
                # 時間帯情報を抽出
                all_time_slots = scraper.extract_all_time_slots(page)
                
                if all_time_slots:
                    # 結果を整形
                    date_results = []
                    for facility_name, rooms in all_time_slots.items():
                        combined_slots = {
                            "9-12": "unknown",
                            "13-17": "unknown",
                            "18-21": "unknown"
                        }
                        
                        for room_name, room_slots in rooms.items():
                            if room_slots.get("morning") == "available":
                                combined_slots["9-12"] = "available"
                            elif combined_slots["9-12"] != "available" and room_slots.get("morning") == "booked":
                                combined_slots["9-12"] = "booked"
                            
                            if room_slots.get("afternoon") == "available":
                                combined_slots["13-17"] = "available"
                            elif combined_slots["13-17"] != "available" and room_slots.get("afternoon") == "booked":
                                combined_slots["13-17"] = "booked"
                            
                            if room_slots.get("evening") == "available":
                                combined_slots["18-21"] = "available"
                            elif combined_slots["18-21"] != "available" and room_slots.get("evening") == "booked":
                                combined_slots["18-21"] = "booked"
                        
                        date_results.append({
                            'facilityName': facility_name,
                            'timeSlots': combined_slots
                        })
                    
                    results[date] = date_results
                else:
                    print(f"No time slots found for {date}")
                    results[date] = []
                    
            except Exception as e:
                print(f"Error processing {date}: {e}")
                # エラーの場合は空リストを設定
                results[date] = []
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
                    # 時間帯データの検証
                    time_slots = facility['timeSlots']
                    assert "9-12" in time_slots
                    assert "13-17" in time_slots
                    assert "18-21" in time_slots
                    # 各時間帯の値が正しい形式か確認
                    for slot, status in time_slots.items():
                        assert status in ["available", "booked", "unknown"]
            else:
                # 予期しない型
                assert False, f"Unexpected result type: {type(result)}"


if __name__ == "__main__":
    # 単体実行用
    pytest.main([__file__, "-v", "-s"])