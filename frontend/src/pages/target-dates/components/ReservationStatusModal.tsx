import React, { useState } from 'react';

interface ReservationStatusModalProps {
  isOpen: boolean;
  targetDate: {
    id: string;
    date: string;
    label: string;
    isbooked: boolean;
    memo?: string;
  } | null;
  onClose: () => void;
  onSubmit: (id: string, isbooked: boolean, memo: string) => Promise<void>;
  onDelete?: (id: string, date: string) => Promise<boolean>;
}

const ReservationStatusModal: React.FC<ReservationStatusModalProps> = ({
  isOpen,
  targetDate,
  onClose,
  onSubmit,
  onDelete
}) => {
  const [selectedStatus, setSelectedStatus] = useState<boolean>(false);
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    if (targetDate) {
      setSelectedStatus(targetDate.isbooked);
      setMemo(targetDate.memo || '');
      setError('');
      setShowDeleteConfirm(false);
      setIsDeleting(false);
    }
  }, [targetDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  };

  const handleSubmit = async () => {
    if (!targetDate) return;
    
    if (memo && memo.length > 500) {
      setError('メモは500文字以内で入力してください');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit(targetDate.id, selectedStatus, memo);
      onClose();
    } catch (err) {
      setError('予約状況の更新に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setError('');
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetDate || !onDelete) return;
    
    setIsDeleting(true);
    setError('');
    
    try {
      const success = await onDelete(targetDate.id, targetDate.date);
      if (success) {
        onClose();
      } else {
        setError('削除に失敗しました。しばらくしてから再度お試しください。');
      }
    } catch (err) {
      setError('削除に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  if (!isOpen || !targetDate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">予約状況の更新</h3>
        
        <div className="bg-gray-50 p-3 rounded mb-4">
          <p className="text-sm text-gray-600 mb-1">日付</p>
          <p className="font-medium text-gray-800">{formatDate(targetDate.date)}</p>
          <p className="text-sm text-gray-600 mt-2 mb-1">ラベル</p>
          <p className="font-medium text-gray-800">{targetDate.label}</p>
        </div>

        <div className="mb-4">
          <label htmlFor="memo" className="block text-sm text-gray-700 mb-2">
            メモ <span className="text-gray-500 text-xs">（任意）</span>
          </label>
          <textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを入力（最大500文字）"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {memo.length}/500
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-3">予約状況を選択してください：</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedStatus(false)}
              className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                !selectedStatus
                  ? 'bg-gray-100 border-gray-400 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              未予約
            </button>
            <button
              onClick={() => setSelectedStatus(true)}
              className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                selectedStatus
                  ? 'bg-green-100 border-green-400 text-green-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              予約済み
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isDeleting}
            >
              削除
            </button>
          )}
          <div className={`flex gap-3 ${!onDelete ? 'w-full' : ''} justify-end`}>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={isSubmitting || isDeleting}
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-white bg-brand-blue rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? '更新中...' : '更新'}
            </button>
          </div>
        </div>
      </div>
      
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleDeleteCancel}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">削除確認</h3>
            <p className="text-gray-600 mb-4">
              以下の日程を削除してもよろしいですか？
            </p>
            <div className="bg-gray-50 p-3 rounded mb-4">
              <p className="font-medium text-gray-800">{formatDate(targetDate.date)}</p>
              <p className="text-gray-600">{targetDate.label}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationStatusModal;