# 人間の操作に近いスクレイピング仕様書

## 概要
本仕様書は、あんさんぶるStudio予約カレンダーのスクレイピングを、人間の操作と同じような方法で実装するための仕様を定義します。

## 対象サイト
- URL: https://ensemble-studio.com/schedule/
- スタジオ: 
  - あんさんぶるStudio和(本郷)
  - あんさんぶるStudio音(初台)

## HTMLページ構造

### 基本構造
```html
<!-- スタジオ名の表示 -->
<p>■あんさんぶるStudio和(本郷)</p>

<!-- カレンダーコンテナ -->
<div class="timetable-calendar">
  <table>
    <!-- 年月キャプション -->
    <caption class="calendar-caption">2025年8月
      <div class="monthly-prev-next">
        <div class="monthly-prev"><span class="no-link">2025年7月</span></div>
        <div class="monthly-next"><a href="/schedule/?ym=2025-9">2025年9月</a></div>
      </div>
    </caption>
    
    <!-- カレンダー本体 -->
    <tbody>
      <!-- 日付セル -->
      <td class="day-box">
        <div class="day-number">28</div>
        <!-- 時刻情報 -->
        <div class="calendar-time-mark"><span class="time-string">09:00</span>×</div>
        <div class="calendar-time-mark"><span class="time-string">13:00</span><a>○</a></div>
        <div class="calendar-time-mark"><span class="time-string">18:00</span>×</div>
      </td>
      
      <!-- 営業していない日 -->
      <td class="day-box">
        <div class="day-number">1</div>
        <div class="calendar-time-disable">－</div>
      </td>
    </tbody>
  </table>
</div>
```

## スクレイピングアルゴリズム

### 1. ページ読み込みと初期化

```python
def scrape_availability(self, date: str):
    """
    指定日付の空き状況をスクレイピング
    
    Args:
        date: "YYYY-MM-DD"形式の日付文字列
    
    Returns:
        スタジオ空き状況のリスト
    """
    # Playwrightでページにアクセス
    page = browser.new_page()
    page.goto("https://ensemble-studio.com/schedule/")
    
    # カレンダーが読み込まれるまで待機
    page.wait_for_selector(".timetable-calendar", timeout=30000)
    page.wait_for_timeout(2000)  # 追加の待機
```

### 2. スタジオごとのカレンダー特定

```python
def find_studio_calendars(page):
    """
    各スタジオのカレンダー要素を特定
    
    Returns:
        [(スタジオ名, カレンダー要素), ...]のリスト
    """
    studios = ["あんさんぶるStudio和(本郷)", "あんさんぶるStudio音(初台)"]
    calendars = []
    
    for studio_name in studios:
        # スタジオ名を含む要素を探す
        studio_element = page.locator(f"text='{studio_name}'").first
        
        if studio_element.count() > 0:
            # 次の兄弟要素のカレンダーを取得
            # XPathを使用して直後のtimetable-calendarを取得
            calendar = studio_element.locator(
                "xpath=following-sibling::div[@class='timetable-calendar'][1]"
            )
            
            if calendar.count() > 0:
                calendars.append((studio_name, calendar))
    
    return calendars
```

### 3. 目的の年月への移動

```python
def navigate_to_month(page, calendar, target_date):
    """
    カレンダーを目的の年月まで移動
    
    Args:
        page: Playwrightのページオブジェクト
        calendar: カレンダー要素
        target_date: datetime オブジェクト
    """
    target_year_month = f"{target_date.year}年{target_date.month}月"
    max_iterations = 12  # 最大12ヶ月分移動
    
    for _ in range(max_iterations):
        # 現在のcaptionを取得
        caption = calendar.locator(".calendar-caption").first
        if caption.count() == 0:
            break
            
        caption_text = caption.text_content()
        current_year_month = caption_text.split()[0]  # "2025年8月"部分を取得
        
        if current_year_month == target_year_month:
            break
        
        # 年月を比較して移動方向を決定
        current_dt = parse_japanese_year_month(current_year_month)
        
        if target_date.year > current_dt.year or \
           (target_date.year == current_dt.year and target_date.month > current_dt.month):
            # 次月へ移動
            next_link = calendar.locator(".monthly-next a").first
            if next_link.count() > 0:
                next_link.click()
                page.wait_for_timeout(1500)
            else:
                break  # リンクがない場合は終了
        else:
            # 前月へ移動
            prev_link = calendar.locator(".monthly-prev a").first
            if prev_link.count() > 0:
                prev_link.click()
                page.wait_for_timeout(1500)
            else:
                break
```

### 4. 日付セルの特定

```python
def find_date_cell(calendar, target_day):
    """
    指定日付のセルを特定
    
    Args:
        calendar: カレンダー要素
        target_day: 日付（1-31の数値）
    
    Returns:
        日付セル要素またはNone
    """
    # すべての日付ボックスを取得
    day_boxes = calendar.locator(".day-box")
    
    for i in range(day_boxes.count()):
        day_box = day_boxes.nth(i)
        day_number = day_box.locator(".day-number").first
        
        if day_number.count() > 0:
            day_text = day_number.text_content()
            if day_text and day_text.strip() == str(target_day):
                return day_box
    
    return None
```

### 5. 時刻情報の抽出

```python
def extract_time_slots(day_box):
    """
    日付セルから時刻情報を抽出
    
    Args:
        day_box: 日付セル要素
    
    Returns:
        {"9-12": "available|booked|unknown", ...}
    """
    time_slots = {}
    
    # 営業していない日の判定
    if day_box.locator(".calendar-time-disable").count() > 0:
        return {
            "9-12": "unknown",
            "13-17": "unknown", 
            "18-21": "unknown"
        }
    
    # 時刻マークを探す
    time_marks = day_box.locator(".calendar-time-mark")
    
    for i in range(time_marks.count()):
        time_mark = time_marks.nth(i)
        time_string_elem = time_mark.locator(".time-string").first
        
        if time_string_elem.count() > 0:
            time_string = time_string_elem.text_content()
            
            # 時刻を時間帯に変換
            slot_key = convert_time_to_slot(time_string)
            
            # 空き状況を判定
            # 方法1: リンクがあるかチェック
            link = time_mark.locator("a").first
            if link.count() > 0:
                link_text = link.text_content()
                if "○" in link_text:
                    time_slots[slot_key] = "available"
                else:
                    time_slots[slot_key] = "booked"
            else:
                # 方法2: 直接○×をチェック
                mark_text = time_mark.text_content()
                if "○" in mark_text:
                    time_slots[slot_key] = "available"
                elif "×" in mark_text:
                    time_slots[slot_key] = "booked"
                else:
                    time_slots[slot_key] = "unknown"
    
    # 見つからない時間帯はunknown
    for slot in ["9-12", "13-17", "18-21"]:
        if slot not in time_slots:
            time_slots[slot] = "unknown"
    
    return time_slots
```

### 6. ヘルパー関数

```python
def convert_time_to_slot(time_str):
    """
    時刻文字列を時間帯に変換
    
    Args:
        time_str: "09:00"形式の時刻文字列
    
    Returns:
        "9-12", "13-17", "18-21"のいずれか
    """
    if "09:00" in time_str or "9:00" in time_str:
        return "9-12"
    elif "13:00" in time_str:
        return "13-17"
    elif "18:00" in time_str:
        return "18-21"
    else:
        return None

def parse_japanese_year_month(text):
    """
    日本語の年月文字列をdatetimeオブジェクトに変換
    
    Args:
        text: "2025年8月"形式の文字列
    
    Returns:
        datetimeオブジェクト
    """
    import re
    match = re.match(r'(\d{4})年(\d{1,2})月', text)
    if match:
        year = int(match.group(1))
        month = int(match.group(2))
        return datetime(year, month, 1)
    return None
```

## エラーハンドリング

### 1. 要素が見つからない場合
- 各locator操作で`count()`を使用して要素の存在を確認
- 存在しない場合はデフォルト値を返す

### 2. タイムアウト対策
- 各操作に適切なタイムアウトを設定
- ページ遷移後は必ず待機時間を設ける

### 3. ネットワークエラー
- リトライ機能の実装
- エラー時はデフォルトデータを返す

## デバッグ機能

### ログ出力
各ステップで以下の情報をログ出力：
- 現在処理中のスタジオ名
- 現在のカレンダー年月
- 見つかった日付
- 抽出した時刻情報

### スクリーンショット
エラー発生時にスクリーンショットを保存：
```python
page.screenshot(path=f"error_{datetime.now()}.png")
```

## 実装の利点

1. **構造変更への耐性**
   - HTMLタグの属性が変更されても、テキスト内容で要素を探すため影響を受けにくい
   - クラス名の変更にも対応しやすい

2. **人間の操作を模倣**
   - 実際のユーザー操作と同じ流れでデータを取得
   - デバッグ時に操作の流れを理解しやすい

3. **メンテナンス性**
   - 各機能が独立した関数として実装されている
   - 変更が必要な場合も該当箇所のみの修正で対応可能

## 今後の拡張

1. **複数日付の一括取得**
   - 月単位でのデータ取得機能

2. **差分取得**
   - 前回取得時からの変更のみを取得

3. **通知機能**
   - 空き状況が変化した場合の通知

## 更新履歴

- 2024-08-24: 初版作成
- Playwrightのlocatorベースの実装仕様を定義
- 人間の操作を模倣したアルゴリズムを採用