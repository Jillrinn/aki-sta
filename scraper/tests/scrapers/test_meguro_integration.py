"""
目黒区スクレイパーの結合テスト（王道ルートのみ）
"""
import pytest
from datetime import datetime, timedelta
from src.scrapers.meguro import MeguroScraper


@pytest.mark.integration
class TestMeguroScraperIntegration:
    """目黒区スクレイパーの結合テスト"""
    
    def test_full_scraping_flow(self):
        """完全なスクレイピングフロー（王道ルート）テスト"""
        # スクレイパーインスタンスを作成
        scraper = MeguroScraper()
        
        # 明日の日付で実行（本日のデータが取得できない可能性があるため）
        target_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        print(f"Testing scraping for date: {target_date}")
        
        try:
            # スクレイピング実行
            result = scraper.scrape_availability(target_date)
            
            # 基本的な検証
            assert isinstance(result, list), "Result should be a list"
            assert len(result) >= 6, f"Should have at least 6 facilities, got {len(result)}"
            
            # 各施設のデータ構造を検証
            for facility_data in result:
                # 必須フィールドの存在確認
                assert "facilityName" in facility_data, "facilityName is required"
                assert "roomName" in facility_data, "roomName is required"
                assert "timeSlots" in facility_data, "timeSlots is required"
                assert "date" in facility_data, "date is required"
                
                # timeSlots の検証
                time_slots = facility_data["timeSlots"]
                assert "morning" in time_slots, "morning slot is required"
                assert "afternoon" in time_slots, "afternoon slot is required"
                assert "evening" in time_slots, "evening slot is required"
                
                # 値の検証
                valid_statuses = ["available", "booked", "unknown", "unavailable"]
                assert time_slots["morning"] in valid_statuses, f"Invalid morning status: {time_slots['morning']}"
                assert time_slots["afternoon"] in valid_statuses, f"Invalid afternoon status: {time_slots['afternoon']}"
                assert time_slots["evening"] in valid_statuses, f"Invalid evening status: {time_slots['evening']}"
            
            print(f"✅ Successfully scraped {len(result)} facility records")
            
            # 施設名の例を出力（デバッグ用）
            sample_facilities = list(set(r["facilityName"] for r in result[:3]))
            print(f"Sample facilities: {', '.join(sample_facilities)}")
            
        except RuntimeError as e:
            # スクレイピングが失敗した場合（サイトの問題など）
            if "Scraping failed" in str(e):
                pytest.skip(f"Scraping failed due to site issue: {e}")
            else:
                raise
        except Exception as e:
            # その他のエラー
            pytest.fail(f"Unexpected error during scraping: {e}")