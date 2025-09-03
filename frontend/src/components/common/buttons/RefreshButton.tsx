import React from 'react';

interface RefreshButtonProps {
  onClick: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  onClick, 
  isRefreshing, 
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isRefreshing}
      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-lg font-bold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="データを更新"
    >
      <span className={`inline-flex items-center gap-2 ${isRefreshing ? 'animate-pulse' : ''}`}>
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        {isRefreshing ? '更新中...' : '更新'}
      </span>
    </button>
  );
};

export default RefreshButton;