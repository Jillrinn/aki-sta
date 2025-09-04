import React from 'react';

interface CommonLoadingStateProps {
  message?: string;
}

const CommonLoadingState: React.FC<CommonLoadingStateProps> = ({ 
  message = 'データを読み込み中...' 
}) => {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="border-4 border-gray-300 border-t-blue-500 rounded-full w-10 h-10 animate-spin"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  );
};

export default CommonLoadingState;