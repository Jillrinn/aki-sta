import React from 'react';
import { ErrorDetails } from '../../../types/common';

interface CommonErrorStateProps {
  error: ErrorDetails;
}

const CommonErrorState: React.FC<CommonErrorStateProps> = ({ error }) => {
  return (
    <div className="bg-red-50 rounded-lg border border-red-200 p-10 text-center">
      <div className="text-red-600 font-semibold">{error.message}</div>
      {error.statusCode && (
        <div className="mt-2 text-sm">
          <span className="text-red-500">HTTPステータス: {error.statusCode}</span>
          {error.statusText && <span className="text-red-400"> ({error.statusText})</span>}
        </div>
      )}
      {error.originalError && (
        <div className="mt-2 text-sm text-red-400">詳細: {error.originalError}</div>
      )}
    </div>
  );
};

export default CommonErrorState;