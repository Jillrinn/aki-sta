import React from 'react';
import { Facility } from '../../../../types/availability';
import StatusBadge from './StatusBadge';
import { TIME_SLOTS } from '../../../../constants/availability';
import { openBookingUrl } from '../../../../utils/availabilityUtils';

interface AvailabilityTableRowProps {
  facility: Facility;
  formatUpdateTime: (dateString: string) => string;
}

const AvailabilityTableRow: React.FC<AvailabilityTableRowProps> = ({ 
  facility, 
  formatUpdateTime 
}) => {
  const handleRowClick = () => {
    openBookingUrl(facility.centerName);
  };

  return (
    <tr 
      className="hover:bg-primary-50 transition-colors duration-150 cursor-pointer"
      onClick={handleRowClick}
    >
      <td className="p-4 text-left border-b border-gray-200 font-medium text-slate-700">
        <div>{facility.facilityName}</div>
        <div className="text-sm text-gray-500">- {facility.roomName}</div>
      </td>
      {TIME_SLOTS.map((timeSlot) => (
        <td key={timeSlot} className="p-4 text-center border-b border-gray-200">
          <StatusBadge 
            status={facility.timeSlots[timeSlot]} 
          />
        </td>
      ))}
      <td className="p-4 text-center border-b border-gray-200 text-gray-600 text-sm">
        {formatUpdateTime(facility.lastUpdated)}
      </td>
    </tr>
  );
};

export default AvailabilityTableRow;