"""
目黒区施設予約システムのスクレイピング
SPAシステムのため、画面遷移を含む複雑な操作を実装
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from playwright.sync_api import Page, Locator
from .base import BaseScraper
from ..types.time_slots import TimeSlots, validate_time_slots


class MeguroScraper(BaseScraper):
    """目黒区施設予約システム用スクレイパー"""
    
    def __init__(self, log_level=None):
        super().__init__(log_level)
        # クリックした部屋の情報を保存する辞書
        # key: (facility_name, room_name), value: table_index
        self.clicked_rooms = {}
    
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
    
    def get_center_name(self) -> str:
        """センター名を返す"""
        return "目黒区民センター"
    
    def get_room_name(self, facility_name: str) -> str:
        """部屋名を返す（目黒区の場合は施設ごとに異なる）"""
        # MeguroScraperでは個別の部屋名が後で設定されるため、ここでは一時的な値
        return "部屋名"
    
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
        self.log_info("Navigating to facility search...")
        
        try:
            # ページが完全に読み込まれるまで待つ
            self.log_info("Waiting for page to be fully loaded...")
            page.wait_for_load_state("networkidle", timeout=10000)
            
            # 「施設種類から探す」をクリック
            self.log_info("Looking for '施設種類から探す' button...")
            
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
                        self.log_info(f"Found '施設種類から探す' button with selector: {selector}")
                        break
                except:
                    continue
            
            if not facility_type_button:
                self.log_error("Could not find '施設種類から探す' button")
                self.log_info("Page title:", page.title())
                self.log_info("Available buttons:", page.locator("button").all_text_contents()[:5])
                return False
            
            # クリック前に要素が表示されているか確認
            if not facility_type_button.is_visible():
                self.log_info("Button found but not visible, waiting...")
                facility_type_button.wait_for(state="visible", timeout=5000)
            
            facility_type_button.click()
            self.log_info("Clicked '施設種類から探す' button")
            page.wait_for_timeout(3000)  # SPAの遷移を待つ
            
            # 「集会施設・学校施設」をクリック
            self.log_info("Looking for '集会施設・学校施設' option...")
            
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
                        self.log_info(f"Found '集会施設・学校施設' option with selector: {selector}")
                        break
                except:
                    continue
            
            if not meeting_facility_option:
                self.log_error("Could not find '集会施設・学校施設' option")
                self.log_info("Available options:", page.locator("a, button, label").all_text_contents()[:10])
                return False
            
            # クリック前に要素が表示されているか確認
            if not meeting_facility_option.is_visible():
                self.log_info("Option found but not visible, waiting...")
                meeting_facility_option.wait_for(state="visible", timeout=5000)
            
            meeting_facility_option.click()
            self.log_info("Clicked '集会施設・学校施設' option")
            page.wait_for_timeout(3000)  # SPAの遷移を待つ
            
            # 「音楽室」をクリック
            self.log_info("Looking for '音楽室' category...")
            
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
                        self.log_info(f"Found '音楽室' category with selector: {selector}")
                        break
                except:
                    continue
            
            if not music_room_option:
                self.log_error("Could not find '音楽室' category")
                self.log_info("Available categories:", page.locator("label").all_text_contents()[:10])
                return False
            
            # クリック前に要素が表示されているか確認
            if not music_room_option.is_visible():
                self.log_info("Category found but not visible, waiting...")
                music_room_option.wait_for(state="visible", timeout=5000)
            
            music_room_option.click()
            self.log_info("Clicked '音楽室' category")
            page.wait_for_timeout(3000)  # SPAの遷移を待つ
            
            # 「検索」ボタンをクリック
            self.log_info("Looking for search button...")
            
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
                        self.log_info(f"Found search button with selector: {selector}")
                        break
                except:
                    continue
            
            if search_button:
                search_button.click()
                self.log_info("Clicked search button")
                page.wait_for_timeout(3000)
            else:
                # 最後の手段: 表示されている検索ボタンを順番に試す
                self.log_info("Trying to find visible search buttons...")
                all_search_buttons = page.locator("text=検索").all()
                self.log_info(f"Found {len(all_search_buttons)} elements with '検索' text")
                
                clicked = False
                for i, btn in enumerate(all_search_buttons):
                    try:
                        if btn.is_visible():
                            self.log_info(f"Clicking visible search button {i+1}")
                            btn.click()
                            clicked = True
                            page.wait_for_timeout(3000)
                            break
                    except:
                        continue
                
                if not clicked:
                    self.log_error("Could not click any search button")
                    return False
            
            # ページ遷移を待つ
            self.log_info("Waiting for page navigation after search...")
            page.wait_for_load_state("networkidle", timeout=10000)
            page.wait_for_timeout(2000)  # 追加の待機
            
            # 施設検索画面に到達したか確認
            self.log_info("Verifying navigation to facility search page...")
            
            # URLで判定
            if "WgR_ModeSelect" not in page.url:
                self.log_info("Successfully navigated away from mode select page")
                return True
            
            # breadcrumbを確認（エラーを防ぐためtry-except使用）
            try:
                breadcrumb = page.locator(".breadcrumbs").first
                if breadcrumb.count() > 0:
                    breadcrumb_text = breadcrumb.text_content()
                    self.log_info(f"Breadcrumb text: {breadcrumb_text}")
                    if "施設の検索" in breadcrumb_text or "施設検索" in breadcrumb_text:
                        self.log_info("Successfully reached facility search page (confirmed by breadcrumb)")
                        return True
                else:
                    self.log_info("No breadcrumb found, checking page content...")
            except Exception as e:
                self.log_info(f"Error checking breadcrumb: {e}")
            
            # ページタイトルでも確認
            try:
                page_content = page.content()
                if "施設検索" in page_content:
                    self.log_info("Successfully reached facility search page (confirmed by page content)")
                    return True
            except Exception as e:
                self.log_info(f"Error checking page content: {e}")
                
            self.log_warning("Could not confirm facility search page")
            return False
            
        except Exception as e:
            self.log_info(f"ERROR in navigate_to_facility_search: {e}")
            self.log_info(f"Page title: {page.title()}")
            import traceback
            self.log_info(f"Traceback: {traceback.format_exc()}")
            
            # デバッグ用: ページのスクリーンショットを保存
            try:
                screenshot_path = "/tmp/meguro_navigation_error.png"
                page.screenshot(path=screenshot_path)
                self.log_info(f"Screenshot saved to: {screenshot_path}")
            except:
                pass
            
            return False
    
    def select_facilities(self, page: Page) -> bool:
        """
        施設を選択（複数選択）
        
        Returns:
            成功した場合True
        """
        self.log_info("Selecting facilities...")
        
        try:
            selected_count = 0
            
            for facility_name in self.studios:
                self.log_info(f"Selecting {facility_name}...")
                
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
                            # チェックボックスの状態変更を待つ
                            try:
                                page.wait_for_function(
                                    f"document.querySelector('{selector}').checked || document.querySelector('input[name=\"checkShisetsu\"]:checked') !== null",
                                    timeout=1000
                                )
                            except:
                                page.wait_for_timeout(200)  # フォールバック
                            self.log_debug(f"  Selected {facility_name}")
                            break
                    except:
                        continue
                else:
                    self.log_debug(f"  Warning: Could not select {facility_name}")
            
            if selected_count == 0:
                self.log_info("Error: No facilities were selected")
                return False
            
            self.log_info(f"Selected {selected_count} facilities")
            return True
            
        except Exception as e:
            self.log_info(f"Error selecting facilities: {e}")
            return False
    
    def navigate_to_calendar(self, page: Page) -> bool:
        """
        施設選択後、カレンダー画面へ遷移
        
        Returns:
            成功した場合True
        """
        self.log_info("Navigating to calendar...")
        
        try:
            # 「次へ進む」ボタンをクリック
            self.log_info("Looking for '次へ進む' button...")
            
            # まず、画面上のボタンやリンクを詳しく調査
            all_buttons = page.locator("button, input[type='submit'], input[type='button'], a").all()
            self.log_info(f"Found {len(all_buttons)} button/link elements")
            
            # デバッグ: すべてのボタン/リンクを表示
            for i, btn in enumerate(all_buttons[:10]):  # 最初の10個だけ
                try:
                    if btn.is_visible():
                        btn_text = btn.text_content() or ""
                        btn_value = btn.get_attribute("value") or ""
                        btn_type = btn.get_attribute("type") or ""
                        tag_name = btn.evaluate("el => el.tagName")
                        if btn_text or btn_value:
                            self.log_debug(f"  Button {i}: tag={tag_name}, type={btn_type}, text='{btn_text[:30]}', value='{btn_value[:30]}'")
                except:
                    pass
            
            # 「次へ」や「進む」を含むテキストを持つ要素を探す
            next_button = None
            for btn in all_buttons:
                try:
                    if btn.is_visible():
                        btn_text = btn.text_content() or ""
                        btn_value = btn.get_attribute("value") or ""
                        
                        if "次" in btn_text or "進" in btn_text or "次" in btn_value or "進" in btn_value or "Next" in btn_value:
                            self.log_debug(f"  >>> Found potential next button: text='{btn_text}', value='{btn_value}'")
                            next_button = btn
                            break
                except:
                    continue
            
            if not next_button:
                # より広範囲に探す
                self.log_info("Searching more broadly for navigation buttons...")
                next_button = page.locator("*:has-text('次へ'):visible").first
                if next_button.count() == 0:
                    next_button = page.locator("*:has-text('進む'):visible").first
            
            if next_button and next_button.count() > 0:
                self.log_info("Clicking next/forward button...")
                
                # クリック前に少し待つ（ページが完全に読み込まれることを確実にする）
                page.wait_for_timeout(1000)
                
                # フォーム送信の準備（必要な場合）
                # 施設が選択されているか確認
                selected_facilities = page.locator("input[name='checkShisetsu']:checked").all()
                self.log_debug(f"  {len(selected_facilities)} facilities are checked before clicking next")
                
                # JavaScriptでクリック（通常のクリックが効かない場合のため）
                try:
                    next_button.click(force=True)
                    self.log_info("Button clicked with force=True")
                except:
                    # 通常のクリック
                    next_button.click()
                    self.log_info("Button clicked normally")
            else:
                self.log_error("Could not find '次へ進む' button")
                return False
            
            self.log_info("Clicked '次へ進む' button, waiting for navigation...")
            
            # ページ遷移を待つ（URLの変化またはコンテンツの変化を待つ）
            try:
                # SPAなのでコンテンツの変化を待つ
                self.log_info("Waiting for page transition in SPA...")
                
                # 施設のチェックボックスが消えるのを待つ（ページが切り替わった証拠）
                try:
                    page.wait_for_function(
                        "document.querySelectorAll('input[name=\"checkShisetsu\"]:visible').length === 0",
                        timeout=10000
                    )
                    self.log_info("Facility checkboxes disappeared - page likely changed")
                except:
                    self.log_warning("Facility checkboxes still visible after timeout")
                
                # さらに待機
                page.wait_for_timeout(3000)
                
                # ページが更新されるのを待つ（日付入力フィールドが現れるまで待つ）
                self.log_info("Waiting for calendar page elements...")
                try:
                    # 日付入力フィールドが存在するか確認（これが施設別空き状況画面の特徴）
                    page.wait_for_selector("#dpStartDate, input[name='textDate'], .joken", timeout=10000)
                    self.log_info("Date input field or .joken section appeared")
                except:
                    self.log_warning("Date input field did not appear within timeout")
                
            except Exception as e:
                self.log_info(f"Error waiting for page transition: {e}")
            
            # 施設別空き状況画面に到達したか確認
            self.log_info("Verifying navigation to calendar page...")
            
            # デバッグ: 現在のURLを確認
            current_url = page.url
            self.log_info(f"Current page URL (partial): ...{current_url[-50:]}")
            
            # ページタイトルを確認
            page_title = page.title()
            self.log_info(f"Page title: {page_title}")
            
            # ページ内容で確認
            page_content = page.content()
            if "施設別空き状況" in page_content:
                self.log_info("Found '施設別空き状況' in page content")
                
                # 施設別空き状況が見つかった場合、実際にその画面要素が表示されているか確認
                # SPAの場合、テキストは存在するが非表示の可能性がある
                try:
                    # 施設別空き状況のヘッダーまたはタイトルが表示されているか
                    header = page.locator("h1:has-text('施設別空き状況'), h2:has-text('施設別空き状況'), .title:has-text('施設別空き状況')").first
                    if header.count() > 0 and header.is_visible():
                        self.log_debug("  '施設別空き状況' header is visible")
                        return True
                    else:
                        self.log_debug("  '施設別空き状況' text found but header not visible")
                except:
                    pass
                    
            if "表示開始日" in page_content:
                self.log_info("Found '表示開始日' in page content")
                
                # 表示開始日のラベルが実際に表示されているか確認
                try:
                    date_label = page.locator("label:has-text('表示開始日'), dt:has-text('表示開始日')").first
                    if date_label.count() > 0 and date_label.is_visible():
                        self.log_debug("  '表示開始日' label is visible - on calendar page")
                        return True
                    else:
                        self.log_debug("  '表示開始日' text found but label not visible")
                except:
                    pass
            
            # breadcrumbでも確認
            try:
                breadcrumb = page.locator(".breadcrumbs, .topicpath").first
                if breadcrumb.count() > 0:
                    breadcrumb_text = breadcrumb.text_content()
                    self.log_info(f"Breadcrumb text: {breadcrumb_text}")
                    if "施設別空き状況" in breadcrumb_text or "空き状況" in breadcrumb_text:
                        self.log_info("Successfully reached calendar page (confirmed by breadcrumb)")
                        return True
            except:
                pass
            
            # 施設のチェックボックスが残っているか確認（まだ施設選択画面の可能性）
            facility_checkboxes = page.locator("input[name='checkShisetsu']").all()
            if len(facility_checkboxes) > 0:
                self.log_warning(f"Still seeing {len(facility_checkboxes)} facility checkboxes - might still be on facility selection page")
                
                # デバッグ用スクリーンショット（必要に応じて）
                # page.screenshot(path="/tmp/debug_after_next.png")
                # self.log_info("Screenshot saved to /tmp/debug_after_next.png")
                
                # もう一度「次へ進む」を探してクリック
                self.log_info("Trying to click '次へ進む' again...")
                try:
                    next_button = page.locator("button:has-text('次へ進む'):visible, input[value='次へ進む']:visible").first
                    if next_button.count() > 0:
                        next_button.click()
                        page.wait_for_timeout(5000)
                        self.log_info("Clicked '次へ進む' again, checking result...")
                        
                        # 再度確認
                        if "施設別空き状況" in page.content() or "表示開始日" in page.content():
                            self.log_info("Successfully navigated after second click")
                            return True
                except:
                    pass
                
            self.log_warning("Could not confirm calendar page")
            return False
            
        except Exception as e:
            self.log_info(f"Error navigating to calendar: {e}")
            return False
    
    def navigate_to_target_month(self, page: Page, target_date: datetime) -> bool:
        """
        表示開始日を入力してカレンダーを更新（目黒区用）
        
        Returns:
            成功した場合True
        """
        # 日付を YYYY/MM/DD 形式に変換
        date_str = target_date.strftime("%Y/%m/%d")
        self.log_info(f"Setting display start date to {date_str}...")
        
        try:
            # ページが完全にロードされるまで待つ
            self.log_info("Waiting for page elements to load...")
            page.wait_for_timeout(2000)
            
            # タブやステップがある場合、施設別空き状況タブをクリック
            self.log_info("Checking for tabs or steps...")
            try:
                # 施設別空き状況タブまたはステップを探す
                tab = page.locator("a:has-text('施設別空き状況'), li:has-text('施設別空き状況'), .tab:has-text('施設別空き状況')").first
                if tab.count() > 0 and tab.is_visible():
                    self.log_info("Found '施設別空き状況' tab/step, clicking it...")
                    tab.click()
                    page.wait_for_timeout(2000)
            except:
                pass
            
            # 「表示開始日」のinput要素を探す（ID指定）
            self.log_info("Looking for display start date input...")
            
            # まず要素が存在するのを待つ
            try:
                page.wait_for_selector("#dpStartDate", timeout=5000)
                date_input = page.locator("#dpStartDate")
                self.log_info("Found date input with id='dpStartDate'")
            except:
                # ID指定で見つからない場合、代替セレクタを試す
                self.log_info("ID selector failed, trying alternative selectors...")
                try:
                    page.wait_for_selector("input[name='textDate']", timeout=3000)
                    date_input = page.locator("input[name='textDate']")
                    self.log_info("Found date input with name='textDate'")
                except:
                    try:
                        page.wait_for_selector("input.hasDatepicker", timeout=3000)
                        date_input = page.locator("input.hasDatepicker")
                        self.log_info("Found date input with class='hasDatepicker'")
                    except:
                        # より広範囲に探す - すべてのinput要素を調査
                        self.log_info("Searching for any input field...")
                        all_inputs = page.locator("input").all()
                        self.log_info(f"Found {len(all_inputs)} input fields total")
                        
                        # デバッグ: すべてのinput要素の詳細を表示
                        date_input = None
                        for i, inp in enumerate(all_inputs):
                            try:
                                input_type = inp.get_attribute("type") or "none"
                                input_id = inp.get_attribute("id") or ""
                                input_name = inp.get_attribute("name") or ""
                                input_value = inp.get_attribute("value") or ""
                                input_placeholder = inp.get_attribute("placeholder") or ""
                                is_visible = inp.is_visible()
                                
                                if is_visible:
                                    self.log_debug(f"  Input {i}: type={input_type}, id={input_id}, name={input_name}, value={input_value[:20] if len(input_value) > 20 else input_value}, visible={is_visible}")
                                    
                                    # dpStartDate IDを持つものを優先
                                    if input_id == "dpStartDate":
                                        date_input = inp
                                        self.log_debug("    >>> Found target input with id='dpStartDate'!")
                                        break
                                    
                                    # 日付っぽい値を持つものを探す
                                    if "/" in input_value or "/" in input_placeholder or "date" in input_name.lower() or "Date" in input_id:
                                        date_input = inp
                                        self.log_debug("    >>> Selected as date input candidate")
                            except Exception as e:
                                self.log_debug(f"  Error checking input {i}: {e}")
                        
                        if not date_input:
                            self.log_error("Could not find date input field with any method")
                            # ページの一部を表示してデバッグ
                            try:
                                self.log_info("\nDebugging page content...")
                                
                                # スクリーンショットを撮影
                                screenshot_path = "/tmp/debug_calendar_page.png"
                                page.screenshot(path=screenshot_path)
                                self.log_info(f"Screenshot saved to {screenshot_path}")
                                
                                # .jokenセクションを探す
                                joken = page.locator(".joken")
                                if joken.count() > 0:
                                    self.log_info(f"Found {joken.count()} .joken section(s)")
                                    # 最初のjokenセクションの内容を表示
                                    inner_text = joken.first.inner_text()[:500]
                                    self.log_info(f"Joken section text: {inner_text}")
                                else:
                                    self.log_info("No .joken section found")
                                
                                # フォーム要素を探す
                                forms = page.locator("form")
                                self.log_info(f"Found {forms.count()} form(s)")
                                
                                # 表示開始日というテキストを探す
                                start_date_label = page.locator("text=表示開始日")
                                if start_date_label.count() > 0:
                                    self.log_info(f"Found '表示開始日' label")
                                    # ラベルの親要素を取得
                                    parent = start_date_label.first.locator("..")
                                    parent_html = parent.inner_html()[:500]
                                    self.log_info(f"Parent element HTML: {parent_html}")
                                else:
                                    self.log_info("No '表示開始日' label found")
                                    
                                # ページタイトルの確認
                                title = page.title()
                                self.log_info(f"Page title: {title}")
                                
                            except Exception as e:
                                self.log_info(f"Debug error: {e}")
                            return False
            
            # 既存の値をクリアして新しい日付を入力
            date_input.click()
            page.wait_for_timeout(500)
            
            # Control+Aで全選択してから入力
            date_input.press("Control+a")
            page.wait_for_timeout(100)
            date_input.fill(date_str)
            page.wait_for_timeout(500)
            self.log_info(f"Entered date: {date_str}")
            
            # 「表示」ボタンをクリック
            self.log_info("Looking for display button...")
            
            # まずすべてのボタンを調査
            all_buttons = page.locator("button, input[type='submit'], input[type='button'], a.btn").all()
            self.log_info(f"Found {len(all_buttons)} button elements on page")
            
            # 表示ボタンを探す
            display_button = None
            for btn in all_buttons:
                try:
                    if btn.is_visible():
                        btn_text = btn.text_content() or ""
                        btn_value = btn.get_attribute("value") or ""
                        btn_onclick = btn.get_attribute("onclick") or ""
                        
                        # デバッグ出力（表示に関連するボタンのみ）
                        if "表示" in btn_text or "表示" in btn_value or "Display" in btn_value or "search" in btn_onclick.lower():
                            tag_name = btn.evaluate("el => el.tagName")
                            self.log_debug(f"  Potential display button: tag={tag_name}, text='{btn_text}', value='{btn_value}', onclick='{btn_onclick[:50] if btn_onclick else ''}'")
                            
                            if "表示" in btn_text or "表示" in btn_value:
                                display_button = btn
                                self.log_debug("    >>> Selected as display button")
                                break
                except:
                    continue
            
            if not display_button:
                # より広範囲に探す
                self.log_info("Searching more broadly for display button...")
                display_button = page.locator("*:has-text('表示'):visible").first
                if display_button.count() == 0:
                    # 画像ボタンの可能性もチェック
                    display_button = page.locator("input[type='image'][alt*='表示']").first
            
            if display_button and display_button.count() > 0:
                self.log_info("Clicking display button...")
                try:
                    display_button.click(force=True)
                    self.log_info("Display button clicked with force=True")
                except:
                    display_button.click()
                    self.log_info("Display button clicked normally")
            else:
                self.log_error("Could not find display button")
                
                # デバッグ: 日付入力フィールド周辺のHTML構造を確認
                try:
                    date_input_parent = date_input.locator("../..")
                    parent_html = date_input_parent.inner_html()[:1000]
                    self.log_info(f"Date input parent HTML: {parent_html}")
                except:
                    pass
                    
                return False
            
            # ページのリロードを待つ
            self.log_info("Waiting for page reload...")
            page.wait_for_load_state("networkidle", timeout=10000)
            page.wait_for_timeout(2000)  # 追加の待機
            
            # 再度「施設別空き状況」画面が表示されていることを確認
            if "施設別空き状況" in page.content():
                self.log_info("Successfully updated calendar display")
                return True
            else:
                self.log_warning("Could not confirm calendar update")
                return False
                
        except Exception as e:
            self.log_info(f"Error in navigate_to_target_month: {e}")
            import traceback
            self.log_info(f"Traceback: {traceback.format_exc()}")
            return False
    
    def select_date_and_navigate(self, page: Page, target_date: datetime) -> bool:
        """
        カレンダーヘッダーから対象日付のカラムをクリックして時間帯別空き状況画面へ遷移
        
        Returns:
            成功した場合True
        """
        target_day = target_date.day
        self.log_info(f"Selecting date columns for day {target_day}...")
        
        try:
            # クリックした部屋情報をリセット
            self.clicked_rooms = {}
            
            # すべてのカレンダーテーブルを取得
            calendar_tables = page.locator("table").all()
            self.log_info(f"Found {len(calendar_tables)} calendar tables")
            
            selected_count = 0
            
            # 各カレンダーテーブルで対象日のカラムを特定し、データセルをクリック
            for i, table in enumerate(calendar_tables):
                try:
                    # デバッグ: テーブルにクラスがあるか確認
                    table_class = table.get_attribute("class") or ""
                    
                    # まずヘッダー行から対象日のカラムインデックスを特定
                    headers = table.locator("thead th").all()
                    
                    if i < 3:  # 最初の3つのテーブルだけデバッグ出力
                        self.log_info(f"Table {i} (class='{table_class}'): {len(headers)} header cells")
                    
                    target_column_index = -1
                    
                    for j, header in enumerate(headers):
                        header_text = header.text_content() or ""
                        
                        # デバッグ: 最初のテーブルのヘッダーテキストを表示
                        if i == 0 and header_text.strip():
                            self.log_debug(f"    Header {j}: '{header_text.strip()}'")
                        
                        if header_text:
                            # 日付を含むヘッダーを探す
                            import re
                            patterns = [
                                r'(\d{1,2})日',     # 10日
                                r'^(\d{1,2})[月火水木金土日]',  # 10水
                                r'^(\d{1,2})$',     # 10（数字のみ）
                                r'/(\d{1,2})$',     # 9/10の10部分
                            ]
                            
                            for pattern in patterns:
                                match = re.search(pattern, header_text.strip())
                                if match:
                                    day = int(match.group(1))
                                    if day == target_day:
                                        target_column_index = j
                                        self.log_info(f"Found target date in table {i}, column {j}: '{header_text.strip()}'")
                                        break
                            
                            if target_column_index >= 0:
                                break
                    
                    # 対象日のカラムが見つかった場合、そのカラムのデータセルをクリック
                    if target_column_index >= 0:
                        # まず、このテーブルが属する施設名を特定
                        facility_name = None
                        try:
                            # テーブルの前にある施設名を探す（親要素を辿る）
                            parent_item = table.locator("..").first
                            max_depth = 5
                            current_depth = 0
                            
                            while parent_item.count() > 0 and current_depth < max_depth:
                                # h3タグの施設名を探す
                                h3_elem = parent_item.locator("h3 a").first
                                if h3_elem.count() > 0:
                                    facility_name = h3_elem.text_content().strip()
                                    self.log_debug(f"  Found facility name for table {i}: {facility_name}")
                                    break
                                # 親要素を更に遡る
                                parent_item = parent_item.locator("..").first
                                current_depth += 1
                            
                            if not facility_name:
                                # 施設名が見つからない場合、デフォルト値を使用
                                facility_name = f"Facility_{i}"
                                self.log_debug(f"  Warning: Could not find facility name for table {i}, using: {facility_name}")
                        except:
                            facility_name = f"Facility_{i}"
                            self.log_debug(f"  Error finding facility name for table {i}, using: {facility_name}")
                        
                        # tbody内の各行を取得
                        rows = table.locator("tbody tr").all()
                        self.log_debug(f"  Table {i} has {len(rows)} rows in tbody")
                        
                        table_selections = 0
                        for row_idx, row in enumerate(rows):
                            # 各行の対象カラムのセルを取得
                            cells = row.locator("td").all()
                            
                            # デバッグ：最初の行の内容を確認
                            if row_idx == 0 and len(cells) > 0:
                                first_cell_text = cells[0].text_content().strip()
                                self.log_debug(f"    Row 0, first cell: '{first_cell_text[:50] if len(first_cell_text) > 50 else first_cell_text}'")
                            
                            if target_column_index < len(cells):
                                # 部屋名を取得（最初のセル、spanタグを除外）
                                room_name = None
                                if len(cells) > 0:
                                    room_name_cell = cells[0]
                                    # spanタグを除外してテキストを取得
                                    try:
                                        # JavaScriptでspanタグを除去してテキストを取得
                                        room_name = room_name_cell.evaluate("""
                                            el => {
                                                const clone = el.cloneNode(true);
                                                clone.querySelectorAll('span').forEach(s => s.remove());
                                                return clone.textContent.trim();
                                            }
                                        """)
                                    except:
                                        # フォールバック: 通常のテキスト取得
                                        room_name = room_name_cell.text_content().strip()
                                    
                                    # 改行・余分な空白を正規化
                                    room_name = ' '.join(room_name.split())
                                    
                                    if not room_name:
                                        room_name = f"Room_{row_idx}"
                                else:
                                    room_name = f"Room_{row_idx}"
                                
                                target_cell = cells[target_column_index]
                                cell_text = target_cell.text_content().strip()
                                
                                # −マーク（ハイフン）がある場合はスキップ（後でunknownとして処理）
                                if "−" in cell_text or "-" in cell_text or "ー" in cell_text:
                                    self.log_debug(f"    Row {row_idx}: Skipping cell with dash ('{cell_text}')")
                                    continue
                                
                                # 休館かどうかチェック
                                is_closed = "休館" in cell_text
                                
                                # その他のセル（○、×、休館、空白など）は全てクリック対象
                                self.log_debug(f"    Row {row_idx} ({room_name}): Processing cell ('{cell_text}')...")
                                
                                # クリック可能な要素を探す
                                clicked = False
                                
                                try:
                                    # 1. まずチェックボックスの存在を確認
                                    checkbox = target_cell.locator("input[type='checkbox']").first
                                    if checkbox.count() > 0:
                                        # チェックボックスが存在する場合
                                        is_checked_before = checkbox.is_checked()
                                        self.log_debug(f"      Found checkbox (checked={is_checked_before})")
                                        
                                        # ラベルがあればラベルをクリック、なければチェックボックスを直接クリック
                                        label = target_cell.locator("label").first
                                        if label.count() > 0 and label.is_visible():
                                            label_text = label.text_content().strip()
                                            self.log_debug(f"      Clicking label: '{label_text}'...")
                                            label.click(timeout=2000)
                                        else:
                                            self.log_debug("      Clicking checkbox directly...")
                                            checkbox.click(timeout=2000)
                                        
                                        # クリック後の状態を確認
                                        page.wait_for_timeout(500)
                                        is_checked_after = checkbox.is_checked()
                                        
                                        if is_checked_after != is_checked_before:
                                            clicked = True
                                            self.log_debug(f"      ✓ Checkbox state changed: {is_checked_before} -> {is_checked_after}")
                                        else:
                                            self.log_debug("      WARNING: Checkbox state unchanged after click")
                                    else:
                                        # チェックボックスがない場合
                                        self.log_debug("      No checkbox found in cell")
                                        
                                        # ラベルだけ存在する可能性をチェック
                                        label = target_cell.locator("label").first
                                        if label.count() > 0:
                                            label_text = label.text_content().strip()
                                            self.log_debug(f"      Found label without checkbox: '{label_text}' - cell may not be selectable")
                                        else:
                                            self.log_debug("      No interactive elements found - cell may not be selectable")
                                    
                                    # クリックが成功した場合のみ情報を保存
                                    if clicked:
                                        table_selections += 1
                                        selected_count += 1
                                        self.clicked_rooms[(facility_name, room_name)] = {
                                            'table_idx': i,
                                            'is_closed': is_closed
                                        }
                                        self.log_debug(f"      Successfully selected: {facility_name}/{room_name} (closed={is_closed})")
                                    else:
                                        self.log_debug(f"      Could not select: {facility_name}/{room_name} - cell may be display-only")
                                    
                                    page.wait_for_timeout(300)
                                except Exception as e:
                                    # クリック要素がない場合
                                    self.log_debug(f"      Failed to click row {row_idx} (cell text: '{cell_text}'): {str(e)[:50]}")
                        
                        if table_selections > 0:
                            self.log_debug(f"  Selected {table_selections} cells in table {i}")
                
                except Exception as e:
                    self.log_info(f"Error processing table {i}: {e}")
            
            if selected_count == 0:
                self.log_warning(f"No columns found for day {target_day}")
                return False
            
            self.log_info(f"Selected {selected_count} date columns")
            
            # 選択されたセルの確認
            self.log_info("Verifying selected cells before navigation...")
            
            # チェックされているチェックボックスの数を確認
            checked_boxes = page.locator("input[type='checkbox']:checked").all()
            self.log_debug(f"  {len(checked_boxes)} checkboxes are checked")
            if len(checked_boxes) > 0:
                for i, box in enumerate(checked_boxes[:3]):  # 最初の3つを表示
                    try:
                        parent_cell = box.locator("..").first
                        cell_text = parent_cell.text_content().strip() if parent_cell.count() > 0 else "unknown"
                        self.log_debug(f"    Checked box {i}: '{cell_text[:50]}'")
                    except:
                        pass
            
            # 選択されたセル（クラスなどで識別）も確認
            selected_cells = page.locator("td.selected, td.active, td[class*='select'], td[class*='check']").all()
            self.log_debug(f"  {len(selected_cells)} cells appear selected")
            
            # 少なくとも1つ以上選択されていることを確認
            total_selections = len(checked_boxes) + len(selected_cells)
            if total_selections == 0:
                self.log_info("WARNING: No cells appear to be selected!")
                # デバッグ: ラベルをクリックしてみる
                self.log_info("Attempting to select at least one available cell by clicking label...")
                available_cells = page.locator("td:has-text('○'), td:has-text('◯')").all()[:3]
                for cell in available_cells:
                    try:
                        # ラベルを探してクリック
                        label = cell.locator("label").first
                        if label.count() > 0:
                            label_text = label.text_content().strip()
                            self.log_debug(f"  Clicking label: '{label_text}'")
                            label.click(timeout=2000)
                        else:
                            cell_text = cell.text_content().strip()
                            self.log_debug(f"  Clicking cell: '{cell_text}'")
                            cell.click(timeout=2000)
                        page.wait_for_timeout(500)
                        break
                    except:
                        continue
            
            # 「次へ進む」ボタンをクリック
            self.log_info("Looking for 'Next' button...")
            
            # より具体的なセレクタを使用
            next_button = None
            button_text = ""
            
            # まず正確なテキストマッチを試す
            next_button = page.locator("button", has_text="次へ進む").first
            if next_button.count() > 0:
                button_text = next_button.text_content().strip()
                self.log_debug(f"  Found button element with text: '{button_text}'")
            
            if next_button.count() == 0:
                next_button = page.locator("input[type='submit'][value='次へ進む']").first
                if next_button.count() > 0:
                    button_text = next_button.get_attribute("value") or ""
                    self.log_debug(f"  Found input[submit] element with value: '{button_text}'")
            
            if next_button.count() == 0:
                next_button = page.locator("a", has_text="次へ進む").first
                if next_button.count() > 0:
                    button_text = next_button.text_content().strip()
                    self.log_debug(f"  Found anchor element with text: '{button_text}'")
            
            if next_button and next_button.count() > 0:
                self.log_info(f"Clicking next button: '{button_text}'...")
                
                # ボタンの状態を確認
                is_enabled = next_button.is_enabled()
                is_visible = next_button.is_visible()
                self.log_debug(f"  Button state: enabled={is_enabled}, visible={is_visible}")
                
                # onclick属性を確認
                onclick = next_button.get_attribute("onclick") or ""
                if onclick:
                    self.log_debug(f"  Button onclick: '{onclick[:100]}'")
                
                # フォーカスを当ててからクリック
                next_button.focus()
                page.wait_for_timeout(200)
                
                # クリック前のURL/ページ状態を記録
                initial_content = page.locator(".breadcrumbs li.current span").text_content() if page.locator(".breadcrumbs li.current span").count() > 0 else ""
                self.log_debug(f"  Current breadcrumb before click: {initial_content}")
                
                # クリック実行（forceオプションも試す）
                next_button.click(force=True)
                self.log_debug(f"  Clicked button: '{button_text}'")
                
                # ページ遷移を待つ（複数の方法で）
                self.log_info("Waiting for page transition...")
                
                # 方法1: ネットワークアイドルを待つ
                try:
                    page.wait_for_load_state("networkidle", timeout=10000)
                except:
                    self.log_debug("  Network idle timeout, continuing...")
                
                # 方法2: DOM変更を待つ
                try:
                    page.wait_for_function(
                        "document.querySelector('.breadcrumbs li.current span')?.textContent?.includes('時間帯別空き状況')",
                        timeout=5000
                    )
                    self.log_debug("  Detected breadcrumb change to time slot page")
                except:
                    self.log_debug("  Breadcrumb change not detected, checking other indicators...")
                
                # 方法3: 新しい要素の出現を待つ
                try:
                    page.wait_for_selector("th:has-text('午前')", timeout=5000)
                    self.log_debug("  Time slot headers appeared")
                except:
                    self.log_debug("  Time slot headers not found")
                
                # 追加の待機
                page.wait_for_timeout(3000)
                
            else:
                self.log_error("Could not find next button")
                # デバッグ: ページ上のボタンを列挙
                all_buttons = page.locator("button, input[type='submit'], a.btn").all()[:10]
                self.log_debug(f"  Found {len(all_buttons)} buttons on page:")
                for i, btn in enumerate(all_buttons):
                    try:
                        text = btn.text_content() or btn.get_attribute("value") or ""
                        if text.strip():
                            self.log_debug(f"    Button {i}: '{text.strip()}'")
                    except:
                        pass
                return False
            
            # 時間帯別空き状況画面に到達したか確認
            self.log_info("Verifying navigation to time slot page...")
            
            # 複数の方法で確認
            is_on_time_slot_page = False
            
            # 1. ブレッドクラムで確認
            breadcrumb_current = page.locator(".breadcrumbs li.current span").first
            if breadcrumb_current.count() > 0:
                current_page = breadcrumb_current.text_content().strip()
                self.log_info(f"Current page (breadcrumb): {current_page}")
                
                if "時間帯別空き状況" in current_page:
                    self.log_info("✓ Breadcrumb confirms time slot page")
                    is_on_time_slot_page = True
            
            # 2. ページタイトルで確認
            if not is_on_time_slot_page:
                h2_title = page.locator("h2").first
                if h2_title.count() > 0:
                    title_text = h2_title.text_content().strip()
                    if "時間帯別空き状況" in title_text:
                        self.log_info(f"✓ Page title confirms time slot page: {title_text}")
                        is_on_time_slot_page = True
            
            # 3. 時間帯ヘッダーの存在で確認（午前、午後、夜間）
            if not is_on_time_slot_page:
                time_headers = page.locator("th:has-text('午前'), th:has-text('午後'), th:has-text('夜間')").all()
                if len(time_headers) > 0:
                    self.log_info(f"✓ Found {len(time_headers)} time slot headers")
                    is_on_time_slot_page = True
            
            # 4. ページコンテンツで確認
            if not is_on_time_slot_page:
                page_content = page.content()
                if "時間帯別空き状況" in page_content:
                    self.log_info("✓ Page content contains '時間帯別空き状況'")
                    is_on_time_slot_page = True
            
            if is_on_time_slot_page:
                self.log_info("Successfully reached time slot page!")
                # スクリーンショットを保存（デバッグ用）
                try:
                    page.screenshot(path="/tmp/time_slot_page.png")
                    self.log_debug("  Screenshot saved to /tmp/time_slot_page.png")
                except:
                    pass
                return True
            else:
                self.log_error("Failed to reach time slot page")
                
                # デバッグ：現在のページの状態を詳細に確認
                self.log_info("\nDEBUG: Current page analysis...")
                
                # カレンダーテーブルの存在
                calendars = page.locator("table.calendar").all()
                if calendars and len(calendars) > 0:
                    self.log_debug(f"  Still showing {len(calendars)} calendar tables")
                    first_headers = calendars[0].locator("thead th").all()[:5]
                    if first_headers:
                        header_texts = [h.text_content().strip() for h in first_headers]
                        self.log_debug(f"  First calendar headers: {header_texts}")
                
                # フォームの状態
                forms = page.locator("form").all()
                self.log_debug(f"  {len(forms)} forms on page")
                
                # エラーメッセージの確認
                error_msgs = page.locator(".error, .alert, .warning, [class*='err']").all()
                if error_msgs:
                    self.log_debug(f"  Found {len(error_msgs)} potential error messages")
                    for msg in error_msgs[:2]:
                        try:
                            text = msg.text_content().strip()[:100]
                            if text:
                                self.log_debug(f"    Error: {text}")
                        except:
                            pass
                
                # スクリーンショット保存
                try:
                    page.screenshot(path="/tmp/failed_navigation.png")
                    self.log_debug("  Debug screenshot saved to /tmp/failed_navigation.png")
                except:
                    pass
                
                return False
            
        except Exception as e:
            self.log_info(f"Error selecting date: {e}")
            return False
    
    def extract_time_slots_from_row(self, cells: List[Locator], time_slots_map: Dict[int, str]) -> Dict[str, str]:
        """
        行のセルから時間帯情報を抽出するヘルパーメソッド
        
        Args:
            cells: 行内のすべてのセル
            time_slots_map: カラムインデックスと時間帯のマッピング
            
        Returns:
            時間帯情報の辞書
        """
        room_slots = {}
        
        # セルのインデックス2以降が時間帯データ
        for cell_idx in range(2, len(cells)):
            if cell_idx in time_slots_map:
                cell = cells[cell_idx]
                cell_text = cell.text_content().strip()
                slot_key = time_slots_map[cell_idx]
                
                # 空き状況を判定
                if "○" in cell_text or "◯" in cell_text:
                    status = "available"
                elif "×" in cell_text or "✕" in cell_text:
                    status = "booked"
                elif "－" in cell_text or "-" in cell_text or "−" in cell_text:
                    status = "unknown"
                else:
                    # チェックボックスがある場合は空きと判定
                    checkbox = cell.locator("input[type='checkbox']").first
                    if checkbox.count() > 0:
                        status = "available"
                    else:
                        status = "unknown"
                
                room_slots[slot_key] = status
        
        # 午後1と午後2を統合（パターンBの場合）
        if "afternoon_1" in room_slots and "afternoon_2" in room_slots:
            # 両方空いている場合
            if room_slots["afternoon_1"] == "available" and room_slots["afternoon_2"] == "available":
                room_slots["afternoon"] = "available"
            # 午後1のみ予約済み
            elif room_slots["afternoon_1"] == "booked" and room_slots["afternoon_2"] == "available":
                room_slots["afternoon"] = "booked_1"
            # 午後2のみ予約済み
            elif room_slots["afternoon_1"] == "available" and room_slots["afternoon_2"] == "booked":
                room_slots["afternoon"] = "booked_2"
            # 両方予約済み
            elif room_slots["afternoon_1"] == "booked" and room_slots["afternoon_2"] == "booked":
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
        
        return room_slots
    
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
        self.log_info("Extracting time slots for all facilities...")
        self.log_debug(f"  Using clicked room information: {len(self.clicked_rooms)} rooms")
        for (facility, room), room_info in self.clicked_rooms.items():
            closed_status = "closed" if room_info.get('is_closed') else "open"
            self.log_debug(f"    - {facility}/{room} (table {room_info.get('table_idx', 'N/A')}, {closed_status})")
        
        results = {}
        
        try:
            # クリックした部屋がない場合はエラー
            if not self.clicked_rooms:
                self.log_error("No clicked rooms found. Cannot extract time slots.")
                return {}
            
            # clicked_roomsの各部屋に対して直接検索
            for (facility_name, room_name), room_info in self.clicked_rooms.items():
                self.log_info(f"\nSearching for room: {facility_name} - {room_name}")
                
                # 施設の結果を初期化
                if facility_name not in results:
                    results[facility_name] = {}
                
                # 休館の部屋は直接unavailableとして処理
                if room_info.get('is_closed'):
                    self.log_debug("  Room is closed (休館) - setting all slots to unavailable")
                    results[facility_name][room_name] = {
                        "morning": "unavailable",
                        "afternoon": "unavailable",
                        "evening": "unavailable"
                    }
                    continue
                
                # すべてのテーブル行を取得
                all_rows = page.locator("tbody tr").all()
                self.log_debug(f"  Total rows on page: {len(all_rows)}")
                
                found = False
                for row in all_rows:
                    try:
                        # 行の最初のセル（部屋名）を取得
                        cells = row.locator("td").all()
                        if len(cells) < 3:  # 部屋名、定員、時間帯が最低限必要
                            continue
                        
                        # 最初のセルから部屋名を取得（spanタグを除外）
                        first_cell = cells[0]
                        try:
                            # spanタグを除外してテキストを取得
                            cell_text = first_cell.evaluate("""
                                el => {
                                    const clone = el.cloneNode(true);
                                    clone.querySelectorAll('span').forEach(s => s.remove());
                                    return clone.textContent.trim();
                                }
                            """)
                        except:
                            cell_text = first_cell.text_content().strip()
                        
                        # 改行・余分な空白を正規化
                        cell_text = ' '.join(cell_text.split())
                        
                        # 完全一致または部分一致をチェック
                        if cell_text == room_name or room_name in cell_text:
                            self.log_debug(f"    Found matching row: '{cell_text}'")
                            found = True
                            
                            # この行が属するテーブルのヘッダーを取得
                            # 行の親要素（tbody）→ その親（table）を辿る
                            parent_table = row.locator("../..")  # tr -> tbody -> table
                            headers = parent_table.locator("thead th").all()
                            
                            self.log_debug(f"    Table has {len(headers)} headers")
                            
                            # 時間帯マッピングを作成
                            time_slots_map = {}
                            for j, header in enumerate(headers):
                                header_text = header.text_content().strip()
                                if j >= 2:  # 最初の2つは施設名と定員
                                    slot_key = None
                                    if "午前" in header_text:
                                        slot_key = "morning"
                                    elif "午後" in header_text and ("1" in header_text or "１" in header_text):
                                        slot_key = "afternoon_1"
                                    elif "午後" in header_text and ("2" in header_text or "２" in header_text):
                                        slot_key = "afternoon_2"
                                    elif "午後" in header_text:
                                        slot_key = "afternoon"
                                    elif "夜間" in header_text:
                                        slot_key = "evening"
                                    
                                    if slot_key:
                                        time_slots_map[j] = slot_key
                                        self.log_debug(f"      Header {j}: '{header_text}' -> {slot_key}")
                            
                            # 時間帯情報を抽出
                            room_slots = {}
                            for cell_idx in range(2, len(cells)):
                                if cell_idx in time_slots_map:
                                    cell = cells[cell_idx]
                                    cell_content = cell.text_content().strip()
                                    slot_key = time_slots_map[cell_idx]
                                    
                                    # 空き状況を判定
                                    if "－" in cell_content or "-" in cell_content or "−" in cell_content:
                                        status = "unknown"
                                    elif "○" in cell_content or "◯" in cell_content:
                                        status = "available"
                                    elif "×" in cell_content or "✕" in cell_content:
                                        status = "booked"
                                    elif "△" in cell_content:
                                        # 三角は部分的に予約済み（とりあえずavailableとする）
                                        status = "available"
                                    else:
                                        # チェックボックスの存在をチェック
                                        checkbox = cell.locator("input[type='checkbox']").first
                                        if checkbox.count() > 0:
                                            status = "available"
                                        else:
                                            status = "unknown"
                                    
                                    room_slots[slot_key] = status
                                    self.log_debug(f"        {slot_key}: {status}")
                            
                            # 午後1と午後2を統合
                            if "afternoon_1" in room_slots and "afternoon_2" in room_slots:
                                if room_slots["afternoon_1"] == "available" and room_slots["afternoon_2"] == "available":
                                    room_slots["afternoon"] = "available"
                                elif room_slots["afternoon_1"] == "booked" and room_slots["afternoon_2"] == "booked":
                                    room_slots["afternoon"] = "booked"
                                else:
                                    room_slots["afternoon"] = "booked"  # 片方でも予約済みなら予約済みとする
                                
                                del room_slots["afternoon_1"]
                                del room_slots["afternoon_2"]
                            
                            # 不足している時間帯を補完
                            for slot in ["morning", "afternoon", "evening"]:
                                if slot not in room_slots:
                                    room_slots[slot] = "unknown"
                            
                            # 結果に保存
                            results[facility_name][room_name] = room_slots
                            break  # この部屋の処理は完了
                            
                    except Exception as e:
                        self.log_debug(f"    Error processing row: {e}")
                        continue
                
                if not found:
                    self.log_debug(f"    WARNING: Room '{room_name}' not found on page")
                    # 見つからなかった部屋はunknownで埋める
                    results[facility_name][room_name] = {
                        "morning": "unknown",
                        "afternoon": "unknown",
                        "evening": "unknown"
                    }
            
            return results
            
        except Exception as e:
            self.log_info(f"Error extracting time slots: {e}")
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
        self.log_info(f"\n=== Starting Meguro scraping for {date} ===")
        
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
                    self.log_info(f"Accessing: {self.base_url}")
                    response = page.goto(self.base_url, wait_until="networkidle", timeout=60000)
                    
                    # 施設検索画面へ遷移
                    if not self.navigate_to_facility_search(page):
                        self.log_info("Error: Failed to navigate to facility search")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 施設を選択
                    if not self.select_facilities(page):
                        self.log_info("Error: Failed to select facilities")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # カレンダー画面へ遷移
                    if not self.navigate_to_calendar(page):
                        self.log_info("Error: Failed to navigate to calendar")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 目標月へ移動
                    if not self.navigate_to_target_month(page, target_date):
                        self.log_info("Error: Failed to navigate to target month")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 日付を選択して時間帯画面へ
                    if not self.select_date_and_navigate(page, target_date):
                        self.log_info("Error: Failed to select date")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 全施設の時間帯情報を取得
                    all_time_slots = self.extract_all_time_slots(page)
                    
                    if not all_time_slots:
                        self.log_warning("No time slot data extracted")
                        raise RuntimeError("Scraping failed - no default data should be saved")
                    
                    # 結果を整形（3層構造で各部屋ごとに個別レコード）
                    results = []
                    for facility_name, rooms in all_time_slots.items():
                        # 各部屋ごとに個別レコードを作成
                        for room_name, room_slots in rooms.items():
                            # room_slotsを型定義に合わせて検証
                            # afternoon の特殊処理（booked_1, booked_2 を booked に統一）
                            normalized_slots = {}
                            for key, value in room_slots.items():
                                if key == "afternoon" and value in ["booked_1", "booked_2"]:
                                    normalized_slots[key] = "booked"
                                else:
                                    normalized_slots[key] = value
                            
                            # 型検証を実行
                            try:
                                validated_slots = validate_time_slots(normalized_slots)
                            except ValueError as e:
                                self.log_warning(f"Invalid time slots for {facility_name} - {room_name}: {e}")
                                validated_slots = {
                                    "morning": "unknown",
                                    "afternoon": "unknown", 
                                    "evening": "unknown"
                                }
                            
                            results.append({
                                "centerName": "目黒区民センター",
                                "facilityName": facility_name,
                                "roomName": room_name,
                                "date": date,
                                "timeSlots": validated_slots,
                                "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                            })
                    
                    return results
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            self.log_info(f"Error during scraping: {e}")
            import traceback
            traceback.print_exc()
            raise