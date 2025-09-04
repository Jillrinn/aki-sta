import { test, expect } from '@playwright/test';

test.describe('ナビゲーション機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3300');
    await page.waitForLoadState('networkidle');
  });

  test('ナビゲーションリンクのスタイル', async ({ page }) => {
    // 練習日程一覧リンクのスタイルを確認
    const targetDatesLink = page.locator('a').filter({ hasText: '練習日程一覧' });
    const targetDatesClass = await targetDatesLink.getAttribute('class');
    expect(targetDatesClass).toContain('bg-brand-green');
    
    // 使い方リンクのスタイルを確認
    const howToUseLink = page.locator('a').filter({ hasText: '使い方' });
    const howToUseClass = await howToUseLink.getAttribute('class');
    expect(howToUseClass).toContain('bg-brand-orange');
  });
});