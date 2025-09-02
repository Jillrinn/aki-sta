import React from 'react';
import Modal from 'react-modal';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const customStyles: Modal.Styles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 40,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    background: 'white',
    padding: '1.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    width: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  message = '更新中...' 
}) => {
  return (
    <Modal
      isOpen={isVisible}
      style={customStyles}
      contentLabel="Loading"
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      ariaHideApp={false} // For testing
    >
      <div className="flex flex-col items-center gap-3" data-testid="loading-overlay">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-400 border-t-transparent"></div>
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </Modal>
  );
};

export default LoadingOverlay;