import React from 'react';
import { Link } from 'react-router-dom';
import AppTitle from '../../../common/AppTitle';

const PageHeader: React.FC = () => {
  return (
    <>
      <AppTitle showLogo={true} />
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