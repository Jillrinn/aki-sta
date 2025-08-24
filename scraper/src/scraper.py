"""
あんさんぶるスタジオの予約状況をスクレイピング
"""
import json
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup


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
    
    def extract_studio_data(self, html_content: str, studio_name: str, date: str) -> Dict:
        """
        HTMLからスタジオデータを抽出
        実際のサイト構造に基づいた実装
        """
        soup = BeautifulSoup(html_content, 'lxml')
        time_slots = {}
        
        # 日付から日の部分を抽出（例: "2025-11-15" → "15"）
        target_day = int(date.split('-')[-1])
        
        # スタジオ名を含む要素を探す
        studio_elements = soup.find_all(string=lambda text: text and studio_name in text)
        
        if not studio_elements:
            # スタジオが見つからない場合はデフォルト値を返す
            return self._get_default_studio_data(studio_name)
        
        # 各時間帯（09:00, 13:00, 18:00）の空き状況を探す
        time_mapping = {
            "09:00": "9-12",
            "9:00": "9-12",
            "13:00": "13-17",
            "18:00": "18-21"
        }
        
        for studio_element in studio_elements:
            parent = studio_element.parent
            if not parent:
                continue
                
            # 親要素から日付と時間の情報を探す
            container = parent.parent if parent.parent else parent
            
            # 日付要素を探す（数字のみのテキスト）
            date_elements = container.find_all(string=lambda text: text and text.strip().isdigit())
            
            for date_elem in date_elements:
                if date_elem.strip() == str(target_day):
                    # この日付の時間帯情報を取得
                    date_container = date_elem.parent.parent if date_elem.parent else None
                    if not date_container:
                        continue
                    
                    # 時間帯ごとの空き状況を確認
                    for time_str, slot_key in time_mapping.items():
                        # 時間を含む要素を探す
                        time_elements = date_container.find_all(string=lambda text: text and time_str in text)
                        
                        if time_elements:
                            # 近くにある○×記号を探す
                            for time_elem in time_elements:
                                time_parent = time_elem.parent
                                if time_parent:
                                    # 同じ親要素内の○×記号を探す
                                    siblings = time_parent.find_next_siblings() + time_parent.find_previous_siblings()
                                    siblings.append(time_parent)
                                    
                                    for sibling in siblings:
                                        status_text = sibling.get_text(strip=True)
                                        if '○' in status_text:
                                            time_slots[slot_key] = "available"
                                            break
                                        elif '×' in status_text:
                                            time_slots[slot_key] = "booked"
                                            break
                                        elif '－' in status_text or '△' in status_text:
                                            time_slots[slot_key] = "unknown"
                                            break
        
        # より簡単な方法：テキスト全体から○×を探す
        if not time_slots:
            # スタジオ名の近くにある○×記号をすべて取得
            text_content = html_content
            if studio_name in text_content:
                # パターンマッチングで時間と記号を探す
                patterns = [
                    (r'09:00.*?([○×－△])', "9-12"),
                    (r'9:00.*?([○×－△])', "9-12"),
                    (r'13:00.*?([○×－△])', "13-17"),
                    (r'18:00.*?([○×－△])', "18-21")
                ]
                
                for pattern, slot_key in patterns:
                    match = re.search(pattern, text_content, re.DOTALL)
                    if match:
                        symbol = match.group(1)
                        if symbol == '○':
                            time_slots[slot_key] = "available"
                        elif symbol == '×':
                            time_slots[slot_key] = "booked"
                        else:
                            time_slots[slot_key] = "unknown"
        
        # デフォルト値を設定
        for slot in ["9-12", "13-17", "18-21"]:
            if slot not in time_slots:
                time_slots[slot] = "unknown"
        
        return {
            "facilityName": studio_name,
            "timeSlots": time_slots,
            "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    
    def _get_default_studio_data(self, studio_name: str) -> Dict:
        """デフォルトのスタジオデータを返す"""
        return {
            "facilityName": studio_name,
            "timeSlots": {
                "9-12": "unknown",
                "13-17": "unknown",
                "18-21": "unknown"
            },
            "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    
    def navigate_to_date(self, page, target_date: str):
        """
        指定された日付のカレンダーページに移動
        
        Args:
            page: Playwrightのページオブジェクト
            target_date: "YYYY-MM-DD"形式の日付文字列
        """
        try:
            # 日付をパース
            target_dt = datetime.strptime(target_date, "%Y-%m-%d")
            target_year = target_dt.year
            target_month = target_dt.month
            
            # 現在表示されている年月を取得
            page.wait_for_timeout(1000)
            html = page.content()
            soup = BeautifulSoup(html, 'lxml')
            
            # 「YYYY年MM月」形式のテキストを探す
            year_month_pattern = re.compile(r'(\d{4})年(\d{1,2})月')
            year_month_text = soup.find(string=year_month_pattern)
            
            if year_month_text:
                match = year_month_pattern.search(year_month_text)
                if match:
                    current_year = int(match.group(1))
                    current_month = int(match.group(2))
                    
                    # 月の差を計算
                    months_diff = (target_year - current_year) * 12 + (target_month - current_month)
                    
                    # 必要に応じて月を移動
                    if months_diff > 0:
                        # 次月へ移動
                        for _ in range(months_diff):
                            next_button = page.locator('a:has-text("次月")').first
                            if next_button:
                                next_button.click()
                                page.wait_for_timeout(1000)
                    elif months_diff < 0:
                        # 前月へ移動
                        for _ in range(abs(months_diff)):
                            prev_button = page.locator('a:has-text("前月")').first
                            if prev_button:
                                prev_button.click()
                                page.wait_for_timeout(1000)
        except Exception as e:
            print(f"Error navigating to date {target_date}: {e}")
            # エラーが発生しても処理を続行
    
    def scrape_availability(self, date: str) -> List[Dict]:
        """
        指定日付の空き状況をスクレイピング
        
        Args:
            date: "YYYY-MM-DD"形式の日付文字列
        
        Returns:
            スタジオ空き状況のリスト
        """
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=['--disable-blink-features=AutomationControlled']
                )
                try:
                    context = browser.new_context(
                        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        viewport={'width': 1920, 'height': 1080},
                        locale='ja-JP'
                    )
                    page = context.new_page()
                    
                    # ページにアクセス
                    page.goto(self.base_url, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_timeout(3000)  # カレンダーの読み込みを待つ
                    
                    # 指定日付に移動
                    self.navigate_to_date(page, date)
                    
                    # HTMLを取得
                    html_content = page.content()
                    
                    # 各スタジオのデータを抽出
                    results = []
                    for studio_name in self.studios:
                        studio_data = self.extract_studio_data(html_content, studio_name, date)
                        results.append(studio_data)
                    
                    return results
                    
                finally:
                    browser.close()
                    
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
            output_path = Path(__file__).parent.parent / "shared-data" / "availability.json"
        
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