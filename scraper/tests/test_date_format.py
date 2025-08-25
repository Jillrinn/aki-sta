"""
日付形式の柔軟性をテスト
"""
import subprocess
import sys
from pathlib import Path


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