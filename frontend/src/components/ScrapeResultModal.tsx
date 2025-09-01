import React from 'react';

interface ScrapeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  isLoading: boolean;
  isError: boolean;
}

const ScrapeResultModal: React.FC<ScrapeResultModalProps> = ({ 
  isOpen, 
  onClose, 
  message, 
  isLoading,
  isError 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            空き状況取得
          </h3>
        </div>

        <div className="mb-6">
          {isLoading ? (
            <div className="flex flex-col items-center py-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue mb-3" />
              <p className="text-gray-600">処理中...</p>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${
              isError 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`${
                isError ? 'text-red-700' : 'text-green-700'
              }`}>
                {message}
              </p>
            </div>
          )}
        </div>

        {!isLoading && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrapeResultModal;