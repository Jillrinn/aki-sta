import React, { useState } from 'react';
import TargetDateModal from './TargetDateModal';

const ActionButtons: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showNotImplemented, setShowNotImplemented] = useState(false);

  const handleRegisterClick = () => {
    setIsModalOpen(true);
  };

  const handleManualFetchClick = () => {
    setShowNotImplemented(true);
    setTimeout(() => setShowNotImplemented(false), 3000);
  };

  return (
    <>
      <div className="fixed top-5 left-5 z-10 flex gap-3 flex-wrap">
        <button
          onClick={handleRegisterClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg font-medium text-sm sm:text-base"
          aria-label="練習日程登録"
        >
          練習日程登録
        </button>
        <button
          onClick={handleManualFetchClick}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg font-medium text-sm sm:text-base"
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

      {/* 練習日程登録モーダル */}
      <TargetDateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ActionButtons;