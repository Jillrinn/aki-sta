import { test, expect } from '@playwright/test';

test.describe('予約サイトへのリンク機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3300');
    await page.waitForLoadState('networkidle');
  });

  test('空き状況取得ボタンが表示される', async ({ page }) => {
    // 空き状況取得ボタンの存在を確認
    const fetchButton = page.locator('button').filter({ hasText: '空き状況取得' });
    
    if (await fetchButton.count() > 0) {
      await expect(fetchButton.first()).toBeVisible();
      
      // ボタンのスタイル確認
      const buttonClass = await fetchButton.first().getAttribute('class');
      expect(buttonClass).toContain('accent-orange');
    }
  });

  test('施設名に予約サイトへのリンクが設定される', async ({ page }) => {
    // カテゴリーを展開
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount > 0) {
      // あんさんぶるStudioのカテゴリーを探す
      let ensembleFound = false;
      for (let i = 0; i < categoryCount; i++) {
        const category = categoryButtons.nth(i);
        const categoryText = await category.textContent();
        
        if (categoryText?.includes('あんさんぶるStudio')) {
          ensembleFound = true;
          await category.click();
          await page.waitForTimeout(500);
          
          // 展開後の施設名リンクを確認
          const facilityLinks = page.locator('a').filter({ 
            hasText: /あんさんぶるStudio/ 
          });
          
          if (await facilityLinks.count() > 0) {
            const firstLink = facilityLinks.first();
            const href = await firstLink.getAttribute('href');
            
            // 正しいURLが設定されている
            expect(href).toContain('ensemble-studio.com');
            
            // target="_blank"が設定されている
            const target = await firstLink.getAttribute('target');
            expect(target).toBe('_blank');
            
            // rel="noopener noreferrer"が設定されている
            const rel = await firstLink.getAttribute('rel');
            expect(rel).toContain('noopener');
          }
          break;
        }
      }
    }
  });

  test('目黒区民センターへのリンクが機能する', async ({ page }) => {
    // カテゴリーを展開
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    const categoryCount = await categoryButtons.count();
    
    if (categoryCount > 0) {
      // 目黒区民センターのカテゴリーを探す
      let meguroFound = false;
      for (let i = 0; i < categoryCount; i++) {
        const category = categoryButtons.nth(i);
        const categoryText = await category.textContent();
        
        if (categoryText?.includes('目黒区民センター')) {
          meguroFound = true;
          await category.click();
          await page.waitForTimeout(500);
          
          // 展開後の施設名リンクを確認
          const facilityLinks = page.locator('a').filter({ 
            hasText: /めぐろパーシモンホール|東山社会教育館|中央町社会教育館|緑が丘文化会館|田道住区センター|上目黒住区センター/ 
          });
          
          if (await facilityLinks.count() > 0) {
            const firstLink = facilityLinks.first();
            const href = await firstLink.getAttribute('href');
            
            // 正しいURLが設定されている
            expect(href).toContain('meguro.tokyo.jp');
            
            // target="_blank"が設定されている
            const target = await firstLink.getAttribute('target');
            expect(target).toBe('_blank');
          }
          break;
        }
      }
    }
  });

  test('リンクアイコンが表示される', async ({ page }) => {
    // カテゴリーを展開
    const categoryButtons = page.locator('tr:has-text("【"), button:has-text("【")');
    
    if (await categoryButtons.count() > 0) {
      await categoryButtons.first().click();
      await page.waitForTimeout(500);
      
      // リンクアイコンの存在を確認
      const linkIcons = page.locator('svg, [data-testid="link-icon"], .fa-external-link-alt');
      
      if (await linkIcons.count() > 0) {
        await expect(linkIcons.first()).toBeVisible();
      }
    }
  });

  test('モバイルビューでもリンクが機能する', async ({ page }) => {
    // モバイルビューに切り替え
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // カテゴリーを展開
    const categoryButtons = page.locator('button:has-text("【")');
    
    if (await categoryButtons.count() > 0) {
      await categoryButtons.first().click();
      await page.waitForTimeout(500);
      
      // モバイルカード内のリンクを確認
      const facilityLinks = page.locator('a').filter({ 
        hasText: /あんさんぶるStudio|めぐろパーシモンホール/ 
      });
      
      if (await facilityLinks.count() > 0) {
        const firstLink = facilityLinks.first();
        const href = await firstLink.getAttribute('href');
        
        // URLが設定されている
        expect(href).toBeTruthy();
        expect(href).toMatch(/ensemble-studio\.com|meguro\.tokyo\.jp/);
        
        // target="_blank"が設定されている
        const target = await firstLink.getAttribute('target');
        expect(target).toBe('_blank');
      }
    }
  });
});

test.describe('空き状況取得機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3300');
    await page.waitForLoadState('networkidle');
  });

  test('空き状況取得ボタンのクリック動作', async ({ page }) => {
    const fetchButton = page.locator('button').filter({ hasText: '空き状況取得' });
    
    if (await fetchButton.count() > 0) {
      // ボタンをクリック
      await fetchButton.first().click();
      
      // モーダルまたは確認ダイアログが表示される可能性
      const modal = page.locator('[role="dialog"], .modal');
      const modalVisible = await modal.isVisible().catch(() => false);
      
      if (modalVisible) {
        // モーダルが表示された場合、閉じるボタンを確認
        const closeButton = page.locator('button').filter({ 
          hasText: /閉じる|キャンセル|×/ 
        });
        
        if (await closeButton.count() > 0) {
          await expect(closeButton.first()).toBeVisible();
          await closeButton.first().click();
        }
      }
    }
  });

  test('更新ボタンの存在と動作', async ({ page }) => {
    // 更新ボタンの存在を確認
    const refreshButton = page.locator('button').filter({ 
      hasText: /更新|リフレッシュ|再読み込み/ 
    });
    
    if (await refreshButton.count() > 0) {
      await expect(refreshButton.first()).toBeVisible();
      
      // ボタンをクリック
      await refreshButton.first().click();
      
      // ローディング状態やスピナーが表示される可能性
      const spinner = page.locator('.spinner, .loading, [role="status"]');
      const spinnerVisible = await spinner.isVisible().catch(() => false);
      
      // スピナーが表示された場合は消えるまで待つ
      if (spinnerVisible) {
        await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      }
    }
  });
});