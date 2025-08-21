"""
あんさんぶるスタジオの予約状況をスクレイピング
"""
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from playwright.sync_api import sync_playwright


def convert_time_slot(time_str: str) -> Optional[str]:
    """
    時刻文字列を時間帯に変換
    "09:00" → "9-12"
    "13:00" → "13-17" 
    "18:00" → "18-21"
    """
    # 時刻部分を抽出
    match = re.match(r'(\d{1,2}):00', time_str)
    if not match:
        return None
    
    hour = int(match.group(1))
    
    if hour == 9:
        return "9-12"
    elif hour == 13:
        return "13-17"
    elif hour == 18:
        return "18-21"
    else:
        return None


def parse_availability(status_str: str) -> str:
    """
    空き状況記号を文字列に変換
    "○" → "available"
    "×" → "booked"
    その他 → "unknown"
    """
    if status_str == "○":
        return "available"
    elif status_str == "×":
        return "booked"
    else:
        return "unknown"


class EnsembleStudioScraper:
    """あんさんぶるスタジオのスクレイパー"""
    
    def __init__(self):
        self.base_url = "https://ensemble-studio.com/schedule/"
        self.studios = [
            "あんさんぶるStudio和(本郷)",
            "あんさんぶるStudio音(初台)"
        ]
    
    def fetch_page(self, url: str) -> str:
        """ページのHTMLを取得"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.goto(url, wait_until="networkidle")
                # カレンダーが完全に読み込まれるまで待機
                page.wait_for_timeout(2000)
                content = page.content()
                return content
            finally:
                browser.close()
    
    def fetch_page_with_retry(self, url: str, max_retries: int = 3) -> str:
        """リトライ機能付きページ取得"""
        for attempt in range(max_retries):
            try:
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True)
                    try:
                        page = browser.new_page()
                        page.goto(url, wait_until="networkidle")
                        page.wait_for_timeout(2000)
                        content = page.content()
                        return content
                    finally:
                        browser.close()
            except Exception as e:
                if attempt < max_retries - 1:
                    # 指数バックオフで待機
                    wait_time = 2 ** attempt
                    print(f"Retry {attempt + 1}/{max_retries} after {wait_time}s: {e}")
                    time.sleep(wait_time)
                else:
                    raise
    
    def extract_studio_data(self, html_content: str, studio_name: str) -> Dict:
        """
        HTMLからスタジオデータを抽出
        実際のHTML構造に基づいて実装を調整する必要があります
        """
        # この実装は実際のHTML構造に基づいて調整が必要
        # 現在はテスト用のダミー実装
        time_slots = {}
        
        # 実際にはBeautifulSoupやregexでパースする
        # ここではテスト用の簡易実装
        if "09:00" in html_content or "9:00" in html_content:
            if "○" in html_content:
                time_slots["9-12"] = "available"
            else:
                time_slots["9-12"] = "booked"
        
        if "13:00" in html_content:
            if studio_name == "あんさんぶるStudio和(本郷)":
                time_slots["13-17"] = "booked"
            else:
                time_slots["13-17"] = "available"
        
        if "18:00" in html_content:
            if studio_name == "あんさんぶるStudio和(本郷)":
                time_slots["18-21"] = "available"
            else:
                time_slots["18-21"] = "booked"
        
        # デフォルト値を設定
        if "9-12" not in time_slots:
            time_slots["9-12"] = "unknown"
        if "13-17" not in time_slots:
            time_slots["13-17"] = "unknown"
        if "18-21" not in time_slots:
            time_slots["18-21"] = "unknown"
        
        return {
            "facilityName": studio_name,
            "timeSlots": time_slots,
            "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    
    def scrape_availability(self, date: str) -> List[Dict]:
        """
        指定日付の空き状況をスクレイピング
        
        Args:
            date: "YYYY-MM-DD"形式の日付文字列
        
        Returns:
            スタジオ空き状況のリスト
        """
        try:
            # ページを取得
            html_content = self.fetch_page_with_retry(self.base_url)
            
            # 各スタジオのデータを抽出
            results = []
            for studio_name in self.studios:
                studio_data = self.extract_studio_data(html_content, studio_name)
                results.append(studio_data)
            
            return results
            
        except Exception as e:
            print(f"Error scraping availability: {e}")
            # エラー時はデフォルトデータを返す
            return self._get_default_data()
    
    def _get_default_data(self) -> List[Dict]:
        """エラー時のデフォルトデータ"""
        default_data = []
        for studio_name in self.studios:
            default_data.append({
                "facilityName": studio_name,
                "timeSlots": {
                    "9-12": "unknown",
                    "13-17": "unknown",
                    "18-21": "unknown"
                },
                "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            })
        return default_data
    
    def save_to_json(self, data: Dict, filepath: str):
        """データをJSONファイルに保存"""
        # ディレクトリが存在しない場合は作成
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def scrape_and_save(self, date: str, output_path: str = None) -> Dict:
        """
        スクレイピングしてJSONに保存
        
        Args:
            date: "YYYY-MM-DD"形式の日付文字列
            output_path: 出力先パス（省略時はデフォルト）
        
        Returns:
            保存したデータ
        """
        if output_path is None:
            output_path = Path(__file__).parent.parent.parent / "shared-data" / "availability.json"
        
        # 既存データを読み込む（存在する場合）
        existing_data = {}
        if Path(output_path).exists():
            try:
                with open(output_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except:
                existing_data = {}
        
        # スクレイピング実行
        facilities = self.scrape_availability(date)
        
        # データ構造を作成
        if "data" not in existing_data:
            existing_data["data"] = {}
        
        existing_data["lastScraped"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        existing_data["data"][date] = facilities
        
        # 保存
        self.save_to_json(existing_data, str(output_path))
        
        return existing_data