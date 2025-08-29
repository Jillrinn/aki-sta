import React from 'react';
import { Facility } from '../../types/availability';
import { TIME_SLOTS } from '../../constants/availability';
import StatusBadge from './StatusBadge';

interface MobileCardViewProps {
  facility: Facility;
  formatUpdateTime: (dateString: string) => string;
}

const TIME_SLOT_LABELS: Record<string, string> = {
  '9-12': '9-12時',
  '13-17': '13-17時',
  '18-21': '18-21時'
};

const MobileCardView: React.FC<MobileCardViewProps> = ({ facility, formatUpdateTime }) => {
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      available: '空き',
      booked: '予約済み',
      lottery: '抽選',
      unknown: '不明'
    };
    return statusMap[status] || '不明';
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h3 className="text-lg font-semibold">{facility.facilityName}</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {TIME_SLOTS.map((timeSlot) => {
          const status = facility.timeSlots[timeSlot];
          const statusText = getStatusText(status);
          const isAvailable = status === 'available';
          
          return (
            <div 
              key={timeSlot}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isAvailable ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <span className="text-base font-medium text-gray-700">
                {TIME_SLOT_LABELS[timeSlot]}
              </span>
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                <span className={`text-sm font-medium ${
                  isAvailable ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">🕐</span>
          <span>{formatUpdateTime(facility.lastUpdated)} 更新</span>
        </div>
      </div>
    </div>
  );
};

export default MobileCardView;