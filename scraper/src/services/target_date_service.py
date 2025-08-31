"""
target_date管理サービス
"""
from datetime import datetime
from typing import List, Optional
from ..repositories.target_date_repository import TargetDateRepository


class TargetDateService:
    """target_dateの取得とデフォルト値管理"""
    
    def __init__(self, repository: Optional[TargetDateRepository] = None):
        """
        初期化
        
        Args:
            repository: TargetDateRepositoryインスタンス（DIパターン）
        """
        self.repository = repository or TargetDateRepository()
    
    def get_dates_to_scrape(self, requested_dates: Optional[List[str]] = None) -> List[str]:
        """
        スクレイピング対象の日付リストを取得
        
        Args:
            requested_dates: ユーザーが明示的に指定した日付リスト
        
        Returns:
            スクレイピング対象の日付リスト（YYYY-MM-DD形式）
        """
        # ユーザー指定がある場合はそれを優先
        if requested_dates and len(requested_dates) > 0:
            return self._validate_dates(requested_dates)
        
        # ユーザー指定がない場合はtarget_datesから取得
        try:
            target_dates = self.repository.get_target_dates()
            if target_dates:
                return target_dates
        except Exception as e:
            print(f"Error fetching target dates: {e}")
        
        # 取得できない場合はデフォルト（今日）
        return [datetime.now().strftime('%Y-%m-%d')]
    
    def get_single_date_to_scrape(self, requested_date: Optional[str] = None) -> str:
        """
        単一のスクレイピング対象日付を取得
        
        Args:
            requested_date: ユーザーが明示的に指定した日付
        
        Returns:
            スクレイピング対象の日付（YYYY-MM-DD形式）
        """
        # ユーザー指定がある場合はそれを優先
        if requested_date:
            validated = self._validate_dates([requested_date])
            return validated[0] if validated else datetime.now().strftime('%Y-%m-%d')
        
        # ユーザー指定がない場合はtarget_datesから取得
        try:
            target_date = self.repository.get_single_target_date()
            if target_date:
                return target_date
        except Exception as e:
            print(f"Error fetching single target date: {e}")
        
        # 取得できない場合はデフォルト（今日）
        return datetime.now().strftime('%Y-%m-%d')
    
    def _validate_dates(self, dates: List[str]) -> List[str]:
        """
        日付リストのバリデーション
        
        Args:
            dates: 検証する日付リスト
        
        Returns:
            有効な日付のリスト（YYYY-MM-DD形式）
        """
        validated_dates = []
        
        for date_str in dates:
            # 複数のフォーマットを試す
            for fmt in ['%Y-%m-%d', '%Y/%m/%d']:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    # YYYY-MM-DD形式に正規化
                    validated_dates.append(parsed_date.strftime('%Y-%m-%d'))
                    break
                except ValueError:
                    continue
        
        return validated_dates
    
    def add_target_date(self, date: str, priority: int = 1) -> bool:
        """
        新しいターゲット日付を追加
        
        Args:
            date: YYYY-MM-DD形式の日付
            priority: 優先度
        
        Returns:
            成功時True
        """
        try:
            return self.repository.add_target_date(date, priority)
        except Exception as e:
            print(f"Error adding target date: {e}")
            return False
    
    def remove_target_date(self, date: str) -> bool:
        """
        ターゲット日付を削除
        
        Args:
            date: YYYY-MM-DD形式の日付
        
        Returns:
            成功時True
        """
        try:
            return self.repository.remove_target_date(date)
        except Exception as e:
            print(f"Error removing target date: {e}")
            return False