import React from 'react';
import StatusBadge from './StatusBadge';
import { STATUS_LABELS } from '../../../constants/availability';

const LegendSection: React.FC = () => (
  <div className="flex justify-center gap-4 sm:gap-8 mb-5 flex-wrap mt-8">
    <span className="flex items-center gap-2 text-sm sm:text-sm text-gray-600">
      <StatusBadge status="available" /> {STATUS_LABELS.available}
    </span>
    <span className="flex items-center gap-2 text-sm sm:text-sm text-gray-600">
      <StatusBadge status="booked" /> {STATUS_LABELS.booked}
    </span>
    <span className="flex items-center gap-2 text-sm sm:text-sm text-gray-600">
      <StatusBadge status="booked_1" /> 一部予約済み
    </span>
  </div>
);

export default LegendSection;