import React, { useState } from 'react';
import { scraperApi } from '../services/api';
import ScrapeResultModal from './ScrapeResultModal';

const ActionButtons: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleManualFetchClick = async () => {
    setIsModalOpen(true);
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
          setIsModalOpen(false);
        }, 3000);
      }
    } catch (error) {
      setIsLoading(false);
      setMessage('通信エラーが発生しました');
      setIsError(true);
    }
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

      <ScrapeResultModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={message}
        isLoading={isLoading}
        isError={isError}
      />
    </>
  );
};

export default ActionButtons;