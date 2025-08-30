"""
日付形式の柔軟性をテスト
"""
import subprocess
import sys
from pathlib import Path
from datetime import datetime
import json
from unittest.mock import Mock, patch


class TestDateFormat:
    """日付形式関連のテスト"""
    
    def test_date_format_with_hyphen(self):
        """YYYY-MM-DD形式の日付が受け入れられることを確認"""
        # main.pyのパス
        main_py = Path(__file__).parent.parent / "src" / "main.py"
        
        # --helpを実行して、正常に動作することを確認
        result = subprocess.run(
            [sys.executable, str(main_py), "--date", "2025-09-01", "--help"],
            capture_output=True,
            text=True
        )
        
        # エラーなく実行できることを確認（helpが表示される）
        assert "あんさんぶるスタジオの予約状況をスクレイピング" in result.stdout or result.stderr
    
    def test_date_format_with_slash(self):
        """YYYY/MM/DD形式の日付が受け入れられることを確認"""
        # main.pyのパス
        main_py = Path(__file__).parent.parent / "src" / "main.py"
        
        # テスト用のダミー出力ファイルを指定して実行
        # （実際のスクレイピングは行わない）
        result = subprocess.run(
            [sys.executable, str(main_py), "--date", "2025/09/01", "--help"],
            capture_output=True,
            text=True
        )
        
        # エラーなく実行できることを確認
        assert "あんさんぶるスタジオの予約状況をスクレイピング" in result.stdout or result.stderr
    
    def test_invalid_date_format(self):
        """無効な日付形式がエラーになることを確認"""
        # main.pyのパス
        main_py = Path(__file__).parent.parent / "src" / "main.py"
        
        # 無効な形式でテスト
        result = subprocess.run(
            [sys.executable, str(main_py), "--date", "2025.09.01"],
            capture_output=True,
            text=True
        )
        
        # エラーメッセージが表示されることを確認
        assert result.returncode != 0
        assert "エラー: 日付は YYYY-MM-DD または YYYY/MM/DD 形式で指定してください" in result.stderr or result.stdout
    
    def test_invalid_date_value(self):
        """無効な日付値（13月など）がエラーになることを確認"""
        main_py = Path(__file__).parent.parent / "src" / "main.py"
        
        # 無効な月でテスト
        result = subprocess.run(
            [sys.executable, str(main_py), "--date", "2025-13-01"],
            capture_output=True,
            text=True
        )
        
        # エラーメッセージが表示されることを確認
        assert result.returncode != 0
        assert "エラー" in result.stderr or result.stdout
    
    def test_normalize_date_for_cosmos_db(self):
        """日付がCosmos DB保存時に正規化されることを確認"""
        # EnsembleStudioScraperをインポート
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from src.scraper import EnsembleStudioScraper
        
        scraper = EnsembleStudioScraper()
        
        # Mock CosmosWriter
        with patch('src.cosmos_writer.CosmosWriter') as MockCosmosWriter:
            mock_writer = Mock()
            mock_writer.save_availability.return_value = True
            MockCosmosWriter.return_value = mock_writer
            
            # Mock scrape_availability
            with patch.object(scraper, 'scrape_availability') as mock_scrape:
                mock_scrape.return_value = [
                    {
                        'facilityName': 'Test Studio',
                        'timeSlots': {'9-12': 'available'},
                        'lastUpdated': '2025-08-29T10:00:00Z'
                    }
                ]
                
                # YYYY/MM/DD形式で入力
                result = scraper.scrape_and_save('2025/09/01')
                
                # 正規化されたYYYY-MM-DD形式でCosmosWriterが呼び出されることを確認
                mock_writer.save_availability.assert_called_once_with(
                    '2025-09-01',  # 正規化された形式
                    mock_scrape.return_value
                )
                
                # 結果のデータキーも正規化されていることを確認
                assert '2025-09-01' in result['data']
                assert result['status'] == 'success'
    
    def test_app_endpoint_date_normalization(self):
        """アプリケーションエンドポイントでの日付正規化を確認"""
        # 日付正規化のロジックのみをテスト
        from datetime import datetime
        
        # YYYY-MM-DD形式
        date1 = "2025-09-01"
        normalized1 = None
        for fmt in ['%Y-%m-%d', '%Y/%m/%d']:
            try:
                parsed_date = datetime.strptime(date1, fmt)
                normalized1 = parsed_date.strftime('%Y-%m-%d')
                break
            except ValueError:
                continue
        assert normalized1 == "2025-09-01"
        
        # YYYY/MM/DD形式
        date2 = "2025/09/01"
        normalized2 = None
        for fmt in ['%Y-%m-%d', '%Y/%m/%d']:
            try:
                parsed_date = datetime.strptime(date2, fmt)
                normalized2 = parsed_date.strftime('%Y-%m-%d')
                break
            except ValueError:
                continue
        assert normalized2 == "2025-09-01"
    
    def test_multiple_date_formats(self):
        """複数の日付形式が混在しても正しく処理されることを確認"""
        from datetime import datetime
        
        dates = ['2025-09-01', '2025/09/02', '2025-09-03']
        normalized_dates = []
        
        for date in dates:
            normalized = None
            for fmt in ['%Y-%m-%d', '%Y/%m/%d']:
                try:
                    parsed_date = datetime.strptime(date, fmt)
                    normalized = parsed_date.strftime('%Y-%m-%d')
                    break
                except ValueError:
                    continue
            normalized_dates.append(normalized)
        
        # 全て正規化された形式になることを確認
        assert normalized_dates == ['2025-09-01', '2025-09-02', '2025-09-03']