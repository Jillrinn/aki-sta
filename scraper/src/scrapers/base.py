"""
基底スクレイパークラス
全ての施設スクレイパーが継承する共通処理を実装
"""
import json
import os
import platform
import re
import time
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from playwright.sync_api import sync_playwright, Page, Locator


class BaseScraper(ABC):
    """全施設共通の基底スクレイパークラス"""
    
    def __init__(self):
        """初期化処理"""
        self.base_url = self.get_base_url()
        self.studios = self.get_studios()
    
    @abstractmethod
    def get_base_url(self) -> str:
        """施設のベースURLを返す（施設固有）"""
        pass
    
    @abstractmethod
    def get_studios(self) -> List[str]:
        """施設のスタジオリストを返す（施設固有）"""
        pass
    
    # ===== 共通Util処理 =====
    
    def convert_time_to_slot(self, time_str: str) -> Optional[str]:
        """
        時刻文字列を時間帯に変換
        "09:00" → "morning"
        "13:00" → "afternoon" 
        "18:00" → "evening"
        """
        if not time_str:
            return None
            
        if "09:00" in time_str or "9:00" in time_str:
            return "morning"
        elif "13:00" in time_str:
            return "afternoon"
        elif "18:00" in time_str:
            return "evening"
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
    
    def setup_browser(self, playwright):
        """
        環境に応じたブラウザをセットアップ
        Returns:
            browser: 起動したブラウザインスタンス
        """
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
            return playwright.chromium.launch(headless=True)
        elif system == "Darwin":  # macOS
            # macOSではWebKitを使用（GPUクラッシュ回避）
            print(f"Running on macOS, using WebKit browser")
            return playwright.webkit.launch(headless=True)
        else:  # Linux/その他の環境
            # その他の環境ではChromiumが安定
            print(f"Running on {system}, using Chromium browser")
            return playwright.chromium.launch(headless=True)
    
    def create_browser_context(self, browser):
        """
        ブラウザコンテキストを作成
        Returns:
            context: ブラウザコンテキスト
        """
        return browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            viewport={'width': 1920, 'height': 1080},
            locale='ja-JP'
        )
    
    def save_to_json(self, data: Dict, filepath: str):
        """データをJSONファイルに保存"""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
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
    
    # ===== 施設固有の実装が必要な抽象メソッド =====
    
    @abstractmethod
    def find_studio_calendars(self, page: Page) -> List[Tuple[str, Locator]]:
        """
        各スタジオのカレンダー要素を特定（施設固有）
        
        Args:
            page: Playwrightのページオブジェクト
        
        Returns:
            [(スタジオ名, カレンダー要素), ...]のリスト
        """
        pass
    
    @abstractmethod
    def navigate_to_month(self, page: Page, calendar: Locator, target_date: datetime) -> bool:
        """
        カレンダーを目的の年月まで移動（施設固有）
        
        Args:
            page: Playwrightのページオブジェクト
            calendar: カレンダー要素
            target_date: 目標日付
        
        Returns:
            成功した場合True
        """
        pass
    
    @abstractmethod
    def find_date_cell(self, calendar: Locator, target_day: int) -> Optional[Locator]:
        """
        指定日付のセルを特定（施設固有）
        
        Args:
            calendar: カレンダー要素
            target_day: 日付（1-31の数値）
        
        Returns:
            日付セル要素またはNone
        """
        pass
    
    @abstractmethod
    def extract_time_slots(self, day_box: Locator) -> Dict[str, str]:
        """
        日付セルから時刻情報を抽出（施設固有）
        
        Args:
            day_box: 日付セル要素
        
        Returns:
            {"9-12": "available|booked|unknown", ...}
        """
        pass
    
    # ===== メインのスクレイピング処理（テンプレートメソッド） =====
    
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
                # ブラウザを起動
                browser = self.setup_browser(p)
                
                try:
                    context = self.create_browser_context(browser)
                    page = context.new_page()
                    
                    # ページにアクセス
                    print(f"Accessing: {self.base_url}")
                    response = page.goto(self.base_url, wait_until="networkidle", timeout=60000)
                    
                    if response:
                        print(f"Response status: {response.status}")
                    
                    # カレンダーが読み込まれるまで待機（施設によってセレクタが異なる可能性）
                    self.wait_for_calendar_load(page)
                    
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
    
    def wait_for_calendar_load(self, page: Page):
        """
        カレンダーの読み込みを待つ（オーバーライド可能）
        """
        page.wait_for_selector(".timetable-calendar", timeout=30000)
        page.wait_for_timeout(3000)  # 追加の待機
    
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