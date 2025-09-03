import React, { useState } from 'react';

interface Step {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}

const HowToUse: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const steps: Step[] = [
    {
      icon: '📝',
      title: '【登録】',
      subtitle: '練習したい日を教えよう',
      description: '「練習日程一覧」ページで練習日を登録。複数登録OK！',
      color: 'bg-brand-blue'
    },
    {
      icon: '⏰',
      title: '【自動チェック】',
      subtitle: 'あとは待つだけ！',
      description: '毎日2回（朝8時・夕方17時）自動確認。空きが出たらお知らせ！',
      color: 'bg-brand-green'
    },
    {
      icon: '🔄',
      title: '【即時チェック】',
      subtitle: '今すぐ知りたい！',
      description: '下の「今すぐ情報を集める」ボタンで最新状況を確認！',
      color: 'bg-brand-orange'
    }
  ];

  return (
    <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary-400 to-primary-600 text-white font-bold text-base sm:text-lg flex items-center justify-between hover:from-primary-500 hover:to-primary-700 transition-all duration-200"
        aria-expanded={isOpen}
        aria-controls="how-to-use-content"
      >
        <div className="flex items-center">
          <span className="mr-2 sm:mr-3 text-xl sm:text-2xl">💡</span>
          <span className="text-sm sm:text-base">使い方はかんたん３ステップ</span>
        </div>
        <svg
          className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id="how-to-use-content"
        className={`transition-all duration-300 ${
          isOpen ? 'max-h-[1200px] sm:max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-3">ようこそ！</h3>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2">
              面倒なスタジオ探しは、「空きスタサーチくん」におまかせ！
              毎日空き状況をチェックします。
            </p>
            <p className="text-xs sm:text-sm text-gray-600 italic">
              今は「あんさんぶるスタジオ」と「目黒区民センター」のみ対応
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start p-3 sm:p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300 hover:border-primary-400 hover:bg-gray-100 transition-all duration-200"
                style={{ borderLeftColor: step.color.replace('bg-', '#').replace('brand-blue', '#42a5f5').replace('brand-green', '#63bb65').replace('brand-orange', '#ffa929') }}
              >
                <div className={`${step.color} text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 shadow-md`}>
                  <span className="text-sm sm:text-lg">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="mb-2">
                    <div className="flex items-center mb-1">
                      <span className="text-lg sm:text-2xl mr-2">{step.icon}</span>
                      <h3 className="font-bold text-gray-800 text-sm sm:text-base">{step.title}</h3>
                    </div>
                    <h4 className="text-xs sm:text-sm text-gray-600 ml-6 sm:ml-8">{step.subtitle}</h4>
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm leading-relaxed ml-0">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default HowToUse;