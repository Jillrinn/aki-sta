import React, { useState } from 'react';

const ActionButtons: React.FC = () => {
  const [showNotImplemented, setShowNotImplemented] = useState(false);

  const handleManualFetchClick = () => {
    setShowNotImplemented(true);
    setTimeout(() => setShowNotImplemented(false), 3000);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleManualFetchClick}
          className="px-4 py-2 bg-brand-orange-dark text-white rounded-lg hover:bg-brand-orange transition-colors shadow-lg font-bold text-sm sm:text-base"
          aria-label="空き状況取得（手動）"
        >
          空き状況取得（手動）
        </button>
      </div>

      {/* 未実装アラート */}
      {showNotImplemented && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg">
            <p className="font-bold">機能未実装です！</p>
            <p className="text-sm">この機能は現在開発中です。</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ActionButtons;