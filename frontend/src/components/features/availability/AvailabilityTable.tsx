import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Facility } from '../../../types/availability';
import { useAvailabilityData } from '../../../hooks/useAvailabilityData';
import { useTargetDates } from '../../../hooks/useTargetDates';
import { formatUpdateTime } from '../../../utils/dateFormatter';
import { TIME_SLOTS, TIME_SLOT_DISPLAY } from '../../../constants/availability';
import {
  LoadingState,
  ErrorState,
  EmptyState
} from './states';
import {
  LegendSection,
  AvailabilityTableRow,
  MobileCardView
} from './components';
import CollapsibleCategorySection from './CollapsibleCategorySection';
import ActionButtons from '../../common/buttons/ActionButtons';
import RefreshButton from '../../common/buttons/RefreshButton';

const AvailabilityTable: React.FC = () => {
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

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  // 表示する日付がない場合
  if (sortedDates.length === 0) {
    return <EmptyState />;
  }

  const mainContent = (
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
          💡 使い方を見る
        </Link>
        <Link
          to="/target-dates"
          className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg font-bold text-sm sm:text-base text-center"
        >
          📅 練習日程一覧を見る
        </Link>
      </div>

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
      
      <LegendSection />
      
      <div className="flex justify-end gap-2 mt-6">
        <RefreshButton
          onClick={refetch}
          isRefreshing={isRefreshing}
          disabled={loading}
        />
        <ActionButtons />
      </div>
    </>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
      {mainContent}
    </div>
  );
};

export default AvailabilityTable;