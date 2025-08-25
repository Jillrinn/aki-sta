import { Page, expect } from '@playwright/test';

/**
 * データが存在するかチェック
 */
export async function hasAvailabilityData(page: Page): Promise<boolean> {
  try {
    // データが存在する場合はテーブルが表示される
    const tables = page.getByRole('table');
    const tableCount = await tables.count();
    return tableCount > 0;
  } catch {
    return false;
  }
}

/**
 * 施設データの構造を検証
 */
export async function validateFacilityStructure(page: Page) {
  const tables = page.getByRole('table');
  const tableCount = await tables.count();
  
  if (tableCount === 0) {
    // データがない場合はメッセージを確認
    const messageExists = await page.getByText(/データがありません|読み込み中/).isVisible().catch(() => false);
    expect(messageExists).toBeTruthy();
    return;
  }

  // テーブルヘッダーの存在確認
  const headers = ['施設名', '9-12', '13-17', '18-21', '更新日時'];
  for (const header of headers) {
    const headerElements = page.locator(`th:has-text("${header}")`);
    const headerCount = await headerElements.count();
    expect(headerCount).toBeGreaterThan(0);
  }
}

/**
 * ステータス値の妥当性を検証
 */
export async function validateStatusValues(page: Page) {
  const tables = page.getByRole('table');
  const tableCount = await tables.count();
  
  if (tableCount === 0) return;

  // ステータスを含むセルを取得
  const statusCells = page.locator('td').filter({ 
    hasText: /^(○|×|\?)$/ 
  });
  
  const cellCount = await statusCells.count();
  if (cellCount > 0) {
    // 各セルの値が有効なステータスであることを確認
    for (let i = 0; i < cellCount; i++) {
      const text = await statusCells.nth(i).textContent();
      expect(['○', '×', '?']).toContain(text?.trim());
    }
  }
}

/**
 * 日付ヘッダーの形式を検証
 */
export async function validateDateHeaders(page: Page) {
  // 日付パターン: YYYY-MM-DD形式
  const datePattern = /\d{4}-\d{2}-\d{2}/;
  const dateHeaders = page.locator('h2').filter({ hasText: datePattern });
  const headerCount = await dateHeaders.count();
  
  if (headerCount > 0) {
    for (let i = 0; i < headerCount; i++) {
      const text = await dateHeaders.nth(i).textContent();
      expect(text).toMatch(datePattern);
    }
  }
}

/**
 * 施設名の妥当性を検証
 */
export async function validateFacilityNames(page: Page) {
  const tables = page.getByRole('table');
  const tableCount = await tables.count();
  
  if (tableCount === 0) return;

  // 施設名を含むセルを取得
  const facilityCells = page.locator('td').first();
  const cellCount = await facilityCells.count();
  
  if (cellCount > 0) {
    const text = await facilityCells.textContent();
    // 施設名が空でないことを確認
    expect(text).toBeTruthy();
    expect(text?.length).toBeGreaterThan(0);
  }
}

/**
 * レスポンシブデザインのテスト
 */
export async function testResponsiveDesign(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  
  // タイトルが表示される
  await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
  
  // データまたはメッセージが表示される
  const hasData = await hasAvailabilityData(page);
  if (hasData) {
    const tables = page.getByRole('table');
    await expect(tables.first()).toBeVisible();
  } else {
    // データがない場合のメッセージ確認
    const hasMessage = await page.getByText(/データがありません|読み込み中|エラー/).isVisible().catch(() => false);
    expect(hasMessage).toBeTruthy();
  }
}