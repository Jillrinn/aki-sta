"""
目黒区施設予約システムのスクレイピング
SPAシステムのため、画面遷移を含む複雑な操作を実装
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from playwright.sync_api import Page, Locator
from .base import BaseScraper


class MeguroScraper(BaseScraper):
    """目黒区施設予約システム用スクレイパー"""
    
    def get_base_url(self) -> str:
        """施設のベースURLを返す"""
        return "https://resv.city.meguro.tokyo.jp/Web/Home/WgR_ModeSelect"
    
    def get_studios(self) -> List[str]:
        """施設のスタジオリストを返す"""
        return [
            "田道住区センター三田分室",
            "上目黒住区センター",
            "めぐろパーシモンホール",
            "東山社会教育館",
            "中央町社会教育館",
            "緑が丘文化会館"
        ]
    
    def wait_for_calendar_load(self, page: Page):
        """
        カレンダーの読み込みを待つ（目黒区用にオーバーライド）
        """
        # 目黒区のカレンダーは通常のカレンダーと異なるセレクタを使用
        page.wait_for_timeout(3000)  # SPAの遷移を待つ
    
    def navigate_to_facility_search(self, page: Page) -> bool:
        """
        トップページから施設検索画面まで遷移
        
        Returns:
            成功した場合True
        """
        print("Navigating to facility search...")
        print(f"Current URL: {page.url}")
        
        try:
            # ページが完全に読み込まれるまで待つ
            print("Waiting for page to be fully loaded...")
            page.wait_for_load_state("networkidle", timeout=10000)
            
            # 「施設種類から探す」をクリック
            print("Looking for '施設種類から探す' button...")
            
            # 複数のセレクタを試す
            selectors = [
                "text=施設種類から探す",
                "button:has-text('施設種類から探す')",
                "a:has-text('施設種類から探す')",
                "//button[contains(text(), '施設種類から探す')]",
                "//a[contains(text(), '施設種類から探す')]"
            ]
            
            facility_type_button = None
            for selector in selectors:
                try:
                    element = page.locator(selector).first
                    if element.count() > 0:
                        facility_type_button = element
                        print(f"Found '施設種類から探す' button with selector: {selector}")
                        break
                except:
                    continue
            
            if not facility_type_button:
                print("ERROR: Could not find '施設種類から探す' button")
                print("Page title:", page.title())
                print("Available buttons:", page.locator("button").all_text_contents()[:5])
                return False
            
            # クリック前に要素が表示されているか確認
            if not facility_type_button.is_visible():
                print("Button found but not visible, waiting...")
                facility_type_button.wait_for(state="visible", timeout=5000)
            
            facility_type_button.click()
            print("Clicked '施設種類から探す' button")
            page.wait_for_timeout(3000)  # SPAの遷移を待つ
            
            # 「集会施設・学校施設」をクリック
            print("Looking for '集会施設・学校施設' option...")
            print(f"Current URL after first click: {page.url}")
            
            # 複数のセレクタを試す
            meeting_selectors = [
                "text=集会施設・学校施設",
                "button:has-text('集会施設・学校施設')",
                "a:has-text('集会施設・学校施設')",
                "label:has-text('集会施設・学校施設')"
            ]
            
            meeting_facility_option = None
            for selector in meeting_selectors:
                try:
                    element = page.locator(selector).first
                    if element.count() > 0:
                        meeting_facility_option = element
                        print(f"Found '集会施設・学校施設' option with selector: {selector}")
                        break
                except:
                    continue
            
            if not meeting_facility_option:
                print("ERROR: Could not find '集会施設・学校施設' option")
                print("Available options:", page.locator("a, button, label").all_text_contents()[:10])
                return False
            
            # クリック前に要素が表示されているか確認
            if not meeting_facility_option.is_visible():
                print("Option found but not visible, waiting...")
                meeting_facility_option.wait_for(state="visible", timeout=5000)
            
            meeting_facility_option.click()
            print("Clicked '集会施設・学校施設' option")
            page.wait_for_timeout(3000)  # SPAの遷移を待つ
            
            # 「音楽室」をクリック
            print("Looking for '音楽室' category...")
            print(f"Current URL after second click: {page.url}")
            
            # 複数のセレクタを試す
            music_selectors = [
                "text=音楽室",
                "button:has-text('音楽室')",
                "a:has-text('音楽室')",
                "label:has-text('音楽室')",
                "input[type='checkbox'] + label:has-text('音楽室')"
            ]
            
            music_room_option = None
            for selector in music_selectors:
                try:
                    element = page.locator(selector).first
                    if element.count() > 0:
                        music_room_option = element
                        print(f"Found '音楽室' category with selector: {selector}")
                        break
                except:
                    continue
            
            if not music_room_option:
                print("ERROR: Could not find '音楽室' category")
                print("Available categories:", page.locator("label").all_text_contents()[:10])
                return False
            
            # クリック前に要素が表示されているか確認
            if not music_room_option.is_visible():
                print("Category found but not visible, waiting...")
                music_room_option.wait_for(state="visible", timeout=5000)
            
            music_room_option.click()
            print("Clicked '音楽室' category")
            page.wait_for_timeout(3000)  # SPAの遷移を待つ
            
            # 「検索」ボタンをクリック
            print("Looking for search button...")
            
            # 複数の検索ボタンセレクタを試す
            search_selectors = [
                "button:has-text('検索'):visible",
                "input[type='submit'][value='検索']:visible",
                "button.btn-primary:has-text('検索')",
                "button.btn:has-text('検索')",
                "//button[text()='検索' and not(contains(@style,'display:none'))]"
            ]
            
            search_button = None
            for selector in search_selectors:
                try:
                    element = page.locator(selector).first
                    if element.count() > 0 and element.is_visible():
                        search_button = element
                        print(f"Found search button with selector: {selector}")
                        break
                except:
                    continue
            
            if search_button:
                search_button.click()
                print("Clicked search button")
                page.wait_for_timeout(3000)
            else:
                # 最後の手段: 表示されている検索ボタンを順番に試す
                print("Trying to find visible search buttons...")
                all_search_buttons = page.locator("text=検索").all()
                print(f"Found {len(all_search_buttons)} elements with '検索' text")
                
                clicked = False
                for i, btn in enumerate(all_search_buttons):
                    try:
                        if btn.is_visible():
                            print(f"Clicking visible search button {i+1}")
                            btn.click()
                            clicked = True
                            page.wait_for_timeout(3000)
                            break
                    except:
                        continue
                
                if not clicked:
                    print("ERROR: Could not click any search button")
                    return False
            
            # ページ遷移を待つ
            print("Waiting for page navigation after search...")
            page.wait_for_load_state("networkidle", timeout=10000)
            page.wait_for_timeout(2000)  # 追加の待機
            
            # 施設検索画面に到達したか確認
            print("Verifying navigation to facility search page...")
            print(f"Current URL after search: {page.url}")
            
            # URLで判定
            if "WgR_ModeSelect" not in page.url:
                print("Successfully navigated away from mode select page")
                return True
            
            # breadcrumbを確認（エラーを防ぐためtry-except使用）
            try:
                breadcrumb = page.locator(".breadcrumbs").first
                if breadcrumb.count() > 0:
                    breadcrumb_text = breadcrumb.text_content()
                    print(f"Breadcrumb text: {breadcrumb_text}")
                    if "施設の検索" in breadcrumb_text or "施設検索" in breadcrumb_text:
                        print("Successfully reached facility search page (confirmed by breadcrumb)")
                        return True
                else:
                    print("No breadcrumb found, checking page content...")
            except Exception as e:
                print(f"Error checking breadcrumb: {e}")
            
            # ページタイトルでも確認
            try:
                page_content = page.content()
                if "施設検索" in page_content:
                    print("Successfully reached facility search page (confirmed by page content)")
                    return True
            except Exception as e:
                print(f"Error checking page content: {e}")
                
            print("Warning: Could not confirm facility search page")
            print("Current URL:", page.url)
            return False
            
        except Exception as e:
            print(f"ERROR in navigate_to_facility_search: {e}")
            print(f"Final URL: {page.url}")
            print(f"Page title: {page.title()}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            
            # デバッグ用: ページのスクリーンショットを保存
            try:
                screenshot_path = "/tmp/meguro_navigation_error.png"
                page.screenshot(path=screenshot_path)
                print(f"Screenshot saved to: {screenshot_path}")
            except:
                pass
            
            return False
    
    def select_facilities(self, page: Page) -> bool:
        """
        施設を選択（複数選択）
        
        Returns:
            成功した場合True
        """
        print("Selecting facilities...")
        
        try:
            selected_count = 0
            
            for facility_name in self.studios:
                print(f"Selecting {facility_name}...")
                
                # チェックボックスを探す（複数の方法を試す）
                checkbox_selectors = [
                    f"label:has-text('{facility_name}')",
                    f"text={facility_name}",
                    f"input[type='checkbox'] + label:has-text('{facility_name}')"
                ]
                
                for selector in checkbox_selectors:
                    try:
                        element = page.locator(selector).first
                        if element.count() > 0:
                            element.click()
                            selected_count += 1
                            page.wait_for_timeout(500)
                            print(f"  Selected {facility_name}")
                            break
                    except:
                        continue
                else:
                    print(f"  Warning: Could not select {facility_name}")
            
            if selected_count == 0:
                print("Error: No facilities were selected")
                return False
            
            print(f"Selected {selected_count} facilities")
            return True
            
        except Exception as e:
            print(f"Error selecting facilities: {e}")
            return False
    
    def navigate_to_calendar(self, page: Page) -> bool:
        """
        施設選択後、カレンダー画面へ遷移
        
        Returns:
            成功した場合True
        """
        print("Navigating to calendar...")
        
        try:
            # 「次へ進む」ボタンをクリック
            print("Looking for '次へ進む' button...")
            next_selectors = [
                "button:has-text('次へ進む'):visible",
                "input[type='submit'][value='次へ進む']:visible",
                "button.btn:has-text('次へ進む')",
                "text=次へ進む"
            ]
            
            clicked = False
            for selector in next_selectors:
                try:
                    element = page.locator(selector).first
                    if element.count() > 0:
                        print(f"Found '次へ進む' button with selector: {selector}")
                        element.click()
                        clicked = True
                        break
                except:
                    continue
            
            if not clicked:
                print("ERROR: Could not find '次へ進む' button")
                return False
            
            print("Clicked '次へ進む' button, waiting for navigation...")
            page.wait_for_timeout(3000)
            
            # 施設別空き状況画面に到達したか確認
            print("Verifying navigation to calendar page...")
            print(f"Current URL: {page.url}")
            
            # ページ内容で確認
            if "施設別空き状況" in page.content():
                print("Successfully reached calendar page (confirmed by page content)")
                return True
            
            # breadcrumbでも確認
            try:
                breadcrumb = page.locator(".breadcrumbs").first
                if breadcrumb.count() > 0:
                    breadcrumb_text = breadcrumb.text_content()
                    print(f"Breadcrumb text: {breadcrumb_text}")
                    if "施設別空き状況" in breadcrumb_text:
                        print("Successfully reached calendar page (confirmed by breadcrumb)")
                        return True
            except:
                pass
                
            print("Warning: Could not confirm calendar page")
            return False
            
        except Exception as e:
            print(f"Error navigating to calendar: {e}")
            return False
    
    def navigate_to_target_month(self, page: Page, target_date: datetime) -> bool:
        """
        カレンダーを目標の月まで移動（目黒区用）
        
        Returns:
            成功した場合True
        """
        target_year = target_date.year
        target_month = target_date.month
        print(f"Navigating to {target_year}年{target_month}月...")
        
        max_iterations = 12
        
        for iteration in range(max_iterations):
            print(f"Iteration {iteration + 1}")
            
            # カレンダーの日付セルから年月を推測
            # まず、カレンダーテーブルを探す
            calendar_tables = page.locator("table.calendar, table").all()
            
            if not calendar_tables:
                print("Warning: No calendar tables found")
                return False
            
            # 最初のカレンダーから日付を取得
            first_calendar = calendar_tables[0]
            
            # 日付リンクを探す
            date_cells = first_calendar.locator("td a").all()
            
            if date_cells:
                # 最初の日付リンクのhrefから年月を抽出
                for cell in date_cells[:5]:  # 最初の5つをチェック
                    href = cell.get_attribute("href")
                    if href:
                        # hrefから日付情報を抽出 (YYYYMMDD形式を期待)
                        import re
                        date_match = re.search(r'(\d{8})', href)
                        if date_match:
                            date_str = date_match.group(1)
                            current_year = int(date_str[:4])
                            current_month = int(date_str[4:6])
                            print(f"Current calendar shows: {current_year}年{current_month}月")
                            break
                else:
                    # hrefから取得できない場合、テキストから推測
                    print("Could not extract date from href, trying alternative method...")
                    # 現在の月のデフォルト値を使用
                    from datetime import datetime as dt
                    current_year = dt.now().year
                    current_month = dt.now().month
                    print(f"Using current date as fallback: {current_year}年{current_month}月")
            
            else:
                print("Warning: No date cells found in calendar")
                return False
            
            # 目標月に到達したか確認
            if current_year == target_year and current_month == target_month:
                print(f"Reached target month: {target_year}年{target_month}月")
                return True
            
            # 移動方向を決定
            if target_year > current_year or (target_year == current_year and target_month > current_month):
                # 次月へ移動（右矢印）
                print("Moving to next month...")
                next_arrows = page.locator("a[title='次へ'], button:has-text('>')").all()
                if next_arrows:
                    next_arrows[0].click()
                    page.wait_for_timeout(2000)
                else:
                    print("No next month button found")
                    return False
            else:
                # 前月へ移動（左矢印）
                print("Moving to previous month...")
                prev_arrows = page.locator("a[title='前へ'], button:has-text('<')").all()
                if prev_arrows:
                    prev_arrows[0].click()
                    page.wait_for_timeout(2000)
                else:
                    print("No previous month button found")
                    return False
        
        print(f"Could not reach target month after {max_iterations} iterations")
        return False
    
    def select_date_and_navigate(self, page: Page, target_date: datetime) -> bool:
        """
        対象日付を選択して時間帯別空き状況画面へ遷移
        
        Returns:
            成功した場合True
        """
        target_day = target_date.day
        print(f"Selecting date: {target_day}日...")
        
        try:
            # 全てのカレンダーから対象日を探す
            # 目黒区は複数施設のカレンダーが表示される
            date_links = page.locator(f"a:has-text('{target_day}')").all()
            
            if not date_links:
                print(f"Warning: Date {target_day} not found")
                return False
            
            # 最初の有効な日付リンクをクリック
            date_links[0].click()
            page.wait_for_timeout(2000)
            
            # 「次へ進む」ボタンをクリック
            next_button = page.locator("button:has-text('次へ進む'), input[type='submit'][value='次へ進む']").first
            if next_button.count() > 0:
                next_button.click()
            else:
                page.click("text=次へ進む")
            
            page.wait_for_timeout(3000)
            
            # 時間帯別空き状況画面に到達したか確認
            breadcrumb = page.locator(".breadcrumbs").first
            if breadcrumb.count() > 0:
                breadcrumb_text = breadcrumb.text_content()
                if "時間帯別空き状況" in breadcrumb_text:
                    print("Successfully reached time slot page")
                    return True
            
            # ページ内容でも確認
            if "時間帯別空き状況" in page.content():
                print("Successfully reached time slot page (confirmed by page content)")
                return True
                
            print("Warning: Could not confirm time slot page")
            return False
            
        except Exception as e:
            print(f"Error selecting date: {e}")
            return False
    
    def extract_all_time_slots(self, page: Page) -> Dict[str, Dict[str, Dict[str, str]]]:
        """
        全施設・全部屋の時間帯情報を抽出
        
        Returns:
            {
                "施設名": {
                    "部屋名": {
                        "morning": "available|booked|unknown",
                        "afternoon": "available|booked|unknown",
                        "evening": "available|booked|unknown"
                    }
                }
            }
        """
        print("Extracting time slots for all facilities...")
        results = {}
        
        try:
            # 施設ごとのセクションを取得
            facility_sections = page.locator(".item").all()
            
            for section in facility_sections:
                # 施設名を取得
                facility_name_elem = section.locator("h3 a").first
                if facility_name_elem.count() == 0:
                    continue
                
                facility_name = facility_name_elem.text_content().strip()
                print(f"\nProcessing facility: {facility_name}")
                
                # この施設が対象リストに含まれているか確認
                if not any(studio in facility_name for studio in self.studios):
                    print(f"  Skipping (not in target list)")
                    continue
                
                results[facility_name] = {}
                
                # 部屋ごとのテーブルを取得
                room_headers = section.locator("h4").all()
                room_tables = section.locator("table.calendar").all()
                
                for i, (room_header, room_table) in enumerate(zip(room_headers, room_tables)):
                    room_name = room_header.text_content().strip()
                    print(f"  Processing room: {room_name}")
                    
                    # 時間帯ヘッダーを取得
                    time_headers = room_table.locator("th.header-time").all()
                    time_slots_map = {}
                    
                    for j, header in enumerate(time_headers):
                        header_text = header.text_content().strip()
                        
                        # 時間帯をキーにマッピング
                        if "午前" in header_text:
                            slot_key = "morning"
                        elif "午後" in header_text and "1" in header_text:
                            slot_key = "afternoon_1"
                        elif "午後" in header_text and "2" in header_text:
                            slot_key = "afternoon_2"
                        elif "午後" in header_text:
                            slot_key = "afternoon"
                        elif "夜間" in header_text:
                            slot_key = "evening"
                        else:
                            continue
                        
                        time_slots_map[j] = slot_key
                    
                    # 空き状況を取得（tbody内のtd要素）
                    status_cells = room_table.locator("tbody td").all()
                    
                    # 最初の2つのセルは施設名と定員なので、3番目から時間帯情報
                    time_slot_cells = status_cells[2:] if len(status_cells) > 2 else []
                    
                    room_slots = {}
                    for j, cell in enumerate(time_slot_cells):
                        if j in time_slots_map:
                            cell_text = cell.text_content().strip()
                            slot_key = time_slots_map[j]
                            
                            # 空き状況を判定
                            if "○" in cell_text or "◯" in cell_text:
                                status = "available"
                            elif "×" in cell_text or "✕" in cell_text:
                                status = "booked"
                            elif "－" in cell_text or "-" in cell_text:
                                status = "unknown"
                            else:
                                status = "unknown"
                            
                            room_slots[slot_key] = status
                            print(f"    {slot_key}: {status}")
                    
                    # 午後1と午後2を統合
                    if "afternoon_1" in room_slots and "afternoon_2" in room_slots:
                        # 両方空いている場合のみavailable
                        if room_slots["afternoon_1"] == "available" and room_slots["afternoon_2"] == "available":
                            room_slots["afternoon"] = "available"
                        elif room_slots["afternoon_1"] == "booked" or room_slots["afternoon_2"] == "booked":
                            room_slots["afternoon"] = "booked"
                        else:
                            room_slots["afternoon"] = "unknown"
                        
                        # 個別の午後1、午後2を削除
                        del room_slots["afternoon_1"]
                        del room_slots["afternoon_2"]
                    
                    # 不足している時間帯を補完
                    for slot in ["morning", "afternoon", "evening"]:
                        if slot not in room_slots:
                            room_slots[slot] = "unknown"
                    
                    results[facility_name][room_name] = room_slots
            
            return results
            
        except Exception as e:
            print(f"Error extracting time slots: {e}")
            return {}
    
    # BaseScraper抽象メソッドの実装（目黒区はSPAなので独自実装）
    
    def find_studio_calendars(self, page: Page) -> List[Tuple[str, Locator]]:
        """
        このメソッドは目黒区では使用しない（SPAのため）
        """
        # 目黒区はSPAで画面遷移するため、このメソッドは使用されない
        return []
    
    def navigate_to_month(self, page: Page, calendar: Locator, target_date: datetime) -> bool:
        """
        このメソッドは目黒区では navigate_to_target_month で代替
        """
        return self.navigate_to_target_month(page, target_date)
    
    def find_date_cell(self, calendar: Locator, target_day: int) -> Optional[Locator]:
        """
        このメソッドは目黒区では select_date_and_navigate で代替
        """
        # 目黒区はSPAで画面遷移するため、このメソッドは使用されない
        return None
    
    def extract_time_slots(self, day_box: Locator) -> Dict[str, str]:
        """
        このメソッドは目黒区では extract_all_time_slots で代替
        """
        # 目黒区はSPAで画面遷移するため、このメソッドは使用されない
        return {}
    
    def scrape_availability(self, date: str) -> List[Dict]:
        """
        指定日付の空き状況をスクレイピング（目黒区用にオーバーライド）
        
        Args:
            date: "YYYY-MM-DD"形式の日付文字列
        
        Returns:
            スタジオ空き状況のリスト
        """
        print(f"\n=== Starting Meguro scraping for {date} ===")
        
        # 日付をパース
        target_date = datetime.strptime(date, "%Y-%m-%d")
        
        try:
            from playwright.sync_api import sync_playwright
            
            with sync_playwright() as p:
                # ブラウザを起動
                browser = self.setup_browser(p)
                
                try:
                    context = self.create_browser_context(browser)
                    page = context.new_page()
                    
                    # トップページにアクセス
                    print(f"Accessing: {self.base_url}")
                    response = page.goto(self.base_url, wait_until="networkidle", timeout=60000)
                    
                    if response:
                        print(f"Response status: {response.status}")
                    
                    # 施設検索画面へ遷移
                    if not self.navigate_to_facility_search(page):
                        print("Error: Failed to navigate to facility search")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 施設を選択
                    if not self.select_facilities(page):
                        print("Error: Failed to select facilities")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # カレンダー画面へ遷移
                    if not self.navigate_to_calendar(page):
                        print("Error: Failed to navigate to calendar")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 目標月へ移動
                    if not self.navigate_to_target_month(page, target_date):
                        print("Error: Failed to navigate to target month")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 日付を選択して時間帯画面へ
                    if not self.select_date_and_navigate(page, target_date):
                        print("Error: Failed to select date")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 全施設の時間帯情報を取得
                    all_time_slots = self.extract_all_time_slots(page)
                    
                    if not all_time_slots:
                        print("Warning: No time slot data extracted")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 結果を整形
                    results = []
                    for facility_name, rooms in all_time_slots.items():
                        # 全部屋の状況を統合（最も空いている状態を採用）
                        combined_slots = {
                            "9-12": "unknown",
                            "13-17": "unknown",
                            "18-21": "unknown"
                        }
                        
                        for room_name, room_slots in rooms.items():
                            # morning -> 9-12
                            if room_slots.get("morning") == "available":
                                combined_slots["9-12"] = "available"
                            elif combined_slots["9-12"] != "available" and room_slots.get("morning") == "booked":
                                combined_slots["9-12"] = "booked"
                            
                            # afternoon -> 13-17
                            if room_slots.get("afternoon") == "available":
                                combined_slots["13-17"] = "available"
                            elif combined_slots["13-17"] != "available" and room_slots.get("afternoon") == "booked":
                                combined_slots["13-17"] = "booked"
                            
                            # evening -> 18-21
                            if room_slots.get("evening") == "available":
                                combined_slots["18-21"] = "available"
                            elif combined_slots["18-21"] != "available" and room_slots.get("evening") == "booked":
                                combined_slots["18-21"] = "booked"
                        
                        results.append({
                            "facilityName": facility_name,
                            "timeSlots": combined_slots,
                            "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                        })
                    
                    return results
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            print(f"Error during scraping: {e}")
            import traceback
            traceback.print_exc()
            raise