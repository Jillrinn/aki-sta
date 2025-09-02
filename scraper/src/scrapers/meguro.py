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
            return False
            
        except Exception as e:
            print(f"ERROR in navigate_to_facility_search: {e}")
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
            
            # まず、画面上のボタンやリンクを詳しく調査
            all_buttons = page.locator("button, input[type='submit'], input[type='button'], a").all()
            print(f"Found {len(all_buttons)} button/link elements")
            
            # デバッグ: すべてのボタン/リンクを表示
            for i, btn in enumerate(all_buttons[:10]):  # 最初の10個だけ
                try:
                    if btn.is_visible():
                        btn_text = btn.text_content() or ""
                        btn_value = btn.get_attribute("value") or ""
                        btn_type = btn.get_attribute("type") or ""
                        tag_name = btn.evaluate("el => el.tagName")
                        if btn_text or btn_value:
                            print(f"  Button {i}: tag={tag_name}, type={btn_type}, text='{btn_text[:30]}', value='{btn_value[:30]}'")
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
                            print(f"  >>> Found potential next button: text='{btn_text}', value='{btn_value}'")
                            next_button = btn
                            break
                except:
                    continue
            
            if not next_button:
                # より広範囲に探す
                print("Searching more broadly for navigation buttons...")
                next_button = page.locator("*:has-text('次へ'):visible").first
                if next_button.count() == 0:
                    next_button = page.locator("*:has-text('進む'):visible").first
            
            if next_button and next_button.count() > 0:
                print("Clicking next/forward button...")
                
                # クリック前に少し待つ（ページが完全に読み込まれることを確実にする）
                page.wait_for_timeout(1000)
                
                # フォーム送信の準備（必要な場合）
                # 施設が選択されているか確認
                selected_facilities = page.locator("input[name='checkShisetsu']:checked").all()
                print(f"  {len(selected_facilities)} facilities are checked before clicking next")
                
                # JavaScriptでクリック（通常のクリックが効かない場合のため）
                try:
                    next_button.click(force=True)
                    print("Button clicked with force=True")
                except:
                    # 通常のクリック
                    next_button.click()
                    print("Button clicked normally")
            else:
                print("ERROR: Could not find '次へ進む' button")
                return False
            
            print("Clicked '次へ進む' button, waiting for navigation...")
            
            # ページ遷移を待つ（URLの変化またはコンテンツの変化を待つ）
            try:
                # SPAなのでコンテンツの変化を待つ
                print("Waiting for page transition in SPA...")
                
                # 施設のチェックボックスが消えるのを待つ（ページが切り替わった証拠）
                try:
                    page.wait_for_function(
                        "document.querySelectorAll('input[name=\"checkShisetsu\"]:visible').length === 0",
                        timeout=10000
                    )
                    print("Facility checkboxes disappeared - page likely changed")
                except:
                    print("Warning: Facility checkboxes still visible after timeout")
                
                # さらに待機
                page.wait_for_timeout(3000)
                
                # ページが更新されるのを待つ（日付入力フィールドが現れるまで待つ）
                print("Waiting for calendar page elements...")
                try:
                    # 日付入力フィールドが存在するか確認（これが施設別空き状況画面の特徴）
                    page.wait_for_selector("#dpStartDate, input[name='textDate'], .joken", timeout=10000)
                    print("Date input field or .joken section appeared")
                except:
                    print("Warning: Date input field did not appear within timeout")
                
            except Exception as e:
                print(f"Error waiting for page transition: {e}")
            
            # 施設別空き状況画面に到達したか確認
            print("Verifying navigation to calendar page...")
            
            # デバッグ: 現在のURLを確認
            current_url = page.url
            print(f"Current page URL (partial): ...{current_url[-50:]}")
            
            # ページタイトルを確認
            page_title = page.title()
            print(f"Page title: {page_title}")
            
            # ページ内容で確認
            page_content = page.content()
            if "施設別空き状況" in page_content:
                print("Found '施設別空き状況' in page content")
                
                # 施設別空き状況が見つかった場合、実際にその画面要素が表示されているか確認
                # SPAの場合、テキストは存在するが非表示の可能性がある
                try:
                    # 施設別空き状況のヘッダーまたはタイトルが表示されているか
                    header = page.locator("h1:has-text('施設別空き状況'), h2:has-text('施設別空き状況'), .title:has-text('施設別空き状況')").first
                    if header.count() > 0 and header.is_visible():
                        print("  '施設別空き状況' header is visible")
                        return True
                    else:
                        print("  '施設別空き状況' text found but header not visible")
                except:
                    pass
                    
            if "表示開始日" in page_content:
                print("Found '表示開始日' in page content")
                
                # 表示開始日のラベルが実際に表示されているか確認
                try:
                    date_label = page.locator("label:has-text('表示開始日'), dt:has-text('表示開始日')").first
                    if date_label.count() > 0 and date_label.is_visible():
                        print("  '表示開始日' label is visible - on calendar page")
                        return True
                    else:
                        print("  '表示開始日' text found but label not visible")
                except:
                    pass
            
            # breadcrumbでも確認
            try:
                breadcrumb = page.locator(".breadcrumbs, .topicpath").first
                if breadcrumb.count() > 0:
                    breadcrumb_text = breadcrumb.text_content()
                    print(f"Breadcrumb text: {breadcrumb_text}")
                    if "施設別空き状況" in breadcrumb_text or "空き状況" in breadcrumb_text:
                        print("Successfully reached calendar page (confirmed by breadcrumb)")
                        return True
            except:
                pass
            
            # 施設のチェックボックスが残っているか確認（まだ施設選択画面の可能性）
            facility_checkboxes = page.locator("input[name='checkShisetsu']").all()
            if len(facility_checkboxes) > 0:
                print(f"Warning: Still seeing {len(facility_checkboxes)} facility checkboxes - might still be on facility selection page")
                
                # デバッグ用スクリーンショット（必要に応じて）
                # page.screenshot(path="/tmp/debug_after_next.png")
                # print("Screenshot saved to /tmp/debug_after_next.png")
                
                # もう一度「次へ進む」を探してクリック
                print("Trying to click '次へ進む' again...")
                try:
                    next_button = page.locator("button:has-text('次へ進む'):visible, input[value='次へ進む']:visible").first
                    if next_button.count() > 0:
                        next_button.click()
                        page.wait_for_timeout(5000)
                        print("Clicked '次へ進む' again, checking result...")
                        
                        # 再度確認
                        if "施設別空き状況" in page.content() or "表示開始日" in page.content():
                            print("Successfully navigated after second click")
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
        表示開始日を入力してカレンダーを更新（目黒区用）
        
        Returns:
            成功した場合True
        """
        # 日付を YYYY/MM/DD 形式に変換
        date_str = target_date.strftime("%Y/%m/%d")
        print(f"Setting display start date to {date_str}...")
        
        try:
            # ページが完全にロードされるまで待つ
            print("Waiting for page elements to load...")
            page.wait_for_timeout(2000)
            
            # タブやステップがある場合、施設別空き状況タブをクリック
            print("Checking for tabs or steps...")
            try:
                # 施設別空き状況タブまたはステップを探す
                tab = page.locator("a:has-text('施設別空き状況'), li:has-text('施設別空き状況'), .tab:has-text('施設別空き状況')").first
                if tab.count() > 0 and tab.is_visible():
                    print("Found '施設別空き状況' tab/step, clicking it...")
                    tab.click()
                    page.wait_for_timeout(2000)
            except:
                pass
            
            # 「表示開始日」のinput要素を探す（ID指定）
            print("Looking for display start date input...")
            
            # まず要素が存在するのを待つ
            try:
                page.wait_for_selector("#dpStartDate", timeout=5000)
                date_input = page.locator("#dpStartDate")
                print("Found date input with id='dpStartDate'")
            except:
                # ID指定で見つからない場合、代替セレクタを試す
                print("ID selector failed, trying alternative selectors...")
                try:
                    page.wait_for_selector("input[name='textDate']", timeout=3000)
                    date_input = page.locator("input[name='textDate']")
                    print("Found date input with name='textDate'")
                except:
                    try:
                        page.wait_for_selector("input.hasDatepicker", timeout=3000)
                        date_input = page.locator("input.hasDatepicker")
                        print("Found date input with class='hasDatepicker'")
                    except:
                        # より広範囲に探す - すべてのinput要素を調査
                        print("Searching for any input field...")
                        all_inputs = page.locator("input").all()
                        print(f"Found {len(all_inputs)} input fields total")
                        
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
                                    print(f"  Input {i}: type={input_type}, id={input_id}, name={input_name}, value={input_value[:20] if len(input_value) > 20 else input_value}, visible={is_visible}")
                                    
                                    # dpStartDate IDを持つものを優先
                                    if input_id == "dpStartDate":
                                        date_input = inp
                                        print(f"    >>> Found target input with id='dpStartDate'!")
                                        break
                                    
                                    # 日付っぽい値を持つものを探す
                                    if "/" in input_value or "/" in input_placeholder or "date" in input_name.lower() or "Date" in input_id:
                                        date_input = inp
                                        print(f"    >>> Selected as date input candidate")
                            except Exception as e:
                                print(f"  Error checking input {i}: {e}")
                        
                        if not date_input:
                            print("ERROR: Could not find date input field with any method")
                            # ページの一部を表示してデバッグ
                            try:
                                print("\nDebugging page content...")
                                
                                # スクリーンショットを撮影
                                screenshot_path = "/tmp/debug_calendar_page.png"
                                page.screenshot(path=screenshot_path)
                                print(f"Screenshot saved to {screenshot_path}")
                                
                                # .jokenセクションを探す
                                joken = page.locator(".joken")
                                if joken.count() > 0:
                                    print(f"Found {joken.count()} .joken section(s)")
                                    # 最初のjokenセクションの内容を表示
                                    inner_text = joken.first.inner_text()[:500]
                                    print(f"Joken section text: {inner_text}")
                                else:
                                    print("No .joken section found")
                                
                                # フォーム要素を探す
                                forms = page.locator("form")
                                print(f"Found {forms.count()} form(s)")
                                
                                # 表示開始日というテキストを探す
                                start_date_label = page.locator("text=表示開始日")
                                if start_date_label.count() > 0:
                                    print(f"Found '表示開始日' label")
                                    # ラベルの親要素を取得
                                    parent = start_date_label.first.locator("..")
                                    parent_html = parent.inner_html()[:500]
                                    print(f"Parent element HTML: {parent_html}")
                                else:
                                    print("No '表示開始日' label found")
                                    
                                # ページタイトルの確認
                                title = page.title()
                                print(f"Page title: {title}")
                                
                            except Exception as e:
                                print(f"Debug error: {e}")
                            return False
            
            # 既存の値をクリアして新しい日付を入力
            date_input.click()
            page.wait_for_timeout(500)
            
            # Control+Aで全選択してから入力
            date_input.press("Control+a")
            page.wait_for_timeout(100)
            date_input.fill(date_str)
            page.wait_for_timeout(500)
            print(f"Entered date: {date_str}")
            
            # 「表示」ボタンをクリック
            print("Looking for display button...")
            
            # まずすべてのボタンを調査
            all_buttons = page.locator("button, input[type='submit'], input[type='button'], a.btn").all()
            print(f"Found {len(all_buttons)} button elements on page")
            
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
                            print(f"  Potential display button: tag={tag_name}, text='{btn_text}', value='{btn_value}', onclick='{btn_onclick[:50] if btn_onclick else ''}'")
                            
                            if "表示" in btn_text or "表示" in btn_value:
                                display_button = btn
                                print(f"    >>> Selected as display button")
                                break
                except:
                    continue
            
            if not display_button:
                # より広範囲に探す
                print("Searching more broadly for display button...")
                display_button = page.locator("*:has-text('表示'):visible").first
                if display_button.count() == 0:
                    # 画像ボタンの可能性もチェック
                    display_button = page.locator("input[type='image'][alt*='表示']").first
            
            if display_button and display_button.count() > 0:
                print("Clicking display button...")
                try:
                    display_button.click(force=True)
                    print("Display button clicked with force=True")
                except:
                    display_button.click()
                    print("Display button clicked normally")
            else:
                print("ERROR: Could not find display button")
                
                # デバッグ: 日付入力フィールド周辺のHTML構造を確認
                try:
                    date_input_parent = date_input.locator("../..")
                    parent_html = date_input_parent.inner_html()[:1000]
                    print(f"Date input parent HTML: {parent_html}")
                except:
                    pass
                    
                return False
            
            # ページのリロードを待つ
            print("Waiting for page reload...")
            page.wait_for_load_state("networkidle", timeout=10000)
            page.wait_for_timeout(2000)  # 追加の待機
            
            # 再度「施設別空き状況」画面が表示されていることを確認
            if "施設別空き状況" in page.content():
                print("Successfully updated calendar display")
                return True
            else:
                print("Warning: Could not confirm calendar update")
                return False
                
        except Exception as e:
            print(f"Error in navigate_to_target_month: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return False
    
    def select_date_and_navigate(self, page: Page, target_date: datetime) -> bool:
        """
        カレンダーヘッダーから対象日付のカラムをクリックして時間帯別空き状況画面へ遷移
        
        Returns:
            成功した場合True
        """
        target_day = target_date.day
        print(f"Selecting date columns for day {target_day}...")
        
        try:
            # すべてのカレンダーテーブルを取得
            calendar_tables = page.locator("table").all()
            print(f"Found {len(calendar_tables)} calendar tables")
            
            selected_count = 0
            
            # 各カレンダーテーブルのヘッダーから対象日を探してクリック
            for i, table in enumerate(calendar_tables):
                try:
                    # デバッグ: テーブルにクラスがあるか確認
                    table_class = table.get_attribute("class") or ""
                    
                    # ヘッダー行のth要素を取得（より広範囲に検索）
                    headers = table.locator("th, td.header, td[class*='head']").all()
                    
                    if i < 3:  # 最初の3つのテーブルだけデバッグ出力
                        print(f"Table {i} (class='{table_class}'): {len(headers)} header cells")
                    
                    for j, header in enumerate(headers):
                        header_text = header.text_content() or ""
                        
                        # デバッグ: 最初のテーブルのヘッダーテキストを表示
                        if i == 0 and header_text.strip():
                            print(f"    Header {j}: '{header_text.strip()}'")
                        
                        if header_text:
                            # 日付を含むヘッダーを探す（複数のパターンに対応）
                            import re
                            # パターン1: "10日(火)" のような形式
                            # パターン2: "10水" のような形式（数字+曜日）
                            # パターン3: "10" のような数字のみ
                            # パターン4: "9/10" のような日付形式
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
                                        print(f"Found target date in table {i}, header {j}: '{header_text.strip()}'")
                                        # ヘッダーがクリック可能か確認
                                        if header.is_visible():
                                            # リンクがある場合はリンクをクリック
                                            link = header.locator("a").first
                                            if link.count() > 0:
                                                print(f"  Clicking link in header for day {target_day}")
                                                link.click()
                                            else:
                                                print(f"  Clicking header cell for day {target_day}")
                                                header.click()
                                            selected_count += 1
                                            page.wait_for_timeout(500)  # 短い待機
                                        break
                            if selected_count > 0:
                                break  # 見つかったら次のテーブルへ
                except Exception as e:
                    print(f"Error processing table {i}: {e}")
            
            if selected_count == 0:
                print(f"Warning: No columns found for day {target_day}")
                return False
            
            print(f"Selected {selected_count} date columns")
            
            # 「次へ進む」ボタンをクリック
            print("Looking for 'Next' button...")
            next_selectors = [
                "button:has-text('次へ進む')",
                "input[type='submit'][value='次へ進む']",
                "button.next",
                "text=次へ進む"
            ]
            
            clicked = False
            for selector in next_selectors:
                try:
                    button = page.locator(selector).first
                    if button.count() > 0 and button.is_visible():
                        print(f"Found next button with selector: {selector}")
                        button.click()
                        clicked = True
                        break
                except:
                    continue
            
            if not clicked:
                print("ERROR: Could not find next button")
                return False
            
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
            # まず、ページ構造を確認
            print("Checking page structure...")
            
            # 施設ごとのセクションを取得（複数のセレクタを試す）
            facility_sections = page.locator(".item").all()
            if len(facility_sections) == 0:
                print("  No .item sections found, trying alternative selectors...")
                # 代替: 施設名を含むh3またはh4要素を探す
                facility_sections = page.locator("div.facility, section.facility, .shisetsu").all()
                
            if len(facility_sections) == 0:
                print("  Still no sections found, trying to find facility names directly...")
                # さらに代替: 施設名を直接探す
                facility_sections = []
                for studio_name in self.studios:
                    elements = page.locator(f"*:has-text('{studio_name}')").all()
                    for elem in elements:
                        parent = elem.locator("..")
                        if parent.count() > 0:
                            facility_sections.append(parent.first)
                            break
            
            print(f"Found {len(facility_sections)} facility sections")
            
            # セクションが見つからない場合、ページ全体を1つのセクションとして扱う
            if len(facility_sections) == 0:
                print("  Using entire page as single section")
                facility_sections = [page.locator("body").first]
            
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
                            afternoon_status = room_slots.get("afternoon")
                            if afternoon_status == "available":
                                combined_slots["13-17"] = "available"
                            elif afternoon_status in ["booked", "booked_1", "booked_2"]:
                                # 既存の状態と比較して最も制限の強い状態を採用
                                current_status = combined_slots["13-17"]
                                if current_status == "available":
                                    combined_slots["13-17"] = afternoon_status
                                elif current_status == "unknown":
                                    combined_slots["13-17"] = afternoon_status
                                elif afternoon_status == "booked":
                                    combined_slots["13-17"] = "booked"
                                elif current_status in ["booked_1", "booked_2"] and afternoon_status in ["booked_1", "booked_2"]:
                                    # 両方が部分的に予約済みの場合
                                    if current_status != afternoon_status:
                                        combined_slots["13-17"] = "booked"  # 異なる部分が予約済みなら全体をbookedに
                            
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