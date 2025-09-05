"""
あんさんぶるStudioの予約状況をスクレイピング
人間の操作に近い方法でPlaywrightのlocatorを使用してDOM要素を探索
"""
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple, cast
from playwright.sync_api import Page, Locator, sync_playwright
from .base import BaseScraper
from ..types.time_slots import TimeSlots, create_default_time_slots


class EnsembleStudioScraper(BaseScraper):
    """人間の操作を模倣したスクレイパー"""
    
    def get_base_url(self) -> str:
        """施設のベースURLを返す"""
        return "https://ensemble-studio.com/schedule/"
    
    def get_studios(self) -> List[str]:
        """施設のスタジオリストを返す"""
        return [
            "あんさんぶるStudio和(本郷)",
            "あんさんぶるStudio音(初台)"
        ]
    
    def get_center_name(self) -> str:
        """センター名を返す"""
        return "あんさんぶるStudio"
    
    def get_room_name(self, facility_name: str) -> str:
        """部屋名を返す（あんさんぶるStudioは練習室で固定）"""
        return "練習室"
    
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
    
    def extract_time_slots(self, day_box: Locator) -> TimeSlots:
        """
        日付セルから時刻情報を抽出
        
        Returns:
            {"morning": "available|booked|unknown", ...}
        """
        # 一時的にDictとして作成し、最後にTimeSlotsとして返す
        time_slots = create_default_time_slots()
        
        # 営業していない日の判定
        if day_box.locator(".calendar-time-disable").count() > 0:
            disable_text = day_box.locator(".calendar-time-disable").first.text_content()
            print(f"Day is disabled: {disable_text}")
            return {
                "morning": "unknown",
                "afternoon": "unknown",
                "evening": "unknown"
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
        
        # 見つからない時間帯はすでにunknown（デフォルト値）
        # 明示的に確認のためログ出力
        for slot in ["morning", "afternoon", "evening"]:
            if time_slots.get(slot) == "unknown":
                print(f"  {slot}: unknown (not found)")
        
        return time_slots
    
    def scrape_multiple_dates(self, dates: List[str]) -> Dict:
        """
        複数日付の空き状況を効率的にスクレイピング（Ensemble Studio用）
        同月内の日付は画面遷移なしで取得
        
        Args:
            dates: ["YYYY-MM-DD", ...]形式の日付リスト
        
        Returns:
            {
                "results": {
                    "2025-01-30": {"status": "success", "data": [...]},
                    "2025-01-31": {"status": "error", "message": "...", "error_type": "..."}
                },
                "summary": {
                    "total": 2,
                    "success": 1,
                    "failed": 1
                }
            }
        """
        self.log_info(f"\n=== Starting Ensemble Studio multiple dates scraping for {len(dates)} dates ===")
        self.log_info(f"Dates: {', '.join(dates)}")
        
        # 日付を年月でグループ化
        grouped_dates = self._group_dates_by_month(dates)
        self.log_info(f"Grouped into {len(grouped_dates)} month(s)")
        
        results = {}
        
        try:
            with sync_playwright() as p:
                # ブラウザを起動
                browser = self.setup_browser(p)
                
                try:
                    context = self.create_browser_context(browser)
                    page = context.new_page()
                    
                    # ページにアクセス
                    self.log_info(f"Accessing: {self.base_url}")
                    page.goto(self.base_url, wait_until="networkidle", timeout=60000)
                    
                    # カレンダーが読み込まれるまで待機
                    self.wait_for_calendar_load(page)
                    
                    # 各スタジオのカレンダーを特定
                    calendars = self.find_studio_calendars(page)
                    
                    if not calendars:
                        self.log_warning("No calendars found")
                        for date in dates:
                            results[date] = {
                                "status": "error",
                                "message": "No calendars found on page",
                                "error_type": "NAVIGATION_ERROR"
                            }
                        return self._summarize_results(results)
                    
                    # 月ごとに処理
                    for year_month, month_dates in grouped_dates.items():
                        self.log_info(f"\n--- Processing month: {year_month} ({len(month_dates)} dates) ---")
                        
                        # 最初の日付を使って月を特定
                        target_month_date = datetime.strptime(month_dates[0], "%Y-%m-%d")
                        
                        # 各スタジオのカレンダーを対象月に移動（一度だけ）
                        moved_calendars = []
                        for studio_name, calendar in calendars:
                            if self.navigate_to_month(page, calendar, target_month_date):
                                moved_calendars.append((studio_name, calendar))
                                self.log_info(f"Moved {studio_name} calendar to {year_month}")
                            else:
                                self.log_warning(f"Failed to navigate {studio_name} to {year_month}")
                        
                        # この月の各日付を処理
                        for date in month_dates:
                            target_date = datetime.strptime(date, "%Y-%m-%d")
                            target_day = target_date.day
                            self.log_info(f"\nProcessing date: {date} (day {target_day})")
                            
                            date_results = []
                            
                            # 各スタジオのデータを取得
                            for studio_name, calendar in moved_calendars:
                                self.log_info(f"Extracting data for {studio_name} on {date}")
                                
                                # 日付セルを特定
                                date_cell = self.find_date_cell(calendar, target_day)
                                
                                if not date_cell:
                                    self.log_warning(f"Date cell not found for {studio_name} on day {target_day}")
                                    continue
                                
                                # 時刻情報を抽出
                                time_slots = self.extract_time_slots(date_cell)
                                
                                # 結果を追加
                                date_results.append({
                                    "centerName": self.get_center_name(),
                                    "facilityName": studio_name,
                                    "roomName": self.get_room_name(studio_name),
                                    "timeSlots": time_slots,
                                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                                })
                            
                            # この日付のデータが取得できた場合、即座にDB保存
                            if date_results:
                                if self._save_to_cosmos_immediately(date, date_results):
                                    results[date] = {
                                        "status": "success",
                                        "data": date_results
                                    }
                                    self.log_info(f"✅ Successfully saved data for {date}")
                                else:
                                    results[date] = {
                                        "status": "error",
                                        "message": "Failed to save to database",
                                        "error_type": "DATABASE_ERROR"
                                    }
                                    self.log_warning(f"⚠️ Failed to save data for {date}")
                            else:
                                results[date] = {
                                    "status": "error",
                                    "message": "No data found for this date",
                                    "error_type": "NO_DATA_FOUND"
                                }
                                self.log_warning(f"No data found for {date}")
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            self.log_error(f"Error during multiple dates scraping: {e}")
            # 処理されていない日付にエラーを設定
            for date in dates:
                if date not in results:
                    results[date] = {
                        "status": "error",
                        "message": f"Processing failed: {str(e)}",
                        "error_type": "SCRAPING_ERROR",
                        "details": str(e)
                    }
        
        # 結果をサマリー化
        summary = self._summarize_results(results)
        
        self.log_info(f"\n=== Ensemble Studio multiple dates scraping completed ===")
        self.log_info(f"Success: {summary['summary']['success']}/{summary['summary']['total']}")
        
        return summary
