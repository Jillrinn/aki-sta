import React from 'react';
import { Facility } from '../types/availability';
import { useAvailabilityData } from '../hooks/useAvailabilityData';
import { formatUpdateTime } from '../utils/dateFormatter';
import { TIME_SLOTS } from '../constants/availability';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  LegendSection,
  AvailabilityTableRow
} from './availability';

const AvailabilityTable: React.FC = () => {
  const { data, loading, error } = useAvailabilityData();

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
    <div className="max-w-6xl mx-auto p-5 font-sans">
      <h1 className="text-3xl text-gray-800 text-center mb-2 font-bold">空きスタサーチくん</h1>
      <p className="text-center text-gray-600 mb-8">施設空き状況一覧</p>
      
      {sortedDates.map((date, dateIndex) => (
        <div key={date} className="mb-8">
          <h2 
            className="text-xl text-gray-700 mb-3 font-semibold"
            data-testid={`date-header-${dateIndex}`}
          >
            {date}の空き状況
          </h2>
          
          <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
            <table 
              className="w-full border-collapse bg-white"
              role="table"
              aria-label={`${date}の施設空き状況`}
            >
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
        </div>
      ))}
      
      <LegendSection />
    </div>
  );
};

export default AvailabilityTable;