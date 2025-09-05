import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTargetDates } from '../../hooks/useTargetDates';
import { TargetDate } from '../../types/targetDates';
import TargetDateModal from './components/TargetDateModal';
import ReservationStatusModal from './components/ReservationStatusModal';
import { CommonLoadingState, CommonErrorState, CommonEmptyState } from '../../components/common/states';
import AppTitle from '../../components/common/AppTitle';
import { targetDatesApi } from '../../services/api';
import Copyright from '../../components/common/Copyright';

const TargetDatesHeader: React.FC<{ onRegisterClick: () => void }> = ({ onRegisterClick }) => {
  return (
    <div className="mb-6">
      <AppTitle isLink={true} showLogo={true} />
      <p className="text-center text-gray-600 mb-4">練習日程一覧</p>
      
      <div className="flex justify-between mb-4">
        <Link
          to="/"
          className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg font-bold text-sm sm:text-base inline-block"
        >
          ← 空き状況一覧に戻る
        </Link>
        <button
          onClick={onRegisterClick}
          className="px-4 py-2 bg-brand-green-dark text-white rounded-lg hover:bg-brand-green transition-colors shadow-lg font-bold text-sm sm:text-base"
          aria-label="新規登録"
        >
          新規登録
        </button>
      </div>
    </div>
  );
};

const TargetDatesPage: React.FC = () => {
  const { data, loading, error, deleteTargetDate, refetch } = useTargetDates();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reservationTarget, setReservationTarget] = useState<TargetDate | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  };


  const handleReservationClick = (targetDate: TargetDate) => {
    setReservationTarget(targetDate);
  };

  const handleReservationSubmit = async (id: string, isbooked: boolean, memo: string) => {
    // ターゲット日付を更新
    await targetDatesApi.updateTargetDate(id, { isbooked, memo });
    
    // 予約済みに変更した場合、該当日付のavailabilityデータを削除
    if (isbooked && reservationTarget) {
      try {
        const { availabilityApi } = await import('../../services/api');
        await availabilityApi.deleteAvailabilityByDate(reservationTarget.date);
      } catch (error) {
        console.error('Failed to delete availability data:', error);
      }
    }
    
    await refetch();
  };

  const handleReservationClose = () => {
    setReservationTarget(null);
  };

  const handleDelete = async (id: string, date: string): Promise<boolean> => {
    const success = await deleteTargetDate(id, date);
    if (success) {
      await refetch();
    }
    return success;
  };

  const handleRegisterClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    refetch(); // 登録後にリストを更新
  };

  // ヘッダーとモーダルは常に表示される状態に移動

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
      <TargetDatesHeader onRegisterClick={handleRegisterClick} />
      
      {loading && <CommonLoadingState />}
      
      {!loading && error && <CommonErrorState error={error} />}
      
      {!loading && !error && data.length === 0 && (
        <CommonEmptyState message="登録されている日程はありません" />
      )}
      
      {!loading && !error && data.length > 0 && (
        <>
          {/* モバイル表示（カード形式） */}
          <div className="block sm:hidden space-y-3">
            {data.map((targetDate) => (
              <div 
                key={targetDate.id}
                className="bg-white shadow-lg rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleReservationClick(targetDate)}
              >
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="col-span-1">
                    <p className="text-xs text-gray-600 mb-1">日付</p>
                    <p className="font-medium text-sm">{formatDate(targetDate.date)}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-gray-600 mb-1">ラベル</p>
                    <p className="text-sm truncate">{targetDate.label}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-xs text-gray-600 mb-1">予約状況</p>
                    {targetDate.isbooked ? (
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
                        予約済み
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-300 shadow-sm">
                        未予約
                      </span>
                    )}
                  </div>
                </div>
                {targetDate.memo && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">メモ</p>
                    <p className="text-sm text-gray-700 break-words">{targetDate.memo}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* デスクトップ表示（テーブル形式） */}
          <div className="hidden sm:block overflow-x-auto shadow-lg rounded-lg border border-gray-200">
            <table className="w-full border-collapse bg-white">
              <thead className="bg-gradient-to-r from-primary-400 to-primary-700 text-white">
                <tr>
                  <th className="w-1/6 p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                    日付
                  </th>
                  <th className="w-1/4 p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                    ラベル
                  </th>
                  <th className="w-1/3 p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                    メモ
                  </th>
                  <th className="w-1/4 p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                    予約状況
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((targetDate, index) => (
                  <tr 
                    key={targetDate.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors cursor-pointer`}
                    onClick={() => handleReservationClick(targetDate)}
                  >
                    <td className="w-1/6 p-4 border-b border-gray-200 font-medium">
                      {formatDate(targetDate.date)}
                    </td>
                    <td className="w-1/4 p-4 border-b border-gray-200">
                      {targetDate.label}
                    </td>
                    <td className="w-1/3 p-4 border-b border-gray-200">
                      <div className="max-w-xs truncate" title={targetDate.memo || ''}>
                        {targetDate.memo || '-'}
                      </div>
                    </td>
                    <td className="w-1/4 p-4 border-b border-gray-200">
                      {targetDate.isbooked ? (
                        <span className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
                          予約済み
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-300 shadow-sm">
                          未予約
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <TargetDateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />

      <ReservationStatusModal
        isOpen={!!reservationTarget}
        targetDate={reservationTarget}
        onClose={handleReservationClose}
        onSubmit={handleReservationSubmit}
        onDelete={handleDelete}
      />
      
      <Copyright />
    </div>
  );
};

export default TargetDatesPage;