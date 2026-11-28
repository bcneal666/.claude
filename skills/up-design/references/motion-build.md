用於 up-design step 3.3 的 IMPLEMENTATION：診斷完成且修正清單寫好之後；不得用來診斷或尋找新動效。
只建構或重調修正清單上的動畫項目；有衝突時，專案規則優先，其次是 ux-rules §7 與 §12。

# Motion build

Contents: Ground rules · A. Decision order · B. Choreography · C. Gestures · D. Recipes

## Ground rules

- 不新增依賴：CSS、WAAPI、原生 pointer events，或 `package.json` 中已有的動效函式庫。需要更多的（動畫函式庫、手勢或 bottom-sheet 套件、新元件）→ 「未解決」並附建議做法；做到一半能用的手刻，比誠實標出缺口更糟。
- 用專案的 easing 與 duration tokens；都不合 → 就地寫 A5 的 literal，不另建平行的 token 組。
- Spring 只用於 drag 或 fling 放開。點擊開啟或關閉的元素用曲線、不彈跳：沒有施力，過衝會被讀成故障。
- Reduced motion 與 hover 設閘隨動畫一起交付。
- `@starting-style`、view transitions、scroll-driven animation → 先查 modern-web-guidance（`references/modern-web-guidance.md`）。

## A. Decision order

A1 與 A2 為所有事項的閘門；零行程式碼也是有效結果。

**A1. 該不該動畫？** 依頻率：

- 100+/天或鍵盤觸發（快捷鍵、command palette）：不加動畫。
- 數十/天（hover、列表導覽）：只有幾乎察覺不到的按壓/hover 回饋；tab 內容與列表列切換無進場/退場（ux-rules §12）。
- 偶爾（dialog、drawer、toast）：標準動畫。
- 罕見或首次（onboarding、成功）：允許愉悅感。

未通過閘門 → 讓變化立即發生，並在報告註明原因。

**A2. 目的。** 點出其一：回饋、空間一致性、狀態指示、避免突兀變化、說明（行銷/onboarding）、愉悅（僅罕見層級）。都不合 → 不要做。使用者閱讀或操作的資料不為風格而動。

**A3. 工具，最便宜的優先。** 遇到第一個合適的就停。

1. CSS transition：hover、按壓、顏色、class 或屬性切換。
2. `@starting-style`：掛載時進場，不需 JS state。
3. 對 `transform`/`opacity` 的 CSS `@keyframes`：預先決定、在繁忙頁面上必須保持流暢的動效（由 compositor 執行；rAF 迴圈會掉幀）。
4. WAAPI `element.animate()`：以 CSS 的成本做程式化控制。
5. Spring、FLIP layout 動畫、卸載節點的退場、手勢驅動的值：已安裝的函式庫；沒有 → 下面的 CSS/WAAPI 路徑，否則 「未解決」。

無函式庫的退場：為基礎元件暴露的關閉狀態設樣式（`data-closed`、`data-ending-style`、`data-state="closed"`），或讓節點保持掛載並帶 `leaving` 旗標，直到動畫 `finished`。兩者都不行 → 「未解決」。

**A4. 屬性。**

- `transform` 與 `opacity` 跳過 layout 與 paint；也允許 `clip-path`；`height` 只用於 accordion，且保持短。點名每個屬性；不用 `transition: all`。
- 不用 `scale(0)`；沒有真實的東西從無到有。從 `scale(0.95–0.97)` + `opacity: 0` 開始。
- 錨定的 popover、menu、tooltip：`transform-origin` 透過基礎元件的 variable 放在觸發器（Base UI `--transform-origin`、Radix `--radix-<component>-content-transform-origin`）。Modal 保持置中。
- `translateY(100%)` 依元素自身高度移動；優先於寫死的 px。
- 在移動的元素本身設 `transform`；父層的 CSS variable 會讓每個後代重算樣式。

**A5. 曲線與 duration。** 專案沒有 token 時的 literal：

- 進場/退場，預設：`cubic-bezier(0.23, 1, 0.32, 1)`
- 螢幕上移動或 morph：`cubic-bezier(0.77, 0, 0.175, 1)`
- 貼邊 sheet（iOS drawer）：`cubic-bezier(0.32, 0.72, 0, 1)`
- 浮動 drawer：`cubic-bezier(0.165, 0.84, 0.44, 1)`
- Hover 或顏色：`ease`。等速動效、進度、長按填充：`linear`。

UI 上不用 `ease-in`：它延遲了使用者注視的那一刻。內建的 `ease-out` 對刻意設計的動效太弱。其他曲線取自 easing.dev 或 easings.co，不要手調。

| Element         | Duration  | Curve      |
| --------------- | --------- | ---------- |
| Press           | 100–160ms | ease-out   |
| Tooltip         | 125–200ms | ease-out   |
| Dropdown        | 150–250ms | ease-out   |
| Modal           | 200–500ms | ease-out   |
| Edge sheet      | 500ms     | iOS drawer |
| Floating drawer | ~200ms    | floating   |
| Toast           | ~400ms    | `ease`     |
| Marketing       | longer    | ease-out   |

UI 保持在 300ms 以下；modal、drawer 與 toast 為例外。

Spring（僅限已安裝的函式庫）：`{ type: "spring", duration: 0.5, bounce: 0.2 }`。Bounce 在 drag 之後為 0.1–0.3，其他情況為 0；較小的元素需要更多 bounce 才讀起來一樣。感覺不對的 spring 通常需要更多阻尼。

**A6. 中斷。**

- 任何被快速重複觸發的東西（toast、toggle）用 transition：它們從當前值重新定向，而 keyframes 從零重來。手勢可能碰到的東西一律不用 keyframes。
- WAAPI：開始新動畫前先 `old.commitStyles(); old.cancel();`，讓它從畫面上的值起步。

**A7. 退場。**

- Overlay 與容器內的 view 依來時的方式離開（ux-rules §7）；頁面轉場僅進場（ux-rules §12）。
- 退場更短、更簡單、同時進行；不做反向 stagger，因為使用者已決定要離開。
- 使用者做決定處採非對稱：長按填充 2s linear，放開 200ms ease-out。

**A8. Reduced motion 與 hover 設閘。** Reduced motion = 僅淡入（ux-rules §12），時序相同：transition 只保留 `opacity`；keyframe 進場把 `animation-name` 換成僅 opacity 的 `fade`。

```css
@media (prefers-reduced-motion: reduce) {
  .panel {
    transition-property: opacity;
  }
}
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    transform: translateY(-2px);
  } /* touch fires false hovers */
}
```

## B. Choreography

適用於一個事件上有兩個以上元素在動。削減移動的部分，其餘並行；只有順序有意義時才排序（閱讀順序、因果、某物先到）。

**為每個移動元素分角色。** Lead（唯一要被注意的）：最先動、移動最遠。Support（副標題、CTA、列表其餘部分）：隨後，動作較小。Decoration（pill、badge、分隔線）：僅淡入，或不動。Static：其餘一切，包括內容在動畫的容器。兩個 lead = 動效無法解決的層級問題 → 「設計建議（未套用）」。

**什麼保持不動。**

- 每個容器一次進場：面板若滑入，其內容已在那裡。父層進場加子層 stagger 會讓使用者兩段都得等。
- 高頻或鍵盤 UI（dropdown 項目、選單列、command palette、tab 內容、列表列）不做 stagger：它只愉悅一次，卻拖慢之後每次使用。

**每一對的關係。**

- Together（預設）：同一物件或時刻，或順序無意義。同時開始、同一時序家族。
- Overlap：順序有意義且兩者同時可見沒問題 → stagger。
- Sequence：重疊看起來會壞（一個元素穿過另一個；容器內兩個豐富 view 的寬高都在變）。讓第二個在第一個結束前約 100ms 開始，讀起來才像一個手勢；用 `forwards`/`both` 保持終態。
- Carry：無法控制子層的動效 → 動畫它的父層，讓子層隨之而行。

**Stagger 數值。**

- 產品 UI：間隔 30–80ms，整組 ≤ ~300ms。長列表只對前 ~5 項 stagger；其餘共用第 5 項的 delay。
- 行銷或首次執行：在 0.5–0.6s 的進場上以 100–150ms 為一步。
- 間隔相等讀起來像節拍器。縮小間隔（產品：0、50、90、120ms），並依角色改變距離：lead ~12px、support 6–8px、decoration 僅淡入。
- 依重要性排序，不依 DOM；標題與第一段可共用第 0 步。方向跟隨閱讀順序，或從互動點向外輻射。
- 一旦可見就都可點擊。

**時序家族與同步。**

- 同一元件的子動畫共用一個 duration 與 easing 家族，在 custom property 中一次設定；drawer 以 500ms 開啟卻以 200ms 調整大小，讀起來像兩個物件。內層內容可用同家族中較輕的曲線。
- 把 support 動效掛在 lead 的某個時刻（開始、撞擊、落定），不要猜 delay。強調動效落在 lead 的最後 ~20%，最重要的先，其他落後 ~40ms。
- 與起因同步：脈動在點擊時觸發，不是在之前的 hover 時。重複的動作跳過鋪陳。

**容器內的 View 切換。**

- Crossfade：舊 view 離開的同時新 view 進場。把舊 view 以 absolute 釘在原位並淡出，新 view 從 `scale(0.96)` 淡入（D6）。
- 高度也在變：依距離縮放淡入時間，`min(max(Δheight / 500, 0.15), 0.27)` 秒，讓微小的跳動不閃爍。
- 兩個豐富狀態的兩個維度都在變 → sequence：舊 view 先完成離開。
- 狀態很少 → 每個轉場寫死數值，不用公式。
- 小容器或相似 view → 以 8px 位移加輕微 blur 做 crossfade，不做完整 slide。
- Wizard 步驟：Next 把內容往左移，Back 往右移。

**元素離開，同層元素補位。** 移除的那一刻就把它拿出 flow，讓同層元素在它淡出時滑入；否則缺口在退場之後才補上，停頓感覺很慢（D6）。

**中斷。** 序列中途重新觸發（hover 到一半移出、快速按兩次 Next）要先停掉進行中的動畫；絕不疊加。全部落定後才串接：`await Promise.allSettled(el.getAnimations({ subtree: true }).map((a) => a.finished))`。快速切換不得讓兩個 view 同時掛載；key 保持穩定且唯一。

**閒置循環。** 載入後 ~2.5s 首次執行，每 ~6s 重複，互動期間暫停，重置完成後才恢復。

**Reduced motion** 會收合 choreography：無 delay、無位移、僅 opacity、全部同時。逐步說明的動效改為在各畫格間直接跳。

## C. Gestures

政策是 ux-rules §7。範圍內：調校既有的 Drawer/sheet（例：Vaul）或專案已有的手勢程式碼；純 CSS 手勢（長按確認、按壓、`touch-action`、`overscroll-behavior: contain`）；已安裝動效函式庫的 drag props。新的 drag 或滑動關閉、snap-point sheet、動量 fling、拖曳排序與滑動卡片列入 「未解決」並附建議的元件或套件：它們需要把動量、感知速度的關閉、focus trap 與 Escape 做對。

**Track（pointer down）：元素就是手指。**

- 拖曳時以 `transition: none` 做 1:1；任何 easing 或 spring 都會讓它落後手指。
- 在 `pointermove` 中直接在元素上寫 `transform`。不要每次移動都動框架 state（重新渲染會掉幀），也不要在父層用繼承的 variable（它讓 Vaul 在超過 ~20 項後延遲）。
- 開始時 `setPointerCapture`；拖曳中忽略額外的 pointer，換手指才不會跳動。保留抓取偏移；把元素中心吸到 pointer 會破壞直接操作。
- 移動約 10px 之後才確定方向，點擊與捲動才不會被誤判為拖曳。
- `touch-action` 只把拖曳軸交給 JS：垂直拖曳 `pan-x`、自由拖曳 `none`。可拖曳 sheet 內的控制項不啟動拖曳（Vaul：`data-vaul-no-drag`）。
- 連動的值在同一個 handler 中由拖曳進度算出（`overlay.style.opacity = 1 - y / height`）；各自獨立的動畫一旦被中斷就會漂移。
- 超過邊界時阻力上升，而不是一堵牆：`rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))`（Motion：`dragElastic={0.2}`）。

**Release（pointer up）：由物理收尾。**

- 速度取自最後幾個 `pointermove` 樣本（位置 + 時間戳），不是當前點。
- 依距離或速度關閉：超過行程的 40–50%，或快速甩動，即平均 `|distance| / elapsed > 0.11` px/ms（Sonner）或 `info.velocity > 500` px/s（Motion）。只看距離會讓甩動感覺被忽略。
- Snap points：選最接近預測停止點的，不是放開點。預測停止點 = `current + (v / 1000) * d / (1 - d)`，`v` 單位 px/s，`d = 0.998`。
- 無函式庫：從當前位置以 transition 收尾，貼邊 sheet 在 iOS drawer 曲線上 500ms（其陡峭起步讓 500ms 仍俐落），浮動 drawer ~200ms；overlay opacity 用同一 duration 與曲線。
- 已安裝函式庫：以放開速度為種子的 spring，bounce 0.1–0.3。當它應停在手指停下處，或 `onDragEnd` 交給自己的 spring 時，用 Motion `dragMomentum={false}`。
- 低於門檻時快速彈回（~200ms ease-out）；緩慢的返回感覺像 UI 在爭辯。
- 方向反轉時，在重新定向時帶著速度；直接切到新動畫會撞上速度的「牆」。

**中途攔截。** 在 `pointerdown` 讀取即時位置（y 用 `new DOMMatrix(getComputedStyle(el).transform).m42`），設 `transition: none`，以 inline 寫入，並從那裡開始追蹤。

## D. Recipes

`var(--ease-*)` = 專案 token 或 A5 literal。狀態 selector（`[data-starting-style]`、`[data-ending-style]`、`[data-closed]`）代表專案的基礎元件所暴露的任何對應物。每個配方都附帶 A8 的分支。

**D1. 按壓。** `:active` 在觸控上就是真實的按壓，所以不設 hover 閘。
`:active` 上 `transform: scale(0.97)`，`transition: transform 160ms var(--ease-out)`。

**D2. Popover、dropdown、tooltip、modal。**
`transform-origin: var(--transform-origin)`；`opacity` 與 `transform` 以 200ms `var(--ease-out)` transition；起始/結束狀態（`[data-starting-style]`、`[data-ending-style]`）為 `opacity: 0` + `scale(0.95)`。
Tooltip：125ms 與 `scale(0.97)`；一個開啟後，相鄰的無 delay 開啟，且 `transition-duration: 0ms`。Modal：250ms、`scale(0.96)`、`transform-origin: center`，backdrop opacity 用同一個 250ms，讓兩者讀起來是同一個表面。

**D3. 無 drag 的 drawer。** 浮動 drawer：在 floating 曲線上 200ms，overlay 包含在內。Reduced motion：關閉狀態 = `opacity: 0`，無位移。
貼邊 sheet：`transform` 500ms `var(--ease-drawer)`，關閉狀態 `translateY(100%)`（`[data-closed]`）。

**D4. Toast**（僅限沒有 toast 函式庫時；Sonner 專案調校 Sonner）。400ms 的 `ease` 比 UI 預算更適合 toast。沒有 `@starting-style` → 掛載後設 `data-mounted` 旗標。堆疊 toast 的 reflow：對照錄影調整 opacity 與 height。

```css
.toast {
  transition:
    opacity 400ms ease,
    transform 400ms ease;
}
@starting-style {
  .toast {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

**D5. Accordion。** `overflow: hidden` + `transition: height 200ms, opacity 200ms`，用 ease-out 曲線，到量測過的高度（JS，或基礎元件的，例：`--radix-accordion-content-height`），絕不用 `auto`。它每幀都耗 layout，所以保持短。

**D6. 離開時同層補位**（也用於 view 切換），WAAPI FLIP。在框架中，讓項目保持掛載並帶 `leaving` 旗標，呼叫此函式，並在 `onDone` 中從 state 移除。Reduced motion：跳過同層的 FLIP，僅淡入。

```js
function leave(el, onDone) {
  const sibs = [...el.parentElement.children].filter((n) => n !== el); // parent: position: relative
  const first = sibs.map((n) => n.getBoundingClientRect());
  el.style.cssText += `position:absolute;top:${el.offsetTop}px;left:${el.offsetLeft}px;width:${el.offsetWidth}px`;
  const opts = { duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" };
  sibs.forEach((n, i) => {
    const r = n.getBoundingClientRect();
    const t = `translate(${first[i].left - r.left}px, ${first[i].top - r.top}px)`;
    n.animate({ transform: [t, "none"] }, opts);
  });
  const out = { ...opts, fill: "forwards" }; // stays hidden until onDone re-renders
  el.animate({ opacity: [1, 0], scale: [1, 0.95] }, out).finished.then(onDone);
}
```

**D7. Stagger**（一次性進場，絕不用於高頻列表）。每項以縮小的間隔 inline 設 `--delay`（B）。`both` 讓有 delay 的項目保持隱藏，而不是閃現終態。
每項 `animation: enter 0.3s var(--ease-out) both`，`animation-delay: var(--delay, 0ms)` 以 inline 設定；`@keyframes enter` 從 `opacity: 0; transform: translateY(8px)` 開始。

**D8. 長按確認。** 用 `linear`，因為填充就是進度。當填充的 `transitionend` 在仍按住時觸發，於 JS 中提交。

```css
.hold .fill {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms var(--ease-out);
}
.hold:active .fill {
  clip-path: inset(0);
  transition: clip-path 2s linear;
}
.hold:active {
  transform: scale(0.97);
}
```

**D9. 較小的項目。**

- Tab 指示器同步：複製 tab 列並設為 active 樣式，裁切到 active 的 tab，`clip-path: inset(0 var(--r) 0 var(--l))` 搭配 `transition: clip-path 250ms` ease-in-out（`--l`/`--r` inline 設在副本上）；文字與背景一起變化。
- 捲動揭示（僅行銷）：`clip-path: inset(0 0 100% 0)` → `inset(0)`，600ms ease-in-out，由 `IntersectionObserver` 一次性設 `data-visible`；不要每次捲動都重播。
- 先畫、再打勾（sequence）：`pathLength="100"`，兩條 path 都 `stroke-dasharray: 100; stroke-dashoffset: 100`，以 `forwards` 動畫到 `0`，曲線 `cubic-bezier(0.645, 0.045, 0.355, 1)`：方框 0.6s，勾 0.4s、delay 0.5s。
- 無法落定的 crossfade：切換中途 `filter: blur(2px); opacity: 0.7`，200ms `ease`，把兩個物件融成一個；blur 低於 20px（Safari 成本高）。

**Only if already installed.**

- Motion：`AnimatePresence mode="popLayout"` + `layout` 用於離開補位與 view 切換；`mode="wait"` 用於兩個豐富狀態雙向調整大小；缺少 `key` 是退場不播的原因。感知方向的步驟在 `AnimatePresence` 與子層都傳 `custom={direction}`。不均勻 stagger：`delayChildren: stagger(0.06, { ease: "easeOut" })`（舊版：`staggerChildren`）。Drag：`drag="y"`、`dragConstraints`、`dragElastic={0.2}`、`onDragEnd` 讀 `info.offset` 與 `info.velocity`；連動值經 `useMotionValue` + `useTransform`。
- Vaul：浮動 drawer 覆寫為 200ms（D3）；互動子層加 `data-vaul-no-drag`。
