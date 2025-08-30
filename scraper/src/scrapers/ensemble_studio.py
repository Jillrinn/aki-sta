"""
あんさんぶるスタジオの予約状況をスクレイピング
人間の操作に近い方法でPlaywrightのlocatorを使用してDOM要素を探索
"""
import json
import os
import platform
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from playwright.sync_api import sync_playwright, Page, Locator
from bs4 import BeautifulSoup


class EnsembleStudioScraper:
    """人間の操作を模倣したスクレイパー"""
    
    def __init__(self):
        self.base_url = "https://ensemble-studio.com/schedule/"
        self.studios = [
            "あんさんぶるStudio和(本郷)",
            "あんさんぶるStudio音(初台)"
        ]
    
    def convert_time_to_slot(self, time_str: str) -> Optional[str]:
        """
        時刻文字列を時間帯に変換
        "09:00" → "9-12"
        "13:00" → "13-17" 
        "18:00" → "18-21"
        """
        if not time_str:
            return None
            
        if "09:00" in time_str or "9:00" in time_str:
            return "9-12"
        elif "13:00" in time_str:
            return "13-17"
        elif "18:00" in time_str:
            return "18-21"
        else:
            return None
    
    def parse_japanese_year_month(self, text: str) -> Optional[datetime]:
        """
        日本語の年月文字列をdatetimeオブジェクトに変換
        "2025年8月" → datetime(2025, 8, 1)
        """
        match = re.match(r'(\d{4})年(\d{1,2})月', text)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            return datetime(year, month, 1)
        return None
    
    def find_studio_calendars(self, page: Page) -> List[Tuple[str, Locator]]:
        """
        各スタジオのカレンダー要素を特定
        
        Returns:
            [(スタジオ名, カレンダー要素), ...]のリスト
        """
        print("Finding studio calendars...")
        calendars = []
        
        # ページ全体のHTMLを取得してデバッグ
        page_content = page.content()
        
        for studio_name in self.studios:
            print(f"Looking for {studio_name}")
            
            # より簡単な方法：すべてのtimetable-calendarを取得
            all_calendars = page.locator(".timetable-calendar")
            calendar_count = all_calendars.count()
            print(f"Found {calendar_count} calendars on the page")
            
            # スタジオ名がHTMLに含まれているか確認
            if studio_name in page_content:
                print(f"{studio_name} found in page content")
                
                # カレンダーを順番に確認
                if "和(本郷)" in studio_name and calendar_count > 0:
                    # 通常、最初のカレンダーが和(本郷)
                    calendar = all_calendars.nth(0)
                    print(f"Using first calendar for {studio_name}")
                    calendars.append((studio_name, calendar))
                elif "音(初台)" in studio_name and calendar_count > 1:
                    # 通常、2番目のカレンダーが音(初台)
                    calendar = all_calendars.nth(1)
                    print(f"Using second calendar for {studio_name}")
                    calendars.append((studio_name, calendar))
                elif calendar_count > 0:
                    # デフォルトで最初のカレンダーを使用
                    calendar = all_calendars.nth(0)
                    print(f"Using first calendar for {studio_name} (default)")
                    calendars.append((studio_name, calendar))
            else:
                print(f"Warning: {studio_name} not found in page content")
        
        # カレンダーが見つからない場合の別の方法
        if not calendars and calendar_count > 0:
            print("Fallback: Using position-based calendar assignment")
            for i, studio_name in enumerate(self.studios):
                if i < calendar_count:
                    calendar = all_calendars.nth(i)
                    calendars.append((studio_name, calendar))
                    print(f"Assigned calendar {i} to {studio_name}")
        
        return calendars
    
    def navigate_to_month(self, page: Page, calendar: Locator, target_date: datetime) -> bool:
        """
        カレンダーを目的の年月まで移動
        
        Returns:
            成功した場合True
        """
        target_year_month = f"{target_date.year}年{target_date.month}月"
        print(f"Navigating to {target_year_month}")
        
        max_iterations = 12  # 最大12ヶ月分移動
        
        for iteration in range(max_iterations):
            # 現在のcaptionを取得
            caption = calendar.locator(".calendar-caption").first
            if caption.count() == 0:
                print("Warning: Could not find calendar caption")
                return False
            
            caption_text = caption.text_content()
            if not caption_text:
                print("Warning: Caption text is empty")
                return False
            
            # "2025年8月"部分を取得
            current_year_month_match = re.match(r'(\d{4}年\d{1,2}月)', caption_text)
            if not current_year_month_match:
                print(f"Warning: Could not parse year-month from caption: {caption_text}")
                return False
            
            current_year_month = current_year_month_match.group(1)
            print(f"Current calendar shows: {current_year_month}")
            
            if current_year_month == target_year_month:
                print(f"Reached target month: {target_year_month}")
                return True
            
            # 年月を比較して移動方向を決定
            current_dt = self.parse_japanese_year_month(current_year_month)
            if not current_dt:
                print(f"Warning: Could not parse date from {current_year_month}")
                return False
            
            if target_date.year > current_dt.year or \
               (target_date.year == current_dt.year and target_date.month > current_dt.month):
                # 次月へ移動
                print("Moving to next month...")
                next_link = calendar.locator(".monthly-next a").first
                if next_link.count() > 0:
                    next_link.click()
                    page.wait_for_timeout(2000)  # 遷移を待つ
                else:
                    print("No next month link available")
                    return False
            else:
                # 前月へ移動
                print("Moving to previous month...")
                prev_link = calendar.locator(".monthly-prev a").first
                if prev_link.count() > 0:
                    prev_link.click()
                    page.wait_for_timeout(2000)  # 遷移を待つ
                else:
                    print("No previous month link available")
                    return False
        
        print(f"Could not reach {target_year_month} after {max_iterations} iterations")
        return False
    
    def find_date_cell(self, calendar: Locator, target_day: int) -> Optional[Locator]:
        """
        指定日付のセルを特定
        
        Args:
            calendar: カレンダー要素
            target_day: 日付（1-31の数値）
        
        Returns:
            日付セル要素またはNone
        """
        print(f"Looking for day {target_day}")
        
        # すべての日付ボックスを取得
        day_boxes = calendar.locator(".day-box")
        day_box_count = day_boxes.count()
        print(f"Found {day_box_count} day boxes")
        
        for i in range(day_box_count):
            day_box = day_boxes.nth(i)
            day_number = day_box.locator(".day-number").first
            
            if day_number.count() > 0:
                day_text = day_number.text_content()
                if day_text:
                    day_text = day_text.strip()
                    if day_text == str(target_day):
                        print(f"Found day {target_day} cell")
                        return day_box
        
        print(f"Could not find day {target_day}")
        return None
    
    def extract_time_slots(self, day_box: Locator) -> Dict[str, str]:
        """
        日付セルから時刻情報を抽出
        
        Returns:
            {"9-12": "available|booked|unknown", ...}
        """
        time_slots = {}
        
        # 営業していない日の判定
        if day_box.locator(".calendar-time-disable").count() > 0:
            disable_text = day_box.locator(".calendar-time-disable").first.text_content()
            print(f"Day is disabled: {disable_text}")
            return {
                "9-12": "unknown",
                "13-17": "unknown",
                "18-21": "unknown"
            }
        
        # 時刻マークを探す
        time_marks = day_box.locator(".calendar-time-mark")
        time_mark_count = time_marks.count()
        print(f"Found {time_mark_count} time marks")
        
        for i in range(time_mark_count):
            time_mark = time_marks.nth(i)
            time_string_elem = time_mark.locator(".time-string").first
            
            if time_string_elem.count() > 0:
                time_string = time_string_elem.text_content()
                print(f"Processing time: {time_string}")
                
                # 時刻を時間帯に変換
                slot_key = self.convert_time_to_slot(time_string)
                
                if slot_key:
                    # 空き状況を判定
                    # 方法1: リンクがあるかチェック（○の場合はリンクになっている）
                    link = time_mark.locator("a").first
                    if link.count() > 0:
                        link_text = link.text_content()
                        if link_text and "○" in link_text:
                            time_slots[slot_key] = "available"
                            print(f"  {slot_key}: available (link found)")
                        else:
                            time_slots[slot_key] = "booked"
                            print(f"  {slot_key}: booked (link without ○)")
                    else:
                        # 方法2: time_mark全体のテキストをチェック
                        mark_text = time_mark.text_content()
                        if mark_text:
                            if "○" in mark_text:
                                time_slots[slot_key] = "available"
                                print(f"  {slot_key}: available (○ found)")
                            elif "×" in mark_text:
                                time_slots[slot_key] = "booked"
                                print(f"  {slot_key}: booked (× found)")
                            else:
                                time_slots[slot_key] = "unknown"
                                print(f"  {slot_key}: unknown")
        
        # 見つからない時間帯はunknown
        for slot in ["9-12", "13-17", "18-21"]:
            if slot not in time_slots:
                time_slots[slot] = "unknown"
                print(f"  {slot}: unknown (not found)")
        
        return time_slots
    
    def scrape_availability(self, date: str) -> List[Dict]:
        """
        指定日付の空き状況をスクレイピング（人間の操作を模倣）
        
        Args:
            date: "YYYY-MM-DD"形式の日付文字列
        
        Returns:
            スタジオ空き状況のリスト
        """
        print(f"\n=== Starting human-like scraping for {date} ===")
        
        # 日付をパース
        target_date = datetime.strptime(date, "%Y-%m-%d")
        target_day = target_date.day
        
        try:
            with sync_playwright() as p:
                # 環境に応じてブラウザを選択
                # 環境変数を優先的にチェック（Docker/Azure環境用）
                platform_override = os.environ.get('PLATFORM_OVERRIDE')
                system = platform_override if platform_override else platform.system()
                
                print(f"Platform detection: system={system}, override={platform_override}")
                
                # Azure Web Appやコンテナ環境を明示的に判定
                is_container = os.environ.get('CONTAINER_ENV') == 'true'
                is_azure = os.environ.get('WEBSITE_INSTANCE_ID') is not None  # Azure固有の環境変数
                
                if is_azure or is_container:
                    # Azure/Dockerでは必ずChromiumを使用
                    print(f"Azure/Container environment detected, forcing Chromium browser")
                    browser = p.chromium.launch(headless=True)
                elif system == "Darwin":  # macOS
                    # macOSではWebKitを使用（GPUクラッシュ回避）
                    print(f"Running on macOS, using WebKit browser")
                    browser = p.webkit.launch(headless=True)
                else:  # Linux/その他の環境
                    # その他の環境ではChromiumが安定
                    print(f"Running on {system}, using Chromium browser")
                    browser = p.chromium.launch(headless=True)
                
                try:
                    context = browser.new_context(
                        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
                        viewport={'width': 1920, 'height': 1080},
                        locale='ja-JP'
                    )
                    page = context.new_page()
                    
                    # ページにアクセス
                    print(f"Accessing: {self.base_url}")
                    response = page.goto(self.base_url, wait_until="networkidle", timeout=60000)
                    
                    if response:
                        print(f"Response status: {response.status}")
                    
                    # カレンダーが読み込まれるまで待機
                    page.wait_for_selector(".timetable-calendar", timeout=30000)
                    page.wait_for_timeout(3000)  # 追加の待機
                    
                    # 各スタジオのカレンダーを特定
                    calendars = self.find_studio_calendars(page)
                    
                    if not calendars:
                        print("Warning: No calendars found")
                        return self._get_default_data()
                    
                    results = []
                    
                    # 各スタジオのデータを抽出
                    for studio_name, calendar in calendars:
                        print(f"\n--- Processing {studio_name} ---")
                        
                        # 目的の年月に移動
                        if not self.navigate_to_month(page, calendar, target_date):
                            print(f"Warning: Skipping {studio_name} - could not navigate to target month")
                            continue  # このスタジオをスキップ
                        
                        # 日付セルを特定
                        date_cell = self.find_date_cell(calendar, target_day)
                        
                        if not date_cell:
                            print(f"Warning: Skipping {studio_name} - date cell not found for day {target_day}")
                            continue  # このスタジオをスキップ
                        
                        # 時刻情報を抽出
                        time_slots = self.extract_time_slots(date_cell)
                        
                        # 結果を追加（有効なデータがある場合のみ）
                        results.append({
                            "facilityName": studio_name,
                            "timeSlots": time_slots,
                            "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                        })
                    
                    return results
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            print(f"Error during scraping: {e}")
            import traceback
            traceback.print_exc()
            # エラーを上位に伝搬するために例外を再度投げる
            raise
    
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
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def scrape_and_save(self, date: str) -> Dict:
        """
        指定日付の空き状況をスクレイピングしてCosmos DBに保存
        
        Args:
            date: "YYYY-MM-DD"または"YYYY/MM/DD"形式の日付文字列
        
        Returns:
            結果を含む辞書（status, data, message, error_type）
        """
        try:
            # 日付フォーマット検証と正規化
            normalized_date = None
            for fmt in ['%Y-%m-%d', '%Y/%m/%d']:
                try:
                    parsed_date = datetime.strptime(date, fmt)
                    normalized_date = parsed_date.strftime('%Y-%m-%d')
                    break
                except ValueError:
                    continue
            
            if normalized_date is None:
                return {
                    "status": "error",
                    "message": f"Invalid date format: {date}. Expected YYYY-MM-DD or YYYY/MM/DD",
                    "error_type": "VALIDATION_ERROR"
                }
            
            # スクレイピング実行（正規化された日付を使用）
            print(f"\nスクレイピング開始: {normalized_date}")
            try:
                facilities = self.scrape_availability(normalized_date)
            except Exception as scrape_error:
                # Playwrightエラーを含むスクレイピングエラーをキャッチ
                error_message = str(scrape_error)
                if "Executable doesn't exist" in error_message or "playwright install" in error_message:
                    return {
                        "status": "error",
                        "message": "Playwright browser not installed",
                        "error_type": "BROWSER_NOT_INSTALLED",
                        "details": error_message
                    }
                elif "timeout" in error_message.lower():
                    return {
                        "status": "error",
                        "message": "Website request timed out",
                        "error_type": "TIMEOUT_ERROR",
                        "details": error_message
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"Scraping failed",
                        "error_type": "SCRAPING_ERROR",
                        "details": error_message
                    }
            
            if not facilities:
                return {
                    "status": "error",
                    "message": f"No data found for date: {normalized_date}",
                    "error_type": "NO_DATA_FOUND"
                }
            
            # Cosmos DBに保存（正規化された日付を使用）
            try:
                from src.repositories.cosmos_repository import CosmosWriter
                writer = CosmosWriter()
                if writer.save_availability(normalized_date, facilities):
                    print(f"\n保存先:")
                    print(f"  ✅ Cosmos DB: {normalized_date}")
                    print(f"\nスクレイピング完了")
                    return {
                        "status": "success",
                        "data": {normalized_date: facilities}
                    }
                else:
                    return {
                        "status": "error",
                        "message": "Failed to save to Cosmos DB",
                        "error_type": "DATABASE_ERROR"
                    }
            except ImportError as e:
                return {
                    "status": "error",
                    "message": "Cosmos DB module not found",
                    "error_type": "CONFIGURATION_ERROR",
                    "details": str(e)
                }
            except Exception as e:
                print(f"\n❌ エラー: Cosmos DB保存失敗")
                print(f"   理由: {e}")
                return {
                    "status": "error",
                    "message": f"Database error: {str(e)}",
                    "error_type": "DATABASE_ERROR",
                    "details": str(e)
                }
                
        except ConnectionError as e:
            return {
                "status": "error",
                "message": "Failed to connect to website",
                "error_type": "NETWORK_ERROR",
                "details": str(e)
            }
        except TimeoutError as e:
            return {
                "status": "error",
                "message": "Website request timed out",
                "error_type": "TIMEOUT_ERROR",
                "details": str(e)
            }
        except Exception as e:
            print(f"\n❌ スクレイピングエラー: {e}")
            return {
                "status": "error",
                "message": f"Scraping failed: {str(e)}",
                "error_type": "SCRAPING_ERROR",
                "details": str(e)
            }