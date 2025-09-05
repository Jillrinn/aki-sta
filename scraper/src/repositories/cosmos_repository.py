"""
Cosmos DBへの書き込みモジュール
"""
import os
from datetime import datetime
from typing import Dict, List
from azure.cosmos import CosmosClient, exceptions
from pathlib import Path
from dotenv import load_dotenv

# root .envファイルを読み込み
root_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(root_env_path)


class CosmosWriter:
    """Cosmos DBへのデータ書き込みクラス"""
    
    def __init__(self):
        endpoint = os.getenv('COSMOS_ENDPOINT')
        key = os.getenv('COSMOS_KEY')
        database_name = os.getenv('COSMOS_DATABASE', 'studio-reservations')
        
        if not endpoint or not key:
            raise ValueError("Cosmos DB connection settings are missing")
        
        self.client = CosmosClient(endpoint, key)
        self.database = self.client.get_database_client(database_name)
        self.container = self.database.get_container_client('availability')
    
    def save_availability(self, date: str, facilities: List[Dict]) -> bool:
        """
        空き状況データをCosmos DBに保存
        
        Args:
            date: YYYY-MM-DD形式の日付
            facilities: 施設データのリスト（3層構造）
        
        Returns:
            成功時True
        """
        try:
            for facility in facilities:
                # IDを3層構造に対応して生成
                center_id = self._generate_center_id(facility['centerName'])
                facility_id = self._generate_facility_id(facility['facilityName'])
                room_id = self._generate_room_id(facility['roomName'])
                
                # Cosmos DB用のデータ構造
                item = {
                    'id': f"{date}_{center_id}_{facility_id}_{room_id}",
                    'partitionKey': date,
                    'date': date,
                    'centerName': facility['centerName'],
                    'facilityName': facility['facilityName'],
                    'roomName': facility['roomName'],
                    'timeSlots': facility['timeSlots'],
                    'updatedAt': facility.get('lastUpdated', datetime.utcnow().isoformat() + 'Z'),
                    'dataSource': 'scraping'
                }
                
                # upsert（存在する場合は更新、なければ作成）
                self.container.upsert_item(body=item)
                print(f"Saved to Cosmos DB: {date} - {facility['centerName']} - {facility['facilityName']} - {facility['roomName']}")
            
            return True
            
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error: {e.message}")
            return False
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False
    
    def _generate_center_id(self, center_name: str) -> str:
        """センター名からIDを生成"""
        return center_name.replace(' ', '-').replace('(', '').replace(')', '').lower()
    
    def _generate_facility_id(self, facility_name: str) -> str:
        """施設名からIDを生成"""
        return facility_name.replace(' ', '-').replace('(', '').replace(')', '').lower()
    
    def _generate_room_id(self, room_name: str) -> str:
        """部屋名からIDを生成"""
        return room_name.replace(' ', '-').replace('(', '').replace(')', '').replace('（', '').replace('）', '').lower()
    
    def warm_up(self) -> Dict:
        """
        接続のウォームアップ（接続維持用）
        軽量なクエリを実行して接続をアクティブに保つ
        
        Returns:
            実行結果を含む辞書
        """
        try:
            # 最小限のデータを取得（1件のみ）
            query = "SELECT TOP 1 c.id FROM c"
            items = list(self.container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            
            return {
                'status': 'success',
                'message': 'Connection warmed up successfully',
                'items_found': len(items)
            }
            
        except exceptions.CosmosHttpResponseError as e:
            return {
                'status': 'error',
                'message': f'Cosmos DB error: {e.message}'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}'
            }