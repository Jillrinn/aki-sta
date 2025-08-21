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
    
    // 施設名が表示されることを確認（日本語名の可能性もある）
    const facilityName = page.locator('td.facility-name').first();
    await expect(facilityName).toBeVisible();
    await expect(facilityName).toContainText(/Ensemble Studio|あんさんぶるStudio/);
    
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
    await expect(statusElements).toHaveCount(2); // 2施設分
    
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
    await expect(page.locator('.error')).toContainText('エラー');
  });

  test('ネットワークエラーが適切に表示される', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/availability/**', route => {
      route.abort('failed');
    });
    
    await page.goto('http://localhost:3300');
    
    // ネットワークエラーメッセージが表示される
    await expect(page.locator('.error')).toBeVisible();
    await expect(page.locator('.error')).toContainText('ネットワーク接続エラー');
  });
});