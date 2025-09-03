import React from 'react';

interface Step {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const HowToUse: React.FC = () => {

  const steps: Step[] = [
    {
      icon: '1️⃣',
      title: '練習日を登録',
      description: '希望の日時を選ぶだけ（複数登録OK）',
      color: 'bg-brand-blue'
    },
    {
      icon: '2️⃣',
      title: '自動でチェック',
      description: '毎日2回（朝8時・夕方5時）最新の空き状況を更新',
      color: 'bg-brand-green'
    },
    {
      icon: '3️⃣',
      title: '結果を確認',
      description: '登録した日の空き状況がひと目でわかる！',
      color: 'bg-brand-purple'
    }
  ];

  return (
    <div className="w-full max-w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-3 sm:p-6">
          {/* ヘッダー部分 */}
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              🎵 空きスタサーチくん
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
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 今すぐチェックセクション */}
          <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">
              💡 今すぐ確認したい時は？
            </h3>
            <p className="text-xs sm:text-sm text-gray-700">
              「今すぐチェック」ボタンで最新情報をリアルタイム取得！
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-base sm:text-lg font-bold text-brand-blue">
              🚀 さっそく始める
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;