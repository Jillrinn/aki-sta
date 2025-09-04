import React from 'react';
import { Link } from 'react-router-dom';

const PageHeader: React.FC = () => {
  return (
    <>
      <div className="flex items-center justify-center mb-2">
        <h1 className="text-2xl sm:text-3xl text-gray-800 font-bold">空きスタサーチくん</h1>
        <img 
          src="/aki-sta-search-kun.png" 
          alt="サーチくん" 
          className="w-12 h-12 sm:w-16 sm:h-16 ml-3"
        />
      </div>
      <p className="text-center text-gray-600 mb-4">施設空き状況一覧</p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
        <Link
          to="/how-to-use"
          className="px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-orange-600 transition-colors shadow-lg font-bold text-sm sm:text-base text-center"
        >
          💡 使い方
        </Link>
        <Link
          to="/target-dates"
          className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg font-bold text-sm sm:text-base text-center"
        >
          📅 練習日程一覧
        </Link>
      </div>
    </>
  );
};

export default PageHeader;