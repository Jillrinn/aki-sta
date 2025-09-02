import React, { useState } from 'react';

interface Step {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const HowToUse: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const steps: Step[] = [
    {
      icon: '📝',
      title: 'ステップ1',
      description: 'まずは「練習日程一覧」から練習日を登録しよう！',
      color: 'bg-brand-blue'
    },
    {
      icon: '🔍',
      title: 'ステップ2',
      description: '登録された日程の空き状況を空きスタサーチくんが確認しに行くよ！',
      color: 'bg-brand-green'
    },
    {
      icon: '⏰',
      title: 'ステップ3',
      description: '毎日8時と17時の2回、自動で確認するよ！',
      color: 'bg-brand-orange'
    },
    {
      icon: '🔄',
      title: 'ステップ4',
      description: '今すぐ確認したい時は、一番下の「空き状況を取得」ボタンをタップ！',
      color: 'bg-brand-purple'
    }
  ];

  return (
    <div className="mb-6 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-gradient-to-r from-primary-400 to-primary-600 text-white font-bold text-lg flex items-center justify-between hover:from-primary-500 hover:to-primary-700 transition-all duration-200"
        aria-expanded={isOpen}
        aria-controls="how-to-use-content"
      >
        <div className="flex items-center">
          <span className="mr-3 text-2xl">💡</span>
          <span>はじめての方へ - 使い方ガイド</span>
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
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300 hover:border-primary-400 hover:bg-gray-100 transition-all duration-200"
                style={{ borderLeftColor: step.color.replace('bg-', '#').replace('brand-blue', '#42a5f5').replace('brand-green', '#63bb65').replace('brand-orange', '#ffa929').replace('brand-purple', '#5767c1') }}
              >
                <div className={`${step.color} text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 mr-3 shadow-md`}>
                  <span className="text-lg">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-2xl mr-2">{step.icon}</span>
                    <h3 className="font-bold text-gray-800">{step.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>ヒント: スマートフォンでは画面を下に引っ張ると更新できるよ！</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;