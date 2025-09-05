/**
 * 施設の表示優先度設定
 * 各センター内での施設の表示順を定義
 * ここに記載された順番で表示されます
 */
export const FACILITY_PRIORITY: { [centerName: string]: string[] } = {
  'Ensemble Studio': [
    'あんさんぶるStudio和(本郷)',
    'あんさんぶるStudio音(初台)',
  ],
  '目黒区民センター': [
    '田道住区センター三田分室',
  ],
};

/**
 * センターの表示優先度
 * centerNameのソート順を定義
 */
export const CENTER_PRIORITY = [
  'Ensemble Studio',
  '目黒区民センター',
];