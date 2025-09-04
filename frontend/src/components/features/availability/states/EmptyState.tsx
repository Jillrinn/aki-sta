import React from 'react';
import PageHeader from '../components/PageHeader';
import PageFooter from '../components/PageFooter';
import { LegendSection } from '../components';

interface EmptyStateProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onRefresh, isRefreshing }) => {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
      <PageHeader />
      
      <div className="text-center p-10 text-lg text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        データがありません
      </div>
      
      <LegendSection />
      
      <PageFooter 
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
    </div>
  );
};

export default EmptyState;