import React, { useState } from 'react';
import { targetDatesApi } from '../services/api';
import { CreateTargetDateRequest } from '../types/targetDates';

interface TargetDateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TargetDateModal: React.FC<TargetDateModalProps> = ({ isOpen, onClose }) => {
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // バリデーション
    if (!date || !label) {
      setError('日付とラベルは必須項目です');
      return;
    }

    setIsLoading(true);

    try {
      const data: CreateTargetDateRequest = { date, label };
      await targetDatesApi.createTargetDate(data);
      
      setSuccessMessage('登録しました');
      setDate('');
      setLabel('');
      
      // 成功メッセージを表示してからモーダルを閉じる
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('この日付は既に登録されています');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || '入力内容に誤りがあります');
      } else {
        setError('通信エラーが発生しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDate('');
    setLabel('');
    setError('');
    setSuccessMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* モーダル本体 */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">練習日程登録</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="date" className="block text-base font-semibold text-gray-900 mb-2">
              日付 <span className="text-red-500 text-sm">*</span>
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              style={{ WebkitAppearance: 'none' }}
              disabled={isLoading}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="label" className="block text-base font-semibold text-gray-900 mb-2">
              ラベル <span className="text-red-500 text-sm">*</span>
            </label>
            <input
              type="text"
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：本番ライブ"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              required
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* 成功メッセージ */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-base font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? '登録中...' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TargetDateModal;