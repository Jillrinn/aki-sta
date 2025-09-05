import React from 'react';
import Modal from 'react-modal';

interface RateLimitWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    maxWidth: '32rem',
    width: '90%',
    padding: '1.5rem',
    border: 'none',
    borderRadius: '0.75rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

const RateLimitWarningModal: React.FC<RateLimitWarningModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="実行中の通知"
      shouldCloseOnOverlayClick={true}
    >
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            しばらくお待ちください
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-amber-900 mb-2">
                  情報取得処理は実行中です
                </h4>
                <ul className="text-sm text-amber-700 space-y-1.5">

                  <li className="flex items-start">
                    <span className="text-amber-400 mr-2">•</span>
                    <span>完了するまでしばらくお待ちください</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-400 mr-2">•</span>
                    <span>ブラウザを更新すると順次最新の情報が表示されます</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            aria-label="閉じる"
          >
            閉じる
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RateLimitWarningModal;