#!/usr/bin/env node
// UserPromptSubmit hook：在每個 prompt 注入完整的目前時間戳。
//
// 內建 system prompt 只在 session 開始時給一次日期快照
// （"Today's date is ..."），沒有時刻、星期或時區，
// 跨過午夜或長時間的 session 就會過時。這個 hook 一律使用
// Asia/Taipei（CLAUDE.md 設定的時區），不受機器本身的時區影響，
// 透過 Intl.DateTimeFormat 計算，所以在
// Windows / macOS / Linux 上行為一致。
//
// 硬性規則：一律 exit 0，絕不寫入 stderr。suppressOutput: true
// 避免每個 prompt 在 transcript 留下雜訊行。

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function buildContext() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const timeStr = `${get("hour")}:${get("minute")}`;

  // Intl 的星期輸出（en-CA 的 "Mon" 等）因 locale 而不穩定，所以改用
  // getDay 加上台北時區的 formatter 另外計算，
  // 不依賴特定 locale 的縮寫格式。
  const weekdayIdx = new Date(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei" }).format(now)
  ).getDay();
  const weekday = WEEKDAYS[weekdayIdx] ?? "";

  return `現在時間：${dateStr}（週${weekday}）${timeStr} Asia/Taipei (UTC+8)`;
}

function main() {
  const hookSpecificOutput = { hookEventName: "UserPromptSubmit" };
  try {
    hookSpecificOutput.additionalContext = buildContext();
  } catch {
    /* 無法建出內容時略過注入，但仍輸出有效的 JSON */
  }
  process.stdout.write(
    JSON.stringify({ suppressOutput: true, hookSpecificOutput }) + "\n"
  );
}

main();
