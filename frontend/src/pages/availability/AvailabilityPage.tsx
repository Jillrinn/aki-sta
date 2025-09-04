import React, { useState, useEffect, useMemo } from 'react';
import { Facility } from '../../types/availability';
import { useAvailabilityData } from '../../hooks/useAvailabilityData';
import { useTargetDates } from '../../hooks/useTargetDates';
import { TIME_SLOTS, TIME_SLOT_DISPLAY } from '../../constants/availability';
import {
  CommonLoadingState,
  CommonErrorState,
  CommonEmptyState
} from '../../components/common/states';
import LegendSection from './components/LegendSection';
import CollapsibleCategorySection from './components/CollapsibleCategorySection';
import PageHeader from './components/PageHeader';
import PageFooter from './components/PageFooter';

const AvailabilityPage: React.FC = () => {
  const { data, loading, error, refetch, isRefreshing } = useAvailabilityData();
  const { data: targetDates } = useTargetDates();
  const [isMobile, setIsMobile] = useState(false);

  // 日付とラベルのマッピングを作成
  const labelMap = useMemo(() => {
    const map: { [date: string]: string } = {};
    targetDates?.forEach(td => {
      map[td.date] = td.label;
    });
    return map;
  }, [targetDates]);

  // target_datesとavailabilityの両方の日付を統合したリストを作成
  const sortedDates = useMemo(() => {
    const availabilityDates = Object.keys(data || {});
    const targetDatesList = targetDates?.map(td => td.date) || [];
    const allDatesSet = new Set([...availabilityDates, ...targetDatesList]);
    return Array.from(allDatesSet).sort();
  }, [data, targetDates]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
      <PageHeader />

      {loading && <CommonLoadingState />}
      
      {!loading && error && <CommonErrorState error={error} />}
      
      {!loading && !error && sortedDates.length === 0 && <CommonEmptyState />}
      
      {!loading && !error && sortedDates.length > 0 && (
        <div className={`${isRefreshing ? 'opacity-60 pointer-events-none' : ''} transition-opacity duration-300`}>
          {sortedDates.map((date, dateIndex) => (
          <div key={date} className="mb-8">
            <h2 
              className="text-xl text-gray-700 mb-3 font-semibold"
              data-testid={`date-header-${dateIndex}`}
            >
              {date}
              {labelMap[date] && (
                <span className="ml-2 text-lg text-gray-600">
                  - {labelMap[date]}
                </span>
              )}
            </h2>
            
            {!data || !data[date] ? (
              <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                <p className="text-gray-600 text-lg">空き状況はまだ取得されていません。</p>
              </div>
            ) : isMobile ? (
              <div className="space-y-4">
                {(() => {
                  const facilities = data[date] || [];
                  const groupedByCenter = facilities.reduce((acc: { [key: string]: Facility[] }, facility: Facility) => {
                    const center = facility.centerName || 'その他';
                    if (!acc[center]) {
                      acc[center] = [];
                    }
                    acc[center].push(facility);
                    return acc;
                  }, {});
                  
                  return Object.entries(groupedByCenter).map(([centerName, centerFacilities]) => (
                    <CollapsibleCategorySection
                      key={centerName}
                      centerName={centerName}
                      facilities={centerFacilities}
                      isMobile={true}
                    />
                  ));
                })()}
              </div>
          ) : (
            <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
              <table 
                className="w-full border-collapse bg-white"
                role="table"
                aria-label={`${date}の施設空き状況`}
              >
                <thead className="bg-gradient-to-r from-primary-400 to-primary-700 text-white">
                  <tr>
                    <th className="p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                      施設名
                    </th>
                    {TIME_SLOTS.map((slot) => (
                      <th 
                        key={slot}
                        className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[100px]"
                      >
                        {TIME_SLOT_DISPLAY[slot as keyof typeof TIME_SLOT_DISPLAY]}
                      </th>
                    ))}
                    <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[140px]">
                      更新日時
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const facilities = data[date] || [];
                    const groupedByCenter = facilities.reduce((acc: { [key: string]: Facility[] }, facility: Facility) => {
                      const center = facility.centerName || 'その他';
                      if (!acc[center]) {
                        acc[center] = [];
                      }
                      acc[center].push(facility);
                      return acc;
                    }, {});
                    
                    return Object.entries(groupedByCenter).map(([centerName, centerFacilities]) => (
                      <CollapsibleCategorySection
                        key={centerName}
                        centerName={centerName}
                        facilities={centerFacilities}
                        isMobile={false}
                      />
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
          </div>
          ))}
        </div>
      )}
      
      <LegendSection />
      
      <PageFooter 
        onRefresh={refetch}
        isRefreshing={isRefreshing}
        disabled={loading}
      />
    </div>
  );
};

export default AvailabilityPage;