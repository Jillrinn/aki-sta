"""
ターゲット日付管理プロバイダー
将来的な拡張に備えた日付取得システム
"""
import os
from datetime import datetime, timedelta
from typing import List


class TargetDateProvider:
    """
    スクレイピング対象日付を管理するプロバイダー
    
    Phase 1: 固定日付（現在の実装）
    Phase 2: Cosmos DBから動的取得（将来）
    Phase 3: Logic Appsから指定された日付（将来）
    """
    
    @staticmethod
    def get_target_dates() -> List[str]:
        """
        スクレイピング対象日付のリストを取得
        
        Returns:
            日付文字列のリスト（YYYY-MM-DD形式）
        """
        # 環境変数から日付取得方法を判定（将来的な拡張）
        date_source = os.environ.get('DATE_SOURCE', 'default')
        
        if date_source == 'cosmos':
            # Phase 2: Cosmos DBから取得（将来実装）
            return TargetDateProvider._get_dates_from_cosmos()
        elif date_source == 'env':
            # 環境変数から取得（テスト用）
            env_dates = os.environ.get('TARGET_DATES', '')
            if env_dates:
                return env_dates.split(',')
        
        # Phase 1: デフォルト実装（1週間後の日付）
        return TargetDateProvider._get_default_dates()
    
    @staticmethod
    def _get_default_dates() -> List[str]:
        """
        デフォルトの日付リストを生成
        現在から1週間後の日付を返す
        """
        target_date = datetime.now() + timedelta(days=7)
        return [target_date.strftime("%Y-%m-%d")]
    
    @staticmethod
    def _get_dates_from_cosmos() -> List[str]:
        """
        Cosmos DBから対象日付を取得（将来実装）
        
        Returns:
            Cosmos DBに登録された日付リスト
        """
        # 将来的な実装
        # from .cosmos_reader import CosmosReader
        # reader = CosmosReader()
        # return reader.get_target_dates()
        
        # 現時点ではデフォルト実装にフォールバック
        return TargetDateProvider._get_default_dates()
    
    @staticmethod
    def get_date_range(start_days: int = 0, end_days: int = 30) -> List[str]:
        """
        指定範囲の日付リストを生成
        
        Args:
            start_days: 開始日数（今日から何日後）
            end_days: 終了日数（今日から何日後）
        
        Returns:
            日付文字列のリスト
        """
        dates = []
        base_date = datetime.now()
        
        for days in range(start_days, end_days + 1):
            target_date = base_date + timedelta(days=days)
            dates.append(target_date.strftime("%Y-%m-%d"))
        
        return dates
    
    @staticmethod
    def get_specific_dates(dates: List[str]) -> List[str]:
        """
        指定された日付リストを検証して返す
        
        Args:
            dates: 日付文字列のリスト
        
        Returns:
            検証済みの日付文字列リスト
        """
        validated_dates = []
        
        for date_str in dates:
            try:
                # 日付形式の検証
                datetime.strptime(date_str, "%Y-%m-%d")
                validated_dates.append(date_str)
            except ValueError:
                # 無効な日付は無視
                continue
        
        return validated_dates