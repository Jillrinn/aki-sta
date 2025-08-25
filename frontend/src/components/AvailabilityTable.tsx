import React, { useEffect, useState } from 'react';
import { availabilityApi } from '../services/api';
import { AllAvailabilityResponse, Facility } from '../types/availability';

interface ErrorDetails {
  message: string;
  statusCode?: number;
  statusText?: string;
  originalError?: string;
}

interface LoadingStateProps {}

const LoadingState: React.FC<LoadingStateProps> = () => (
  <div className="max-w-6xl mx-auto p-5 font-sans">
    <div className="text-blue-500 flex flex-col items-center gap-5">
      <div className="border-4 border-gray-300 border-t-blue-500 rounded-full w-10 h-10 animate-spin"></div>
      <p className="m-0">データを読み込み中...</p>
    </div>
  </div>
);

interface ErrorStateProps {
  error: ErrorDetails;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => (
  <div className="max-w-6xl mx-auto p-5 font-sans">
    <div className="text-red-600 bg-red-50 rounded-lg border border-red-200 p-10 text-center">
      <div className="font-semibold">{error.message}</div>
      {error.statusCode && (
        <div className="mt-2 text-sm">
          <span className="text-red-500">HTTPステータス: {error.statusCode}</span>
          {error.statusText && <span className="text-red-400"> ({error.statusText})</span>}
        </div>
      )}
      {error.originalError && (
        <div className="mt-2 text-sm text-red-400">詳細: {error.originalError}</div>
      )}
    </div>
  </div>
);

interface EmptyStateProps {}

const EmptyState: React.FC<EmptyStateProps> = () => (
  <div className="max-w-6xl mx-auto p-5 font-sans">
    <div className="text-center p-10 text-lg text-gray-500">データがありません</div>
  </div>
);

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusSymbol = () => {
    switch (status) {
      case 'available':
        return '○';
      case 'booked':
        return '×';
      case 'lottery':
        return '△';
      default:
        return '?';
    }
  };

  const getStatusClasses = () => {
    const baseClasses = 'inline-block w-8 h-8 leading-8 text-center rounded-full font-bold text-xl text-white';
    switch (status) {
      case 'available':
        return `${baseClasses} bg-green-500`;
      case 'booked':
        return `${baseClasses} bg-red-500`;
      case 'lottery':
        return `${baseClasses} bg-orange-500`;
      default:
        return `${baseClasses} bg-gray-500`;
    }
  };

  return (
    <span className={getStatusClasses()}>
      {getStatusSymbol()}
    </span>
  );
};

interface LegendSectionProps {}

const LegendSection: React.FC<LegendSectionProps> = () => (
  <div className="flex justify-center gap-8 mb-5 flex-wrap mt-8">
    <span className="flex items-center gap-2 text-sm text-gray-600">
      <StatusBadge status="available" /> 空き
    </span>
    <span className="flex items-center gap-2 text-sm text-gray-600">
      <StatusBadge status="booked" /> 予約済み
    </span>
    <span className="flex items-center gap-2 text-sm text-gray-600">
      <StatusBadge status="unknown" /> 不明
    </span>
  </div>
);

interface AvailabilityTableRowProps {
  facility: Facility;
  formatUpdateTime: (dateString: string) => string;
}

const AvailabilityTableRow: React.FC<AvailabilityTableRowProps> = ({ facility, formatUpdateTime }) => (
  <tr className="hover:bg-blue-50 transition-colors duration-150">
    <td className="p-4 text-left border-b border-gray-200 font-medium text-slate-700">
      {facility.facilityName}
    </td>
    <td className="p-4 text-center border-b border-gray-200">
      <StatusBadge status={facility.timeSlots['9-12']} />
    </td>
    <td className="p-4 text-center border-b border-gray-200">
      <StatusBadge status={facility.timeSlots['13-17']} />
    </td>
    <td className="p-4 text-center border-b border-gray-200">
      <StatusBadge status={facility.timeSlots['18-21']} />
    </td>
    <td className="p-4 text-center border-b border-gray-200 text-gray-600 text-sm">
      {formatUpdateTime(facility.lastUpdated)}
    </td>
  </tr>
);

const AvailabilityTable: React.FC = () => {
  const [data, setData] = useState<AllAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorDetails | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await availabilityApi.getAllAvailability();
        setData(response);
        setError(null);
      } catch (err: any) {
        const errorDetails: ErrorDetails = {
          message: 'データの取得に失敗しました',
        };
        
        if (err.response) {
          // HTTPエラー
          errorDetails.statusCode = err.response.status;
          errorDetails.statusText = err.response.statusText;
          
          if (err.response.status === 404) {
            errorDetails.message = 'APIエンドポイントが見つかりません。サーバーの設定を確認してください';
          } else if (err.response.status === 500) {
            errorDetails.message = 'サーバーエラーが発生しました。時間をおいて再度お試しください';
          } else {
            errorDetails.message = `サーバーエラーが発生しました`;
          }
          
          // レスポンスボディのエラーメッセージがあれば追加
          if (err.response.data?.error) {
            errorDetails.originalError = err.response.data.error;
          }
        } else if (err.request) {
          // ネットワークエラー
          errorDetails.message = 'ネットワーク接続エラー: サーバーに接続できません';
        } else {
          // その他のエラー
          errorDetails.originalError = err.message || '不明なエラー';
        }
        
        setError(errorDetails);
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  const formatUpdateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',  // 常に日本時間で表示
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '不明';
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!data || Object.keys(data).length === 0) {
    return <EmptyState />;
  }

  // 日付を昇順でソート
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
            <table className="w-full border-collapse bg-white">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  <th className="p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">施設名</th>
                  <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[100px]">9-12</th>
                  <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[100px]">13-17</th>
                  <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[100px]">18-21</th>
                  <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[140px]">更新日時</th>
                </tr>
              </thead>
              <tbody>
                {data[date].map((facility: Facility, facilityIndex: number) => (
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