/**
 * アプリケーション全体で使用するカラーパレット定義
 * 
 * 使用方法:
 * 1. Tailwind CSS: tailwind.config.jsで定義されたクラス名を使用（例: bg-brand-blue）
 * 2. JavaScript/TypeScript: このファイルからインポート（例: COLORS.brand.blue）
 */

export const COLORS = {
  // ブランドカラーパレット
  brand: {
    red: '#dd5a4b',    // color-1: 赤系（アクセント、重要な操作）
    green: '#63bb65',  // color-2: 緑系（成功、確認、登録）
    orange: '#ffa929', // color-3: オレンジ系（警告、注意喚起）
    blue: '#42a5f5',   // color-4: 青系（情報、メイン操作）
    purple: '#5767c1', // color-5: 紫系（特別な機能）
  },
  
  // プライマリカラー（青系をベースに）
  primary: {
    50: '#e7f3ff',
    100: '#d0e8ff',
    200: '#a1d0ff',
    300: '#71b9ff',
    400: '#42a5f5', // brand.blue
    500: '#2196e3',
    600: '#1976d2',
    700: '#1565c0',
    800: '#0d47a1',
    900: '#01377d',
  },
  
  // アクセントカラー（ボタンやアクション用）
  accent: {
    red: '#dd5a4b',    // brand.red
    green: '#63bb65',  // brand.green
    orange: '#ffa929', // brand.orange
    blue: '#42a5f5',   // brand.blue
    purple: '#5767c1', // brand.purple
  },
  
  // ステータスカラー（状態表示用）
  status: {
    available: '#63bb65', // 空き状況：緑（brand.green）
    reserved: '#dd5a4b',  // 予約済み：赤（brand.red）
    pending: '#ffa929',   // 待機中：オレンジ（brand.orange）
    info: '#42a5f5',      // 情報：青（brand.blue）
    success: '#63bb65',   // 成功：緑（brand.green）
    error: '#dd5a4b',     // エラー：赤（brand.red）
    warning: '#ffa929',   // 警告：オレンジ（brand.orange）
  },
  
  // グレースケール
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // 背景色
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  
  // テキスト色
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
  },
} as const;

// 型定義
export type ColorPalette = typeof COLORS;
export type PrimaryColors = keyof typeof COLORS.primary;
export type AccentColors = keyof typeof COLORS.accent;
export type StatusColors = keyof typeof COLORS.status;
export type GrayColors = keyof typeof COLORS.gray;