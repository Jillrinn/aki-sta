"""
COSMOS DBのtarget_datesコンテナとの連携
"""
import os
from datetime import datetime, timedelta
from typing import List, Optional
from azure.cosmos import CosmosClient, exceptions
from pathlib import Path
from dotenv import load_dotenv

# root .envファイルを読み込み
root_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(root_env_path)


class TargetDateRepository:
    """target_datesコンテナへのアクセスクラス"""
    
    def __init__(self):
        endpoint = os.getenv('COSMOS_ENDPOINT')
        key = os.getenv('COSMOS_KEY')
        database_name = os.getenv('COSMOS_DATABASE', 'studio-reservations')
        
        if not endpoint or not key:
            raise ValueError("Cosmos DB connection settings are missing")
        
        self.client = CosmosClient(endpoint, key)
        self.database = self.client.get_database_client(database_name)
        self.container = self.database.get_container_client('target_dates')
    
    def get_target_dates(self) -> List[str]:
        """
        target_datesコンテナから日付リストを取得
        
        Returns:
            YYYY-MM-DD形式の日付文字列のリスト
        """
        try:
            # target_datesコンテナから全アイテムを取得
            query = "SELECT * FROM c WHERE c.active = true ORDER BY c.date"
            items = list(self.container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            
            if items:
                # date フィールドを抽出
                return [item['date'] for item in items if 'date' in item]
            
            # データがない場合はデフォルト日付を返す
            return self._get_default_dates()
            
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error while fetching target dates: {e.message}")
            # エラー時もデフォルト日付を返す
            return self._get_default_dates()
        except Exception as e:
            print(f"Unexpected error while fetching target dates: {e}")
            return self._get_default_dates()
    
    def get_single_target_date(self) -> Optional[str]:
        """
        最も優先度の高い単一の日付を取得
        
        Returns:
            YYYY-MM-DD形式の日付文字列、またはNone
        """
        dates = self.get_target_dates()
        return dates[0] if dates else None
    
    def add_target_date(self, date: str, priority: int = 1) -> bool:
        """
        新しいターゲット日付を追加
        
        Args:
            date: YYYY-MM-DD形式の日付
            priority: 優先度（低い数値が高優先度）
        
        Returns:
            成功時True
        """
        try:
            # 日付フォーマットの検証
            datetime.strptime(date, '%Y-%m-%d')
            
            item = {
                'id': f"target_{date}",
                'partitionKey': date,
                'date': date,
                'priority': priority,
                'active': True,
                'isbooked': False,
                'createdAt': datetime.utcnow().isoformat() + 'Z'
            }
            
            self.container.upsert_item(body=item)
            print(f"Added target date: {date}")
            return True
            
        except ValueError as e:
            print(f"Invalid date format: {date}")
            return False
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error while adding target date: {e.message}")
            return False
        except Exception as e:
            print(f"Unexpected error while adding target date: {e}")
            return False
    
    def remove_target_date(self, date: str) -> bool:
        """
        ターゲット日付を削除（非アクティブ化）
        
        Args:
            date: YYYY-MM-DD形式の日付
        
        Returns:
            成功時True
        """
        try:
            item_id = f"target_{date}"
            
            # アイテムを取得
            try:
                item = self.container.read_item(
                    item=item_id,
                    partition_key=date
                )
                
                # activeフラグをFalseに設定
                item['active'] = False
                item['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
                
                self.container.replace_item(
                    item=item_id,
                    body=item
                )
                print(f"Deactivated target date: {date}")
                return True
                
            except exceptions.CosmosResourceNotFoundError:
                print(f"Target date not found: {date}")
                return False
                
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error while removing target date: {e.message}")
            return False
        except Exception as e:
            print(f"Unexpected error while removing target date: {e}")
            return False
    
    def _get_default_dates(self) -> List[str]:
        """
        デフォルトの日付リストを生成（今日から7日間）
        
        Returns:
            YYYY-MM-DD形式の日付文字列のリスト
        """
        today = datetime.now().date()
        dates = []
        for i in range(7):
            date = today + timedelta(days=i)
            dates.append(date.strftime('%Y-%m-%d'))
        return dates