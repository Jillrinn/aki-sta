import React from 'react';
import Modal from 'react-modal';

interface CheckingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  taskDescription?: string;
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
    maxWidth: '24rem',
    width: '90%',
    padding: '1.5rem',
    border: 'none',
    borderRadius: '0.75rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

const CheckingModal: React.FC<CheckingModalProps> = ({ isOpen, taskDescription }) => {
  return (
    <Modal
      isOpen={isOpen}
      style={customStyles}
      contentLabel="確認中"
      shouldCloseOnOverlayClick={false}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="mb-4">
          <svg 
            className="animate-spin h-12 w-12 text-primary-500" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p className="text-gray-700 font-medium text-center">
          {taskDescription || '実行状況を確認中...'}
        </p>
        <p className="text-sm text-gray-500 mt-2 text-center">
          少々お待ちください
        </p>
      </div>
    </Modal>
  );
};

export default CheckingModal;