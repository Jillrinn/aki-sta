import React from 'react';
import { 
  StatusValue, 
  STATUS_SYMBOLS, 
  STATUS_COLORS, 
  STATUS_LABELS 
} from '../../../../constants/availability';

interface StatusBadgeProps {
  status: string;
  onClick?: () => void;
  clickable?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onClick, clickable = false }) => {
  const statusValue = status as StatusValue;
  const symbol = STATUS_SYMBOLS[statusValue] || STATUS_SYMBOLS.unknown;
  const colorClass = STATUS_COLORS[statusValue] || STATUS_COLORS.unknown;
  const label = STATUS_LABELS[statusValue] || STATUS_LABELS.unknown;
  
  const baseClasses = 'inline-block w-8 h-8 sm:w-8 sm:h-8 leading-8 text-center rounded-full font-bold text-xl text-white';
  const clickableClasses = clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  return (
    <span 
      className={`${baseClasses} ${colorClass} ${clickableClasses}`}
      aria-label={label}
      role="img"
      onClick={onClick}
    >
      {symbol}
    </span>
  );
};

export default StatusBadge;