import React, { useState, useEffect, useMemo } from 'react';
import { Facility } from '../../types/availability';
import { useAvailabilityData } from '../../hooks/useAvailabilityData';
import { useTargetDates } from '../../hooks/useTargetDates';
import { TIME_SLOTS, TIME_SLOT_DISPLAY } from '../../constants/availability';
import { sortGroupedFacilities } from '../../utils/sortingUtils';
import { scraperApi, rateLimitsApi } from '../../services/api';
import { isActuallyRunning } from '../../utils/rateLimits';
import {
  CommonLoadingState,
  CommonErrorState,
  CommonEmptyState
} from '../../components/common/states';
import LegendSection from './components/LegendSection';
import CollapsibleCategorySection from './components/CollapsibleCategorySection';
import PageHeader from './components/PageHeader';
import PageFooter from './components/PageFooter';
import Copyright from '../../components/common/Copyright';
import CheckingModal from '../../components/common/modals/CheckingModal';
import ScrapeResultModal from '../../components/common/modals/ScrapeResultModal';
import ConfirmationModal from '../../components/common/modals/ConfirmationModal';
import RateLimitWarningModal from '../../components/common/modals/RateLimitWarningModal';

const AvailabilityPage: React.FC = () => {
  const { data, loading, error, refetch, isRefreshing } = useAvailabilityData();
  const { data: targetDates } = useTargetDates();
  const [isMobile, setIsMobile] = useState(false);
  
  // スクレイピング実行関連の状態
  const [isScrapingForDate, setIsScrapingForDate] = useState<string | null>(null);
  const [showCheckingModal, setShowCheckingModal] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // 確認モーダル関連の状態
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(false);

  // 日付とラベル、予約状況、メモのマッピングを作成
  const targetDateMap = useMemo(() => {
    const map: { [date: string]: { label: string; isbooked: boolean; memo?: string } } = {};
    targetDates?.forEach(td => {
      map[td.date] = {
        label: td.label,
        isbooked: td.isbooked,
        memo: td.memo
      };
    });
    return map;
  }, [targetDates]);

  // target_datesとavailabilityの両方の日付を統合したリストを作成
  const sortedDates = useMemo(() => {
    const availabilityDates = Object.keys(data || {});
    const targetDatesList = targetDates?.map(td => td.date) || [];
    const allDatesSet = new Set([...availabilityDates, ...targetDatesList]);
    return Array.from(allDatesSet).sort();
  }, [data, targetDates]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 確認モーダルを表示（実行中チェック付き）
  const handleScrapeDateClick = async (date: string) => {
    // まず実行中かどうかをチェック
    setShowCheckingModal(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const rateLimitRecord = await rateLimitsApi.getRateLimitByDate(today);
      setShowCheckingModal(false);
      
      if (isActuallyRunning(rateLimitRecord)) {
        // 実行中の場合は警告モーダルを表示
        setShowRateLimitWarning(true);
      } else {
        // 実行中でない場合は確認モーダルを表示
        setPendingDate(date);
        setShowConfirmationModal(true);
      }
    } catch (error) {
      setShowCheckingModal(false);
      // エラーの場合も確認モーダルを表示（ユーザーに選択させる）
      setPendingDate(date);
      setShowConfirmationModal(true);
    }
  };

  // 確認後、実際にスクレイピングを実行
  const handleConfirmScraping = async () => {
    if (!pendingDate) return;
    
    setShowConfirmationModal(false);
    setIsScrapingForDate(pendingDate);
    setShowCheckingModal(true);
    setScrapeResult(null);

    try {
      const response = await scraperApi.triggerScrapingByDate(pendingDate);
      
      if (response.success) {
        setScrapeResult({
          success: true,
          message: response.message
        });
        // 成功したら5秒後にデータを再取得
        setTimeout(() => {
          refetch();
        }, 5000);
      } else {
        setScrapeResult({
          success: false,
          message: response.message
        });
      }
    } catch (error) {
      setScrapeResult({
        success: false,
        message: 'スクレイピングの実行中にエラーが発生しました'
      });
    } finally {
      setShowCheckingModal(false);
      setPendingDate(null);
    }
  };

  // 確認モーダルをキャンセル
  const handleCancelScraping = () => {
    setShowConfirmationModal(false);
    setPendingDate(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 font-sans">
      <PageHeader />

      {loading && <CommonLoadingState />}
      
      {!loading && error && <CommonErrorState error={error} />}
      
      {!loading && !error && sortedDates.length === 0 && <CommonEmptyState />}
      
      {!loading && !error && sortedDates.length > 0 && (
        <div className={`${isRefreshing ? 'opacity-60 pointer-events-none' : ''} transition-opacity duration-300`}>
          {sortedDates.map((date, dateIndex) => (
          <div key={date} className="mb-8">
            <h2 
              className="text-xl text-gray-700 mb-3 font-semibold"
              data-testid={`date-header-${dateIndex}`}
            >
              {date}
              {targetDateMap[date] && (
                <>
                  <span className="ml-2 text-lg text-gray-600">
                    - {targetDateMap[date].label}
                  </span>
                  {targetDateMap[date].isbooked && (
                    <span className="ml-3 inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
                      予約済み
                    </span>
                  )}
                </>
              )}
            </h2>
            
            {!data || !data[date] ? (
              targetDateMap[date]?.isbooked ? (
                targetDateMap[date].memo ? (
                  <div className="p-5 bg-green-50 rounded-lg border border-green-200 shadow-sm">
                    <p className="text-gray-700 text-left">{targetDateMap[date].memo}</p>
                  </div>
                ) : null
              ) : (
                <div className="p-5 text-center rounded-lg border shadow-sm bg-gray-50 border-gray-200">
                  <button
                    onClick={() => handleScrapeDateClick(date)}
                    className="text-gray-600 text-lg hover:text-blue-600 hover:underline transition-colors duration-200 cursor-pointer"
                  >
                    <>
                      空き状況はまだ取得されていません。
                      <br />
                      （クリックで取得）
                    </>
                  </button>
                </div>
              )
            ) : isMobile ? (
              <div className="space-y-4">
                {(() => {
                  const facilities = data[date] || [];
                  // 全時間帯がunknownの施設を除外
                  const filteredFacilities = facilities.filter(facility => 
                    !TIME_SLOTS.every(slot => facility.timeSlots[slot] === 'unknown')
                  );
                  
                  const groupedByCenter = filteredFacilities.reduce((acc: { [key: string]: Facility[] }, facility: Facility) => {
                    // centerNameがnullの場合はスキップ
                    if (!facility.centerName) return acc;
                    
                    const center = facility.centerName;
                    if (!acc[center]) {
                      acc[center] = [];
                    }
                    acc[center].push(facility);
                    return acc;
                  }, {});
                  
                  // 優先度順でソート
                  const sortedEntries = sortGroupedFacilities(groupedByCenter);
                  
                  return sortedEntries.map(([centerName, centerFacilities]) => (
                    <CollapsibleCategorySection
                      key={centerName}
                      centerName={centerName}
                      facilities={centerFacilities}
                      isMobile={true}
                    />
                  ));
                })()}
              </div>
          ) : (
            <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
              <table 
                className="w-full border-collapse bg-white"
                role="table"
                aria-label={`${date}の施設空き状況`}
              >
                <thead className="bg-gradient-to-r from-primary-400 to-primary-700 text-white">
                  <tr>
                    <th className="p-4 text-left border-b border-gray-200 font-semibold uppercase text-sm tracking-wider">
                      施設名
                    </th>
                    {TIME_SLOTS.map((slot) => (
                      <th 
                        key={slot}
                        className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[100px]"
                      >
                        {TIME_SLOT_DISPLAY[slot as keyof typeof TIME_SLOT_DISPLAY]}
                      </th>
                    ))}
                    <th className="p-4 text-center border-b border-gray-200 font-semibold uppercase text-sm tracking-wider min-w-[140px]">
                      更新日時
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const facilities = data[date] || [];
                    // 全時間帯がunknownの施設を除外
                    const filteredFacilities = facilities.filter(facility => 
                      !TIME_SLOTS.every(slot => facility.timeSlots[slot] === 'unknown')
                    );
                    
                    const groupedByCenter = filteredFacilities.reduce((acc: { [key: string]: Facility[] }, facility: Facility) => {
                      // centerNameがnullの場合はスキップ
                      if (!facility.centerName) return acc;
                      
                      const center = facility.centerName;
                      if (!acc[center]) {
                        acc[center] = [];
                      }
                      acc[center].push(facility);
                      return acc;
                    }, {});
                    
                    // 優先度順でソート
                    const sortedEntries = sortGroupedFacilities(groupedByCenter);
                    
                    return sortedEntries.map(([centerName, centerFacilities]) => (
                      <CollapsibleCategorySection
                        key={centerName}
                        centerName={centerName}
                        facilities={centerFacilities}
                        isMobile={false}
                      />
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
          </div>
          ))}
        </div>
      )}
      
      <LegendSection />
      
      <PageFooter 
        onRefresh={refetch}
        isRefreshing={isRefreshing}
        disabled={loading}
      />
      <Copyright />
      
      {/* モーダル */}
      {showConfirmationModal && (
        <ConfirmationModal
          isOpen={showConfirmationModal}
          onConfirm={handleConfirmScraping}
          onCancel={handleCancelScraping}
          date={pendingDate || undefined}
        />
      )}
      
      {showCheckingModal && (
        <CheckingModal 
          isOpen={showCheckingModal}
          onClose={() => setShowCheckingModal(false)}
          taskDescription={isScrapingForDate ? `${isScrapingForDate}の空き状況を取得を開始中...` : '実行状況を確認中...'}
        />
      )}
      
      {scrapeResult && (
        <ScrapeResultModal
          isOpen={!!scrapeResult}
          onClose={() => setScrapeResult(null)}
          message={scrapeResult.message}
          isLoading={false}
          isError={!scrapeResult.success}
        />
      )}
      
      {showRateLimitWarning && (
        <RateLimitWarningModal
          isOpen={showRateLimitWarning}
          onClose={() => setShowRateLimitWarning(false)}
        />
      )}
    </div>
  );
};

export default AvailabilityPage;