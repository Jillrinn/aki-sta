import React from 'react';
import { Link } from 'react-router-dom';

interface AppTitleProps {
  isLink?: boolean;
  showLogo?: boolean;
}

const AppTitle: React.FC<AppTitleProps> = ({ 
  isLink = false, 
  showLogo = true 
}) => {
  const titleContent = (
    <>
      <span className="text-xl sm:text-2xl text-gray-800 font-bold">
        空きスタサーチくん
      </span>
      {showLogo && (
        <img 
          src="/aki-sta-search-kun.png" 
          alt="サーチくん" 
          className="w-12 h-12 sm:w-16 sm:h-16 ml-3"
        />
      )}
    </>
  );

  const containerClasses = showLogo 
    ? "flex items-center justify-center mb-2" 
    : "flex items-center justify-center mb-2";

  if (isLink) {
    return (
      <div className={containerClasses}>
        <h1>
          <Link to="/" className="hover:text-gray-600 transition-colors flex items-center">
            {titleContent}
          </Link>
        </h1>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <h1 className="flex items-center">
        {titleContent}
      </h1>
    </div>
  );
};

export default AppTitle;