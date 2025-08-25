import React from 'react';

export interface ErrorDetails {
  message: string;
  statusCode?: number;
  statusText?: string;
  originalError?: string;
}

interface ErrorStateProps {
  error: ErrorDetails;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => (
  <div className="max-w-6xl mx-auto p-5 font-sans">
    <div className="text-red-600 bg-red-50 rounded-lg border border-red-200 p-10 text-center">
      <div className="font-semibold">{error.message}</div>
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
  </div>
);

export default ErrorState;