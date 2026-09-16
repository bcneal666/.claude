#!/usr/bin/env node
// UserPromptSubmit hook：每則 prompt 注入當前完整時間戳。
//
// 內建 system prompt 只給開場當下的日期快照（"Today's date is ..."），
// 沒有時刻、星期、時區，且跨午夜或長 session 就會失準。這裡固定用
// Asia/Taipei（CLAUDE.md 指定的時區），不依賴機器本身的時區設定，
// 用 Intl.DateTimeFormat 取得，跨 Windows / macOS / Linux 一致。
//
// 硬性規則：任何情況都要 exit 0、不寫 stderr。suppressOutput: true
// 避免每則 prompt 都在 transcript 留一行雜訊。

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

  // Intl 的 weekday（en-CA "Mon" 等）語系不穩定，改用 getDay 配台北時區
  // 的 formatter 分開算，避免依賴特定語系縮寫格式。
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
    /* 取不到就不注入，仍要輸出合法 JSON */
  }
  process.stdout.write(
    JSON.stringify({ suppressOutput: true, hookSpecificOutput }) + "\n"
  );
}

main();
