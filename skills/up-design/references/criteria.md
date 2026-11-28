# Static design criteria

診斷時逐項評分並附證據（截圖區域或 `file:line`）。每個 gap 都要有含真實數值的修法。專案自身規則與某標準衝突時，專案規則優先；衝突列入報告。

兩種處理類別：

- **Auto-fix**：客觀、可量測；直接修正（併入報告的「穩定性」）。
- **Report-only**：品味或改版；不自動更動；列在報告的「設計建議（未套用）」。

## Typography

Auto-fix：

- 字族最多 2 種；字重 ≤3 種；不用偽粗體 / 偽斜體。
- 正文 16–20px、line-height 1.5–1.7、行寬 45–75ch；標題 line-height 1.0–1.25。
- `font-display: swap`；對齊數字用 tabular numbers。
- CJK：專用 CJK fallback、line-height ≥1.7、標點寬度不混用。
- 字級每階 ≥1.25×；標題以 `clamp()` 流體縮放。

Report-only：display / body 搭配是否為有意為之，而非預設系統字型。

## Whitespace

Auto-fix：

- 間距落在單一 4/8px 刻度上；區段 padding 一致；gutter / margin 一致。
- 邊緣不擁擠。

Report-only：區段 padding 是否夠寬鬆（例：桌面 96–160px）、留白看起來是刻意還是未完成。

## Visual hierarchy

Report-only（全屬品味）：

- 每個 viewport 一個視覺焦點；閱讀順序符合重要性。
- 強調層級 ≤3；主要 CTA 一眼可辨，次要的明顯較弱。
- 沒有東西與主視覺競爭。

## Color

Auto-fix：

- 顏色來自 tokens，不寫死；若支援 dark mode，是重新調校而非反相。

Report-only：1 個主色、1 個強調色、中性色的比例（強調色 ≈10%）；避免預設模板配色（白底紫漸層）。

## Responsive (375 / 768 / 1024 / 1440, plus 320 reflow)

Auto-fix：

- 任何寬度（含 320px）皆無水平捲動；無被裁切或重疊的內容。
- 圖片依斷點裁切；行寬維持在範圍內；固定元素不吃掉 viewport。

Report-only：版面是經設計重新排列，還是只是縮小。

## Originality

Report-only：

- 至少一個模板做不出來的獨特點子（版面、字體處理、插畫、互動概念）。
- 視覺語言一致；不是常見的 hero + 三張卡片 + footer 版型。
- 原創性不得犧牲可讀性、無障礙或 AdSense 政策。
