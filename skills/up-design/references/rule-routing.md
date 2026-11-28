# Rule writing

把使用者的設計修正轉成下一個 agent 會讀的規則：**lint 檢查、DESIGN.md 或專案 skill**。up-design 直接寫入、不停下來等核准；每項變更都列在報告中，使用者可檢視或還原。

## Contents

1. Principles
2. Collect, filter, generalize
3. Choose the write location
4. DESIGN.md format
5. Project skill format
6. Make sure the rules get read
7. Lint detection, writing and checking
8. Examples

## 1. Principles

使用者做的每次修正，都是 agent 缺少的品味。不寫下來，下個 session 會重蹈覆轍。本步驟只寫規則；絕不更動元件程式碼（範圍內檔案的 lint 修正例外，見表）。

1. **只寫使用者的品味。** 規則必須能追溯到使用者說過、改過或確認過的東西。agent 自認為「良好實務」的規則不寫，即使它來自 review 的阻擋，或本輪反覆出現的問題：那是 agent 的品味，而使用者才是糾正者。這類候選列入「建議規則（未寫入）」，附建議位置與內容；使用者之後再採用。
2. **絕不捏造 why。** 使用者的理由以其原話記錄。沒有理由時，寫你最合理的候選並標 `*推論*`，列入報告待日後確認。錯誤的 why 比沒有更糟：下一個 agent 會把該推理延伸到不適用的情況。
3. **檢查勝過一句話。** 比對程式碼就能抓到的違規（禁用的值、該用 token 卻寫 raw hex、禁用的屬性）要變成 lint 規則，因為機器檢查每次都會跑，而長檔案中的一句話在 context 滿時會被跳過。DESIGN.md 也留一行規則，記錄 why。
4. **為不在場的 agent 而寫。** 不寫「如我們討論的」或「先前那張卡片」；要點名元件 class、數值、token、檔案。
5. **沒表達偏好 → 沒有規則。** 使用者沒表達設計偏好的一輪什麼都不寫；這是正常結果，不是失敗。

lint 規則在既有程式碼中發現違規時的處理：範圍內檔案 → 修正；範圍外 → 把規則設為 warn，並在報告記錄數量。CLAUDE.md / AGENTS.md 指向 DESIGN.md 的指標直接加入（section 6）。

## 2. Collect, filter, generalize

**Collect.** 從第一輪起讀本次對話。明確修正是少數；五種訊號都要找：

| 訊號                   | 範例                                                                                         | 告訴你什麼                                |
| ---------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 明確修正               | "No, semi-transparent shadow, not a border"                                                  | 規則，常附 why                            |
| 無聲編輯               | 使用者把你寫的檔案中的 `duration: 400` 改成 `200`（外部變更通知，或與你上次寫入內容的 diff） | 你的預設錯了；他們的值就是規則            |
| 反覆微調               | "Smaller." → "Still too big." → "Ok"                                                         | 記錄他們最後落在哪，不記步驟              |
| 還原或拒絕             | "Undo that"，選 B 方案而非 A                                                                 | 不該做什麼；通常缺 why，所以標 `*推論*`   |
| 確認過的非顯而易見選擇 | "Yes, keep the icon outside the button"                                                      | 僅當全新的 agent 可能會做不同選擇時才記錄 |

附在 up-design 觸發上的偏好也算（例：「跑 up-design，另外 hover 不要用 transform」）。擷取原話或 diff、你做了什麼、他們要什麼，以及給過的理由。非品味的略過：功能 bug、單一畫面的內容（"the headline should say Pricing"）、對任務理解的更正。

**Filter.** 在本 repo 建構一個_不同_元件的全新 agent，會犯同樣的錯嗎？

- 不會（一次性：這次活動的顏色、這個頁面的版面）→ 略過。
- 既有規則（DESIGN.md、CLAUDE.md / AGENTS.md、專案 skill）說了同樣的事卻仍被違反 → 規則太弱；改寫得更嚴（數值、token、「一律」），不要加重複條目。
- 與既有規則矛盾 → 把舊規則改寫成本輪的結論，並在報告列為「衝突」。
- 其他情況成為規則；若比對程式碼能抓到，也加 lint 檢查。

**Generalize.** 選最窄、但能在下一個不同元件上防止該錯誤的層級：

| 層級      | 範例                                                                              | 判定                             |
| --------- | --------------------------------------------------------------------------------- | -------------------------------- |
| Instance  | "The pricing card gets a shadow, not a border"                                    | 太窄：只保護一張卡片             |
| Class     | "Raised surfaces (card, popover, menu) use `shadow-raised`, never a solid border" | 寫這個                           |
| Universal | "Never use borders"                                                               | 太廣：會破壞 input、分隔線、表格 |

同一個修正發生在兩個以上不同元件，是 class 層級的證據。用本 codebase 實際的值與 token 名稱；用「一律」「不要」，不用「盡量」「建議」（僅當使用者把它框成偏好時才用較軟的措辭）。

**寫入前自我測試：** 只讀規則與其 why，想像原本的任務。若一個不知道其他背景的 agent 仍可能做出錯誤版本，規則就太模糊；補上數值、token 或例外。

## 3. Choose the write location

```
能用比對程式碼的方式抓出違規？（禁用的值、該用 token 卻寫死、禁用的屬性）
├── 是 → lint 規則（見第 7 節），另在 DESIGN.md 對應段落寫一行規則記錄 why
└── 否
    ├── DESIGN.md 該段落超過約 40 行，而且只和部分任務有關？
    │   （例：動態規則和做設定表單無關）
    │   └── 是 → 把整個段落搬到 project skill（見第 5 節），DESIGN.md 留一行指向它
    └── 預設 → 寫入 repo 根目錄的 DESIGN.md 對應段落
```

DESIGN.md 的區段固定：**Surfaces · Color · Typography · Spacing & layout · Motion · Interaction · Copy**。DESIGN.md 或該區段不存在 → 建立；骨架在 `assets/design-md-template.md`。

## 4. DESIGN.md format

每條規則：粗體規則、一行 `Why:`、一則含日期與來源的註解。

```md
## Motion

- **Modal 進場使用 ease-out，時長 200ms 以內。**
  Why: modal 是使用者主動觸發的，慢的進場會讓操作感覺遲鈍。
  <!-- 2026-11-23：「modal 開太慢了」 -->
```

- why 由使用者提供 → 用其原話；否則寫最合理的推測，並以 `*推論*` 開頭
- 註解記錄日期與使用者原話（或所做的編輯），日後衝突時才能看出哪條規則較新、使用者實際說了什麼

## 5. Project skill format

路徑：`.claude/skills/design-<section>/SKILL.md`，例：`.claude/skills/design-motion/SKILL.md`。骨架在 `assets/project-skill-template.md`。

- description 寫明何時讀取（例：「在這個專案建立或修改動畫、transition、gesture 時讀取」），agent 才只在相關任務載入
- 區段原文照搬，保留每條規則的 Why 與註解
- DESIGN.md 在舊區段留一行：`動態規則見 .claude/skills/design-motion/SKILL.md`

## 6. Make sure the rules get read

沒有 agent 會讀的 DESIGN.md 等於沒寫。寫完 DESIGN.md 後，檢查專案的 `CLAUDE.md` 或 `AGENTS.md`（兩者都有則都查）是否指向它。若否，把這行附加到檔案結尾：

```md
Before building or changing UI, read DESIGN.md.
```

兩個檔案都不存在 → 建立 `CLAUDE.md`，內容僅此一行。這是 up-design 唯一會編輯 CLAUDE.md / AGENTS.md 的情況。

## 7. Lint detection, writing and checking

**絕不安裝新的 lint 工具或外掛。** 那會改動專案依賴，超出本 skill 的職責。專案中沒有合適的 lint 工具 → 只寫 DESIGN.md，並把建議的 lint 設定附在報告的「規則變更」。

### Detection

找出 linter 設定（ESLint、Stylelint、Biome、Oxlint：任何設定檔或 `package.json` key）及其執行指令（`package.json` scripts 的 `lint`、`lint:css`、`lint:style`、`lint:js`，否則直接呼叫如 `npx eslint .`），套件管理器依 lockfile 判斷。

### Check after writing

| 結果                            | 動作                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| 設定無效（解析失敗、未知規則）  | 還原；只保留 DESIGN.md 規則；把建議設定附在報告             |
| 範圍內程式碼有錯誤              | 修程式碼                                                    |
| 範圍外的舊程式碼有錯誤          | 把規則設為 warn；記入「未解決」並附違規數量                 |
| Lint 無法執行（缺依賴、無指令） | 不寫 lint；只寫 DESIGN.md；把建議設定附在報告並標「未驗證」 |

無法執行 → 不寫，因為無法確認設定有效，錯誤的 lint 設定可能直接讓 CI 失敗。範圍外的錯誤降為 warn，免得一條新規則讓整個專案的 lint 失敗。編輯既有設定時，維持其原有格式與註解風格。

### Common built-in rules

不確定規則名稱或選項格式 → 用工具本身（`npx stylelint --print-config <file>`、`npx biome explain <rule>`）或官方文件確認；絕不憑記憶寫。

| Tool      | Rule                                         | 適用                                                        |
| --------- | -------------------------------------------- | ----------------------------------------------------------- |
| Stylelint | `declaration-property-value-disallowed-list` | 禁用 `transition: all`、禁用特定 easing                     |
| Stylelint | `property-disallowed-list`                   | 禁用某些屬性                                                |
| Stylelint | `declaration-property-unit-allowed-list`     | 限制 duration 單位                                          |
| Stylelint | `declaration-property-value-allowed-list`    | 只允許特定值或 CSS 變數                                     |
| ESLint    | `no-restricted-imports`                      | 統一函式庫（例：禁用 `framer-motion`，改用 `motion/react`） |
| ESLint    | `no-restricted-syntax`                       | 以 AST selector 禁用特定寫法                                |
| Biome     | `noRestrictedImports`                        | 限制函式庫；其規則群組隨版本變動，用 `biome explain` 確認   |

Tailwind 專案把許多樣式放在 className，CSS lint 看不到。這類規則（例：禁用 `transition-all`）通常只寫在 DESIGN.md；僅當專案已有可用的 ESLint Tailwind 外掛時才考慮使用。

## 8. Examples

**範例 1：可機械檢查，lint 可執行**
使用者說：「不要再用 transition: all 了」
→ 寫 Stylelint 設定（與既有 `rules` 合併）：

```json
{
  "rules": {
    "declaration-property-value-disallowed-list": {
      "transition": ["/\\ball\\b/"]
    }
  }
}
```

→ 在 DESIGN.md › Motion 下加一行：

```md
- **不要使用 `transition: all`，列出實際要動的屬性。**（由 Stylelint 檢查）
  Why: `all` 會連帶動到不該動的屬性，也容易觸發 layout。
  <!-- 2026-11-23：「不要再用 transition: all 了」 -->
```

**範例 2：可機械檢查，lint 無法執行**
同一條規則，專案沒裝依賴 → 只寫 DESIGN.md › Motion；把範例 1 的 Stylelint 設定附在報告並標「未驗證」。

**範例 3：不可機械檢查**
使用者說：「hover 不要用 transform，手機點完會卡住」
→ DESIGN.md › Interaction：

```md
- **hover 狀態不使用 transform（位移、縮放）。**
  Why: 觸控裝置沒有 hover，點擊後 transform 會殘留在畫面上。
  <!-- 2026-11-23：「hover 不要用 transform，手機點完會卡住」 -->
```

→ CLAUDE.md 沒有指向 DESIGN.md 的指標 → 加上 `Before building or changing UI, read DESIGN.md.`

**範例 4：agent 自己發現的問題**
motion-review 擋下某 modal 的 `ease-in` 三次，但使用者沒說任何相關的話
→ 修程式碼；不寫規則。列入「建議規則（未寫入）」：「Modal 進場使用 ease-out」，建議位置 DESIGN.md › Motion

**範例 5：區段太長**
DESIGN.md › Motion 已有 45 行，且只與動畫任務有關 → 把整個區段搬到 `.claude/skills/design-motion/SKILL.md`；DESIGN.md › Motion 留一行指向它；新規則寫進該 skill。
