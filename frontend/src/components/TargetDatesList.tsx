import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTargetDates } from '../hooks/useTargetDates';
import { TargetDate } from '../types/targetDates';

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

const TargetDatesList: React.FC = () => {
  const { data, loading, error, deleteTargetDate } = useTargetDates();
  const [deleteTarget, setDeleteTarget] = useState<TargetDate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${year}年${month}月${day}日（${dayOfWeek}）`;
  };

  const formatUpdateTime = (updateTime: string): string => {
    const date = new Date(updateTime);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  const handleDeleteClick = (targetDate: TargetDate) => {
    setDeleteTarget(targetDate);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const success = await deleteTargetDate(deleteTarget.id);
    
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">データを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-bold mb-2">エラーが発生しました</h3>
          <p className="text-red-600">{error.message}</p>
          {error.originalError && (
            <p className="text-sm text-red-500 mt-2">詳細: {error.originalError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl text-gray-800 text-center mb-2 font-bold">
          <Link to="/" className="hover:text-gray-600 transition-colors">
            空きスタサーチくん
          </Link>
        </h1>
        <p className="text-center text-gray-600 mb-4">登録済み練習日程</p>
        
        <div className="flex justify-center mb-4">
          <Link
            to="/"
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg font-bold text-sm sm:text-base"
          >
            ← 空き状況に戻る
          </Link>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">登録されている日程はありません</p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
          <table className="w-full border-collapse bg-white">
            <thead className="bg-gradient-to-r from-primary-400 to-primary-700 text-white">
              <tr>
                <th className="p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                  日付
                </th>
                <th className="p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                  ラベル
                </th>
                <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                  更新日時
                </th>
                <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((targetDate, index) => (
                <tr key={targetDate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-4 border-b border-gray-200 font-medium">
                    {formatDate(targetDate.date)}
                  </td>
                  <td className="p-4 border-b border-gray-200">
                    {targetDate.label}
                  </td>
                  <td className="p-4 border-b border-gray-200 text-center text-sm text-gray-600">
                    {formatUpdateTime(targetDate.updatedAt)}
                  </td>
                  <td className="p-4 border-b border-gray-200 text-center">
                    <button
                      onClick={() => handleDeleteClick(targetDate)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-bold"
                      aria-label={`${targetDate.date}を削除`}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};

export default TargetDatesList;