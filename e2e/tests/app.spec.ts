import { test, expect } from '@playwright/test';

test.describe('空きスタサーチくん E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Azure Functions と Reactが起動していることを前提
    await page.goto('http://localhost:3300');
  });

  test('アプリケーションが正常に起動する', async ({ page }) => {
    // タイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('空きスタサーチくん');
  });

  test('施設データが表示される', async ({ page }) => {
    // テーブルが表示されるまで待つ（テキストで確認）
    await page.waitForSelector('text=テスト施設A', { timeout: 10000 });
    
    // テーブルが表示されることを確認
    await expect(page.getByRole('table')).toBeVisible();
    
    // 固定テストデータの施設名が表示されることを確認
    await expect(page.getByText('テスト施設A')).toBeVisible();
    await expect(page.getByText('テスト施設B')).toBeVisible();
    await expect(page.getByText('テスト施設C')).toBeVisible();
    
    // 時間帯ヘッダーが表示されることを確認
    await expect(page.locator('th:has-text("13:00-17:00")')).toBeVisible();
    
    // 更新日時ヘッダーが表示されることを確認
    await expect(page.locator('th:has-text("更新日時")')).toBeVisible();
  });

  test('空き状況のステータスが正しく表示される', async ({ page }) => {
    // テーブルのロードを待つ（施設名で確認）
    await page.waitForSelector('text=テスト施設A', { timeout: 10000 });
    
    // テーブルが表示されることを確認
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    
    // 各施設の正しい行に正しいステータスが表示されることを確認
    // テスト施設A: 13-17は空き（○）
    const facilityARow = page.getByRole('row').filter({ hasText: 'テスト施設A' });
    await expect(facilityARow.getByText('○')).toBeVisible();
    
    // テスト施設B: 13-17は予約済み（×）
    const facilityBRow = page.getByRole('row').filter({ hasText: 'テスト施設B' });
    await expect(facilityBRow.getByText('×')).toBeVisible();
    
    // テスト施設C: 13-17は空き（○）
    const facilityCRow = page.getByRole('row').filter({ hasText: 'テスト施設C' });
    await expect(facilityCRow.getByText('○')).toBeVisible();
    
    // 更新時刻のフォーマットを確認（MM/DD HH:mm形式）
    // テーブル内で時刻形式のテキストを探す
    const timePattern = /\d{2}\/\d{2} \d{2}:\d{2}/;
    await expect(page.getByRole('table')).toContainText(timePattern);
    
    // 凡例が表示されることを確認（より具体的に）
    await expect(page.getByText('○ 空き')).toBeVisible();
    await expect(page.getByText('× 予約済み')).toBeVisible();
  });

  test('レスポンシブデザインが機能する - モバイル', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    // タイトルが表示される
    await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
    
    // データが表示されるまで待つ
    await page.waitForSelector('text=テスト施設A', { timeout: 10000 });
    
    // テーブルが表示される
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('レスポンシブデザインが機能する - タブレット', async ({ page }) => {
    // タブレットビューポートに設定
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // タイトルが表示される
    await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
    
    // データが表示されるまで待つ
    await page.waitForSelector('text=テスト施設A', { timeout: 10000 });
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('レスポンシブデザインが機能する - デスクトップ', async ({ page }) => {
    // デスクトップビューポートに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // タイトルが表示される
    await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
    
    // データが表示されるまで待つ
    await page.waitForSelector('text=テスト施設A', { timeout: 10000 });
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('ローディング状態が表示される', async ({ page }) => {
    // ネットワークを遅くしてローディング状態を確認
    await page.route('**/api/availability/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('http://localhost:3300');
    
    // ローディングメッセージが表示される
    await expect(page.getByText('データを読み込み中...')).toBeVisible();
  });

  test('エラー状態が適切に表示される', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/availability/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    await page.goto('http://localhost:3300');
    
    // エラーメッセージが表示される
    await expect(page.getByText('サーバーエラーが発生しました')).toBeVisible();
    await expect(page.getByText('HTTPステータス: 500')).toBeVisible();
    await expect(page.getByText('詳細: Server error')).toBeVisible();
  });

  test('ネットワークエラーが適切に表示される', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/availability/**', route => {
      route.abort('failed');
    });
    
    await page.goto('http://localhost:3300');
    
    // ネットワークエラーメッセージが表示される
    await expect(page.getByText('ネットワーク接続エラー: サーバーに接続できません')).toBeVisible();
  });
});