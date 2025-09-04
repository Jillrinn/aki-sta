import React from 'react';
import HowToUse from '../components/pages/HowToUse';

const HowToUsePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-2xl sm:text-3xl text-gray-800 font-bold">空きスタサーチくん</h1>
          <img 
            src="/aki-sta-search-kun.png" 
            alt="サーチくん" 
            className="w-12 h-12 sm:w-16 sm:h-16 ml-3"
          />
        </div>

        <HowToUse />
      </div>
    </div>
  );
};

export default HowToUsePage;