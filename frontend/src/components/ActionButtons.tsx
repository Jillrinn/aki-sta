import React, { useState } from 'react';
import { scraperApi } from '../services/api';
import ScrapeResultModal from './ScrapeResultModal';
import ConfirmationModal from './ConfirmationModal';

const ActionButtons: React.FC = () => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleManualFetchClick = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirm = async () => {
    setIsConfirmModalOpen(false);
    setIsResultModalOpen(true);
    setIsLoading(true);
    setIsError(false);
    setMessage('');

    try {
      const response = await scraperApi.triggerBatchScraping();
      
      setIsLoading(false);
      setMessage(response.message);
      setIsError(!response.success);
      
      // 成功時は3秒後に自動で閉じる
      if (response.success) {
        setTimeout(() => {
          setIsResultModalOpen(false);
        }, 3000);
      }
    } catch (error) {
      setIsLoading(false);
      setMessage('通信エラーが発生しました');
      setIsError(true);
    }
  };

  const handleCancel = () => {
    setIsConfirmModalOpen(false);
  };

  return (
    <>
      <button
        onClick={handleManualFetchClick}
        className="px-4 py-2 bg-brand-orange-dark text-white rounded-lg hover:bg-brand-orange transition-colors shadow-lg font-bold text-sm sm:text-base"
        aria-label="今すぐ情報を集める"
        disabled={isLoading}
      >
        今すぐ情報を集める
      </button>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <ScrapeResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        message={message}
        isLoading={isLoading}
        isError={isError}
      />
    </>
  );
};

export default ActionButtons;