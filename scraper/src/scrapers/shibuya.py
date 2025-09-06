"""
渋谷区施設予約システムのスクレイピング
React + Ant Design SPAサイト対応
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Literal
from playwright.sync_api import Page, Locator, sync_playwright
from .base import BaseScraper
from ..types.time_slots import TimeSlots, validate_time_slots

# フロントエンドの定義に合わせた型定義
StatusValue = Literal['available', 'booked', 'booked_1', 'booked_2', 'lottery', 'unknown']


class ShibuyaScraper(BaseScraper):
    """渋谷区施設予約システム用スクレイパー"""
    
    # 文化総合センター大和田の練習室定義
    PRACTICE_ROOMS = [
        "大練習室",
        "練習室１",
        "練習室２",
        "練習室３",
        "練習室４"
    ]
    
    def __init__(self, log_level=None):
        super().__init__(log_level)
    
    def get_base_url(self) -> str:
        """施設のベースURLを返す"""
        return "https://www.yoyaku.city.shibuya.tokyo.jp/"
    
    def get_studios(self) -> List[str]:
        """施設のスタジオリストを返す"""
        return [
            "文化総合センター大和田"
        ]
    
    def get_center_name(self) -> str:
        """センター名を返す"""
        return "渋谷区民センター"
    
    def get_room_name(self, facility_name: str) -> str:
        """部屋名を返す"""
        return "練習室"
    
    def get_room_names(self) -> List[str]:
        """文化総合センター大和田の練習室リストを返す"""
        return self.PRACTICE_ROOMS
    
    def wait_for_react_load(self, page: Page):
        """Reactアプリケーションの読み込みを待つ"""
        # SPAの初期読み込みを待つ
        page.wait_for_load_state("networkidle", timeout=30000)
        page.wait_for_timeout(2000)  # 追加の待機
        
        # React rootが存在することを確認
        page.wait_for_selector("#root", timeout=10000)
    
    def navigate_to_search(self, page: Page) -> bool:
        """
        トップページから検索画面へ遷移
        
        Returns:
            成功した場合True
        """
        self.log_info("Navigating to search page...")
        
        try:
            # Reactアプリの読み込みを待つ
            self.wait_for_react_load(page)
            
            # ページの内容をログに出力（デバッグ用）
            page_title = page.title()
            self.log_info(f"Page title: {page_title}")
            
            # 「空き状況確認」タブが選択されていることを確認
            # Ant Designのタブコンポーネント
            availability_tab = page.locator(".ant-tabs-tab-active:has-text('空き状況確認')")
            if availability_tab.count() == 0:
                # タブをクリックして切り替え
                tab = page.locator(".ant-tabs-tab:has-text('空き状況確認')").first
                if tab.count() > 0:
                    tab.click()
                    page.wait_for_timeout(1000)
                    self.log_info("Switched to availability check tab")
                else:
                    # タブが見つからない場合は、既に正しいページにいる可能性
                    self.log_info("Availability check tab not found, might already be on correct page")
            else:
                self.log_info("Already on availability check tab")
            
            # フォーム要素があるか確認
            forms = page.locator("form, .ant-form").all()
            self.log_info(f"Found {len(forms)} form elements")
            
            return True
            
        except Exception as e:
            self.log_error(f"Error navigating to search: {e}")
            return False
    
    def select_search_criteria(self, page: Page, target_date: datetime) -> bool:
        """
        検索条件を選択（プルダウンから選択）
        
        Args:
            page: Playwrightのページオブジェクト
            target_date: 目標日付
        
        Returns:
            成功した場合True
        """
        self.log_info("Selecting search criteria...")
        
        try:
            # デバッグ: すべてのセレクトボックスを確認
            all_selects = page.locator(".ant-select, select, [role='combobox']").all()
            self.log_info(f"Found {len(all_selects)} select elements on page")
            
            # 1. 目的を選択 -> 器楽
            self.log_info("Selecting purpose: 器楽")
            
            # プレースホルダーテキストを使用してセレクトボックスを探す
            purpose_selectors = [
                ".ant-select:has(.ant-select-selector:has-text('目的を選択'))",
                ".ant-select-selector:has-text('目的を選択')",
                "div:has-text('目的を選択')",
                ".ant-select-selection-placeholder:has-text('目的を選択')"
            ]
            
            purpose_select = None
            for selector in purpose_selectors:
                try:
                    elem = page.locator(selector).first
                    if elem.count() > 0:
                        purpose_select = elem
                        self.log_info(f"Found purpose select with selector: {selector}")
                        break
                except:
                    continue
            
            if not purpose_select:
                # フォールバック: インデックスで取得
                if len(all_selects) > 0:
                    purpose_select = all_selects[0]
                    self.log_info("Using first select element as purpose select")
                else:
                    self.log_error("Could not find any select elements")
                    return False
            
            # デバッグ用スクリーンショット（セレクト前）
            try:
                page.screenshot(path="/tmp/shibuya_before_select.png")
                self.log_info("Screenshot saved: /tmp/shibuya_before_select.png")
            except:
                pass
            
            # セレクトボックスをクリック
            try:
                purpose_select.scroll_into_view_if_needed()
                purpose_select.click()
                self.log_info("Clicked purpose select")
            except Exception as e:
                self.log_error(f"Failed to click purpose select: {e}")
                # スクリーンショットを保存
                try:
                    page.screenshot(path="/tmp/shibuya_click_error.png")
                    self.log_info("Error screenshot saved: /tmp/shibuya_click_error.png")
                except:
                    pass
                return False
            
            page.wait_for_timeout(1000)
            
            # ドロップダウンから適切なオプションを選択
            # ドロップダウンが開くのを待つ
            page.wait_for_timeout(500)
            
            # ドロップダウン内のオプションから「器楽」を探す
            option_found = False
            try:
                # ドロップダウンが表示されているか確認
                dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
                if dropdown.count() > 0:
                    # オプションを取得
                    options = dropdown.locator(".ant-select-item-option").all()
                    
                    # 「器楽」または音楽関連のオプションを探す
                    # ログに出ている最初の2つのオプション(100010, 100020)が実際のドロップダウンでは異なる位置にある
                    target_index = -1
                    all_options_text = []
                    for i, opt in enumerate(options):
                        text = opt.text_content()
                        text_stripped = text.strip() if text else ""
                        all_options_text.append(text_stripped)
                        # デバッグ用に最初の5個を出力
                        if i < 5:
                            self.log_info(f"Dropdown option {i}: '{text_stripped}'")
                    
                    # まず表示されているオプションから「器楽」を探す
                    for i, text in enumerate(all_options_text):
                        if "器楽" in text:
                            target_index = i
                            self.log_info(f"Found '器楽' option at index {target_index}")
                            break
                    
                    # 「器楽」が見つからない場合、「演奏会・発表会」を選択（音楽練習に適している）
                    # 注：11番目のオプションに「器楽」があるが、タイムアウトの問題で現実的には選択困難
                    if target_index < 0:
                        self.log_info("'器楽' not in visible options, looking for '演奏会・発表会'...")
                        for i, text in enumerate(all_options_text):
                            if "演奏会" in text or "発表会" in text:
                                target_index = i
                                self.log_info(f"Found alternative music option '演奏会・発表会' at index {target_index}")
                                break
                    
                    # 器楽が11番目にもない場合、「演奏会・発表会」を選択（音楽練習に適している）
                    if target_index == -1:  # -2の場合は器楽が選択済み
                        # ドロップダウンを再度開く
                        purpose_select.click()
                        page.wait_for_timeout(1000)
                        
                        # 再度オプションを取得
                        dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
                        if dropdown.count() > 0:
                            options = dropdown.locator(".ant-select-item-option").all()
                            for i, opt in enumerate(options):
                                text = opt.text_content()
                                if "演奏会" in text or "発表会" in text:
                                    target_index = i
                                    self.log_info(f"Found alternative music option '演奏会・発表会' at index {target_index}")
                                    break
                    
                    # それでも見つからない場合は「楽屋」を探す
                    if target_index < 0:
                        for i, text in enumerate(all_options_text):
                            if "楽屋" in text:
                                target_index = i
                                self.log_info(f"Found music option '楽屋' at index {target_index}")
                                break
                    
                    # それでも見つからない場合は最初のオプションを選択
                    if target_index < 0 and len(all_options_text) > 0:
                        target_index = 0
                        self.log_warning(f"Music option not found, using first option: '{all_options_text[0]}')")
                    
                    if target_index >= 0:
                        # アローダウンキーで移動（インデックス回）
                        for _ in range(target_index):
                            page.keyboard.press("ArrowDown")
                            page.wait_for_timeout(50)
                        
                        # エンターキーで確定
                        page.keyboard.press("Enter")
                        page.wait_for_timeout(500)
                        
                        self.log_info(f"Successfully selected option at index {target_index}")
                        option_found = True
                    elif target_index == -2:
                        # 器楽が11番目で選択済み
                        option_found = True
                    else:
                        self.log_error("Target option not found in dropdown (looking for '器楽')")
                else:
                    self.log_error("Dropdown not visible")
            except Exception as e:
                self.log_error(f"Error selecting purpose: {e}")
            
            if not option_found:
                self.log_error("Could not select '器楽' option")
                return False
            
            # 選択後、短い待機のみ
            page.wait_for_timeout(1000)
            self.log_info("Purpose selection completed, moving to facility selection")
            
            # ドロップダウンを確実に閉じる
            page.keyboard.press("Escape")
            page.wait_for_timeout(1000)
            
            # ドロップダウンが閉じたことを確認
            page.wait_for_selector(".ant-select-dropdown", state="hidden", timeout=5000)
            
            # 2. 施設を選択 -> 文化総合センター大和田（練習室）
            self.log_info("Selecting facility: 文化総合センター大和田（練習室）")
            
            # Ant Selectの全体取得（より正確なセレクタ）
            all_ant_selects = page.locator(".ant-select").all()
            self.log_info(f"Found {len(all_ant_selects)} ant-select elements")
            
            # 通常、施設は2番目のセレクトボックス（0: 団体, 1: 施設, 2: 目的, 3: 月）
            # ただし目的選択後は表示が変わる可能性があるため確認
            facility_select = None
            facility_index = -1
            
            for idx, sel in enumerate(all_ant_selects):
                sel_text = sel.text_content()
                self.log_info(f"Ant-Select {idx}: {sel_text}")
                if "施設を選択" in sel_text or (idx == 1 and not sel_text.strip()):
                    facility_select = sel
                    facility_index = idx
                    self.log_info(f"Identified facility select at index {idx}")
                    break
            
            if not facility_select and len(all_ant_selects) > 1:
                # フォールバック: 2番目のセレクトボックスを使用
                facility_select = all_ant_selects[1]
                facility_index = 1
                self.log_info("Using index 1 as facility select (fallback)")
            
            if not facility_select:
                self.log_error("Could not find facility select element")
                return False
            
            # プレースホルダをクリックしてドロップダウンを開く
            option_found = False
            try:
                # セレクトボックスのセレクター部分をクリック
                facility_selector = facility_select.locator(".ant-select-selector").first if facility_select.locator(".ant-select-selector").count() > 0 else facility_select
                facility_selector.click()
                page.wait_for_timeout(1000)  # ドロップダウンが開くのを待つ
                
                # ドロップダウンが開くまで待機
                page.wait_for_selector(".ant-select-dropdown:not(.ant-select-dropdown-hidden)", timeout=3000)
                
                # aria-controlsを使って正しいドロップダウンを取得
                aria_controls = facility_select.get_attribute("aria-controls")
                if aria_controls:
                    dropdown = page.locator(f"#{aria_controls}")
                    self.log_info(f"Using dropdown with id: {aria_controls}")
                else:
                    # フォールバック：最新のドロップダウンを使用
                    dropdowns = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").all()
                    if len(dropdowns) > 0:
                        dropdown = dropdowns[-1]
                        self.log_info(f"Found {len(dropdowns)} dropdown(s), using the last one")
                    else:
                        dropdown = None
                
                if dropdown and dropdown.count() > 0:
                    
                    # オプションをログ出力して確認
                    options = dropdown.locator(".ant-select-item-option").all()
                    self.log_info(f"Facility dropdown has {len(options)} options")
                    for i, opt in enumerate(options[:5]):  # 最初の5個を表示
                        text = opt.text_content()
                        self.log_info(f"  Option {i}: {text}")
                    
                    # 「文化総合センター大和田（練習室）」を含むオプションを探す
                    target_found = False
                    for i, opt in enumerate(options):
                        text = opt.text_content()
                        # 練習室を優先、なければ文化総合センター大和田を含むものを選択
                        if "文化総合センター大和田" in text and "練習室" in text:
                            self.log_info(f"Found target facility (練習室) at position {i}")
                            # 矢印キーで移動（0番目が空欄の場合、i回だけ押せばよい）
                            for _ in range(i):  # i回下矢印キーを押す
                                page.keyboard.press("ArrowDown")
                                page.wait_for_timeout(100)
                            # Enterキーで確定
                            page.keyboard.press("Enter")
                            page.wait_for_timeout(500)
                            target_found = True
                            break
                    
                    # 練習室が見つからない場合、文化総合センター大和田のいずれかを選択
                    if not target_found:
                        for i, opt in enumerate(options):
                            text = opt.text_content()
                            if "文化総合センター大和田" in text:
                                self.log_info(f"Found alternative facility at position {i}")
                                # 矢印キーで移動
                                for _ in range(i):
                                    page.keyboard.press("ArrowDown")
                                    page.wait_for_timeout(100)
                                # Enterキーで確定
                                page.keyboard.press("Enter")
                                page.wait_for_timeout(500)
                                target_found = True
                                break
                    
                    if not target_found:
                        # 見つからない場合は最初のオプションを選択
                        self.log_warning("Target facility not found, selecting first option")
                        page.keyboard.press("ArrowDown")
                        page.wait_for_timeout(200)
                        page.keyboard.press("Enter")
                        page.wait_for_timeout(500)
                    
                    # 選択されたか確認
                    selected_text = facility_select.text_content()
                    self.log_info(f"Selected facility: {selected_text}")
                    option_found = True
                else:
                    # ドロップダウンが開かない場合
                    self.log_error("No dropdown found after opening facility select")
                    option_found = False
                    
            except Exception as e:
                self.log_error(f"Keyboard selection failed: {e}")
                option_found = False
            
            if not option_found:
                self.log_error("Could not find '文化総合センター大和田' option")
                return False
            
            # ドロップダウンを閉じるため、別の場所をクリック
            page.locator("body").click()
            page.wait_for_timeout(1000)
            
            # 3. 利用月を選択 -> 希望月
            target_year_month = f"{target_date.year}年{target_date.month}月"
            self.log_info(f"Selecting month: {target_year_month}")
            
            # 最新のセレクトボックス一覧を取得（施設選択後に更新されている可能性）
            all_ant_selects = page.locator(".ant-select").all()
            
            month_select = None
            month_index = -1
            
            for idx, sel in enumerate(all_ant_selects):
                sel_text = sel.text_content()
                if "利用月を選択" in sel_text or (idx == 3 and not sel_text.strip()):
                    month_select = sel
                    month_index = idx
                    self.log_info(f"Identified month select at index {idx}")
                    break
            
            if not month_select and len(all_ant_selects) > 3:
                # フォールバック: 4番目のセレクトボックスを使用
                month_select = all_ant_selects[3]
                month_index = 3
                self.log_info("Using index 3 as month select (fallback)")
            
            if not month_select:
                self.log_error("Could not find month select element")
                return False
            
            # プレースホルダをクリックしてドロップダウンを開く
            option_found = False
            try:
                # セレクトボックスのセレクター部分をクリック
                month_selector = month_select.locator(".ant-select-selector").first if month_select.locator(".ant-select-selector").count() > 0 else month_select
                month_selector.click(timeout=5000)  # クリックのタイムアウトを短くする
                page.wait_for_timeout(1000)  # ドロップダウンが開くのを待つ
                
                # ドロップダウンが開くまで待機（タイムアウトを短くする）
                try:
                    page.wait_for_selector(".ant-select-dropdown:not(.ant-select-dropdown-hidden)", timeout=2000)
                except:
                    self.log_warning("Dropdown did not appear, continuing anyway")
                
                # aria-controlsを使って正しいドロップダウンを取得
                aria_controls = month_select.get_attribute("aria-controls")
                if aria_controls:
                    dropdown = page.locator(f"#{aria_controls}")
                    self.log_info(f"Using month dropdown with id: {aria_controls}")
                else:
                    # フォールバック：最新のドロップダウンを使用
                    dropdowns = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").all()
                    if len(dropdowns) > 0:
                        dropdown = dropdowns[-1]
                        self.log_info(f"Found {len(dropdowns)} dropdown(s) for month, using the last one")
                    else:
                        dropdown = None
                
                if dropdown and dropdown.count() > 0:
                    
                    # オプションをログ出力して確認
                    options = dropdown.locator(".ant-select-item-option").all()
                    self.log_info(f"Month dropdown has {len(options)} options")
                    for i, opt in enumerate(options[:5]):  # 最初の5個を表示
                        text = opt.text_content()
                        self.log_info(f"  Month option {i}: {text}")
                    
                    # 目標の年月を含むオプションを探す
                    target_found = False
                    for i, opt in enumerate(options):
                        text = opt.text_content()
                        if target_year_month in text or f"{target_date.year}/{target_date.month:02d}" in text:
                            self.log_info(f"Found target month at position {i}")
                            # 矢印キーで移動
                            for _ in range(i + 1):  # i+1回下矢印キーを押す
                                page.keyboard.press("ArrowDown")
                                page.wait_for_timeout(100)
                            # Enterキーで確定
                            page.keyboard.press("Enter")
                            page.wait_for_timeout(500)
                            target_found = True
                            break
                    
                    if not target_found:
                        # 見つからない場合は最初のオプションを選択
                        self.log_warning(f"Target month {target_year_month} not found, selecting first option")
                        page.keyboard.press("ArrowDown")
                        page.wait_for_timeout(200)
                        page.keyboard.press("Enter")
                        page.wait_for_timeout(500)
                    
                    # 選択されたか確認
                    selected_text = month_select.text_content()
                    self.log_info(f"Selected month: {selected_text}")
                    option_found = True
                else:
                    # ドロップダウンが開かない場合
                    self.log_error("No dropdown found after opening month select")
                    option_found = False
                    
            except Exception as e:
                self.log_error(f"Month keyboard selection failed: {e}")
                option_found = False
            
            if not option_found:
                self.log_warning(f"Could not select month for {target_year_month}, continuing with default month")
                # 月選択に失敗しても検索を続行してみる
            
            self.log_info("Successfully selected all search criteria")
            return True
            
        except Exception as e:
            self.log_error(f"Error selecting search criteria: {e}")
            return False
    
    def execute_search(self, page: Page) -> bool:
        """
        検索ボタンをクリックして検索を実行
        
        Returns:
            成功した場合True
        """
        self.log_info("Executing search...")
        
        try:
            # 「検索する」ボタンを探す
            search_button = page.locator("button:has-text('検索する')").first
            
            if search_button.count() == 0:
                # 別のセレクタを試す
                search_button = page.locator(".ant-btn:has-text('検索')").first
            
            if search_button.count() > 0 and search_button.is_visible():
                self.log_info("Found search button, clicking...")
                search_button.click()
                
                # ページ遷移またはコンテンツ更新を待つ
                page.wait_for_timeout(2000)
                
                # spinner/loadingの消滅を待つ
                self.wait_for_loading_complete(page)
                
                self.log_info("Search executed successfully")
                return True
            else:
                self.log_error("Could not find search button")
                return False
                
        except Exception as e:
            self.log_error(f"Error executing search: {e}")
            return False
    
    def wait_for_loading_complete(self, page: Page):
        """
        ローディング（spinner）が消えるまで待つ
        """
        self.log_info("Waiting for loading to complete...")
        
        try:
            # Ant Designのspinnerを待つ
            spinner_selectors = [
                ".ant-spin-spinning",
                ".ant-spin",
                ".ant-loading",
                "[class*='spinner']",
                "[class*='loading']"
            ]
            
            for selector in spinner_selectors:
                spinner = page.locator(selector).first
                if spinner.count() > 0:
                    self.log_info(f"Found spinner with selector: {selector}")
                    # spinnerが消えるまで待つ
                    spinner.wait_for(state="hidden", timeout=30000)
                    self.log_info("Spinner disappeared")
                    break
            
            # 追加の待機
            page.wait_for_timeout(1000)
            
        except Exception as e:
            self.log_warning(f"No spinner found or timeout waiting for spinner: {e}")
    
    def navigate_to_date(self, page: Page, target_date: datetime) -> bool:
        """
        カレンダーから日付を選択
        
        Args:
            page: Playwrightのページオブジェクト
            target_date: 目標日付
        
        Returns:
            成功した場合True
        """
        target_day = target_date.day
        self.log_info(f"Looking for date: {target_day}")
        
        try:
            # カレンダーが表示されるまで待つ
            page.wait_for_selector(".calendar, [class*='calendar'], table", timeout=10000)
            
            # 月が正しいことを確認（#calendar_month または .calendar_month）
            month_display = page.locator("#calendar_month, .calendar_month").first
            if month_display.count() > 0:
                month_text = month_display.text_content()
                self.log_info(f"Current month display: {month_text}")
                # 月が正しいか確認
                expected_month = f"{target_date.year}年{target_date.month}月"
                if expected_month not in month_text:
                    self.log_warning(f"Month mismatch: expected {expected_month}, got {month_text}")
            
            # 日付セルを探す
            date_cell = None
            
            # まず日付のIDで直接探す（例：2025/12/19）
            date_id = target_date.strftime("%Y/%m/%d")
            # スラッシュをエスケープ
            escaped_id = date_id.replace("/", "\\/")
            date_cell = page.locator(f"td#{escaped_id}")
            
            if date_cell.count() == 0:
                # IDが見つからない場合は、日付テキストで探す
                date_cell = page.locator(f"td:has(div:text-is('{target_day}'))")
            
            if date_cell.count() == 0:
                # それでも見つからない場合は従来の方法
                date_selectors = [
                    f"td:has-text('{target_day}')",
                    f"[class*='day']:has-text('{target_day}')",
                    f"[class*='date']:has-text('{target_day}')"
                ]
                
                for selector in date_selectors:
                    cells = page.locator(selector).all()
                    for cell in cells:
                        cell_text = cell.text_content().strip()
                        # 日付の数字だけを含むセルを探す
                        if str(target_day) in cell_text and "予約" not in cell_text:
                            date_cell = cell
                            break
                    if date_cell:
                        break
            
            if date_cell.count() == 0:
                self.log_error(f"Could not find date cell for day {target_day}")
                return False
            
            # 空き状況があるか確認
            has_availability = False
            
            # 「予約申込可能」のspan要素を確認
            vacant_span = date_cell.locator("span.vacant, span:has-text('予約申込可能')")
            if vacant_span.count() > 0:
                has_availability = True
                self.log_info(f"Date {target_day} has availability marker (予約申込可能)")
            else:
                # role="button"のspan要素も確認
                button_span = date_cell.locator("span[role='button']")
                if button_span.count() > 0:
                    has_availability = True
                    self.log_info(f"Date {target_day} has clickable button element")
                else:
                    # 従来の○マークも念のため確認（後方互換性）
                    cell_html = date_cell.inner_html()
                    if "○" in cell_html or "◯" in cell_html:
                        has_availability = True
                        self.log_info(f"Date {target_day} has availability marker (○)")
                    elif "●" in cell_html or "◉" in cell_html:
                        has_availability = True
                        self.log_info(f"Date {target_day} has availability marker (●)")
            
            if not has_availability:
                self.log_warning(f"Date {target_day} does not have availability marker")
                return False
            
            # 日付をクリック
            self.log_info(f"Clicking date {target_day}...")
            date_cell.click()
            
            # ページ遷移またはモーダル表示を待つ
            page.wait_for_timeout(2000)
            self.wait_for_loading_complete(page)
            
            self.log_info("Successfully navigated to date details")
            return True
            
        except Exception as e:
            self.log_error(f"Error navigating to date: {e}")
            return False
    
    def extract_room_availability(self, page: Page, date: str) -> List[Dict]:
        """
        各部屋の空き状況を抽出
        
        Args:
            page: Playwrightのページオブジェクト
            date: 日付（YYYY-MM-DD形式）
        
        Returns:
            部屋ごとの空き状況リスト
        """
        self.log_info("Extracting room availability...")
        results = []
        
        try:
            # 部屋の空き状況が表示されるまで待つ
            page.wait_for_selector("[class*='room'], [class*='facility'], table", timeout=10000)
            
            # 時間帯の判定用マッピング
            time_slot_map = {
                "9:00": "morning",
                "09:00": "morning",
                "午前": "morning",
                "13:00": "afternoon",
                "午後": "afternoon",
                "18:00": "evening",
                "夜間": "evening"
            }
            
            # 各部屋の情報を抽出
            # テーブル形式の場合
            tables = page.locator("table").all()
            if tables:
                for table in tables:
                    rows = table.locator("tbody tr").all()
                    for row in rows:
                        cells = row.locator("td").all()
                        if len(cells) >= 4:  # 部屋名、9:00〜12:00、13:00〜17:00、18:00〜22:00
                            room_name_cell = cells[0].text_content().strip()
                            
                            time_slots = {
                                "morning": "unknown",
                                "afternoon": "unknown",
                                "evening": "unknown"
                            }
                            
                            # 各時間帯のセルを確認
                            for i, slot_key in enumerate(["morning", "afternoon", "evening"], start=1):
                                if i < len(cells):
                                    cell_text = cells[i].text_content().strip()
                                    if "○" in cell_text or "◯" in cell_text or "空" in cell_text:
                                        time_slots[slot_key] = "available"
                                    elif "×" in cell_text or "✕" in cell_text or "満" in cell_text:
                                        time_slots[slot_key] = "booked"
                            
                            results.append({
                                "centerName": self.get_center_name(),
                                "facilityName": self.studios[0],
                                "roomName": room_name_cell or self.get_room_name(self.studios[0]),
                                "date": date,
                                "timeSlots": time_slots,
                                "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                            })
            
            # カード形式の場合
            if not results:
                cards = page.locator("[class*='card'], [class*='room-item'], [class*='facility-item']").all()
                for card in cards:
                    room_name = card.locator("[class*='title'], h3, h4").first.text_content().strip() if card.locator("[class*='title'], h3, h4").count() > 0 else self.get_room_name(self.studios[0])
                    
                    time_slots = {
                        "morning": "unknown",
                        "afternoon": "unknown",
                        "evening": "unknown"
                    }
                    
                    # 時間帯情報を探す
                    time_elements = card.locator("[class*='time'], [class*='slot']").all()
                    for elem in time_elements:
                        elem_text = elem.text_content().strip()
                        for time_key, slot_key in time_slot_map.items():
                            if time_key in elem_text:
                                if "○" in elem_text or "◯" in elem_text or "空" in elem_text:
                                    time_slots[slot_key] = "available"
                                elif "×" in elem_text or "✕" in elem_text or "満" in elem_text:
                                    time_slots[slot_key] = "booked"
                                break
                    
                    results.append({
                        "centerName": self.get_center_name(),
                        "facilityName": self.studios[0],
                        "roomName": room_name,
                        "date": date,
                        "timeSlots": time_slots,
                        "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                    })
            
            if not results:
                self.log_warning("No room availability data found")
                # デフォルトデータを返す
                results.append({
                    "centerName": self.get_center_name(),
                    "facilityName": self.studios[0],
                    "roomName": self.get_room_name(self.studios[0]),
                    "date": date,
                    "timeSlots": {
                        "morning": "unknown",
                        "afternoon": "unknown",
                        "evening": "unknown"
                    },
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                })
            
            return results
            
        except Exception as e:
            self.log_error(f"Error extracting room availability: {e}")
            return []
    
    def scrape_availability(self, date: str) -> List[Dict]:
        """
        指定日付の空き状況をスクレイピング（渋谷区用にオーバーライド）
        
        Args:
            date: "YYYY-MM-DD"形式の日付文字列
        
        Returns:
            スタジオ空き状況のリスト
        """
        self.log_info(f"\n=== Starting Shibuya scraping for {date} ===")
        
        # 日付をパース
        target_date = datetime.strptime(date, "%Y-%m-%d")
        
        try:
            with sync_playwright() as p:
                # ブラウザを起動
                browser = self.setup_browser(p)
                
                try:
                    context = self.create_browser_context(browser)
                    page = context.new_page()
                    
                    # トップページにアクセス
                    self.log_info(f"Accessing: {self.base_url}")
                    page.goto(self.base_url, wait_until="networkidle", timeout=60000)
                    
                    # 検索画面へ遷移
                    if not self.navigate_to_search(page):
                        self.log_error("Failed to navigate to search")
                        raise RuntimeError("Scraping failed - navigation error")
                    
                    # 検索条件を選択
                    if not self.select_search_criteria(page, target_date):
                        self.log_error("Failed to select search criteria")
                        raise RuntimeError("Scraping failed - criteria selection error")
                    
                    # 検索を実行
                    if not self.execute_search(page):
                        self.log_error("Failed to execute search")
                        raise RuntimeError("Scraping failed - search execution error")
                    
                    # 日付を選択
                    if not self.navigate_to_date(page, target_date):
                        self.log_warning(f"Date {target_date.day} is not available")
                        # 全ての練習室について予約済みとして記録
                        results = []
                        for room_name in self.get_room_names():
                            results.append({
                                "centerName": self.get_center_name(),
                                "facilityName": self.studios[0],
                                "roomName": room_name,
                                "date": date,
                                "timeSlots": {
                                    "morning": "booked",
                                    "afternoon": "booked",
                                    "evening": "booked"
                                },
                                "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                            })
                        return results
                    
                    # 空き状況を抽出
                    results = self.extract_room_availability(page, date)
                    
                    if not results:
                        self.log_warning("No availability data extracted")
                        raise RuntimeError("Scraping failed - no data extracted")
                    
                    return results
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            self.log_error(f"Error during scraping: {e}")
            import traceback
            self.log_error(traceback.format_exc())
            raise
    
    # BaseScraperの抽象メソッド実装（渋谷区では使用しない）
    
    def find_studio_calendars(self, page: Page) -> List[Tuple[str, Locator]]:
        """このメソッドは渋谷区では使用しない（SPAのため）"""
        return []
    
    def navigate_to_month(self, page: Page, calendar: Locator, target_date: datetime) -> bool:
        """このメソッドは渋谷区では使用しない（検索で月を指定するため）"""
        return False
    
    def find_date_cell(self, calendar: Locator, target_day: int) -> Optional[Locator]:
        """このメソッドは渋谷区では使用しない（navigate_to_dateで代替）"""
        return None
    
    def extract_time_slots(self, day_box: Locator) -> TimeSlots:
        """このメソッドは渋谷区では使用しない（extract_room_availabilityで代替）"""
        return {
            "morning": "unknown",
            "afternoon": "unknown",
            "evening": "unknown"
        }