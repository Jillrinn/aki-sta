import React, { useState, useEffect } from 'react';
import { Facility } from '../../../../types/availability';
import { TIME_SLOTS, TIME_SLOT_DISPLAY } from '../../../../constants/availability';
import StatusBadge from './StatusBadge';
import { openBookingUrl } from '../../../../utils/availabilityUtils';

interface MobileCardViewProps {
  facility: Facility;
  formatUpdateTime: (dateString: string) => string;
}

const TIME_SLOT_LABELS = TIME_SLOT_DISPLAY;

const MobileCardView: React.FC<MobileCardViewProps> = ({ facility, formatUpdateTime }) => {
  const handleTimeSlotClick = () => {
    openBookingUrl(facility.centerName);
  };
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      available: '空き',
      booked: '予約済み',
      lottery: '抽選',
      unknown: '不明'
    };
    return statusMap[status] || '不明';
  };

  // 施設の状態を判定
  const hasAvailable = TIME_SLOTS.some(slot => facility.timeSlots[slot] === 'available');
  const allBooked = TIME_SLOTS.every(slot => facility.timeSlots[slot] === 'booked');
  const allUnknown = TIME_SLOTS.every(slot => facility.timeSlots[slot] === 'unknown');
  const afternoonBooked = facility.timeSlots['afternoon'] === 'booked';
  
  // ヘッダーの色を決定
  const getHeaderColorClass = () => {
    if (allUnknown) return 'bg-gradient-to-r from-gray-400 to-gray-600';
    return 'bg-gradient-to-r from-primary-400 to-primary-700';
  };

  // 初期状態：空きがある場合のみ展開（ただし13-17が予約済みの場合は折りたたむ）
  const [isExpanded, setIsExpanded] = useState(hasAvailable && !afternoonBooked);

  useEffect(() => {
    setIsExpanded(hasAvailable && !afternoonBooked);
  }, [hasAvailable, afternoonBooked]);

  return (
    <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden border border-gray-200">
      <div 
        className={`${getHeaderColorClass()} text-white p-4 cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-start">
            <span className="mr-2 text-base">▶</span>
            <div className="flex-1">
              <h3 className="text-base font-semibold">【{facility.facilityName}】</h3>
              <div className="text-sm opacity-90 ml-4">{facility.roomName}</div>
            </div>
          </div>
          <span className="text-2xl">{isExpanded ? '−' : '＋'}</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-3">
          {TIME_SLOTS.map((timeSlot) => {
            const status = facility.timeSlots[timeSlot];
            const statusText = getStatusText(status);
            const isAvailable = status === 'available';
            
            return (
              <div 
                key={timeSlot}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                  isAvailable ? 'bg-accent-green/10' : 'bg-gray-50'
                }`}
                onClick={handleTimeSlotClick}
              >
                <span className="text-base font-medium text-gray-700">
                  {TIME_SLOT_LABELS[timeSlot]}
                </span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={status} />
                  <span className={`text-sm font-medium ${
                    isAvailable ? 'text-accent-green' : 'text-gray-600'
                  }`}>
                    {statusText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <span className="mr-2">🕐</span>
            <span>{formatUpdateTime(facility.lastUpdated)} 更新</span>
          </div>
          {!isExpanded && (
            <span className={`font-medium px-2 py-1 rounded whitespace-nowrap ${
              allBooked ? 'bg-red-100 text-red-700' : 
              allUnknown ? 'bg-gray-100 text-gray-700' : 
              afternoonBooked ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
            }`}>
              {allBooked ? '全て予約済み' : 
               allUnknown ? '全て不明' : 
               afternoonBooked ? '希望時間は予約済み' : '空きあり'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileCardView;