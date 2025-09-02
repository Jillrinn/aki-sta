import React from 'react';
import Modal from 'react-modal';

interface ScrapeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  isLoading: boolean;
  isError: boolean;
}

const customStyles: Modal.Styles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 50,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '28rem',
    width: '90%',
    padding: '1.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

const ScrapeResultModal: React.FC<ScrapeResultModalProps> = ({ 
  isOpen, 
  onClose, 
  message, 
  isLoading,
  isError 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="空き状況取得結果"
      shouldCloseOnOverlayClick={!isLoading}
    >
      <div>
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
              message.includes('実行中') 
                ? 'bg-yellow-50 border border-yellow-200'
                : isError 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start">
                <div className="mr-3 text-2xl">
                  {message.includes('実行中') ? '⏳' : isError ? '❌' : '✅'}
                </div>
                <div className="flex-1">
                  <p className={`${
                    message.includes('実行中')
                      ? 'text-yellow-700'
                      : isError 
                      ? 'text-red-700' 
                      : 'text-green-700'
                  } font-medium`}>
                    {message}
                  </p>
                  {message.includes('実行中') && (
                    <p className="mt-2 text-sm text-yellow-600">
                      前回の処理が完了するまでお待ちください
                    </p>
                  )}
                  {!isError && !message.includes('実行中') && (
                    <p className="mt-2 text-sm text-green-600">
                      データの反映には数分かかる場合があります
                    </p>
                  )}
                </div>
              </div>
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
    </Modal>
  );
};

export default ScrapeResultModal;