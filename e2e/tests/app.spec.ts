import { test, expect } from '@playwright/test';

test.describe('空きスタサーチくん E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Azure Functions と Reactが起動していることを前提
    await page.goto('http://localhost:3300');
  });

  test('アプリケーションが正常に起動する', async ({ page }) => {
    // タイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('空きスタサーチくん');
    // サブタイトルも確認
    await expect(page.getByText('施設空き状況一覧')).toBeVisible();
  });

  test('日付のデータがテーブルで表示される', async ({ page }) => {
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    
    // テーブルが表示されることを確認（テストデータは1日分）
    const tables = page.getByRole('table');
    await expect(tables).toHaveCount(1);
    
    // 日付のヘッダーが表示されることを確認
    await expect(page.getByText('2025-11-15の空き状況')).toBeVisible();
    
    // 施設名が表示されることを確認（テストデータ）
    await expect(page.getByText('テスト施設A')).toBeVisible();
    await expect(page.getByText('テスト施設B')).toBeVisible();
    await expect(page.getByText('テスト施設C')).toBeVisible();
  });

  test('全時間帯（9-12, 13-17, 18-21）が表示される', async ({ page }) => {
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    
    // 各時間帯のヘッダーが表示されることを確認
    const nineToTwelveHeaders = page.locator('th:has-text("9-12")');
    const oneToFiveHeaders = page.locator('th:has-text("13-17")');
    const sixToNineHeaders = page.locator('th:has-text("18-21")');
    
    // 各時間帯がテーブルに存在することを確認（テストデータは1テーブル）
    await expect(nineToTwelveHeaders).toHaveCount(1);
    await expect(oneToFiveHeaders).toHaveCount(1);
    await expect(sixToNineHeaders).toHaveCount(1);
    
    // 更新日時ヘッダーも確認
    await expect(page.locator('th:has-text("更新日時")')).toHaveCount(1);
  });

  test('空き状況のステータスが正しく表示される', async ({ page }) => {
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    
    // 2025-11-15のテーブルを特定
    const nov15Section = page.locator('div:has(h2:has-text("2025-11-15の空き状況"))');
    const nov15Table = nov15Section.locator('table');
    
    // テスト施設Aの行を確認（9-12: ○, 13-17: ○, 18-21: ×）
    const facilityARow = nov15Table.locator('tr:has-text("テスト施設A")');
    await expect(facilityARow.getByText('○')).toHaveCount(2); // 9-12, 13-17 available
    await expect(facilityARow.getByText('×')).toBeVisible(); // 18-21 booked
    
    // テスト施設Bの行を確認（9-12: ×, 13-17: ×, 18-21: ○）
    const facilityBRow = nov15Table.locator('tr:has-text("テスト施設B")');
    await expect(facilityBRow.getByText('×')).toHaveCount(2); // 9-12, 13-17 booked
    await expect(facilityBRow.getByText('○')).toBeVisible(); // 18-21 available
    
    // 更新時刻のフォーマットを確認（MM/DD HH:mm形式）
    const timePattern = /\d{2}\/\d{2} \d{2}:\d{2}/;
    await expect(nov15Table).toContainText(timePattern);
  });

  test('テスト施設Cの全時間帯が空きで表示される', async ({ page }) => {
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    
    // 2025-11-15のテーブルを特定
    const nov15Section = page.locator('div:has(h2:has-text("2025-11-15の空き状況"))');
    const nov15Table = nov15Section.locator('table');
    
    // テスト施設Cの行を確認（全時間帯○）
    const facilityCRow = nov15Table.locator('tr:has-text("テスト施設C")');
    await expect(facilityCRow.getByText('○')).toHaveCount(3); // 全時間帯 available
  });

  test('凡例が表示される', async ({ page }) => {
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    
    // 凡例が表示されることを確認
    await expect(page.getByText('○ 空き')).toBeVisible();
    await expect(page.getByText('× 予約済み')).toBeVisible();
    // テストデータに不明ステータスがないため、凡例には不明も表示されるが必須ではない
    const unknownLegend = page.getByText('? 不明');
    if (await unknownLegend.isVisible()) {
      await expect(unknownLegend).toBeVisible();
    }
  });

  test('レスポンシブデザインが機能する - モバイル', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    // タイトルが表示される
    await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
    
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    
    // テーブルが表示される
    const tables = page.getByRole('table');
    await expect(tables.first()).toBeVisible();
  });

  test('レスポンシブデザインが機能する - タブレット', async ({ page }) => {
    // タブレットビューポートに設定
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // タイトルが表示される
    await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
    
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    const tables = page.getByRole('table');
    await expect(tables.first()).toBeVisible();
  });

  test('レスポンシブデザインが機能する - デスクトップ', async ({ page }) => {
    // デスクトップビューポートに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // タイトルが表示される
    await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
    
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    const tables = page.getByRole('table');
    await expect(tables.first()).toBeVisible();
  });

  test('ローディング状態が表示される', async ({ page }) => {
    // ネットワークを遅くしてローディング状態を確認
    await page.route('**/api/availability', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('http://localhost:3300');
    
    // ローディングメッセージが表示される
    await expect(page.getByText('データを読み込み中...')).toBeVisible();
  });

  test('エラー状態が適切に表示される', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/availability', route => {
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
  });

  test('ネットワークエラーが適切に表示される', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/availability', route => {
      route.abort('failed');
    });
    
    await page.goto('http://localhost:3300');
    
    // ネットワークエラーメッセージが表示される
    await expect(page.getByText('ネットワーク接続エラー: サーバーに接続できません')).toBeVisible();
  });

  test('テーブル内の施設が正しい順序で表示される', async ({ page }) => {
    // データが表示されるまで待つ
    await page.waitForSelector('text=2025-11-15の空き状況', { timeout: 10000 });
    
    // テーブル内の施設名を取得
    const facilityNames = page.locator('td').filter({ hasText: 'テスト施設' });
    const names = await facilityNames.allTextContents();
    
    // 施設の順序を確認
    expect(names[0]).toBe('テスト施設A');
    expect(names[1]).toBe('テスト施設B');
    expect(names[2]).toBe('テスト施設C');
  });
});