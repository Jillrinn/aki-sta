"""
テスト用のダミーデータを生成してJSONファイルに保存
"""
import json
from datetime import datetime
from pathlib import Path


def generate_test_data():
    """テスト用データを生成"""
    test_data = {
        "lastScraped": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data": {
            "2025-11-15": [
                {
                    "facilityName": "あんさんぶるStudio和(本郷)",
                    "timeSlots": {
                        "9-12": "available",
                        "13-17": "booked",
                        "18-21": "available"
                    },
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                },
                {
                    "facilityName": "あんさんぶるStudio音(初台)",
                    "timeSlots": {
                        "9-12": "booked",
                        "13-17": "available",
                        "18-21": "booked"
                    },
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            ],
            "2025-11-16": [
                {
                    "facilityName": "あんさんぶるStudio和(本郷)",
                    "timeSlots": {
                        "9-12": "booked",
                        "13-17": "available",
                        "18-21": "available"
                    },
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                },
                {
                    "facilityName": "あんさんぶるStudio音(初台)",
                    "timeSlots": {
                        "9-12": "available",
                        "13-17": "booked",
                        "18-21": "available"
                    },
                    "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            ]
        }
    }
    
    # shared-dataディレクトリを作成
    shared_data_path = Path(__file__).parent.parent.parent / "shared-data"
    shared_data_path.mkdir(parents=True, exist_ok=True)
    
    # JSONファイルに保存
    json_path = shared_data_path / "availability.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)
    
    print(f"テストデータを生成しました: {json_path}")
    print("\n生成したデータ:")
    for date, facilities in test_data["data"].items():
        print(f"\n{date}:")
        for facility in facilities:
            print(f"  {facility['facilityName']}:")
            for time_slot, status in facility['timeSlots'].items():
                status_symbol = "○" if status == "available" else "×"
                print(f"    {time_slot}: {status_symbol}")


if __name__ == "__main__":
    generate_test_data()