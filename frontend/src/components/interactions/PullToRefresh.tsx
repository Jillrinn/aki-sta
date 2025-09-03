import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children, 
  disabled = false 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const threshold = 80; // 更新をトリガーする閾値（px）
  const maxDistance = 120; // 最大引っ張り距離（px）

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop !== 0 || isRefreshing) return;
      
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;
      if (container.scrollTop !== 0) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);
      const limitedDistance = Math.min(distance, maxDistance);
      
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(limitedDistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;
      
      setIsPulling(false);
      
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        setPullDistance(60); // 更新中の位置に固定
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    // パッシブリスナーをfalseにしてpreventDefaultを有効化
    const options = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, isRefreshing, onRefresh, disabled]);

  // プルインジケーターの表示テキスト
  const getIndicatorText = () => {
    if (isRefreshing) return '更新中...';
    if (pullDistance >= threshold) return '↑ 離して更新';
    if (pullDistance > 0) return '↓ 引っ張って更新';
    return '';
  };

  // プルインジケーターの回転角度
  const getRotation = () => {
    if (isRefreshing) return 'animate-spin';
    if (pullDistance >= threshold) return 'rotate-180';
    return '';
  };

  return (
    <div className="relative">
      {/* プルインジケーター - pullDistance > 0の時のみ表示 */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm flex justify-center items-center transition-all duration-300 ease-out overflow-hidden pointer-events-none"
          style={{ 
            height: `${pullDistance}px`,
            transform: `translateY(-${pullDistance}px)`,
          }}
        >
          <div 
            className="flex items-center gap-2 text-gray-600"
            style={{
              position: 'absolute',
              top: Math.min(pullDistance / 2 - 15, pullDistance - 35) + 'px'
            }}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${getRotation()}`}
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span className="text-sm font-medium">{getIndicatorText()}</span>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div 
        ref={containerRef}
        className="h-full overflow-auto"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
          overscrollBehavior: 'contain'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;