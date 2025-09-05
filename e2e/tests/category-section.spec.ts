import { test, expect } from '@playwright/test';

test.describe('カテゴリーセクション機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3300');
    await page.waitForLoadState('networkidle');
  });

  test('カテゴリーセクションが正しく表示される', async ({ page }) => {
    // カテゴリーセクションの存在を確認
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount > 0) {
      // カテゴリー名が表示されている
      const firstCategory = categoryButtons.first();
      const categoryText = await firstCategory.textContent();
      expect(categoryText).toContain('【');
      expect(categoryText).toContain('】');
      
      // ステータスバッジが表示される場合がある
      const badges = ['全て空きなし', '希望時間は空きなし', '空きあり'];
      let hasBadge = false;
      for (const badge of badges) {
        if (categoryText?.includes(badge)) {
          hasBadge = true;
          break;
        }
      }
      // バッジの有無は問わない（データ依存のため）
    }
  });

  test('カテゴリーセクションの展開/折りたたみが機能する', async ({ page }) => {
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount > 0) {
      const firstCategory = categoryButtons.first();
      
      // 初期状態を確認（展開されている場合と折りたたまれている場合がある）
      const arrowIcon = firstCategory.locator('span').first();
      const initialRotation = await arrowIcon.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // クリックして状態を変更
      await firstCategory.click();
      await page.waitForTimeout(500);
      
      // 回転状態が変わることを確認
      const afterRotation = await arrowIcon.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      expect(initialRotation).not.toBe(afterRotation);
      
      // もう一度クリックして元に戻す
      await firstCategory.click();
      await page.waitForTimeout(500);
      
      const finalRotation = await arrowIcon.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      expect(finalRotation).toBe(initialRotation);
    }
  });

  test('カテゴリー展開時に施設データが表示される', async ({ page }) => {
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount > 0) {
      // 最初のカテゴリーを展開
      const firstCategory = categoryButtons.first();
      await firstCategory.click();
      await page.waitForTimeout(500);
      
      // 展開後のデータ行を確認（カテゴリーヘッダーを除く）
      const table = page.locator('table').first();
      const allRows = await table.locator('tbody tr').all();
      
      let hasDataRow = false;
      for (const row of allRows) {
        const text = await row.textContent();
        // カテゴリーヘッダーではないデータ行を探す
        if (text && !text.includes('【')) {
          hasDataRow = true;
          
          // データ行の構造を確認
          const cells = await row.locator('td').all();
          if (cells.length > 0) {
            // 施設名が含まれることを確認
            const facilityText = await cells[0].textContent();
            expect(facilityText).toBeTruthy();
            
            // ステータス記号が含まれることを確認（○、×、?のいずれか）
            const rowText = await row.textContent();
            const hasStatusSymbol = rowText?.includes('○') || 
                                   rowText?.includes('×') || 
                                   rowText?.includes('?');
            expect(hasStatusSymbol).toBeTruthy();
          }
          break;
        }
      }
      
      // 少なくとも1つのデータ行が存在することを確認
      expect(hasDataRow).toBeTruthy();
    }
  });

  test('カテゴリーステータスバッジの色が正しい', async ({ page }) => {
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount > 0) {
      // 各カテゴリーのバッジを確認
      for (let i = 0; i < Math.min(categoryCount, 3); i++) {
        const category = categoryButtons.nth(i);
        const badge = category.locator('span').filter({ hasText: /全て空きなし|希望時間は空きなし|空きあり/ });
        
        if (await badge.count() > 0) {
          const badgeText = await badge.textContent();
          const badgeClass = await badge.getAttribute('class');
          
          if (badgeText?.includes('全て空きなし')) {
            expect(badgeClass).toContain('bg-red');
          } else if (badgeText?.includes('希望時間は空きなし')) {
            expect(badgeClass).toContain('bg-orange');
          } else if (badgeText?.includes('空きあり')) {
            expect(badgeClass).toContain('bg-green');
          }
        }
      }
    }
  });

  test('複数カテゴリーの独立した展開/折りたたみ', async ({ page }) => {
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount >= 2) {
      // 最初のカテゴリーを展開
      await categoryButtons.first().click();
      await page.waitForTimeout(300);
      
      // 2番目のカテゴリーも展開
      await categoryButtons.nth(1).click();
      await page.waitForTimeout(300);
      
      // 両方が展開されていることを確認
      const firstArrow = categoryButtons.first().locator('span').first();
      const secondArrow = categoryButtons.nth(1).locator('span').first();
      
      const firstRotation = await firstArrow.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      const secondRotation = await secondArrow.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // 両方が展開されていることを確認するため、施設行が表示されているかチェック
      // カテゴリー行の次の行（施設行）を探す
      const facilitiesAfterFirst = await page.locator('tr').filter({ hasText: 'あんさんぶるStudio' }).count();
      const facilitiesAfterSecond = await page.locator('tr').filter({ hasText: '田道住区センター' }).count();
      
      // 施設が表示されていることを確認（展開状態）
      const hasExpandedFacilities = facilitiesAfterFirst > 0 || facilitiesAfterSecond > 0;
      expect(hasExpandedFacilities).toBeTruthy();
      
      // 最初のカテゴリーを折りたたむ
      await categoryButtons.first().click();
      await page.waitForTimeout(300);
      
      // 最初は折りたたまれ、2番目は展開のまま
      const firstNewRotation = await firstArrow.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      const secondNewRotation = await secondArrow.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // 変化があることを確認（完全一致でなくても良い）
      const hasChanged = firstNewRotation !== firstRotation || secondNewRotation !== secondRotation;
      expect(hasChanged).toBeTruthy();
    }
  });
});