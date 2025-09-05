import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTargetDates } from '../../hooks/useTargetDates';
import { TargetDate } from '../../types/targetDates';
import TargetDateModal from './components/TargetDateModal';
import ReservationStatusModal from './components/ReservationStatusModal';
import { CommonLoadingState, CommonErrorState, CommonEmptyState } from '../../components/common/states';
import AppTitle from '../../components/common/AppTitle';
import { targetDatesApi } from '../../services/api';

const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  targetDate: TargetDate | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, targetDate, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen || !targetDate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">削除確認</h3>
        <p className="text-gray-600 mb-4">
          以下の日程を削除してもよろしいですか？
        </p>
        <div className="bg-gray-50 p-3 rounded mb-4">
          <p className="font-medium text-gray-800">{targetDate.date}</p>
          <p className="text-gray-600">{targetDate.label}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            disabled={isDeleting}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [deleteTarget, setDeleteTarget] = useState<TargetDate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reservationTarget, setReservationTarget] = useState<TargetDate | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  };

  const handleDeleteClick = (targetDate: TargetDate) => {
    setDeleteTarget(targetDate);
    setDeleteError('');
  };

  const handleReservationClick = (targetDate: TargetDate) => {
    setReservationTarget(targetDate);
  };

  const handleReservationSubmit = async (id: string, isbooked: boolean) => {
    await targetDatesApi.updateTargetDate(id, { isbooked });
    await refetch();
  };

  const handleReservationClose = () => {
    setReservationTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const success = await deleteTargetDate(deleteTarget.id, deleteTarget.date);
    
    if (success) {
      setDeleteTarget(null);
    } else {
      setDeleteError('削除に失敗しました。しばらくしてから再度お試しください。');
    }
    setIsDeleting(false);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteError('');
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
                className="bg-white shadow-lg rounded-lg border border-gray-200 p-4"
              >
                <div className="grid grid-cols-3 gap-2">
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
                      <button 
                        className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors cursor-pointer"
                        onClick={() => handleReservationClick(targetDate)}
                      >
                        予約済み
                      </button>
                    ) : (
                      <button 
                        className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer shadow-sm"
                        onClick={() => handleReservationClick(targetDate)}
                      >
                        未予約
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* デスクトップ表示（テーブル形式） */}
          <div className="hidden sm:block overflow-x-auto shadow-lg rounded-lg border border-gray-200">
            <table className="w-full border-collapse bg-white">
              <thead className="bg-gradient-to-r from-primary-400 to-primary-700 text-white">
                <tr>
                  <th className="w-1/4 p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                    日付
                  </th>
                  <th className="w-2/5 p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                    ラベル
                  </th>
                  <th className="w-1/3 p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                    予約状況
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((targetDate, index) => (
                  <tr 
                    key={targetDate.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors cursor-pointer`}
                    onClick={() => handleDeleteClick(targetDate)}
                  >
                    <td className="w-1/4 p-4 border-b border-gray-200 font-medium">
                      {formatDate(targetDate.date)}
                    </td>
                    <td className="w-2/5 p-4 border-b border-gray-200">
                      {targetDate.label}
                    </td>
                    <td className="w-1/3 p-4 border-b border-gray-200">
                      {targetDate.isbooked ? (
                        <button 
                          className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReservationClick(targetDate);
                          }}
                        >
                          予約済み
                        </button>
                      ) : (
                        <button 
                          className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReservationClick(targetDate);
                          }}
                        >
                          未予約
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {deleteError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg">
            <p>{deleteError}</p>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        targetDate={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />

      <TargetDateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />

      <ReservationStatusModal
        isOpen={!!reservationTarget}
        targetDate={reservationTarget}
        onClose={handleReservationClose}
        onSubmit={handleReservationSubmit}
      />
      
    </div>
  );
};

export default TargetDatesPage;