整輪 up-design 的判斷基準：如何診斷並修正靜態設計、互動細節與動效品味。
整輪開始時讀一次；專案規則與 ux-rules 優先於本檔。

本檔只補 `ux-rules.md` 與 `criteria.md` 缺的部分；它們已涵蓋的一點寫作 `see ux-rules §N`。專案 tokens（easing、duration、radius、字型）取代本檔所有預設值，因為那是使用者的明確選擇。標有或列在 **[report-only]** 下的項目屬品味或改版：以具體替代方案列入 設計建議（未套用），不改程式碼。其餘皆可在 up-design 邊界內修正（範圍內檔案、不新增依賴或元件）。

## 1. Should it animate

依序判斷；遇到第一個「否」即停。

1. **Frequency.** 高頻與鍵盤觸發的動作：見 ux-rules §12。一天用數十次的介面（hover、列表導覽）：移除動效，或降為顏色/opacity 變化，因為重複會把任何延遲變成摩擦。愉悅感留給罕見或首次的時刻（onboarding、完成設定）。
2. **Purpose.** 動效只為空間一致性（沿同一路徑進出）、狀態指示（morph 顯示什麼變了）、說明、回饋（按下確認輸入）或避免突兀跳變而保留。在高頻介面上「看起來不錯」是移除候選。
3. **Easing**，再 **duration**（section 2）。

動效配合產品（工作工具：俐落快速；玩味的消費者 app：較柔和），且全 app 維持單一氣質；混用風格讀起來像未完成。

## 2. Easing and duration

具體曲線與時長：`motion-audit.md` §C（診斷）、`motion-build.md` A5（實作）、`motion-review.md` 3.2–3.3（驗證）。原則：

- Easing：進場或退場 → ease-out；螢幕上移動或 morph → ease-in-out；hover 與顏色 → ease；等速動效（跑馬燈、進度）→ linear；不確定 → ease-out。UI 上的 `ease-in` 恰好在使用者注視時起步緩慢，所以同樣時長下感覺比 ease-out 慢。
- UI 動效保持在 300ms 以內，modal、drawer、sheet 與 toast 除外；動效更短（spinner 更快）會讓 app 在載入時間相同下感覺更快。
- 退場比進場快（例：進場 250ms、退場 200ms）：使用者已決定要離開。
- 使用者做決定處放慢，系統回應處加快：長按確認以 `linear` 在 2s 內填滿，放開時以 200ms ease-out 彈回（行為見 ux-rules §7）。

## 3. Component polish

按壓 scale、從 `scale(0.95)` 進場、觸發器 `transform-origin`、tooltip 群組、`transition: all`、blur 遮罩 crossfade、百分比位移、`clip-path` 揭示與 stagger：見 `motion-build.md` A4、B 與 D1–D9。

## 4. Interruptibility

見 `motion-build.md` A6 與 `motion-review.md` 3.5。

## 5. Physical feel: springs and gestures

物理感動效只用在使用者的手驅動時（drag、swipe、sheet、fling、慣性 carousel），或某個元素必須顯得有生命時；其他地方用臨界阻尼 spring 或 ease-out。

**Restraint rule：** 只在帶動量的手勢之後才彈跳。快速甩出的卡片過衝感覺對；剛打開的選單過衝感覺不對，且處處過衝的 UI 顯得玩具化又慢。前面沒有 fling 的彈跳要移除。

**Scope：** up-design 不新增依賴，也不手寫手勢（ux-rules §7）。只在專案已有 spring 或手勢函式庫時套用這些數值，或用來判斷範圍內既有的手勢程式碼；需要函式庫的修正列入 未解決。手勢機制：`motion-build.md` C。

| Interaction                     | Damping ratio      | Response (s) |
| ------------------------------- | ------------------ | ------------ |
| Default UI                      | 1.0 (no overshoot) | 0.3–0.4      |
| Move / reposition               | 1.0                | 0.4          |
| Rotation                        | 0.8                | 0.4          |
| Drawer / sheet released by drag | 0.8                | 0.3          |
| Settle after a flick            | ~0.8               | 0.3–0.4      |

- Response 不是 duration；穩定時間由參數自然產生。bounce/duration 型 API 預設 `bounce: 0, duration: 0.4`；`bounce` 0.1–0.3 僅用於動量之後，或刻意玩味的元件。物理 `damping` 係數不是 damping ratio；勿混用兩者的數字。
- 裝飾性的指標追蹤（游標傾斜、視差）經 spring 平滑（例：stiffness 100、damping 10）；原始 1:1 對應感覺機械。功能性資料顯示不加此類動效。
- 2D 動效用獨立的 X 與 Y spring；對距離用單一 spring，會在兩軸速度不同時失去同步。

## 6. Materials and depth

判斷既有的半透明表面；把不透明的外框改成半透明屬改版 **[report-only]**。

- 不要把淺色半透明表面疊在另一個上；可讀性會崩壞。讓其中一層變實心。
- blur 上的文字：不用單調的中灰；提高對比、字重稍增、字距略加（下限：ux-rules §13）。顏色放在實心層。
- 較大的表面比 chip 看起來更厚（blur 更強、陰影更深）；陰影在繁忙內容上較重、在單純內容上較輕。
- Modal 任務 → 調暗 scrim、把背景往後推。非阻擋的並行面板 → 用半透明或位移、不加 scrim，免得打斷流程。
- 玻璃表面進場時 blur 與 scale 一起動畫，而非只動 opacity，讓它讀起來像材質到來（留意 blur 成本）。
- 遵守 `prefers-reduced-transparency: reduce`（不透明背景、無 blur）與 `prefers-contrast: more`（近乎實心背景、明確邊框）；半透明正是這些使用者最先失去可讀性之處。
- 捲動內容上方的 sticky header：短的淡出或 blur 遮罩勝過 1px 分隔線 **[report-only]**。

## 7. Motion performance

見 `motion-audit.md` §A 與 `motion-review.md` 3.7。

## 8. Reduced motion and comfort

- Reduced motion：見 ux-rules §12 與 §7。是更溫和，不是沒有。
- 避免全視窗移動背景，以及接近 0.2 Hz（約每 5s 一圈）的慢速循環；兩者都會造成前庭不適。主題切換要做緩和過渡，不要亮度跳變。

## 9. Static design: intent over template

可量測的檢查在 `criteria.md`；本節判斷意圖。專案 DESIGN.md 或 tokens 刻意選擇的特徵不算 gap。

可修正：

- 區段間距不一致，常源於選擇器優先序衝突（區段 class 與元素 class 都設 padding/margin）。修源頭；再加一層覆寫只會讓問題惡化。
- 襯線正文的 line-height 比無襯線稍大，仍在 criteria.md 範圍內。
- 結果沿用動作的動詞（按鈕「Publish」→ toast「Published」），讓詞彙教會流程（ux-rules §11）。空狀態指向下一步動作；錯誤說明發生什麼與如何修正，不道歉（ux-rules §4、§6）。

**[report-only]**，各附具體替代方案（元素、數值、位置），不寫「讓它更有辨識度」：

- 模板特徵（預設而非選擇）：奶油 ~#F4F1EA + 高對比襯線 + 赤陶 ~#D97757；近黑 + 單一酸綠或朱紅強調色；報紙細線、零圓角、密集欄位；SaaS 卡片套組（相同圓角卡片、各層級共用一種 radius、同一個 `rgba(0,0,0,.1)` 陰影、漸層底）；模板外框（每個標題上方加字距拉開的全大寫 eyebrow、`A · B · C` meta、`WORD — fragment` 標籤、以 #0B0B0B/#111 當黑、等寬資料標籤、連結與按鈕後附 `→`）。
- 標題中的單一詞以斜體、粗體或顏色強調；全大寫標籤；內容上方沒有增加資訊的標籤行。
- 在非序列內容上加編號標記（01 / 02 / 03）或其他結構裝置；邊框、分隔線、eyebrow 與數字應編碼資訊，不是裝飾。
- Hero 預設為大數字 + 小標籤 + 統計 + 漸層強調；建議改以主題最具代表性的東西開場（真實內容、live demo、圖像）。
- 每個區段都淡入上滑、每張卡片都有 hover transition，讀起來像生成的；建議每頁一個精心編排的時刻。移除階段只移除未通過 section 1 頻率或目的測試的部分。
- 字型是預設而非為主題挑選；兩個字族應明顯有別；顯示字體作為主動的設計元素。
- 大膽的處理四處散布：建議一個令人記住的元素、周圍一切安靜，並每個畫面移除一個裝飾元素。
- 標籤以系統內部命名，而非使用者管理的對象（「webhook config」對「notifications」）。

以慢 2–5 倍的播放或逐格驗證改動過的動效。觸控手勢需要真機；沒有真機則標為 未驗證。
