import React from 'react';
import ActionButtons from '../../../components/common/buttons/ActionButtons';

const PageFooter: React.FC = () => {
  return (
    <div className="flex justify-end gap-2 mt-6">
      <ActionButtons />
    </div>
  );
};

export default PageFooter;