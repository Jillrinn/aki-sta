import React, { useState, useEffect } from 'react';
import { Facility } from '../../../types/availability';
import { 
  getCategoryStatus
} from '../../../utils/availabilityUtils';
import { formatUpdateTime } from '../../../utils/dateFormatter';
import { TIME_SLOTS, TIME_SLOT_DISPLAY } from '../../../constants/availability';
import { AvailabilityTableRow, MobileCardView } from './components';

interface CollapsibleCategorySectionProps {
  centerName: string;
  facilities: Facility[];
  isMobile: boolean;
  preferredTimeSlots?: string[];
}

const CollapsibleCategorySection: React.FC<CollapsibleCategorySectionProps> = ({
  centerName,
  facilities,
  isMobile,
  preferredTimeSlots
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // カテゴリの状態を取得
  const categoryStatus = getCategoryStatus(facilities, preferredTimeSlots);

  // 初回レンダリング時とデータ更新時に自動展開/折りたたみを設定
  useEffect(() => {
    // ユーザーが手動操作していない場合のみ自動制御
    if (!userHasInteracted) {
      setIsExpanded(categoryStatus.shouldExpand);
    }
  }, [categoryStatus.shouldExpand, userHasInteracted]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    setUserHasInteracted(true);
  };

  // ステータスバッジの色を決定
  const getStatusBadgeClass = () => {
    switch (categoryStatus.status) {
      case 'all-booked':
        return 'bg-red-100 text-red-800';
      case 'preferred-booked':
        return 'bg-orange-100 text-orange-800';
      case 'has-availability':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // モバイル表示
  if (isMobile) {
    return (
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={handleToggle}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <h3 className="font-bold text-gray-700">【{centerName}】</h3>
            {categoryStatus.message && (
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass()}`}>
                {categoryStatus.message}
              </span>
            )}
          </div>
        </button>
        
        {isExpanded && (
          <div className="p-4 space-y-3">
            {facilities.map((facility, index) => (
              <MobileCardView
                key={`${centerName}-${index}`}
                facility={facility}
                formatUpdateTime={formatUpdateTime}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // デスクトップ表示
  return (
    <>
      <tr className="bg-gray-100 hover:bg-gray-200 cursor-pointer" onClick={handleToggle}>
        <td colSpan={5} className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span className="font-bold text-gray-700">【{centerName}】</span>
              {categoryStatus.message && (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass()}`}>
                  {categoryStatus.message}
                </span>
              )}
            </div>
          </div>
        </td>
      </tr>
      
      {isExpanded && facilities.map((facility, index) => (
        <AvailabilityTableRow 
          key={`${centerName}-${index}`} 
          facility={facility} 
          formatUpdateTime={formatUpdateTime}
        />
      ))}
    </>
  );
};

export default CollapsibleCategorySection;