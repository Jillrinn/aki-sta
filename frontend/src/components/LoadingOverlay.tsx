import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  message = '更新中...' 
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200"
      data-testid="loading-overlay"
    >
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-400 border-t-transparent"></div>
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;