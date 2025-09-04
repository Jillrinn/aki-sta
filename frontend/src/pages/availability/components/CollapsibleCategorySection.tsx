import React, { useState, useEffect } from 'react';
import { Facility } from '../../../types/availability';
import { 
  getCategoryStatus
} from '../../../utils/availabilityUtils';
import { formatUpdateTime } from '../../../utils/dateFormatter';
import AvailabilityTableRow from './AvailabilityTableRow';
import MobileCardView from './MobileCardView';

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
  preferredTimeSlots = ['afternoon'] // 13-17時は午後(afternoon)に該当
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
        return 'bg-red-200 text-red-900';
      case 'preferred-booked':
        return 'bg-orange-200 text-orange-900';
      case 'has-availability':
        return 'bg-green-200 text-green-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // モバイル表示
  if (isMobile) {
    return (
      <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={handleToggle}
          className="w-full px-3 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`transform transition-transform text-sm ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span className="font-semibold text-sm">【{centerName}】</span>
              {categoryStatus.message && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}>
                  {categoryStatus.message}
                </span>
              )}
            </div>
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
      <tr className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white cursor-pointer transition-all" onClick={handleToggle}>
        <td colSpan={5} className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span className="font-bold">【{centerName}】</span>
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