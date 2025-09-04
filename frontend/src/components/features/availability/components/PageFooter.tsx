import React from 'react';
import RefreshButton from '../../../common/buttons/RefreshButton';
import ActionButtons from '../../../common/buttons/ActionButtons';

interface PageFooterProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
}

const PageFooter: React.FC<PageFooterProps> = ({ onRefresh, isRefreshing, disabled = false }) => {
  return (
    <div className="flex justify-end gap-2 mt-6">
      <RefreshButton
        onClick={onRefresh}
        isRefreshing={isRefreshing}
        disabled={disabled}
      />
      <ActionButtons />
    </div>
  );
};

export default PageFooter;