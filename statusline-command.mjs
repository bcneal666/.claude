#!/usr/bin/env node
// statusline：單一程序版本（取代 statusline-command.sh）。
//
// 為什麼要用 Node 重寫：harness 每次觸發（permission mode、model、tokenUsage…）
// 都會 taskkill 掉還在跑的前一次，被殺的那次永遠不會把結果畫到畫面上，且共用
// 300ms debounce。舊版 bash 腳本（4~6 次外部程序 fork）在 Windows 上端到端要
// 700ms 以上，遠大於 300ms，導致「opusplan 切 plan/auto mode 時 model 名稱常
// 常沒更新」——模型其實真的切了，只是腳本常常來不及跑完就被殺。
// 收進單一 node 程序後，內部運算 <1ms，端到端主要是 node 啟動成本（~185ms），
// 才有機會穩定落在 debounce 窗內。
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

function readStdinSafe() {
  try {
    return readFileSync(0, "utf8");
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
function readLastPermissionModeSafe(transcriptPath) {
  if (!transcriptPath) return null;
  let fd;
  try {
    fd = openSync(transcriptPath, "r");
    const size = fstatSync(fd).size;
    if (size === 0) return null;
    const want = Math.min(size, 65536);
    const buf = Buffer.alloc(want);
    readSync(fd, buf, 0, want, size - want);
    const txt = buf.toString("utf8");
    const marker = '"type":"permission-mode"';
    const idx = txt.lastIndexOf(marker);
    if (idx < 0) return null;
    const lineStart = txt.lastIndexOf("\n", idx) + 1;
    let lineEnd = txt.indexOf("\n", idx);
    if (lineEnd < 0) lineEnd = txt.length;
    const line = txt.slice(lineStart, lineEnd).trim();
    const obj = JSON.parse(line);
    return obj && typeof obj.permissionMode === "string" ? obj.permissionMode : null;
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
  };
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

  let pctRaw = o.context_window && typeof o.context_window === "object" ? o.context_window.used_percentage : undefined;
  if (typeof pctRaw !== "number" || Number.isNaN(pctRaw)) pctRaw = 0;
  let pct = Math.floor(pctRaw);
  if (pct < 0) pct = 0;
  else if (pct > 100) pct = 100;

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

  return { model, effort, pct, cost, costTier, durationMs, modelCfg, over200k, dir, transcriptPath };
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

// ---------- opusplan 階段標籤 ----------
//
// 優先用 permission mode（來自 transcript 尾端）推導階段，因為那才是「即時生效
// 的判斷依據」；model 名稱只在 transcript 讀不到時當退路。若兩者都有但結論不同
// （代表 harness 這一輪還沒把新 model 解析結果送進 stdin），用暗色 ≠ 標記出來，
// 而不是靜默顯示其中一個——這樣使用者看得出「畫面正在追上」而非誤判成 bug。
function computeOpusplanTag({ modelCfg, model, over200k, permissionMode, DIM, C_WARN, C_GOOD, C_BAD, RESET }) {
  if (!modelCfg.startsWith("opusplan")) return "";

  if (over200k) {
    return ` ${DIM}${C_BAD}⚠ >200k 停用升級${RESET}`;
  }

  const modelLower = model.toLowerCase();
  const hasOpus = modelLower.includes("opus");
  const hasSonnet = modelLower.includes("sonnet");
  const modelStage = hasOpus ? "plan" : hasSonnet ? "run" : null;

  if (permissionMode !== null) {
    const modeStage = permissionMode === "plan" ? "plan" : "run";
    const tagText =
      modeStage === "plan" ? `${DIM}${C_WARN}📋 plan${RESET}` : `${DIM}${C_GOOD}⚡ run${RESET}`;
    // modelStage 為 null（model 名稱既非 Opus 也非 Sonnet）時沒有東西可比對，
    // 不加 ≠ 標記，直接採用 mode 的結論
    if (modelStage !== null && modelStage !== modeStage) {
      return ` ${tagText} ${DIM}≠${RESET}`;
    }
    return ` ${tagText}`;
  }

  // transcript 讀不到：退回舊邏輯，純靠 model 名稱猜階段
  if (hasOpus) return ` ${DIM}${C_WARN}📋 plan${RESET}`;
  if (hasSonnet) return ` ${DIM}${C_GOOD}⚡ run${RESET}`;
  return ` ${DIM}⇄ opusplan${RESET}`;
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

// ---------- 組裝輸出（三行，與舊 bash 版格式逐 byte 對齊） ----------

function render(fields, permissionMode, theme) {
  const { model, effort, pct, cost, costTier, durationMs, modelCfg, over200k, dir } = fields;
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

  const opusplanTag = computeOpusplanTag({ modelCfg, model, over200k, permissionMode, DIM, C_WARN, C_GOOD, C_BAD, RESET });

  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  const durColor = mins >= 15 ? C_BAD : mins >= 5 ? C_WARN : DIM;

  const shortDir = shortenDir(dir);
  const branch = readBranchSafe(dir);
  const branchSegment = branch ? ` ${C_SEP}|${RESET} ${C_BRANCH}🌿 ${branch}${RESET}` : "";

  const sep = `${C_SEP}|${RESET}`;
  const costFmt = `$${cost.toFixed(2)}`;

  const line1 = `${C_MODEL}🤖 [${model}]${RESET}${opusplanTag} ${effortColor}🔥 ${effort}${RESET}`;
  const line2 = `${C_DIR}📁 ${shortDir}${RESET}${branchSegment}`;
  const line3 = `🧠 ${barColor}${bar}${RESET} ${pct}% ${sep} ${costColor}💰 ${costFmt}${RESET} ${sep} ${durColor}⏱️ ${mins}m ${secs}s${RESET}`;

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
