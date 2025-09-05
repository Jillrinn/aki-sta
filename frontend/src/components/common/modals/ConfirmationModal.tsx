import React from 'react';
import Modal from 'react-modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  date?: string;
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

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel,
  date 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onCancel}
      style={customStyles}
      contentLabel="実行確認"
      shouldCloseOnOverlayClick={true}
    >
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {date ? `${date}の空き状況を取得しますか？` : '空き状況の取得を開始しますか？'}
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  処理について
                </h4>
                <ul className="text-sm text-blue-700 space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>全ての情報を集めるのに約5分かかります</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>更新すれば順次新しい情報が表示されていきます</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            aria-label="キャンセル"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md"
            aria-label="実行する"
          >
            実行する
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;