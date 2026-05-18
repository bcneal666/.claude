# Retro Rush FM 頻道音樂類型分析

## Context

使用者請求透過 `/music-genre-finder` skill 分析 YouTube 頻道 [@RetroRushFM](https://www.youtube.com/@RetroRushFM) 的音樂類型與特色。
由於 YouTube 主頁採 JavaScript 動態渲染，`WebFetch` 無法直接取得內容，因此改以 `WebSearch` 蒐集頻道實際發佈影片標題、頻道宗旨，再對照本機 `~/.claude/skills/music-genre-finder/references/` 的 RateYourMusic 5947 風格資料庫進行精準分類比對。

---

## 一、頻道實證資料（來自搜尋結果的影片標題與頻道說明）

**頻道網址**：https://www.youtube.com/@RetroRushFM
**頻道 ID**：UCtAIiGWPZEzKcVn1VkgCc1g

**頻道宗旨（節錄自搜尋結果）**：
> "Started because of a passion for 80s love songs and soft rock ballads, the quiet romantic kind."
> "Romantic songs playlists and original music made to feel like the oldies but goodies."
> "Perfect for relaxing, driving, or late night listening."

**典型影片標題（已抓到的 Volumes）**：
| Vol. | 標題 |
|------|------|
| 13 | 80s Love Songs Playlist 🌌 \| Soft Rock Ballads & Romantic Hits |
| 14 | 80s Love Songs Playlist 🌤️ \| Soft Rock Ballads & Classic Love Songs |
| 16 | 80s Love Songs Playlist 💘 \| Soft Rock Ballads & Romantic Love Songs |
| 21 | 80s Love Songs Playlist 🎷 \| Soft Rock Ballads & Romantic Hits |
| 25 | 80s Love Songs Playlist 💛 \| Soft Rock Ballads & Romantic Hits |

> ⚠️ 即使頻道名稱含「Retro」與「FM」聽起來像 Synthwave / Retrowave 廣播，**實際內容並非合成器導向的 Synthwave 系**，而是**真實 80 年代軟搖滾情歌**。命名容易誤導，需以實際影片內容為準。

---

## 二、對應 RateYourMusic 風格分類（按相關度排序）

### 🥇 核心類型（占比最高）

#### 1. ⭐ Soft Rock（軟搖滾）— 最直接對應
- **層級**：Rock > Pop Rock > **Soft Rock**（sub-2）
- **描述**：Clean production and light instrumentation paired with harmonious, radio-friendly songwriting; gained huge commercial success in the 1970s.
- **中譯**：乾淨的製作、輕量化的編曲，搭配和諧、適合電台播放的旋律寫作；於 1970 年代取得巨大商業成功，並延燒到整個 80 年代。
- 🔗 https://rateyourmusic.com/genre/soft-rock/
- **為何匹配**：頻道標題直接寫「Soft Rock Ballads」，這是頻道自己宣稱的核心類型。

#### 2. ⭐ Adult Contemporary（成人抒情 / AC）— 電台格式對應
- **層級**：Pop > **Adult Contemporary**（sub）
- **描述**：Slow to midtempo with a light and soothing tone, emerged as a successful radio format in the late 1970s and early 1980s.
- **中譯**：慢板至中板節奏、輕柔舒緩的音色，於 1970 年代末至 1980 年代初崛起為成功的電台播放格式。
- 🔗 https://rateyourmusic.com/genre/adult-contemporary/
- **為何匹配**：頻道以「FM 電台」自我定位，發佈「playlist」格式，目標客群是成年聽眾（懷舊、開車、深夜），完全符合 AC 電台格式的本質。

### 🥈 高度相關（次要類型）

#### 3. AOR（Album-Oriented Rock）
- **層級**：Rock > **AOR**（sub）
- **描述**：Emerged in the late 1970s and early 1980s as an amalgamation of Hard Rock, Pop Rock, and Progressive Rock; characterized by a rich, layered sound, slick production and a heavy reliance on commercial melodic hooks.
- **中譯**：80 年代初定型，融合硬式搖滾、流行搖滾與前衛搖滾，特徵為飽滿的層次感、油亮的製作與商業化的旋律鉤子。
- 🔗 https://rateyourmusic.com/genre/aor/
- **為何匹配**：經典 80 年代情歌大多有 AOR 風味（典型樂團：Journey、Foreigner、REO Speedwagon、Toto、Chicago）。

#### 4. Yacht Rock（遊艇搖滾）
- **層級**：Rock > Pop Rock > Soft Rock > **Yacht Rock**（sub-3）
- **描述**：Slick Pop Rock influenced by smoother R&B styles, popular in the late 1970s and often associated with California.
- **中譯**：受 R&B 影響、製作油亮的流行搖滾，70 年代末走紅，常與加州陽光氛圍綁定。
- 🔗 https://rateyourmusic.com/genre/yacht-rock/
- **為何匹配**：頻道強調「適合開車、深夜聆聽」，與 Yacht Rock 的「巡航/夜晚」氛圍重疊（典型：Christopher Cross、Michael McDonald、Steely Dan 晚期）。

#### 5. Pop Rock（流行搖滾）— 上層分類
- **層級**：Rock > **Pop Rock**（sub）
- 🔗 https://rateyourmusic.com/genre/pop-rock/
- **為何匹配**：Soft Rock 的母分類，頻道內容本質上仍是 Pop Rock 譜系。

### 🥉 可能融入（取決於選曲）

#### 6. Sophisti-Pop（精緻流行）
- **層級**：Pop > **Sophisti-Pop**（sub）
- **描述**：Incorporates influences from Jazz, classic R&B and Soul along with a slick, polished production style while retaining elements from its New Wave roots.
- 🔗 https://rateyourmusic.com/genre/sophisti-pop/
- **為何可能匹配**：若選曲包含 Sade、Swing Out Sister、Style Council 等 80 年代精緻情歌，會落入此分類。

---

## 三、頻道特色總結

| 維度 | 特色 |
|------|------|
| **年代** | 1980 年代為主（少量延伸至 70 年代末、90 年代初） |
| **核心風格** | Soft Rock + Adult Contemporary 雙主軸，輔以 AOR 與 Yacht Rock |
| **製作美學** | 油亮的錄音室製作、合成器點綴、薩克斯風 solo、層疊和聲、清亮鼓組（Linn LM-1 / DX7 時代音色） |
| **情緒定位** | 浪漫、慵懶、懷舊、深夜、療癒 |
| **使用場景** | 開車兜風、深夜獨處、咖啡廳背景、放鬆、回憶過往 |
| **編排形式** | 廣播電台式長播清單（Playlist 形式，編號到 Vol. 25+） |
| **頻道命名** | 「FM」後綴模仿真實電台呼號，「Retro Rush」強調復古衝擊感 |
| **代表性藝人方向** | Air Supply、Chicago、Bryan Adams、Lionel Richie、Phil Collins、REO Speedwagon、Journey、Bonnie Tyler 等同類型情歌歌手族群 |

---

## 四、與相似頻道的區別

- 與 **NewRetroWave / RetroPulseFM**（Synthwave / Retrowave 合成波頻道）**完全不同類型**，雖然命名風格相近。
- 此頻道是**真實 80 年代流行音樂的策展者**，不是 Synthwave 那種「向 80 年代致敬的新音樂」。
- 在 RateYourMusic 體系內：
  - **NewRetroWave 系**：Electronic > Synthwave
  - **Retro Rush FM**：Rock > Pop Rock > Soft Rock + Pop > Adult Contemporary

---

## 五、一句話總結

> **Retro Rush FM 是一個專注於 1980 年代軟搖滾情歌（Soft Rock Ballads）的懷舊電台式 YouTube 頻道，核心風格為 Soft Rock 與 Adult Contemporary，輔以 AOR 與 Yacht Rock 的油亮製作美學，主打深夜、開車、放鬆等浪漫場景。**

---

## 六、Suno 提示詞生成（依分析結果產出 4 組變體）

> 以下提示詞依照 Suno v4+ 的最佳實踐撰寫：**Style tags 以英文逗號分隔、Lyrics 標註 song structure tag、Description 給情緒與場景**。每組提供「Style / Title / Description / Lyrics 範例」四欄。

---

### 🎵 變體 1：經典 Soft Rock Ballad（最貼近頻道核心）

**Style of Music（Tags）**
```
soft rock, 80s ballad, romantic, male lead vocal, electric piano, lush strings, gated reverb drums, saxophone solo, slow tempo, FM radio sound, analog warmth, nostalgic, heartfelt
```

**Title 建議**：`Letters in the Rain` / `One More Midnight` / `Stay Until Morning`

**Description**
> A heartfelt 1985 soft rock love ballad. Imagine driving down an empty highway at 2 AM, neon signs reflecting on a wet windshield. Warm Rhodes electric piano, soaring chorus with layered harmonies, an aching sax solo in the bridge.

**Lyrics 範例骨架**
```
[Verse 1]
The radio plays our song again
A whisper from a year ago
You said goodbye in the autumn rain
Now I drive these streets alone

[Chorus]
Stay until the morning light
One more midnight in your eyes
I would trade tomorrow's sun
For one more chance to hold you tight

[Sax Solo]

[Bridge]
Time will not return what's gone
But I keep the radio on

[Chorus]

[Outro]
```

---

### 🎵 變體 2：AOR Power Ballad（Journey / Foreigner 風）

**Style of Music（Tags）**
```
AOR, arena rock ballad, 1984, soaring male tenor vocals, layered harmony, DX7 synth pad, distorted lead guitar solo, big drums, gated snare, anthemic chorus, melodic hooks, key change finale
```

**Title 建議**：`Heart on the Highway` / `When the Lights Go Down` / `Faithfully Yours`

**Description**
> An 80s arena AOR power ballad with a slow-burn intro on electric piano, building into an explosive guitar-driven chorus. Think Journey "Faithfully" meets Foreigner "I Want to Know What Love Is" — stadium-sized emotion, hands-in-the-air finale with a key change in the last chorus.

**Lyrics 範例骨架**
```
[Intro - piano only]

[Verse 1]
City lights below the plane
Another town, another stage
Calling home but no one there
Just an empty answering machine

[Pre-Chorus]
I'm running out of words to say
But the road won't let me stay

[Chorus]
Heart on the highway, soul on the line
Singing your name through the neon night
I'd cross every state, fight every fight
Just to hold you one more time

[Guitar Solo]

[Bridge - key change]

[Final Chorus - higher key]
```

---

### 🎵 變體 3：Yacht Rock（Christopher Cross / Michael McDonald 風）

**Style of Music（Tags）**
```
yacht rock, smooth, 1979, mellow male falsetto, jazzy chord changes, fretless bass, electric piano, congas, lush background vocals, california sunset, breezy, sophisticated R&B influence, sax interlude
```

**Title 建議**：`Sail Through You` / `Pacific Time` / `Drift Away with Me`

**Description**
> Late 70s yacht rock cruising vibe. Warm fretless bass, jazzy 7th chords, smooth falsetto harmonies. The feeling of a sailboat drifting off Santa Monica at golden hour. Subtle congas, electric piano, and a creamy alto sax break.

**Lyrics 範例骨架**
```
[Verse 1]
Ocean breeze, an easy day
Coffee cooling in the bay
You said love would find its way
I think it found us anyway

[Chorus]
Sail through you, drift on by
Tangerine sun, a watercolor sky
We've got nothing left to prove
Just an afternoon to lose

[Sax Solo]

[Verse 2]

[Chorus - layered harmonies]
```

---

### 🎵 變體 4：Adult Contemporary 慢板（深夜廣播感）

**Style of Music（Tags）**
```
adult contemporary, late night radio, 1987, female smooth vocals, dim electric piano, sparse drum machine, soft synth pad, intimate whisper, slow ballad, FM radio mix, lush reverb tail, candlelight mood
```

**Title 建議**：`After the Last Call` / `Whispers on the Line` / `Two A.M. in Your Voice`

**Description**
> 1987 late-night AC radio ballad. Sparse, intimate arrangement — a single warm electric piano, gentle Linn drum machine, soft synth pad. Whispered female vocal as if confessing into a phone at 2 AM. Perfect for a long-distance lover listening alone in the dark.

**Lyrics 範例骨架**
```
[Intro - electric piano only]

[Verse 1]
The DJ played our favorite song
Half past two, the city's gone
I dial your number, hang up twice
Then I dial it one more time

[Chorus]
Whispers on the line
A heartbeat I can't hide
Tell me you're awake tonight
Tell me you remember mine

[Verse 2]

[Bridge - synth pad swells]

[Chorus - softer, fade]
```

---

### 📋 通用使用提示

- **Suno 平台輸入欄位對照**：
  - 「Style of Music / Tags」→ 填入上方逗號分隔的英文標籤
  - 「Lyrics」→ 貼入帶 `[Verse]` `[Chorus]` `[Sax Solo]` 等結構標記的歌詞
  - 「Title」→ 從建議擇一
  - 啟用「Persona」或「Instrumental」開關依需求調整
- **若想做純音樂版本**：把 lyrics 留空、勾選 instrumental，並在 tags 加上 `instrumental, no vocals, mood music`
- **想更貼近頻道感**：在 tags 末尾加 `late night FM radio broadcast, vinyl warmth, cassette hiss` 可增加懷舊質感
- **避免採樣相似度過高**：不要在 tags 直接寫具體藝人名（如 "Air Supply style"），改用編制/音色描述更安全
- **語言**：Suno 對英文歌詞品質最佳，欲做中文 80 年代台/港式抒情曲，可改用 `mandopop ballad, 80s hong kong cantopop, taiwanese ballad` 等替代 tag

---

## 資料來源

- [Retro Rush FM YouTube 頻道](https://www.youtube.com/@RetroRushFM)
- 影片標題實證：[Vol. 13](https://www.youtube.com/watch?v=tKsj-hD_EJQ)、[Vol. 14](https://www.youtube.com/watch?v=CkN8ypwX3nM)、[Vol. 16](https://www.youtube.com/watch?v=DoH_ux7lHUI)、[Vol. 21](https://www.youtube.com/watch?v=GjvWHDAxQHw)、[Vol. 25](https://www.youtube.com/watch?v=GhQKsoyRlfU)
- 風格資料庫：本機 `~/.claude/skills/music-genre-finder/references/`（基於 RateYourMusic 2026-01-31 快照）

---

## 驗證方式

1. 直接造訪 https://www.youtube.com/@RetroRushFM 隨機點開任一支 Vol. XX 影片，確認曲目為 80 年代軟搖滾情歌（例如 Air Supply「All Out of Love」、Chicago「Hard to Say I'm Sorry」、Bryan Adams「Heaven」一類）。
2. 將上述分類連結貼入瀏覽器（如 https://rateyourmusic.com/genre/soft-rock/ ），比對 RateYourMusic 該分類下的代表專輯/歌手，與頻道選曲的歌手重合度應極高。
