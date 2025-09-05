import React from 'react';

const Copyright: React.FC = () => {

  return (
    <footer className="w-full mt-8 py-3 sm:py-4 border-t border-gray-200">
      <div className="flex items-center justify-center text-xs sm:text-sm text-gray-500">
        <span className="whitespace-nowrap">© 2025 Ensemble PALBA</span>
        <img 
          src="/Ensemble_PALBA_Logo.png" 
          alt="Ensemble PALBA Logo" 
          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover mx-1.5 sm:mx-2"
        />
        <span className="whitespace-nowrap">All rights reserved.</span>
      </div>
    </footer>
  );
};

export default Copyright;