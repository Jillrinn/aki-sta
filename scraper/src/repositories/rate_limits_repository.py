"""
rate_limitsコンテナへのアクセス管理
"""
import os
from datetime import datetime
from typing import Dict, Optional, Any
from azure.cosmos import CosmosClient, exceptions
from pathlib import Path
from dotenv import load_dotenv

# ルートの.envファイルを読み込み
root_env_path = Path(__file__).parent.parent.parent.parent / '.env'
load_dotenv(root_env_path)


class RateLimitsRepository:
    """rate_limitsコンテナへのアクセスクラス"""
    
    def __init__(self):
        """
        Cosmos DB接続の初期化
        """
        endpoint = os.getenv('COSMOS_ENDPOINT')
        key = os.getenv('COSMOS_KEY')
        database_name = os.getenv('COSMOS_DATABASE', 'studio-reservations')
        
        if not endpoint or not key:
            raise ValueError("Cosmos DB connection settings are missing")
        
        self.client = CosmosClient(endpoint, key)
        self.database = self.client.get_database_client(database_name)
        self.container = self.database.get_container_client('rate_limits')
    
    def get_today_record(self) -> Optional[Dict[str, Any]]:
        """
        本日のレコードを取得
        
        Returns:
            本日のレコード、存在しない場合はNone
        """
        today = datetime.now().strftime('%Y-%m-%d')
        
        try:
            query = "SELECT * FROM c WHERE c.date = @date"
            parameters = [{"name": "@date", "value": today}]
            
            items = list(self.container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))
            
            return items[0] if items else None
            
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error while fetching rate limit record: {e.message}")
            raise
        except Exception as e:
            print(f"Unexpected error while fetching rate limit record: {e}")
            raise
    
    def create_or_update_record(self, status: str = 'running') -> Dict[str, Any]:
        """
        レコードを作成または更新
        
        Args:
            status: 設定するステータス（'running', 'completed', 'failed'）
        
        Returns:
            dict: {
                'is_already_running': bool,  # すでに実行中の場合True
                'record': dict  # レコード情報
            }
        """
        today = datetime.now().strftime('%Y-%m-%d')
        
        try:
            existing_record = self.get_today_record()
            
            if existing_record:
                # 既存レコードがある場合
                if existing_record.get('status') == 'running':
                    # すでに実行中の場合はそのまま返す
                    return {
                        'is_already_running': True,
                        'record': existing_record
                    }
                
                # completed/failedの場合はcountを増やして新しいリクエストとして処理
                updated_record = {
                    **existing_record,
                    'count': existing_record.get('count', 0) + 1,
                    'status': status,
                    'lastRequestedAt': datetime.now().isoformat() + 'Z',
                    'updatedAt': datetime.now().isoformat() + 'Z'
                }
                
                # partitionKeyを明示的に設定
                self.container.upsert_item(body=updated_record)
                
                return {
                    'is_already_running': False,
                    'record': updated_record
                }
            else:
                # 新規レコードを作成
                new_record = {
                    'id': today,  # idとdateを同じに
                    'date': today,
                    'count': 1,
                    'status': status,
                    'lastRequestedAt': datetime.now().isoformat() + 'Z',
                    'createdAt': datetime.now().isoformat() + 'Z',
                    'updatedAt': datetime.now().isoformat() + 'Z'
                }
                
                self.container.create_item(body=new_record)
                
                return {
                    'is_already_running': False,
                    'record': new_record
                }
                
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error while creating/updating rate limit: {e.message}")
            raise
        except Exception as e:
            print(f"Unexpected error while creating/updating rate limit: {e}")
            raise
    
    def update_status(self, record_id: str, date: str, status: str) -> Dict[str, Any]:
        """
        ステータスを更新
        
        Args:
            record_id: レコードID
            date: 日付（パーティションキー）
            status: 新しいステータス（'completed' or 'failed'）
        
        Returns:
            更新されたレコード
        """
        try:
            # レコードを取得
            existing_record = self.container.read_item(
                item=record_id,
                partition_key=date
            )
            
            if not existing_record:
                raise ValueError(f"Record not found: {record_id}")
            
            # ステータスを更新
            updated_record = {
                **existing_record,
                'status': status,
                'updatedAt': datetime.now().isoformat() + 'Z'
            }
            
            # 更新を実行
            self.container.replace_item(
                item=record_id,
                body=updated_record
            )
            
            return updated_record
            
        except exceptions.CosmosResourceNotFoundError:
            print(f"Rate limit record not found: {record_id}")
            raise ValueError(f"Record not found: {record_id}")
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error while updating status: {e.message}")
            raise
        except Exception as e:
            print(f"Unexpected error while updating status: {e}")
            raise