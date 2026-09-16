#!/usr/bin/env node
// statusline：單一程序版本。
//
// 為什麼要用 Node 重寫：harness 每次觸發（permission mode、model、tokenUsage…）
// 都會 taskkill 掉還在跑的前一次，被殺的那次永遠不會把結果畫到畫面上，且共用
// 300ms debounce。舊版 bash 腳本（4~6 次外部程序 fork）在 Windows 上端到端要
// 700ms 以上，遠大於 300ms，導致「opusplan 切 plan/auto mode 時 model 名稱常
// 常沒更新」——模型其實真的切了，只是腳本常常來不及跑完就被殺。
// 收進單一 node 程序後，內部運算 <1ms，端到端主要是 node 啟動成本（~185ms），
// 才有機會穩定落在 debounce 窗內。
//
// 已移除 bash fallback（statusline-command.sh）：舊版只有 node 缺席時才會被
// 觸發，但那時它又硬相依 jq（多數 Linux distro 不預裝），fallback 反而更脆弱；
// node 是這台機器與大多數目標環境的合理硬相依，直接砍掉這層可省一次 shell spawn。
//
// 硬性規則：任何例外都必須仍輸出三行、exit code 0。空輸出／非 0 exit code 會
// 讓 harness 把整條 statusline 清空，比顯示舊值更糟。

import { readFileSync, statSync, appendFileSync, openSync, fstatSync, readSync, closeSync } from "node:fs";
import path from "node:path";
import os from "node:os";

// 用 os.homedir() 而非 process.env.HOME：harness 呼叫本腳本時是否保留 HOME
// 不確定，os.homedir() 在 Windows 上會正確走 USERPROFILE，等義於 shell 的 `~`
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");

// ---------- stdin / settings.json 讀取（全程不可拋出到呼叫端） ----------

// Linux 上 stdin 有機率被設成 non-blocking（harness 用 pipe 餵資料時常見），
// readFileSync(0) 在讀空時會直接拋 EAGAIN，不會像一般檔案那樣等待——若不接住，
// 會被最外層 catch 吃掉整段資料，退成全預設值（看起來像「腳本壞了」而非「暫時
// 讀不到」）。改成手動迴圈 + EAGAIN 時同步小睡重試，讓它等到資料真正到齊。
function sleepSyncMs(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    /* Atomics.wait 在極少數環境會被禁用；退化成忙等一次即可，不影響正確性 */
  }
}

function readStdinSafe() {
  const chunks = [];
  const buf = Buffer.alloc(65536);
  let retriesLeft = 200; // 200 * 5ms ≈ 1s 上限，避免 stdin 永遠不到資料時卡死
  for (;;) {
    let n;
    try {
      n = readSync(0, buf, 0, buf.length, null);
    } catch (err) {
      if (err && err.code === "EAGAIN" && retriesLeft > 0) {
        retriesLeft--;
        sleepSyncMs(5);
        continue;
      }
      // EOF（err.code === "EOF"）或其他錯誤：结束讀取，回傳已讀到的內容
      break;
    }
    if (n === 0) break; // 正常 EOF
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  try {
    return Buffer.concat(chunks).toString("utf8");
  } catch {
    return "";
  }
}

function readSettingsSafe() {
  try {
    const raw = readFileSync(path.join(CLAUDE_DIR, "settings.json"), "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

// 讀 transcript_path 尾端最後一筆 permission-mode 記錄，用來推導 opusplan 的
// plan/run 階段標籤。這筆記錄是「每回合寫入」，不是切換當下即時寫入——若讀不到
// 就整段跳過，讓呼叫端退回舊的「靠 model 名稱猜階段」邏輯，不製造新的靜默錯誤。
//
// 從檔尾往前找、逐塊擴大（64KB → 1MB 上限），每塊內由後往前逐行 JSON.parse，
// 要求 type 欄位精確等於 "permission-mode"——不再用子字串 lastIndexOf，避免
// 長 session 裡某則 assistant/tool 訊息內文剛好含有這段字面量時誤判命中。
function readLastPermissionModeSafe(transcriptPath) {
  if (!transcriptPath) return null;
  let fd;
  try {
    fd = openSync(transcriptPath, "r");
    const size = fstatSync(fd).size;
    if (size === 0) return null;

    const MAX_SCAN = 1024 * 1024; // 1MB 上限，避免超大 transcript 拖慢 statusline
    let scanSize = Math.min(size, 65536);

    for (;;) {
      const buf = Buffer.alloc(scanSize);
      readSync(fd, buf, 0, scanSize, size - scanSize);
      const txt = buf.toString("utf8");
      const lines = txt.split("\n");
      // 非首行才視為完整行；scanSize < size 時第 0 行可能被切半，跳過它
      const startIdx = scanSize < size ? 1 : 0;
      for (let i = lines.length - 1; i >= startIdx; i--) {
        const line = lines[i].trim();
        if (!line) continue;
        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        if (obj && obj.type === "permission-mode" && typeof obj.permissionMode === "string") {
          return obj.permissionMode;
        }
      }
      if (scanSize >= size || scanSize >= MAX_SCAN) return null;
      scanSize = Math.min(scanSize * 4, size, MAX_SCAN);
    }
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* 忽略 */
      }
    }
  }
}

// ---------- 欄位擷取（缺值 / 型別錯誤一律給預設值，絕不拋出） ----------

function defaultFields() {
  return {
    model: "?",
    effort: "medium",
    pct: 0,
    cost: 0,
    costTier: "good",
    durationMs: 0,
    modelCfg: "",
    over200k: false,
    dir: "",
    transcriptPath: null,
    vimMode: null,
    ctxSize: null,
    rateLimits: null,
  };
}

// 0~100 夾限 + 取整；型別不對或 NaN 一律回 null（呼叫端據此整段省略該欄位）
function clampPercentOrNull(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  const p = Math.floor(v);
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}

function extractRateLimits(rl) {
  if (!rl || typeof rl !== "object") return null;
  const out = {};
  const fiveHour = clampPercentOrNull(rl.five_hour && typeof rl.five_hour === "object" ? rl.five_hour.used_percentage : undefined);
  const sevenDay = clampPercentOrNull(rl.seven_day && typeof rl.seven_day === "object" ? rl.seven_day.used_percentage : undefined);
  const overage = clampPercentOrNull(rl.overage && typeof rl.overage === "object" ? rl.overage.used_percentage : undefined);
  if (fiveHour !== null) out.fiveHour = fiveHour;
  if (sevenDay !== null) out.sevenDay = sevenDay;
  if (overage !== null) out.overage = overage;
  return Object.keys(out).length > 0 ? out : null;
}

function extractFields(stdinObj, settings) {
  const o = stdinObj && typeof stdinObj === "object" ? stdinObj : {};
  const s = settings && typeof settings === "object" ? settings : {};

  const model =
    (o.model && typeof o.model === "object" && typeof o.model.display_name === "string" && o.model.display_name) ||
    "?";

  const effort =
    (o.effort && typeof o.effort === "object" && typeof o.effort.level === "string" && o.effort.level) ||
    (typeof s.effortLevel === "string" && s.effortLevel) ||
    "medium";

  const pct = clampPercentOrNull(o.context_window && typeof o.context_window === "object" ? o.context_window.used_percentage : undefined) ?? 0;

  let cost = o.cost && typeof o.cost === "object" ? o.cost.total_cost_usd : undefined;
  if (typeof cost !== "number" || Number.isNaN(cost)) cost = 0;
  const costTier = cost > 5 ? "bad" : cost > 1 ? "warn" : "good";

  let durationMs = o.cost && typeof o.cost === "object" ? o.cost.total_duration_ms : undefined;
  if (typeof durationMs !== "number" || Number.isNaN(durationMs)) durationMs = 0;
  durationMs = Math.floor(durationMs);

  const modelCfg = (typeof s.model === "string" && s.model) || "";
  const over200k = o.exceeds_200k_tokens === true;

  const dir =
    (o.workspace && typeof o.workspace === "object" && typeof o.workspace.current_dir === "string" && o.workspace.current_dir) ||
    "";

  const transcriptPath = typeof o.transcript_path === "string" ? o.transcript_path : null;

  const vimMode =
    (o.vim && typeof o.vim === "object" && typeof o.vim.mode === "string" && o.vim.mode) || null;

  let ctxSize = o.context_window && typeof o.context_window === "object" ? o.context_window.context_window_size : undefined;
  ctxSize = typeof ctxSize === "number" && Number.isFinite(ctxSize) && ctxSize > 0 ? Math.floor(ctxSize) : null;

  const rateLimits = extractRateLimits(o.rate_limits);

  return { model, effort, pct, cost, costTier, durationMs, modelCfg, over200k, dir, transcriptPath, vimMode, ctxSize, rateLimits };
}

// ---------- 配色（對應 STATUSLINE_THEME：default / mono / light） ----------

function getPalette(theme) {
  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";
  const DIM = "\x1b[2m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";
  const RED = "\x1b[31m";
  const CYAN = "\x1b[36m";
  const GREY = "\x1b[90m";
  const BLUE = "\x1b[34m";

  switch (theme) {
    case "mono":
      return { RESET, BOLD, DIM, C_MODEL: BOLD, C_DIR: "", C_BRANCH: DIM, C_SEP: DIM, C_GOOD: "", C_WARN: BOLD, C_BAD: BOLD };
    case "light":
      return {
        RESET, BOLD, DIM,
        C_MODEL: BOLD + BLUE, C_DIR: BLUE, C_BRANCH: DIM, C_SEP: DIM,
        C_GOOD: GREEN, C_WARN: YELLOW, C_BAD: RED,
      };
    default:
      return {
        RESET, BOLD, DIM,
        C_MODEL: BOLD + CYAN, C_DIR: CYAN, C_BRANCH: GREY, C_SEP: GREY,
        C_GOOD: GREEN, C_WARN: YELLOW, C_BAD: RED,
      };
  }
}

// ---------- permission mode 圖示 ----------
//
// permissionMode 目前觀察到的值："plan"（規劃中）、"auto"（全自動免確認）、
// "default"（逐步詢問）；未知值一律 fallback 顯示原字串，不吃掉資訊。
// 回傳 { text, stage }：stage 只分 "plan" / "run"，供下面 opusplan 模型比對用
// ——auto 與 default 對 opusplan 而言都停在 Sonnet（run 階段），差別只在
// 「要不要跳確認」，所以圖示要分三種、但 stage 仍是二分。
function permissionModeTag(permissionMode, { DIM, BOLD, C_WARN, C_GOOD, C_BAD, RESET }) {
  switch (permissionMode) {
    case "plan":
      return { text: `${DIM}${C_WARN}📋 plan${RESET}`, stage: "plan" };
    case "auto":
      // auto 是免確認全自動模式，用粗體紅提醒「這個階段風險較高、看仔細」
      return { text: `${DIM}${BOLD}${C_BAD}🚀 auto${RESET}`, stage: "run" };
    case "default":
      return { text: `${DIM}${C_GOOD}✋ manual${RESET}`, stage: "run" };
    default:
      return permissionMode
        ? { text: `${DIM}${C_WARN}🔧 ${permissionMode}${RESET}`, stage: "run" }
        : null;
  }
}

// ---------- opusplan 階段標籤 ----------
//
// 優先用 permission mode（來自 transcript 尾端）推導階段，因為那才是「即時生效
// 的判斷依據」；model 名稱只在 transcript 讀不到時當退路。
//
// >200k 只在 plan mode 才會讓 harness 跳過 opusplan 升級（見 claude.exe 內
// gpn()：`if(n!=="plan")return{model:r,clampWarning:null}`）；auto/default 模式
// 下升級判斷根本不看 over200k，此時仍顯示 ⚠ 會誤導使用者以為升級被擋。故先解出
// stage，只有 stage === "plan" 時才用 >200k 警示蓋掉一般標籤。
function computeOpusplanTag({ modelCfg, model, over200k, permissionMode, DIM, BOLD, C_WARN, C_GOOD, C_BAD, RESET }) {
  if (!modelCfg.startsWith("opusplan")) return "";

  const modelLower = model.toLowerCase();
  const hasOpus = modelLower.includes("opus");
  const hasSonnet = modelLower.includes("sonnet");
  const modelStage = hasOpus ? "plan" : hasSonnet ? "run" : null;

  const tag = permissionModeTag(permissionMode, { DIM, BOLD, C_WARN, C_GOOD, C_BAD, RESET });

  if (tag !== null) {
    if (tag.stage === "plan" && over200k) {
      return ` ${DIM}${C_BAD}⚠ >200k 停用升級${RESET}`;
    }
    // modelStage 為 null（model 名稱既非 Opus 也非 Sonnet）時沒有東西可比對，
    // 不加 ≠ 標記，直接採用 mode 的結論
    if (modelStage !== null && modelStage !== tag.stage) {
      return ` ${tag.text} ${DIM}≠${RESET}`;
    }
    return ` ${tag.text}`;
  }

  // transcript 讀不到 permission mode：退回舊邏輯，純靠 model 名稱猜階段。
  // 這裡沒有 stage 可判斷是否為 plan，>200k 警示一併退回舊的「一律顯示」規則，
  // 寧可偶爾誤報也不要在退路裡完全丟失 >200k 這個重要資訊。
  if (over200k) {
    return ` ${DIM}${C_BAD}⚠ >200k 停用升級${RESET}`;
  }
  if (hasOpus) return ` ${DIM}${C_WARN}📋 plan${RESET}`;
  if (hasSonnet) return ` ${DIM}${C_GOOD}⚡ run${RESET}`;
  return ` ${DIM}⇄ opusplan${RESET}`;
}

// ---------- vim mode 標籤 ----------
//
// 只在 hideVimModeIndicator:true（見 settings.json）時才需要我們自己畫，
// 否則畫面下方還會有內建的 `-- INSERT --` 重複一次。
//
// 圖示用 🔤（input latin letters）而非 ⌨（U+2328 鍵盤）：後者預設是「文字樣式」
// 字符，多數終端機會用等寬字型畫窄版單色符號，跟其他全彩 emoji（🔥🚀📁🌿）基線
// 對不齊；🔤 是 emoji-presentation-default，永遠畫成全彩符號，高度才會一致。
function vimModeTag(vimMode, { DIM, C_WARN, BOLD, C_MODEL, RESET }) {
  if (!vimMode) return "";
  let color;
  if (vimMode === "NORMAL") color = DIM;
  else if (vimMode === "INSERT") color = C_WARN;
  else if (vimMode.startsWith("VISUAL")) color = BOLD + C_MODEL;
  else color = DIM;
  return ` ${color}🔤 ${vimMode}${RESET}`;
}

// ---------- context window 大小格式化 ----------

function formatCtxSize(ctxSize) {
  if (ctxSize === null) return "";
  if (ctxSize >= 1000000) {
    const m = ctxSize / 1000000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `${Math.round(ctxSize / 1000)}k`;
}

// ---------- rate limits 標籤 ----------

function tierColor(pct, { C_GOOD, C_WARN, C_BAD }) {
  if (pct >= 90) return C_BAD;
  if (pct >= 70) return C_WARN;
  return C_GOOD;
}

function rateLimitsSegment(rateLimits, palette) {
  if (!rateLimits) return "";
  const { DIM, RESET, C_GOOD, C_WARN, C_BAD } = palette;
  const parts = [];
  if (typeof rateLimits.fiveHour === "number") {
    parts.push(`5h ${tierColor(rateLimits.fiveHour, { C_GOOD, C_WARN, C_BAD })}${rateLimits.fiveHour}%${RESET}`);
  }
  if (typeof rateLimits.sevenDay === "number") {
    parts.push(`7d ${tierColor(rateLimits.sevenDay, { C_GOOD, C_WARN, C_BAD })}${rateLimits.sevenDay}%${RESET}`);
  }
  if (typeof rateLimits.overage === "number") {
    parts.push(`ov ${tierColor(rateLimits.overage, { C_GOOD, C_WARN, C_BAD })}${rateLimits.overage}%${RESET}`);
  }
  if (parts.length === 0) return "";
  return ` ${DIM}📊${RESET} ${parts.join(` ${DIM}·${RESET} `)}`;
}

// ---------- 目錄縮寫：最後兩段 + .../ 前綴，超過 30 字元截斷 ----------

function shortenDir(dir) {
  const norm = (dir || "").split("\\").join("/");
  const parts = norm.split("/").filter(Boolean);
  let sd;
  if (parts.length >= 2) sd = ".../" + parts.slice(-2).join("/");
  else if (parts.length === 1) sd = parts[0];
  else sd = "";
  if (sd.length > 30) sd = "…" + sd.slice(-29);
  return sd;
}

// ---------- branch：沿目錄樹上溯讀 .git/HEAD，零 child_process ----------
// 支援 .git 是檔案的 worktree/submodule 情形（內容為 "gitdir: <path>"，相對路徑
// 要接回目前層級）與 detached HEAD（取前 7 碼）。找到 .git 但讀不到 HEAD 時視為
// 失敗直接回傳 null，不再往上找（對應舊 bash 版 read_branch 的 `return 1`）。
function readBranch(startDir) {
  let d = (startDir || "").split("\\").join("/");
  if (!d) return null;

  for (;;) {
    let st;
    try {
      st = statSync(d + "/.git");
    } catch {
      const idx = d.lastIndexOf("/");
      if (idx <= 0) return null;
      const parent = d.slice(0, idx);
      if (parent === d || parent === "") return null;
      d = parent;
      continue;
    }

    let gitdir;
    if (st.isFile()) {
      const content = readFileSync(d + "/.git", "utf8");
      const firstLine = content.split("\n")[0] || "";
      const m = firstLine.match(/^\S+\s+(.*)$/); // 第一個 token 之後的整段（如 "gitdir: <path>"）
      let g = m ? m[1].trim() : "";
      g = g.split("\\").join("/");
      if (!(g.startsWith("/") || /^[A-Za-z]:/.test(g))) {
        g = d + "/" + g;
      }
      gitdir = g;
    } else {
      gitdir = d + "/.git";
    }

    try {
      const head = readFileSync(gitdir + "/HEAD", "utf8").trim();
      if (head.startsWith("ref: refs/heads/")) return head.slice(16);
      return head.slice(0, 7);
    } catch {
      return null;
    }
  }
}

function readBranchSafe(dir) {
  try {
    return readBranch(dir || process.cwd());
  } catch {
    return null;
  }
}

// ---------- 組裝輸出（三行） ----------

function render(fields, permissionMode, theme) {
  const { model, effort, pct, cost, costTier, durationMs, modelCfg, over200k, dir, vimMode, ctxSize, rateLimits } = fields;
  const P = getPalette(theme);
  const { RESET, BOLD, DIM, C_MODEL, C_DIR, C_BRANCH, C_SEP, C_GOOD, C_WARN, C_BAD } = P;

  const barColor = pct >= 90 ? C_BAD : pct >= 70 ? C_WARN : C_GOOD;
  const filled = Math.floor(pct / 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  const costColor = costTier === "bad" ? C_BAD : costTier === "warn" ? C_WARN : C_GOOD;

  let effortColor;
  if (effort === "lite" || effort === "low" || effort.startsWith("min")) effortColor = DIM + C_GOOD;
  else if (effort === "high" || effort === "xhigh" || effort === "max" || effort === "ultra") effortColor = BOLD + C_BAD;
  else effortColor = C_WARN;

  const opusplanTag = computeOpusplanTag({ modelCfg, model, over200k, permissionMode, DIM, BOLD, C_WARN, C_GOOD, C_BAD, RESET });
  const vimTag = vimModeTag(vimMode, { DIM, C_WARN, BOLD, C_MODEL, RESET });

  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  const durColor = mins >= 15 ? C_BAD : mins >= 5 ? C_WARN : DIM;

  const shortDir = shortenDir(dir);
  const branch = readBranchSafe(dir);
  const branchSegment = branch ? ` ${C_SEP}|${RESET} ${C_BRANCH}🌿 ${branch}${RESET}` : "";

  const sep = `${C_SEP}|${RESET}`;
  const costFmt = `$${cost.toFixed(2)}`;
  const costSegment = ` ${sep} ${costColor}💰 ${costFmt}${RESET}`;
  const durationSegment = ` ${sep} ${durColor}⏱️ ${mins}m ${secs}s${RESET}`;
  const ctxSizeFmt = formatCtxSize(ctxSize);
  const pctFmt = ctxSizeFmt ? `${pct}%/${ctxSizeFmt}` : `${pct}%`;
  const rateLimitsFmt = rateLimitsSegment(rateLimits, P);

  // ⏱️ 耗時放第二行（跟在 🌿 branch 之後）；💰 cost 放第三行最右邊（bar/pct 與
  // rate limits 之後），避免第三行把最常盯著看的 context bar 擠到中間
  const line1 = `${C_MODEL}🤖 [${model}]${RESET}${opusplanTag} ${effortColor}🔥 ${effort}${RESET}${vimTag}`;
  const line2 = `${C_DIR}📁 ${shortDir}${RESET}${branchSegment}${durationSegment}`;
  const line3 = `🧠 ${barColor}${bar}${RESET} ${pctFmt}${rateLimitsFmt}${costSegment}`;

  return line1 + "\n" + line2 + "\n" + line3 + "\n";
}

// ---------- 除錯開關：CC_STATUSLINE_DEBUG=1 時記錄原始 stdin，方便日後比對 ----------
// 「harness 送的就是舊值」vs「送對了但畫面沒刷新」。關閉時完全不讀環境變數以外
// 的任何東西，零額外成本。

function logDebugSafe(raw) {
  if (!process.env.CC_STATUSLINE_DEBUG) return;
  try {
    const entry = JSON.stringify({ ts: new Date().toISOString(), stdin: raw });
    appendFileSync(path.join(CLAUDE_DIR, "statusline-debug.log"), entry + "\n");
  } catch {
    /* 除錯記錄失敗不可影響正常輸出 */
  }
}

// ---------- 進入點：三層防呆，保證永遠輸出三行、exit code 0 ----------

function main() {
  const theme = process.env.STATUSLINE_THEME || "default";
  try {
    const raw = readStdinSafe();
    logDebugSafe(raw);

    const stdinObj = JSON.parse(raw);
    const settings = readSettingsSafe();
    const fields = extractFields(stdinObj, settings);
    const permissionMode = readLastPermissionModeSafe(fields.transcriptPath);

    process.stdout.write(render(fields, permissionMode, theme));
  } catch {
    try {
      process.stdout.write(render(defaultFields(), null, theme));
    } catch {
      // 最壞情況（render 本身出錯）：純字面量輸出，不呼叫任何可能再度出錯的函式
      process.stdout.write("🤖 [?] 🔥 medium\n📁 \n🧠 ░░░░░░░░░░ 0% | 💰 $0.00 | ⏱️ 0m 0s\n");
    }
  }
}

main();
