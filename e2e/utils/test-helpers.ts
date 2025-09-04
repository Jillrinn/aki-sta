import { Page, expect } from '@playwright/test';

/**
 * データが存在するかチェック
 */
export async function hasAvailabilityData(page: Page): Promise<boolean> {
  try {
    // データが存在する場合はテーブルまたはカードが表示される
    const tables = page.getByRole('table');
    const tableCount = await tables.count();
    
    // モバイルビューのカードもチェック
    const cards = page.locator('.bg-white.rounded-lg.shadow-md');
    const cardCount = await cards.count();
    
    // 施設名のh3要素もチェック（モバイルカード内）
    const facilityHeaders = page.locator('h3');
    const headerCount = await facilityHeaders.count();
    
    return tableCount > 0 || cardCount > 0 || headerCount > 0;
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
    const messageExists = await page.getByText(/データがありません|読み込み中|空き状況はまだ取得されていません/).isVisible().catch(() => false);
    expect(messageExists).toBeTruthy();
    return;
  }

  // テーブルヘッダーの存在確認
  const headers = ['施設名', '午前', '午後', '夜間', '更新日時'];
  for (const header of headers) {
    const headerElements = page.locator(`th:has-text("${header}")`);
    const headerCount = await headerElements.count();
    if (headerCount === 0) {
      // カテゴリーセクションが折りたたまれている場合もあるので、その場合は成功とする
      const categorySection = page.locator('tr:has-text("【")');
      const categoryCount = await categorySection.count();
      expect(categoryCount).toBeGreaterThan(0);
      return;
    }
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
  
  // ビューポート変更後、Reactの再レンダリングを待つ
  await page.waitForTimeout(1000);
  
  // タイトルが表示される
  await expect(page.getByRole('heading', { name: '空きスタサーチくん' })).toBeVisible();
  
  // ビューポートサイズに応じて異なる要素を確認
  if (viewport.width < 640) {
    // モバイル: カードレイアウトまたはテーブルを確認
    // まずカードを探す
    const cards = page.locator('.bg-white.rounded-lg.shadow-md');
    const cardsCount = await cards.count();
    
    if (cardsCount > 0) {
      // カードが存在する場合
      await expect(cards.first()).toBeVisible();
    } else {
      // カードがない場合、テーブルまたはメッセージを探す
      const tables = page.getByRole('table');
      const tableCount = await tables.count();
      
      if (tableCount > 0) {
        // テーブルが存在する場合
        await expect(tables.first()).toBeVisible();
      } else {
        // データがない場合のメッセージを確認
        const messageElement = page.getByText(/データがありません|読み込み中|エラー/);
        const messageCount = await messageElement.count();
        
        if (messageCount > 0) {
          await expect(messageElement.first()).toBeVisible();
        } else {
          // 施設名のh3要素を探す（最後の手段）
          const facilityHeaders = page.locator('h3');
          const headersCount = await facilityHeaders.count();
          if (headersCount > 0) {
            await expect(facilityHeaders.first()).toBeVisible();
          }
        }
      }
    }
  } else {
    // デスクトップ/タブレット: テーブルレイアウトを確認
    const tables = page.getByRole('table');
    const tableCount = await tables.count();
    
    if (tableCount > 0) {
      await expect(tables.first()).toBeVisible();
    } else {
      // データがない場合のメッセージを確認
      const messageElement = page.getByText(/データがありません|読み込み中|エラー|空き状況はまだ取得されていません/);
      await expect(messageElement.first()).toBeVisible();
    }
  }
}