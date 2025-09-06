"""
渋谷区スクレイパーの結合テスト（王道ルートのみ）
"""
import pytest
from datetime import datetime, timedelta
from src.scrapers.shibuya import ShibuyaScraper


@pytest.mark.integration
class TestShibuyaScraperIntegration:
    """渋谷区スクレイパーの結合テスト"""
    
    def test_full_scraping_flow(self):
        """完全なスクレイピングフロー（王道ルート）テスト"""
        # スクレイパーインスタンスを作成
        scraper = ShibuyaScraper()
        
        # 明日の日付で実行（本日のデータが取得できない可能性があるため）
        target_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        print(f"Testing scraping for date: {target_date}")
        
        try:
            # スクレイピング実行
            result = scraper.scrape_availability(target_date)
            
            # 基本的な検証
            assert isinstance(result, list), "Result should be a list"
            assert len(result) > 0, "Should have at least one result"
            
            # 各部屋のデータ構造を検証
            for room_data in result:
                # 必須フィールドの存在確認
                assert "centerName" in room_data, "centerName is required"
                assert "facilityName" in room_data, "facilityName is required"
                assert "roomName" in room_data, "roomName is required"
                assert "timeSlots" in room_data, "timeSlots is required"
                assert "date" in room_data, "date is required"
                assert "lastUpdated" in room_data, "lastUpdated is required"
                
                # timeSlots の検証
                time_slots = room_data["timeSlots"]
                assert "morning" in time_slots, "morning slot is required"
                assert "afternoon" in time_slots, "afternoon slot is required"
                assert "evening" in time_slots, "evening slot is required"
                
                # 値の検証（具体的な値ではなく、有効な値かどうか）
                valid_statuses = ["available", "booked", "booked_1", "booked_2", "lottery", "unknown"]
                assert time_slots["morning"] in valid_statuses, f"Invalid morning status: {time_slots['morning']}"
                assert time_slots["afternoon"] in valid_statuses, f"Invalid afternoon status: {time_slots['afternoon']}"
                assert time_slots["evening"] in valid_statuses, f"Invalid evening status: {time_slots['evening']}"
                
                # 日付フォーマットの検証
                assert room_data["date"] == target_date, f"Date should be {target_date}"
            
            print(f"✅ Successfully scraped {len(result)} room records")
            
            # 部屋名の例を出力（デバッグ用）
            sample_rooms = list(set(r["roomName"] for r in result[:4]))
            print(f"Sample rooms: {', '.join(sample_rooms)}")
            
        except RuntimeError as e:
            # スクレイピングが失敗した場合（サイトの問題など）
            if "Scraping failed" in str(e):
                pytest.skip(f"Scraping failed due to site issue: {e}")
            else:
                raise
        except Exception as e:
            # その他のエラー
            pytest.fail(f"Unexpected error during scraping: {e}")
    
    def test_room_names_defined(self):
        """練習室名が定義されているかのテスト"""
        scraper = ShibuyaScraper()
        room_names = scraper.get_room_names()
        
        # 部屋名リストの検証
        assert isinstance(room_names, list), "Room names should be a list"
        assert len(room_names) > 0, "Should have at least one room defined"
        
        # 各部屋名が文字列であることを確認
        for room_name in room_names:
            assert isinstance(room_name, str), f"Room name should be string: {room_name}"
            assert len(room_name) > 0, "Room name should not be empty"
        
        print(f"✅ Defined {len(room_names)} rooms: {', '.join(room_names)}")