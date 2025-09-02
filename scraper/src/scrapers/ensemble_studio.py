"""
あんさんぶるスタジオの予約状況をスクレイピング
人間の操作に近い方法でPlaywrightのlocatorを使用してDOM要素を探索
"""
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from playwright.sync_api import Page, Locator, sync_playwright
from .base import BaseScraper


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
            {"morning": "available|booked|unknown", ...}
        """
        time_slots = {}
        
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
        
        # 見つからない時間帯はunknown
        for slot in ["morning", "afternoon", "evening"]:
            if slot not in time_slots:
                time_slots[slot] = "unknown"
                print(f"  {slot}: unknown (not found)")
        
        return time_slots
    
