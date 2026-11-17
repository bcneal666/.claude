#!/usr/bin/env node
// UserPromptSubmit hook: inject the full current timestamp into every prompt.
//
// The built-in system prompt only gives a date snapshot at session start
// ("Today's date is ..."), with no time of day, weekday or timezone, and it
// goes stale across midnight or in long sessions. This hook always uses
// Asia/Taipei (the timezone set in CLAUDE.md), independent of the machine's
// own timezone, via Intl.DateTimeFormat, so it behaves the same on
// Windows / macOS / Linux.
//
// Hard rule: always exit 0 and never write to stderr. suppressOutput: true
// keeps every prompt from leaving a noise line in the transcript.

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

  // Intl's weekday output (en-CA "Mon" etc.) is locale-unstable, so compute it
  // separately with getDay plus a Taipei-timezone formatter instead of
  // relying on a specific locale abbreviation format.
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
    /* if the context cannot be built, skip injection but still emit valid JSON */
  }
  process.stdout.write(
    JSON.stringify({ suppressOutput: true, hookSpecificOutput }) + "\n"
  );
}

main();
