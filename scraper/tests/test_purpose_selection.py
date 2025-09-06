#!/usr/bin/env python3
"""
渋谷区サイトの目的選択の動作検証用スクリプト
"""
import os
from playwright.sync_api import sync_playwright
from datetime import datetime
import time

def test_purpose_selection():
    """目的選択の動作を詳しく検証"""
    
    print("=" * 60)
    print("渋谷区サイト - 目的選択動作検証")
    print("=" * 60)
    
    with sync_playwright() as p:
        # ブラウザを起動（ヘッドレスモード）
        browser = p.chromium.launch(
            headless=True,  # CI環境でも動作するようにヘッドレスモード
            slow_mo=100,    # 動作を少し遅くする
        )
        
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            locale='ja-JP',
        )
        
        page = context.new_page()
        
        # イベントリスナーを設定
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[ERROR] {err}"))
        
        try:
            # サイトにアクセス
            print("\n1. サイトにアクセス中...")
            page.goto("https://www.yoyaku.city.shibuya.tokyo.jp/", wait_until="networkidle")
            print("   ✓ アクセス完了")
            
            # React/SPAの読み込み待機
            print("\n2. Reactアプリケーションの読み込み待機...")
            page.wait_for_selector("#root", timeout=10000)
            page.wait_for_load_state("networkidle")
            print("   ✓ React読み込み完了")
            
            # 「場所・日時から探す」タブをクリック
            print("\n3. '場所・日時から探す'タブを探しています...")
            tab_found = False
            
            # タブを探す複数のセレクタ
            tab_selectors = [
                "text=場所・日時から探す",
                "button:has-text('場所・日時から探す')",
                ".ant-tabs-tab:has-text('場所・日時から探す')",
            ]
            
            for selector in tab_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        page.locator(selector).first.click()
                        tab_found = True
                        print(f"   ✓ タブをクリックしました: {selector}")
                        break
                except:
                    continue
            
            if not tab_found:
                print("   ✗ タブが見つかりません")
                return
            
            # タブ切り替え後の待機
            page.wait_for_timeout(2000)
            
            # 目的セレクトボックスの状態を確認
            print("\n4. 目的セレクトボックスの初期状態を確認...")
            
            # すべてのant-selectを取得して分析
            all_selects = page.locator(".ant-select").all()
            print(f"   - 見つかったセレクトボックス数: {len(all_selects)}")
            
            for i, select in enumerate(all_selects):
                try:
                    # セレクタ内のテキストを取得
                    selector_elem = select.locator(".ant-select-selector").first
                    text_content = selector_elem.text_content()
                    inner_html = selector_elem.inner_html()
                    
                    print(f"\n   Select {i+1}:")
                    print(f"     Text: {text_content}")
                    print(f"     HTML (first 200 chars): {inner_html[:200]}")
                    
                    # aria-controls属性を確認
                    aria_controls = select.get_attribute("aria-controls")
                    if aria_controls:
                        print(f"     aria-controls: {aria_controls}")
                except Exception as e:
                    print(f"     Error reading select {i+1}: {e}")
            
            # 目的セレクトボックスをクリック
            print("\n5. 目的セレクトボックスをクリック...")
            purpose_select = page.locator(".ant-select").first  # 最初のセレクトボックスが目的
            
            # クリック前の状態を記録
            print("   クリック前の状態:")
            print(f"     - aria-expanded: {purpose_select.get_attribute('aria-expanded')}")
            print(f"     - class: {purpose_select.get_attribute('class')}")
            
            # クリック
            purpose_select.click()
            print("   ✓ クリック完了")
            
            # クリック後の状態を確認
            page.wait_for_timeout(1000)
            print("\n   クリック後の状態:")
            print(f"     - aria-expanded: {purpose_select.get_attribute('aria-expanded')}")
            print(f"     - class: {purpose_select.get_attribute('class')}")
            
            # ドロップダウンが表示されているか確認
            print("\n6. ドロップダウンメニューを確認...")
            dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
            
            if dropdown.count() > 0:
                print("   ✓ ドロップダウンが表示されています")
                
                # オプションを取得
                options = dropdown.locator(".ant-select-item-option").all()
                print(f"   - 表示されているオプション数: {len(options)}")
                
                # 各オプションの内容を表示
                print("\n   オプション一覧:")
                for j, option in enumerate(options[:5]):  # 最初の5個だけ表示
                    try:
                        text = option.text_content()
                        print(f"     {j+1}. {text}")
                    except:
                        pass
                
                # 「演奏会・発表会」を選択
                print("\n7. '演奏会・発表会'オプションを選択...")
                target_option = dropdown.locator(".ant-select-item-option").filter(has_text="演奏会・発表会").first
                
                if target_option.count() > 0:
                    target_option.click()
                    print("   ✓ オプションをクリックしました")
                    
                    # 選択後の待機
                    page.wait_for_timeout(2000)
                    
                    # 選択後の状態を確認
                    print("\n8. 選択後の状態を確認...")
                    
                    # すべてのセレクトボックスの状態を再確認
                    all_selects = page.locator(".ant-select").all()
                    for i, select in enumerate(all_selects):
                        try:
                            selector_elem = select.locator(".ant-select-selector").first
                            text_content = selector_elem.text_content()
                            print(f"\n   Select {i+1} (選択後):")
                            print(f"     Text: {text_content}")
                        except:
                            pass
                    
                    # 施設セレクトボックスが更新されているか確認
                    print("\n9. 施設セレクトボックスの状態を確認...")
                    if len(all_selects) > 1:
                        facility_select = all_selects[1]
                        facility_text = facility_select.locator(".ant-select-selector").first.text_content()
                        print(f"   施設セレクトボックスのテキスト: {facility_text}")
                        
                        # 施設セレクトボックスをクリックしてオプションを確認
                        print("\n10. 施設セレクトボックスをクリック...")
                        facility_select.click()
                        page.wait_for_timeout(1000)
                        
                        # 施設のドロップダウンを確認
                        facility_dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").last()
                        if facility_dropdown.count() > 0:
                            facility_options = facility_dropdown.locator(".ant-select-item-option").all()
                            print(f"   - 施設オプション数: {len(facility_options)}")
                            print("\n   施設オプション一覧:")
                            for j, option in enumerate(facility_options[:5]):
                                try:
                                    text = option.text_content()
                                    print(f"     {j+1}. {text}")
                                except:
                                    pass
                else:
                    print("   ✗ '演奏会・発表会'オプションが見つかりません")
            else:
                print("   ✗ ドロップダウンが表示されていません")
            
            # スクリーンショットを保存
            print("\n11. スクリーンショットを保存...")
            screenshot_path = "/tmp/shibuya_purpose_selection.png"
            page.screenshot(path=screenshot_path)
            print(f"   ✓ スクリーンショット保存: {screenshot_path}")
            
            # 終了前に少し待機（CI環境用に短縮）
            print("\n12. 待機中...")
            time.sleep(1)
            
        except Exception as e:
            print(f"\n✗ エラーが発生しました: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            browser.close()
            print("\n" + "=" * 60)
            print("検証完了")
            print("=" * 60)

if __name__ == "__main__":
    test_purpose_selection()