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
            
            # 各カレンダーテーブルで対象日のカラムを特定し、データセルをクリック
            for i, table in enumerate(calendar_tables):
                try:
                    # デバッグ: テーブルにクラスがあるか確認
                    table_class = table.get_attribute("class") or ""
                    
                    # まずヘッダー行から対象日のカラムインデックスを特定
                    headers = table.locator("thead th").all()
                    
                    if i < 3:  # 最初の3つのテーブルだけデバッグ出力
                        print(f"Table {i} (class='{table_class}'): {len(headers)} header cells")
                    
                    target_column_index = -1
                    
                    for j, header in enumerate(headers):
                        header_text = header.text_content() or ""
                        
                        # デバッグ: 最初のテーブルのヘッダーテキストを表示
                        if i == 0 and header_text.strip():
                            print(f"    Header {j}: '{header_text.strip()}'")
                        
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
                                        print(f"Found target date in table {i}, column {j}: '{header_text.strip()}'")
                                        break
                            
                            if target_column_index >= 0:
                                break
                    
                    # 対象日のカラムが見つかった場合、そのカラムのデータセルをクリック
                    if target_column_index >= 0:
                        # tbody内の各行を取得
                        rows = table.locator("tbody tr").all()
                        print(f"  Table {i} has {len(rows)} rows in tbody")
                        
                        table_selections = 0
                        for row_idx, row in enumerate(rows):
                            # 既に選択済みの場合はスキップ
                            if table_selections > 0:
                                break
                                
                            # 各行の対象カラムのセルを取得
                            cells = row.locator("td").all()
                            
                            # デバッグ：最初の行の内容を確認
                            if row_idx == 0 and len(cells) > 0:
                                first_cell_text = cells[0].text_content().strip()
                                print(f"    Row 0, first cell: '{first_cell_text[:50] if len(first_cell_text) > 50 else first_cell_text}'")
                            
                            if target_column_index < len(cells):
                                target_cell = cells[target_column_index]
                                cell_text = target_cell.text_content().strip()
                                
                                # まず○マークがあるかチェック（予約可能の可能性が高い）
                                if "○" in cell_text or "◯" in cell_text:
                                    print(f"    Row {row_idx}: Available cell ('{cell_text}'), looking for clickable element...")
                                    try:
                                        # ラベルを探してクリック
                                        label = target_cell.locator("label").first
                                        if label.count() > 0:
                                            label_text = label.text_content().strip()
                                            print(f"      Found label with text: '{label_text}'")
                                            label.click(timeout=2000, force=True)
                                            print(f"      Successfully clicked label: '{label_text}'")
                                        else:
                                            # ラベルがない場合はセル自体をクリック
                                            print(f"      No label found, clicking cell directly: '{cell_text}'")
                                            target_cell.click(timeout=2000, force=True)
                                            print(f"      Successfully clicked cell: '{cell_text}'")
                                        table_selections += 1
                                        selected_count += 1
                                        page.wait_for_timeout(300)
                                        break  # 次のテーブルへ
                                    except Exception as e:
                                        print(f"      Failed to click: {str(e)[:50]}")
                                
                                # チェックボックスがある場合はラベルをクリック（○がない場合のみ）
                                if table_selections == 0:
                                    try:
                                        # まずラベルを探す
                                        label = target_cell.locator("label").first
                                        if label.count() > 0 and label.is_visible():
                                            label_text = label.text_content().strip()
                                            print(f"    Row {row_idx}: Found label with text: '{label_text}', clicking...")
                                            label.click(timeout=2000, force=True)
                                            table_selections += 1
                                            selected_count += 1
                                            page.wait_for_timeout(300)
                                            print(f"      Successfully clicked label: '{label_text}'")
                                            break  # 次のテーブルへ
                                        
                                        # ラベルがない場合はチェックボックスを直接クリック
                                        checkbox = target_cell.locator("input[type='checkbox']").first
                                        if checkbox.count() > 0 and checkbox.is_visible():
                                            print(f"    Row {row_idx}: No label found, clicking checkbox directly (cell text: '{cell_text}')...")
                                            checkbox.click(timeout=2000, force=True)
                                            table_selections += 1
                                            selected_count += 1
                                            page.wait_for_timeout(300)
                                            print(f"      Successfully clicked checkbox")
                                            break  # 次のテーブルへ
                                        
                                        # チェックボックスもラベルもない場合、セル自体をクリック
                                        if not ("×" in cell_text or "−" in cell_text or "-" in cell_text or cell_text == ""):
                                            print(f"    Row {row_idx}: No label/checkbox, clicking cell directly: '{cell_text}'...")
                                            target_cell.click(timeout=2000, force=True)
                                            table_selections += 1
                                            selected_count += 1
                                            page.wait_for_timeout(300)
                                            print(f"      Successfully clicked cell: '{cell_text}'")
                                            break
                                    except Exception as e:
                                        # クリック要素がない場合
                                        if row_idx == 0:  # 最初の行だけログ出力
                                            print(f"      No clickable element in row 0 (cell text: '{cell_text}'): {str(e)[:50]}")
                        
                        if table_selections > 0:
                            print(f"  Selected {table_selections} cells in table {i}")
                
                except Exception as e:
                    print(f"Error processing table {i}: {e}")
            
            if selected_count == 0:
                print(f"Warning: No columns found for day {target_day}")
                return False
            
            print(f"Selected {selected_count} date columns")
            
            # 選択されたセルの確認
            print("Verifying selected cells before navigation...")
            
            # チェックされているチェックボックスの数を確認
            checked_boxes = page.locator("input[type='checkbox']:checked").all()
            print(f"  {len(checked_boxes)} checkboxes are checked")
            if len(checked_boxes) > 0:
                for i, box in enumerate(checked_boxes[:3]):  # 最初の3つを表示
                    try:
                        parent_cell = box.locator("..").first
                        cell_text = parent_cell.text_content().strip() if parent_cell.count() > 0 else "unknown"
                        print(f"    Checked box {i}: '{cell_text[:50]}'")
                    except:
                        pass
            
            # 選択されたセル（クラスなどで識別）も確認
            selected_cells = page.locator("td.selected, td.active, td[class*='select'], td[class*='check']").all()
            print(f"  {len(selected_cells)} cells appear selected")
            
            # 少なくとも1つ以上選択されていることを確認
            total_selections = len(checked_boxes) + len(selected_cells)
            if total_selections == 0:
                print("WARNING: No cells appear to be selected!")
                # デバッグ: ラベルをクリックしてみる
                print("Attempting to select at least one available cell by clicking label...")
                available_cells = page.locator("td:has-text('○'), td:has-text('◯')").all()[:3]
                for cell in available_cells:
                    try:
                        # ラベルを探してクリック
                        label = cell.locator("label").first
                        if label.count() > 0:
                            label_text = label.text_content().strip()
                            print(f"  Clicking label: '{label_text}'")
                            label.click(timeout=2000)
                        else:
                            cell_text = cell.text_content().strip()
                            print(f"  Clicking cell: '{cell_text}'")
                            cell.click(timeout=2000)
                        page.wait_for_timeout(500)
                        break
                    except:
                        continue
            
            # 「次へ進む」ボタンをクリック
            print("Looking for 'Next' button...")
            
            # より具体的なセレクタを使用
            next_button = None
            button_text = ""
            
            # まず正確なテキストマッチを試す
            next_button = page.locator("button", has_text="次へ進む").first
            if next_button.count() > 0:
                button_text = next_button.text_content().strip()
                print(f"  Found button element with text: '{button_text}'")
            
            if next_button.count() == 0:
                next_button = page.locator("input[type='submit'][value='次へ進む']").first
                if next_button.count() > 0:
                    button_text = next_button.get_attribute("value") or ""
                    print(f"  Found input[submit] element with value: '{button_text}'")
            
            if next_button.count() == 0:
                next_button = page.locator("a", has_text="次へ進む").first
                if next_button.count() > 0:
                    button_text = next_button.text_content().strip()
                    print(f"  Found anchor element with text: '{button_text}'")
            
            if next_button and next_button.count() > 0:
                print(f"Clicking next button: '{button_text}'...")
                
                # ボタンの状態を確認
                is_enabled = next_button.is_enabled()
                is_visible = next_button.is_visible()
                print(f"  Button state: enabled={is_enabled}, visible={is_visible}")
                
                # onclick属性を確認
                onclick = next_button.get_attribute("onclick") or ""
                if onclick:
                    print(f"  Button onclick: '{onclick[:100]}'")
                
                # フォーカスを当ててからクリック
                next_button.focus()
                page.wait_for_timeout(200)
                
                # クリック前のURL/ページ状態を記録
                initial_content = page.locator(".breadcrumbs li.current span").text_content() if page.locator(".breadcrumbs li.current span").count() > 0 else ""
                print(f"  Current breadcrumb before click: {initial_content}")
                
                # クリック実行（forceオプションも試す）
                next_button.click(force=True)
                print(f"  Clicked button: '{button_text}'")
                
                # ページ遷移を待つ（複数の方法で）
                print("Waiting for page transition...")
                
                # 方法1: ネットワークアイドルを待つ
                try:
                    page.wait_for_load_state("networkidle", timeout=10000)
                except:
                    print("  Network idle timeout, continuing...")
                
                # 方法2: DOM変更を待つ
                try:
                    page.wait_for_function(
                        "document.querySelector('.breadcrumbs li.current span')?.textContent?.includes('時間帯別空き状況')",
                        timeout=5000
                    )
                    print("  Detected breadcrumb change to time slot page")
                except:
                    print("  Breadcrumb change not detected, checking other indicators...")
                
                # 方法3: 新しい要素の出現を待つ
                try:
                    page.wait_for_selector("th:has-text('午前')", timeout=5000)
                    print("  Time slot headers appeared")
                except:
                    print("  Time slot headers not found")
                
                # 追加の待機
                page.wait_for_timeout(3000)
                
            else:
                print("ERROR: Could not find next button")
                # デバッグ: ページ上のボタンを列挙
                all_buttons = page.locator("button, input[type='submit'], a.btn").all()[:10]
                print(f"  Found {len(all_buttons)} buttons on page:")
                for i, btn in enumerate(all_buttons):
                    try:
                        text = btn.text_content() or btn.get_attribute("value") or ""
                        if text.strip():
                            print(f"    Button {i}: '{text.strip()}'")
                    except:
                        pass
                return False
            
            # 時間帯別空き状況画面に到達したか確認
            print("Verifying navigation to time slot page...")
            
            # 複数の方法で確認
            is_on_time_slot_page = False
            
            # 1. ブレッドクラムで確認
            breadcrumb_current = page.locator(".breadcrumbs li.current span").first
            if breadcrumb_current.count() > 0:
                current_page = breadcrumb_current.text_content().strip()
                print(f"Current page (breadcrumb): {current_page}")
                
                if "時間帯別空き状況" in current_page:
                    print("✓ Breadcrumb confirms time slot page")
                    is_on_time_slot_page = True
            
            # 2. ページタイトルで確認
            if not is_on_time_slot_page:
                h2_title = page.locator("h2").first
                if h2_title.count() > 0:
                    title_text = h2_title.text_content().strip()
                    if "時間帯別空き状況" in title_text:
                        print(f"✓ Page title confirms time slot page: {title_text}")
                        is_on_time_slot_page = True
            
            # 3. 時間帯ヘッダーの存在で確認（午前、午後、夜間）
            if not is_on_time_slot_page:
                time_headers = page.locator("th:has-text('午前'), th:has-text('午後'), th:has-text('夜間')").all()
                if len(time_headers) > 0:
                    print(f"✓ Found {len(time_headers)} time slot headers")
                    is_on_time_slot_page = True
            
            # 4. ページコンテンツで確認
            if not is_on_time_slot_page:
                page_content = page.content()
                if "時間帯別空き状況" in page_content:
                    print("✓ Page content contains '時間帯別空き状況'")
                    is_on_time_slot_page = True
            
            if is_on_time_slot_page:
                print("Successfully reached time slot page!")
                # スクリーンショットを保存（デバッグ用）
                try:
                    page.screenshot(path="/tmp/time_slot_page.png")
                    print("  Screenshot saved to /tmp/time_slot_page.png")
                except:
                    pass
                return True
            else:
                print("ERROR: Failed to reach time slot page")
                
                # デバッグ：現在のページの状態を詳細に確認
                print("\nDEBUG: Current page analysis...")
                
                # カレンダーテーブルの存在
                calendars = page.locator("table.calendar").all()
                if calendars and len(calendars) > 0:
                    print(f"  Still showing {len(calendars)} calendar tables")
                    first_headers = calendars[0].locator("thead th").all()[:5]
                    if first_headers:
                        header_texts = [h.text_content().strip() for h in first_headers]
                        print(f"  First calendar headers: {header_texts}")
                
                # フォームの状態
                forms = page.locator("form").all()
                print(f"  {len(forms)} forms on page")
                
                # エラーメッセージの確認
                error_msgs = page.locator(".error, .alert, .warning, [class*='err']").all()
                if error_msgs:
                    print(f"  Found {len(error_msgs)} potential error messages")
                    for msg in error_msgs[:2]:
                        try:
                            text = msg.text_content().strip()[:100]
                            if text:
                                print(f"    Error: {text}")
                        except:
                            pass
                
                # スクリーンショット保存
                try:
                    page.screenshot(path="/tmp/failed_navigation.png")
                    print("  Debug screenshot saved to /tmp/failed_navigation.png")
                except:
                    pass
                
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
                
                # この施設セクション内のカレンダーテーブルを取得
                # セクション内のテーブルのみを取得するため、sectionから検索
                room_tables = section.locator("table.calendar").all()
                print(f"  Found {len(room_tables)} calendar tables for this facility")
                
                for table_idx, room_table in enumerate(room_tables):
                    # 時間帯ヘッダーを取得して、カラムインデックスをマッピング
                    # まず、より広範囲でヘッダーを探す
                    all_headers = room_table.locator("thead th").all()
                    print(f"    Table {table_idx}: {len(all_headers)} total headers found")
                    
                    time_slots_map = {}
                    
                    # 最初の2つは施設名と定員なので、3つ目以降を時間帯として扱う
                    for j, header in enumerate(all_headers):
                        header_text = header.text_content().strip()
                        print(f"      Header {j}: '{header_text}'")
                        
                        # 最初の2つのヘッダーはスキップ（施設名と定員）
                        if j < 2:
                            continue
                        
                        # 時間帯をキーにマッピング
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
                            # ヘッダーの位置はそのままjをキーとする（tbodyのセルと対応）
                            time_slots_map[j] = slot_key
                            print(f"        Mapped column {j} to {slot_key}")
                    
                    # tbody内の各行を処理（各行が1つの部屋）
                    room_rows = room_table.locator("tbody tr").all()
                    
                    for row_idx, row in enumerate(room_rows):
                        # 行内のすべてのセルを取得
                        cells = row.locator("td").all()
                        
                        if len(cells) < 3:  # 部屋名、定員、時間帯が最低限必要
                            continue
                        
                        # 最初のセルから部屋名を取得
                        room_name_cell = cells[0]
                        room_name = room_name_cell.text_content().strip()
                        
                        if not room_name:
                            continue
                        
                        print(f"    Table {table_idx}, Row {row_idx}: {room_name}")
                        
                        # 時間帯ごとの空き状況を取得
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
                                print(f"      {slot_key}: {status}")
                    
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
                        
                        # 部屋名が重複する場合は番号を付ける
                        final_room_name = room_name
                        if room_name in results[facility_name]:
                            counter = 2
                            while f"{room_name}_{counter}" in results[facility_name]:
                                counter += 1
                            final_room_name = f"{room_name}_{counter}"
                        
                        results[facility_name][final_room_name] = room_slots
            
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
                    
                    # 結果を整形（3層構造で各部屋ごとに個別レコード）
                    results = []
                    for facility_name, rooms in all_time_slots.items():
                        # 各部屋ごとに個別レコードを作成
                        for room_name, room_slots in rooms.items():
                            # 時間帯形式を変換
                            converted_slots = {
                                "9-12": "unknown",
                                "13-17": "unknown",
                                "18-21": "unknown"
                            }
                            
                            # morning -> 9-12
                            if room_slots.get("morning") == "available":
                                converted_slots["9-12"] = "available"
                            elif room_slots.get("morning") == "booked":
                                converted_slots["9-12"] = "booked"
                            
                            # afternoon -> 13-17
                            afternoon_status = room_slots.get("afternoon")
                            if afternoon_status == "available":
                                converted_slots["13-17"] = "available"
                            elif afternoon_status in ["booked", "booked_1", "booked_2"]:
                                converted_slots["13-17"] = "booked"
                            
                            # evening -> 18-21
                            if room_slots.get("evening") == "available":
                                converted_slots["18-21"] = "available"
                            elif room_slots.get("evening") == "booked":
                                converted_slots["18-21"] = "booked"
                            
                            results.append({
                                "centerName": "目黒区民センター",
                                "facilityName": facility_name,
                                "roomName": room_name,
                                "timeSlots": converted_slots,
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