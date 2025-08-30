"""
動的な日付を使った型チェックテスト
実際のスクレイピング結果の値は問わず、型と構造が正しいことを確認
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from src.scraper import EnsembleStudioScraper
from src.date_provider import TargetDateProvider


class TestDynamicDateScraping:
    """動的な日付でのスクレイピングテスト"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを作成"""
        return EnsembleStudioScraper()
    
    @pytest.fixture
    def dynamic_date(self):
        """ターゲット日付を取得（将来的な拡張に対応）"""
        # TargetDateProviderを使用して日付を取得
        dates = TargetDateProvider.get_target_dates()
        return dates[0] if dates else (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    @patch('src.scraper.sync_playwright')
    def test_scrape_with_dynamic_date(self, mock_playwright, scraper, dynamic_date):
        """動的な日付でのスクレイピング（モック使用）"""
        # モックのセットアップ
        mock_page = Mock()
        mock_page.content.return_value = f"""
        <html>
            <div class="calendar">
                <div class="year-month">2025年8月</div>
                <div class="studio">あんさんぶるStudio和(本郷)</div>
                <div class="date">{dynamic_date.split('-')[-1]}</div>
                <div class="time">09:00</div><div class="status">○</div>
                <div class="time">13:00</div><div class="status">×</div>
                <div class="time">18:00</div><div class="status">○</div>
                <div class="studio">あんさんぶるStudio音(初台)</div>
                <div class="date">{dynamic_date.split('-')[-1]}</div>
                <div class="time">09:00</div><div class="status">×</div>
                <div class="time">13:00</div><div class="status">○</div>
                <div class="time">18:00</div><div class="status">×</div>
            </div>
        </html>
        """
        
        # locatorモックを正しく設定
        mock_locator = Mock()
        mock_locator.count.return_value = 0  # 整数を返すように修正
        mock_locator.nth.return_value = Mock()
        mock_page.locator.return_value = mock_locator
        mock_page.goto.return_value = Mock(status=200)
        mock_page.wait_for_selector.return_value = None
        mock_page.wait_for_timeout.return_value = None
        
        mock_context = Mock()
        mock_context.new_page.return_value = mock_page
        mock_browser = Mock()
        mock_browser.new_context.return_value = mock_context
        mock_browser.close.return_value = None
        mock_chromium = Mock()
        mock_chromium.launch.return_value = mock_browser
        mock_p = Mock()
        mock_p.chromium = mock_chromium
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # スクレイピング実行
        results = scraper.scrape_availability(dynamic_date)
        
        # 型と構造の検証
        self._validate_scraping_results(results, dynamic_date)
    
    def _validate_scraping_results(self, results, expected_date):
        """スクレイピング結果の型と構造を検証"""
        # 結果がリストであることを確認
        assert isinstance(results, list), "結果はリストである必要があります"
        assert len(results) == 2, f"2つのスタジオのデータが必要です。取得: {len(results)}"
        
        for studio_data in results:
            # 必須フィールドの存在確認
            assert "facilityName" in studio_data, "facilityNameフィールドが必要です"
            assert "timeSlots" in studio_data, "timeSlotsフィールドが必要です"
            assert "lastUpdated" in studio_data, "lastUpdatedフィールドが必要です"
            
            # 型の確認
            assert isinstance(studio_data["facilityName"], str), "facilityNameは文字列である必要があります"
            assert isinstance(studio_data["timeSlots"], dict), "timeSlotsは辞書である必要があります"
            assert isinstance(studio_data["lastUpdated"], str), "lastUpdatedは文字列である必要があります"
            
            # facilityNameが有効な値であることを確認
            valid_facilities = ["あんさんぶるStudio和(本郷)", "あんさんぶるStudio音(初台)"]
            assert studio_data["facilityName"] in valid_facilities, \
                f"facilityNameは {valid_facilities} のいずれかである必要があります"
            
            # timeSlotsの検証
            time_slots = studio_data["timeSlots"]
            required_slots = ["9-12", "13-17", "18-21"]
            
            for slot in required_slots:
                assert slot in time_slots, f"時間帯 {slot} が必要です"
                
                # 値が有効な状態のいずれかであることを確認
                valid_statuses = ["available", "booked", "unknown"]
                status = time_slots[slot]
                assert status in valid_statuses, \
                    f"時間帯 {slot} の状態 '{status}' は {valid_statuses} のいずれかである必要があります"
            
            # ISO形式の日時であることを確認
            try:
                datetime.strptime(studio_data["lastUpdated"], "%Y-%m-%dT%H:%M:%SZ")
            except ValueError:
                pytest.fail(f"lastUpdated '{studio_data['lastUpdated']}' はISO形式である必要があります")
    
    @patch('src.cosmos_writer.CosmosWriter')
    def test_save_with_dynamic_date(self, mock_cosmos_writer, scraper, dynamic_date, tmp_path):
        """動的な日付での保存機能テスト（Cosmos DBモック）"""
        # CosmosWriterのモック設定
        mock_writer_instance = mock_cosmos_writer.return_value
        mock_writer_instance.save_availability.return_value = True
        
        # extract_studio_dataをモック化
        with patch.object(scraper, 'scrape_availability') as mock_scrape:
            mock_scrape.return_value = [
                {
                    "facilityName": "あんさんぶるStudio和(本郷)",
                    "timeSlots": {"9-12": "available", "13-17": "booked", "18-21": "unknown"},
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                },
                {
                    "facilityName": "あんさんぶるStudio音(初台)",
                    "timeSlots": {"9-12": "booked", "13-17": "available", "18-21": "unknown"},
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            ]
            
            # Cosmos DBに保存（モック）
            result = scraper.scrape_and_save(dynamic_date)
            
            # 保存されたデータの検証
            assert "data" in result, "dataフィールドが必要です"
            assert dynamic_date in result["data"], f"日付 {dynamic_date} のデータが保存されているはずです"
            
            # CosmosWriterが呼ばれたことを確認
            mock_writer_instance.save_availability.assert_called_once_with(dynamic_date, mock_scrape.return_value)
            
            # 保存された日付のデータを検証
            saved_data = result["data"][dynamic_date]
            self._validate_scraping_results(saved_data, dynamic_date)
    
    def test_real_site_scraping(self, scraper, dynamic_date):
        """実際のサイトに対するスクレイピングテスト"""
        # 注: ネットワークエラーの場合はテストを失敗させない
        try:
            # 実際のサイトにアクセス
            results = scraper.scrape_availability(dynamic_date)
        except Exception as e:
            # ネットワークエラーなどの場合はテストをスキップ
            error_msg = str(e)
            if any(x in error_msg.lower() for x in ['network', 'connection', 'timeout', 'err_aborted']):
                pytest.skip(f"ネットワークエラーのためスキップ: {error_msg}")
            else:
                # その他のエラーは再発生
                raise
        
        # 型と構造の検証のみ（値は問わない）
        self._validate_scraping_results(results, dynamic_date)
        
        print(f"\n✅ 実際のサイトから {dynamic_date} のデータを正常に取得しました")
        print(f"取得データ: {results}")