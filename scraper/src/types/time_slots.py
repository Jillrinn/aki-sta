"""
タイムスロット関連の型定義
統一されたタイムスロット形式を保証するための型定義
"""
from typing import Literal, TypedDict, Dict

# タイムスロットのキー（morning, afternoon, evening形式）
TimeSlotKey = Literal["morning", "afternoon", "evening"]

# タイムスロットのステータス
# booked_1: 午後1のみ予約済み（目黒区）
# booked_2: 午後2のみ予約済み（目黒区）
TimeSlotStatus = Literal["available", "booked", "booked_1", "booked_2", "lottery", "unknown"]

# タイムスロットの型定義
class TimeSlots(TypedDict):
    """タイムスロットの型定義"""
    morning: TimeSlotStatus
    afternoon: TimeSlotStatus
    evening: TimeSlotStatus

def create_default_time_slots() -> TimeSlots:
    """デフォルトのタイムスロットを作成"""
    return {
        "morning": "unknown",
        "afternoon": "unknown",
        "evening": "unknown"
    }

def validate_time_slots(slots: Dict[str, str]) -> TimeSlots:
    """
    タイムスロットの検証と型変換
    
    Args:
        slots: 検証対象のタイムスロット
        
    Returns:
        検証済みのTimeSlots
        
    Raises:
        ValueError: 無効なキーまたは値が含まれている場合
    """
    valid_keys = {"morning", "afternoon", "evening"}
    valid_statuses = {"available", "booked", "booked_1", "booked_2", "lottery", "unknown"}
    
    # キーの検証
    if not all(key in valid_keys for key in slots.keys()):
        invalid_keys = set(slots.keys()) - valid_keys
        raise ValueError(f"Invalid time slot keys: {invalid_keys}")
    
    # 値の検証
    if not all(value in valid_statuses for value in slots.values()):
        invalid_values = {v for v in slots.values() if v not in valid_statuses}
        raise ValueError(f"Invalid time slot statuses: {invalid_values}")
    
    # デフォルト値で初期化してから更新
    result = create_default_time_slots()
    for key, value in slots.items():
        if key in valid_keys:
            result[key] = value  # type: ignore
    
    return result