"""
ファイル更新を確認するテスト
"""
import json
import os
import tempfile
import time
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from src.scraper import EnsembleStudioScraper


class TestFileUpdate:
    """ファイル更新関連のテスト"""
    
    @pytest.fixture
    def temp_output_file(self):
        """テスト用の一時ファイルを作成"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            # 初期データを書き込み
            initial_data = {
                "data": {
                    "2025-01-01": [
                        {
                            "facilityName": "テスト施設",
                            "timeSlots": {
                                "9-12": "available",
                                "13-17": "booked",
                                "18-21": "available"
                            },
                            "lastUpdated": "2025-01-01T00:00:00Z"
                        }
                    ]
                },
                "lastScraped": "2025-01-01T00:00:00Z"
            }
            json.dump(initial_data, f)
            temp_path = f.name
        
        yield temp_path
        
        # クリーンアップ
        if os.path.exists(temp_path):
            os.unlink(temp_path)
    
    def test_file_is_updated_after_scraping(self, temp_output_file):
        """スクレイピング後にファイルが更新されることを確認"""
        # 更新前のファイル更新時刻を記録
        original_mtime = os.path.getmtime(temp_output_file)
        
        # 少し待機（ファイルシステムの時刻精度のため）
        time.sleep(0.1)
        
        # モックデータを準備
        mock_facilities = [
            {
                "facilityName": "あんさんぶるStudio和(本郷)",
                "timeSlots": {
                    "9-12": "available",
                    "13-17": "booked",
                    "18-21": "available"
                },
                "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        ]
        
        scraper = EnsembleStudioScraper()
        
        # scrape_availabilityをモック化
        with patch.object(scraper, 'scrape_availability', return_value=mock_facilities):
            # スクレイピングを実行
            result = scraper.scrape_and_save("2025-11-15", temp_output_file)
        
        # ファイル更新時刻が変更されていることを確認
        new_mtime = os.path.getmtime(temp_output_file)
        assert new_mtime > original_mtime, "ファイルの更新時刻が変更されていません"
        
        # ファイルが存在し、読み込み可能であることを確認
        assert os.path.exists(temp_output_file)
        with open(temp_output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # データ構造が正しいことを確認
        assert "data" in data
        assert "lastScraped" in data
        assert "2025-11-15" in data["data"]
    
    def test_file_creation_when_not_exists(self):
        """ファイルが存在しない場合に新規作成されることを確認"""
        # 一時ディレクトリを作成
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "new_availability.json"
            
            # ファイルが存在しないことを確認
            assert not output_path.exists()
            
            # モックデータ
            mock_facilities = [
                {
                    "facilityName": "テスト施設",
                    "timeSlots": {
                        "9-12": "available",
                        "13-17": "available",
                        "18-21": "booked"
                    },
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            ]
            
            scraper = EnsembleStudioScraper()
            
            # scrape_availabilityをモック化
            with patch.object(scraper, 'scrape_availability', return_value=mock_facilities):
                result = scraper.scrape_and_save("2025-11-20", str(output_path))
            
            # ファイルが作成されたことを確認
            assert output_path.exists(), "ファイルが作成されていません"
            
            # ファイルの内容を確認
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            assert "2025-11-20" in data["data"]
            assert len(data["data"]["2025-11-20"]) == 1
    
    def test_lastScraped_timestamp_is_updated(self, temp_output_file):
        """lastScrapedタイムスタンプが更新されることを確認"""
        # 初期データを読み込み
        with open(temp_output_file, 'r', encoding='utf-8') as f:
            original_data = json.load(f)
        original_timestamp = original_data["lastScraped"]
        
        # 少し待機
        time.sleep(0.1)
        
        # モックデータ
        mock_facilities = []
        
        scraper = EnsembleStudioScraper()
        
        with patch.object(scraper, 'scrape_availability', return_value=mock_facilities):
            result = scraper.scrape_and_save("2025-12-01", temp_output_file)
        
        # 更新後のデータを読み込み
        with open(temp_output_file, 'r', encoding='utf-8') as f:
            new_data = json.load(f)
        new_timestamp = new_data["lastScraped"]
        
        # タイムスタンプが更新されていることを確認
        assert new_timestamp != original_timestamp, "lastScrapedタイムスタンプが更新されていません"
        
        # タイムスタンプが有効な形式であることを確認
        try:
            datetime.strptime(new_timestamp, "%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            pytest.fail(f"無効なタイムスタンプ形式: {new_timestamp}")
    
    def test_existing_data_is_preserved(self, temp_output_file):
        """既存のデータが保持されることを確認"""
        # 初期データを確認
        with open(temp_output_file, 'r', encoding='utf-8') as f:
            original_data = json.load(f)
        
        assert "2025-01-01" in original_data["data"]
        
        # 新しいデータを追加
        mock_facilities = [
            {
                "facilityName": "新規施設",
                "timeSlots": {
                    "9-12": "booked",
                    "13-17": "booked", 
                    "18-21": "booked"
                },
                "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        ]
        
        scraper = EnsembleStudioScraper()
        
        with patch.object(scraper, 'scrape_availability', return_value=mock_facilities):
            result = scraper.scrape_and_save("2025-11-25", temp_output_file)
        
        # 更新後のデータを確認
        with open(temp_output_file, 'r', encoding='utf-8') as f:
            updated_data = json.load(f)
        
        # 既存のデータが保持されていることを確認
        assert "2025-01-01" in updated_data["data"], "既存のデータが削除されています"
        assert "2025-11-25" in updated_data["data"], "新しいデータが追加されていません"
        
        # 既存データの内容が変更されていないことを確認
        assert updated_data["data"]["2025-01-01"] == original_data["data"]["2025-01-01"]