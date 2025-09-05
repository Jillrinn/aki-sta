import React from 'react';
import { Link } from 'react-router-dom';
import AppTitle from '../../components/common/AppTitle';
import Copyright from '../../components/common/Copyright';

interface Step {
  icon: string;
  title: string;
  description: React.ReactNode;
  color: string;
}

const HowToUsePage: React.FC = () => {

  const steps: Step[] = [
    {
      icon: '1️⃣',
      title: '練習日を登録',
      description: (
        <>
          <span className="block sm:inline">「練習日程一覧」ページへ移動し、</span>
          <span className="block sm:inline">「新規登録」から希望の日時を登録！</span>
        </>
      ),
      color: 'bg-brand-blue'
    },
    {
      icon: '2️⃣',
      title: '自動でチェック',
      description: (
        <>
          <span className="block sm:inline">毎日3回（深夜1時、朝8時・夕方4時）</span>
          <span className="block sm:inline">最新の空き状況を更新</span>
        </>
      ),
      color: 'bg-brand-green'
    },
    {
      icon: '3️⃣',
      title: '結果を確認',
      description: (
        <>
          <span className="block sm:inline">「空き状況一覧」ページで、登録した</span>
          <span className="block sm:inline">練習日の空き状況を確認！</span>
        </>
      ),
      color: 'bg-brand-purple'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <AppTitle isLink={true} showLogo={true} />
        </div>
        <div className="w-full max-w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-3 sm:p-6">
          {/* ヘッダー部分 */}
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              🎵 ようこそ！ 🎵
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              音楽スタジオの空き状況をかんたんチェック！
            </p>
          </div>

          {/* 対応施設セクション */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">
              📍 対応施設（順次拡大中！）
            </h3>
            <div className="space-y-1">
              <p className="text-sm sm:text-base text-gray-700">・あんさんぶるスタジオ</p>
              <p className="text-sm sm:text-base text-gray-700">・目黒区民センター</p>
            </div>
          </div>

          {/* 使い方セクション */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3">
              【使い方】
            </h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 mb-2"
              >
                <span className="text-xl sm:text-2xl mr-2 sm:mr-3 flex-shrink-0">
                  {step.icon}
                </span>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm sm:text-base mb-1">
                    {step.title}
                  </h4>
                  <div className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 今すぐ情報を取得セクション */}
          <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4 sm:mb-6">
            <div className="flex">
              <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">
                💡
              </span>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm sm:text-base mb-1">
                  今すぐ確認したい時は？
                </h4>
                <div className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  <span className="block sm:inline">「今すぐ情報を取得」ボタンを押して</span>
                  <span className="block sm:inline">最新情報を取得開始！</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link to="/" className="text-base sm:text-lg font-bold text-brand-blue bg-blue-100 hover:bg-blue-200 px-6 py-3 rounded-lg transition-colors inline-block shadow-sm">
              🚀 さっそく始める！
            </Link>
          </div>
          </div>
        </div>
      </div>
      <Copyright />
    </div>
  </div>
  );
};

export default HowToUsePage;