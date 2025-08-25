import React from 'react';

const LoadingState: React.FC = () => (
  <div className="max-w-6xl mx-auto p-5 font-sans">
    <div className="text-blue-500 flex flex-col items-center gap-5">
      <div className="border-4 border-gray-300 border-t-blue-500 rounded-full w-10 h-10 animate-spin"></div>
      <p className="m-0">データを読み込み中...</p>
    </div>
  </div>
);

export default LoadingState;