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
            facilities: 施設データのリスト
        
        Returns:
            成功時True
        """
        try:
            for facility in facilities:
                # facility IDを生成
                facility_id = self._generate_facility_id(facility['facilityName'])
                
                # Cosmos DB用のデータ構造
                item = {
                    'id': f"{date}_{facility_id}",
                    'partitionKey': date,
                    'date': date,
                    'facility': facility_id,
                    'facilityName': facility['facilityName'],
                    'timeSlots': facility['timeSlots'],
                    'updatedAt': facility.get('lastUpdated', datetime.utcnow().isoformat() + 'Z'),
                    'dataSource': 'scraping'
                }
                
                # upsert（存在する場合は更新、なければ作成）
                self.container.upsert_item(body=item)
                print(f"Saved to Cosmos DB: {date} - {facility['facilityName']}")
            
            return True
            
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error: {e.message}")
            return False
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False
    
    def _generate_facility_id(self, facility_name: str) -> str:
        """施設名からIDを生成"""
        if "本郷" in facility_name:
            return "ensemble-hongo"
        elif "初台" in facility_name:
            return "ensemble-hatsudai"
        else:
            # その他の施設用
            return facility_name.lower().replace(' ', '-').replace('(', '').replace(')', '')