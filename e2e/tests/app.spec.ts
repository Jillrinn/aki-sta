import { test, expect } from '@playwright/test';
import { 
  hasAvailabilityData, 
  validateFacilityStructure, 
  validateStatusValues,
  validateDateHeaders,
  validateFacilityNames,
  testResponsiveDesign
} from '../utils/test-helpers';

test.describe('空きスタサーチくん E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Azure Functions と Reactが起動していることを前提
    await page.goto('http://localhost:3300');
    // ページの初期ロードを待つ
    await page.waitForLoadState('networkidle');
  });

  test('アプリケーションが正常に起動する', async ({ page }) => {
    // タイトル要素が表示されるまで待つ
    await page.waitForSelector('h1', { timeout: 30000 });
    // タイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('空きスタサーチくん');
    // サブタイトルも確認
    await expect(page.getByText('施設空き状況一覧')).toBeVisible();
  });

  test('データまたはメッセージが表示される', async ({ page }) => {
    // データの有無をチェック
    const hasData = await hasAvailabilityData(page);
    
    if (hasData) {
      // データがある場合はテーブル構造を検証
      await validateFacilityStructure(page);
      await validateDateHeaders(page);
      await validateFacilityNames(page);
    } else {
      // データがない場合はメッセージが表示されることを確認
      const messages = [
        'データがありません',
        'データを読み込み中',
        'Service temporarily unavailable'
      ];
      
      let messageFound = false;
      for (const msg of messages) {
        const visible = await page.getByText(msg).isVisible().catch(() => false);
        if (visible) {
          messageFound = true;
          break;
        }
      }
      expect(messageFound).toBeTruthy();
    }
  });

  test('時間帯ヘッダーが正しく表示される', async ({ page }) => {
    const hasData = await hasAvailabilityData(page);
    
    if (hasData) {
      // 各時間帯のヘッダーが表示されることを確認
      const timeSlots = ['9-12', '13-17', '18-21'];
      
      for (const slot of timeSlots) {
        const headers = page.locator(`th:has-text("${slot}")`);
        const count = await headers.count();
        expect(count).toBeGreaterThan(0);
      }
      
      // 更新日時ヘッダーも確認
      const updateHeaders = page.locator('th:has-text("更新日時")');
      const updateCount = await updateHeaders.count();
      expect(updateCount).toBeGreaterThan(0);
    }
  });

  test('ステータス値が妥当な値である', async ({ page }) => {
    await validateStatusValues(page);
    
    const hasData = await hasAvailabilityData(page);
    if (hasData) {
      // 更新時刻のフォーマットを確認（MM/DD HH:mm形式）
      const timePattern = /\d{2}\/\d{2} \d{2}:\d{2}/;
      const tables = page.getByRole('table');
      const tableCount = await tables.count();
      
      if (tableCount > 0) {
        const tableText = await tables.first().textContent();
        expect(tableText).toMatch(timePattern);
      }
    }
  });

  test('施設データの構造が正しい', async ({ page }) => {
    // データのロードを待つ
    await page.waitForTimeout(2000);
    await validateFacilityStructure(page);
  });

  test('凡例が表示される', async ({ page }) => {
    const hasData = await hasAvailabilityData(page);
    
    if (hasData) {
      // 凡例が表示されることを確認
      await expect(page.getByText('○ 空き')).toBeVisible();
      await expect(page.getByText('× 予約済み')).toBeVisible();
      // 不明ステータスの凡例は任意
      const unknownLegend = page.getByText('? 不明');
      if (await unknownLegend.isVisible()) {
        await expect(unknownLegend).toBeVisible();
      }
    }
  });

  test('レスポンシブデザインが機能する - モバイル', async ({ page }) => {
    // ビューポート設定前に少し待つ
    await page.waitForTimeout(1000);
    await testResponsiveDesign(page, { width: 375, height: 667 });
  });

  test('レスポンシブデザインが機能する - タブレット', async ({ page }) => {
    await testResponsiveDesign(page, { width: 768, height: 1024 });
  });

  test('レスポンシブデザインが機能する - デスクトップ', async ({ page }) => {
    await testResponsiveDesign(page, { width: 1920, height: 1080 });
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

  test('データ構造の一貫性を確認', async ({ page }) => {
    const hasData = await hasAvailabilityData(page);
    
    if (hasData) {
      // テーブル内の施設名を取得
      const tables = page.getByRole('table');
      const tableCount = await tables.count();
      
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        const rows = table.locator('tbody tr');
        const rowCount = await rows.count();
        
        // 各行に施設名とステータスが含まれることを確認
        for (let j = 0; j < rowCount; j++) {
          const row = rows.nth(j);
          const cells = row.locator('td');
          const cellCount = await cells.count();
          
          // 最低限のセル数（施設名、3時間帯、更新日時）
          expect(cellCount).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });
});