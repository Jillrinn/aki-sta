import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Facility } from '../types/availability';
import { useAvailabilityData } from '../hooks/useAvailabilityData';
import { useTargetDates } from '../hooks/useTargetDates';
import { formatUpdateTime } from '../utils/dateFormatter';
import { TIME_SLOTS } from '../constants/availability';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  LegendSection,
  AvailabilityTableRow,
  MobileCardView
} from './availability';
import ActionButtons from './ActionButtons';

const AvailabilityTable: React.FC = () => {
  const { data, loading, error } = useAvailabilityData();
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

  if (!data || Object.keys(data).length === 0) {
    return <EmptyState />;
  }

  const sortedDates = Object.keys(data).sort();

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
      <div className="flex items-center justify-center mb-2">
        <h1 className="text-2xl sm:text-3xl text-gray-800 font-bold">空きスタサーチくん</h1>
        <img 
          src="/aki-sta-search-kun.png" 
          alt="サーチくん" 
          className="w-12 h-12 sm:w-16 sm:h-16 ml-3"
        />
      </div>
      <p className="text-center text-gray-600 mb-4">施設空き状況一覧</p>
      
      <div className="flex justify-center mb-4">
        <Link
          to="/target-dates"
          className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg font-bold text-sm sm:text-base"
        >
          練習日程一覧を見る →
        </Link>
      </div>
      
      <ActionButtons />
      
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
          
          {isMobile ? (
            <div className="space-y-4">
              {(data[date] || []).map((facility: Facility, facilityIndex: number) => (
                <MobileCardView
                  key={facilityIndex}
                  facility={facility}
                  formatUpdateTime={formatUpdateTime}
                />
              ))}
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
                        {slot}
                      </th>
                    ))}
                    <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[140px]">
                      更新日時
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data[date] || []).map((facility: Facility, facilityIndex: number) => (
                    <AvailabilityTableRow 
                      key={facilityIndex} 
                      facility={facility} 
                      formatUpdateTime={formatUpdateTime}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
      
      <LegendSection />
    </div>
  );
};

export default AvailabilityTable;