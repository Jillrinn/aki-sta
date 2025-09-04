import React from 'react';

interface CommonEmptyStateProps {
  message?: string;
}

const CommonEmptyState: React.FC<CommonEmptyStateProps> = ({ 
  message = 'データがありません' 
}) => {
  return (
    <div className="text-center p-10 text-lg text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
      {message}
    </div>
  );
};

export default CommonEmptyState;