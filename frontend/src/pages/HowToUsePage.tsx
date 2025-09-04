import React from 'react';
import HowToUse from '../components/pages/HowToUse';
import AppTitle from '../components/common/AppTitle';

const HowToUsePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <AppTitle isLink={true} showLogo={true} />
        </div>
        <HowToUse />
      </div>
    </div>
  );
};

export default HowToUsePage;