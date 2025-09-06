import { Facility } from '../types/availability';
import { BOOKING_URLS } from '../constants/availability';

/**
 * 施設の空き状況を判定するユーティリティ関数
 */

/**
 * 全ての施設が予約済みかチェック
 */
export const areAllFacilitiesBooked = (facilities: Facility[]): boolean => {
  return facilities.every(facility => 
    Object.values(facility.timeSlots).every(status => 
      status === 'booked' || status === 'unknown'
    )
  );
};

/**
 * 指定した時間帯が全て空きなしかチェック
 */
export const areTimeSlotsFull = (
  facilities: Facility[], 
  targetTimeSlots: string[]
): boolean => {
  return facilities.every(facility => 
    targetTimeSlots.every(slot => 
      facility.timeSlots[slot] === 'booked' || 
      facility.timeSlots[slot] === 'booked_1' || 
      facility.timeSlots[slot] === 'booked_2' || 
      facility.timeSlots[slot] === 'unknown'
    )
  );
};

/**
 * 施設に空きがあるかチェック
 */
export const hasAvailableSlots = (facilities: Facility[]): boolean => {
  return facilities.some(facility => 
    Object.values(facility.timeSlots).some(status => 
      status === 'available'
    )
  );
};

/**
 * 個別施設の状態を判定
 */
const getFacilityStatus = (facility: Facility, preferredTimeSlots?: string[]): 'all-booked' | 'preferred-booked' | 'has-availability' => {
  const allBooked = Object.values(facility.timeSlots).every(status => 
    status === 'booked' || status === 'unknown'
  );
  
  if (allBooked) {
    return 'all-booked';
  }
  
  if (preferredTimeSlots && preferredTimeSlots.length > 0) {
    const preferredBooked = preferredTimeSlots.every(slot => 
      facility.timeSlots[slot] === 'booked' || 
      facility.timeSlots[slot] === 'booked_1' || 
      facility.timeSlots[slot] === 'booked_2' || 
      facility.timeSlots[slot] === 'unknown'
    );
    
    if (preferredBooked) {
      return 'preferred-booked';
    }
  }
  
  return 'has-availability';
};

/**
 * カテゴリの状態を取得
 * 各施設レコードの状態を集約してカテゴリレベルの状態を決定
 */
export const getCategoryStatus = (
  facilities: Facility[],
  preferredTimeSlots?: string[]
): {
  status: 'all-booked' | 'preferred-booked' | 'has-availability';
  message: string;
  shouldExpand: boolean;
} => {
  // 各施設の状態を判定
  const facilityStatuses = facilities.map(facility => 
    getFacilityStatus(facility, preferredTimeSlots)
  );
  
  // 全ての施設が「全て空きなし」の場合
  if (facilityStatuses.every(status => status === 'all-booked')) {
    return {
      status: 'all-booked',
      message: '全て空きなし',
      shouldExpand: false
    };
  }
  
  // 全ての施設が「全て空きなし」または「希望時間は予約済み」の場合
  if (facilityStatuses.every(status => 
    status === 'all-booked' || status === 'preferred-booked'
  )) {
    return {
      status: 'preferred-booked',
      message: '希望時間は予約済み',
      shouldExpand: false
    };
  }
  
  // いずれかの施設に空きがある場合
  return {
    status: 'has-availability',
    message: '空きあり',
    shouldExpand: true
  };
};

/**
 * 施設の予約URLを取得
 */
export const getBookingUrl = (centerName: string): string | undefined => {
  return BOOKING_URLS[centerName];
};

/**
 * 予約サイトを新しいタブで開く
 */
export const openBookingUrl = (centerName: string): void => {
  const url = getBookingUrl(centerName);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

