/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ブランドカラーパレット
        brand: {
          red: '#dd5a4b',    // color-1: 赤系（アクセント、重要な操作）
          green: '#63bb65',  // color-2: 緑系（成功、確認、登録）
          orange: '#ffa929', // color-3: オレンジ系（警告、注意喚起）
          blue: '#42a5f5',   // color-4: 青系（情報、メイン操作）
          purple: '#5767c1', // color-5: 紫系（特別な機能）
          // 濃い色バリエーション（ボタン用）
          'green-dark': '#4ea550',  // 緑系の濃い色
          'orange-dark': '#ff9500', // オレンジ系の濃い色
        },
        // プライマリカラー（青系をベースに）
        primary: {
          50: '#e7f3ff',
          100: '#d0e8ff',
          200: '#a1d0ff',
          300: '#71b9ff',
          400: '#42a5f5', // brand.blue
          500: '#3b9aee',
          600: '#348ae8',
          700: '#2d7ae2',
          800: '#266adc',
          900: '#1f5ad6',
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
        },
      }
    },
  },
  plugins: [],
}