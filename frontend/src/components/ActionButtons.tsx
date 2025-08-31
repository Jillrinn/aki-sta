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
      <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-2 sm:gap-3 mb-4">
        <button
          onClick={handleManualFetchClick}
          className="w-full sm:w-auto px-4 py-2 bg-brand-orange-dark text-white rounded-lg hover:bg-brand-orange transition-colors shadow-lg font-bold text-sm sm:text-base order-1 sm:order-2"
          aria-label="空き状況取得（手動）"
        >
          空き状況取得（手動）
        </button>
        <button
          onClick={handleRegisterClick}
          className="w-full sm:w-auto px-4 py-2 bg-brand-green-dark text-white rounded-lg hover:bg-brand-green transition-colors shadow-lg font-bold text-sm sm:text-base order-2 sm:order-1"
          aria-label="練習日程登録"
        >
          練習日程登録
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