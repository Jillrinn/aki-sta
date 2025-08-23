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
    // ローディング完了を待つ
    await page.waitForSelector('.availability-table', { timeout: 10000 });
    
    // テーブルが表示されることを確認
    await expect(page.locator('.availability-table')).toBeVisible();
    
    // 固定テストデータの施設名が表示されることを確認
    const facilityNames = page.locator('td.facility-name');
    await expect(facilityNames).toHaveCount(3); // 3施設分
    await expect(facilityNames.nth(0)).toContainText('テスト施設A');
    await expect(facilityNames.nth(1)).toContainText('テスト施設B');
    await expect(facilityNames.nth(2)).toContainText('テスト施設C');
    
    // 時間帯ヘッダーが表示されることを確認
    await expect(page.locator('th:has-text("13:00-17:00")')).toBeVisible();
    
    // 更新日時ヘッダーが表示されることを確認
    await expect(page.locator('th:has-text("更新日時")')).toBeVisible();
  });

  test('空き状況のステータスが正しく表示される', async ({ page }) => {
    // テーブルのロードを待つ
    await page.waitForSelector('.availability-table', { timeout: 10000 });
    
    // テーブル内のステータスシンボルが表示されることを確認
    const statusElements = page.locator('.availability-table .status');
    await expect(statusElements).toHaveCount(3); // 3施設分
    
    // 固定テストデータのステータスを確認
    // テスト施設A: 13-17は空き（○）
    // テスト施設B: 13-17は予約済み（×）
    // テスト施設C: 13-17は空き（○）
    await expect(statusElements.nth(0)).toContainText('○');
    await expect(statusElements.nth(1)).toContainText('×');
    await expect(statusElements.nth(2)).toContainText('○');
    
    // 更新時刻が各レコードに表示されることを確認（tbody内のみ）
    const updateTimes = page.locator('.availability-table tbody .update-time');
    await expect(updateTimes).toHaveCount(3); // 3施設分
    
    // 更新時刻のフォーマットを確認（MM/DD HH:mm形式）
    const firstUpdateTime = updateTimes.first();
    await expect(firstUpdateTime).toContainText(/\d{2}\/\d{2} \d{2}:\d{2}/);
    
    // 凡例が表示されることを確認
    await expect(page.locator('.legend')).toBeVisible();
    await expect(page.locator('.legend-item').filter({ hasText: '空き' })).toBeVisible();
    await expect(page.locator('.legend-item').filter({ hasText: '予約済み' })).toBeVisible();
  });

  test('レスポンシブデザインが機能する - モバイル', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    // アプリケーションコンテナが表示される
    await expect(page.locator('.availability-container')).toBeVisible();
    
    // テーブルが横スクロール可能な状態で表示される
    await page.waitForSelector('.table-wrapper', { timeout: 10000 });
    await expect(page.locator('.table-wrapper')).toBeVisible();
  });

  test('レスポンシブデザインが機能する - タブレット', async ({ page }) => {
    // タブレットビューポートに設定
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // コンテンツが適切に表示される
    await expect(page.locator('.availability-container')).toBeVisible();
    await page.waitForSelector('.availability-table', { timeout: 10000 });
    await expect(page.locator('.availability-table')).toBeVisible();
  });

  test('レスポンシブデザインが機能する - デスクトップ', async ({ page }) => {
    // デスクトップビューポートに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 全てのコンテンツが適切に表示される
    await expect(page.locator('.availability-container')).toBeVisible();
    await page.waitForSelector('.availability-table', { timeout: 10000 });
    await expect(page.locator('.availability-table')).toBeVisible();
  });

  test('ローディング状態が表示される', async ({ page }) => {
    // ネットワークを遅くしてローディング状態を確認
    await page.route('**/api/availability/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('http://localhost:3300');
    
    // ローディングスピナーが表示される
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('text=データを読み込み中...')).toBeVisible();
  });

  test('エラー状態が適切に表示される', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/availability/**', route => {
      route.fulfill({
        status: 500,
        statusText: 'Internal Server Error',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('http://localhost:3300');
    
    // エラーメッセージが表示される
    await expect(page.locator('.error')).toBeVisible();
    await expect(page.locator('.error-main')).toContainText('サーバーエラーが発生しました');
    await expect(page.locator('.error-details')).toContainText('HTTPステータス: 500');
    await expect(page.locator('.error-original')).toContainText('詳細: Server error');
  });

  test('ネットワークエラーが適切に表示される', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/availability/**', route => {
      route.abort('failed');
    });
    
    await page.goto('http://localhost:3300');
    
    // ネットワークエラーメッセージが表示される
    await expect(page.locator('.error')).toBeVisible();
    await expect(page.locator('.error-main')).toContainText('ネットワーク接続エラー: サーバーに接続できません');
  });
});