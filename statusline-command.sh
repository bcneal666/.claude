#!/bin/bash
input=$(cat)
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

# 本 repo 同時用於 Windows 與 Linux。jq 一律輸出小數點格式的數字，若 host 的
# LC_NUMERIC 是逗號小數點語系（de_DE / fr_FR / pt_BR…），下方 printf '%.2f'
# 會誤解析成 $2.00 或印出 $2,35。只鎖數字語系，不動 LC_ALL 以免破壞 UTF-8 輸出
LC_NUMERIC=C

# 單次 jq 取完所有 stdin 欄位並合併 settings.json，順便算好 cost tier 與百分比取整，
# 取代原本 6 次 echo|jq + 1 次 jq settings.json + cut + awk（Windows 上每次 spawn 約 0.4~0.8s）
CFG="$CLAUDE_DIR/settings.json"; [ -f "$CFG" ] || CFG=/dev/null
mapfile -t F < <(jq -r --slurpfile cfg "$CFG" '
  ($cfg[0] // {}) as $c | (.cost.total_cost_usd // 0) as $cost |
  [ (.model.display_name // "?")
  , (.effort.level // $c.effortLevel // "medium")
  , ((.context_window.used_percentage // 0) | floor
     | if . < 0 then 0 elif . > 100 then 100 else . end)
  , $cost
  , (if $cost > 5 then "bad" elif $cost > 1 then "warn" else "good" end)
  , ((.cost.total_duration_ms // 0) | floor)
  , ($c.model // "")
  , (if .exceeds_200k_tokens then "1" else "0" end)
  , (.workspace.current_dir // "")
  ] | .[]' <<<"$input")

# jq 在此機器上是原生 Windows PE 執行檔（非 msys 原生程式），每行輸出一律帶
# CRLF；mapfile／command substitution 只會剝掉尾端的 \n，留下 \r 混進每個欄位，
# 導致後面的整數比較（[ "$PCT" -ge 90 ]）與 printf '%.2f' 出錯。逐一剝除
for i in "${!F[@]}"; do F[i]="${F[i]%$'\r'}"; done

MODEL="${F[0]}"; EFFORT="${F[1]}"; PCT="${F[2]}"; COST="${F[3]}"
COST_TIER="${F[4]}"; DURATION_MS="${F[5]}"; MODEL_CFG="${F[6]}"
OVER200K="${F[7]}"; DIR="${F[8]}"

# jq 缺席或 payload 異常時給預設值。少了這道防線，空字串會讓 [ "$PCT" -ge 90 ]
# 算術失敗 → 腳本非零退出 → harness 收到空輸出 → 整條 statusline 變空白
: "${MODEL:=?}"; : "${EFFORT:=medium}"; : "${PCT:=0}"
: "${COST:=0}"; : "${COST_TIER:=good}"; : "${DURATION_MS:=0}"

THEME="${STATUSLINE_THEME:-default}"

# Palette
RESET='\033[0m'; BOLD='\033[1m'; DIM='\033[2m'
GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'
CYAN='\033[36m'; GREY='\033[90m'

case "$THEME" in
  mono)
    C_MODEL="$BOLD"; C_DIR=""; C_BRANCH="$DIM"; C_SEP="$DIM"
    C_GOOD=""; C_WARN="$BOLD"; C_BAD="$BOLD" ;;
  light)
    C_MODEL="$BOLD\033[34m"; C_DIR="\033[34m"; C_BRANCH="$DIM"; C_SEP="$DIM"
    C_GOOD='\033[32m'; C_WARN='\033[33m'; C_BAD='\033[31m' ;;
  *)
    C_MODEL="$BOLD$CYAN"; C_DIR="$CYAN"; C_BRANCH="$GREY"; C_SEP="$GREY"
    C_GOOD="$GREEN"; C_WARN="$YELLOW"; C_BAD="$RED" ;;
esac

# Context bar color
if [ "$PCT" -ge 90 ]; then BAR_COLOR="$C_BAD"
elif [ "$PCT" -ge 70 ]; then BAR_COLOR="$C_WARN"
else BAR_COLOR="$C_GOOD"; fi

FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
printf -v FILL "%${FILLED}s"; printf -v PAD "%${EMPTY}s"
BAR="${FILL// /█}${PAD// /░}"

case "$COST_TIER" in
  bad) COST_COLOR="$C_BAD" ;;
  warn) COST_COLOR="$C_WARN" ;;
  *) COST_COLOR="$C_GOOD" ;;
esac

# Effort tier
case "$EFFORT" in
  lite|low|min*) EFFORT_COLOR="$DIM$C_GOOD" ;;
  high|xhigh|max|ultra) EFFORT_COLOR="$BOLD$C_BAD" ;;
  *) EFFORT_COLOR="$C_WARN" ;;
esac

# opusplan 指示：依「當前生效模型」標示所處階段（Plan 用 Opus、執行切 Sonnet）。
# 但 context 超過 200k 時 harness 會整段跳過 plan 升級，兩種 mode 拿到同一個模型，
# 此時顯示 plan/run 會誤導，改為明示原因
OPUSPLAN_TAG=""
case "$MODEL_CFG" in
  opusplan*)
    if [ "$OVER200K" = "1" ]; then
      OPUSPLAN_TAG=" ${DIM}${C_BAD}⚠ >200k 停用升級${RESET}"
    else
      case "$MODEL" in
        *[Oo]pus*)   OPUSPLAN_TAG=" ${DIM}${C_WARN}📋 plan${RESET}" ;;
        *[Ss]onnet*) OPUSPLAN_TAG=" ${DIM}${C_GOOD}⚡ run${RESET}" ;;
        *)           OPUSPLAN_TAG=" ${DIM}⇄ opusplan${RESET}" ;;
      esac
    fi
    ;;
esac

# Duration tier
MINS=$((DURATION_MS / 60000)); SECS=$(((DURATION_MS % 60000) / 1000))
if [ "$MINS" -ge 15 ]; then DUR_COLOR="$C_BAD"
elif [ "$MINS" -ge 5 ]; then DUR_COLOR="$C_WARN"
else DUR_COLOR="$DIM"; fi

# Truncate dir to last 2 segments, max 30 chars
SHORT_DIR="${DIR//\\//}"
IFS='/' read -ra PARTS <<< "$SHORT_DIR"
N=${#PARTS[@]}
if [ "$N" -ge 2 ]; then
  SHORT_DIR=".../${PARTS[N-2]}/${PARTS[N-1]}"
elif [ "$N" -eq 1 ]; then
  SHORT_DIR="${PARTS[0]}"
else
  SHORT_DIR=""
fi
if [ "${#SHORT_DIR}" -gt 30 ]; then
  SHORT_DIR="…${SHORT_DIR: -29}"
fi

# 沿目錄樹上溯讀 .git/HEAD，取代 git rev-parse + git branch 兩次 spawn（各約 300ms）
read_branch() {
  local d="${1//\\//}" gitdir head p
  while :; do
    if [ -f "$d/.git" ]; then
      read -r _ gitdir < "$d/.git"          # worktree/submodule: "gitdir: <path>"
      case "$gitdir" in /*|[A-Za-z]:*) ;; *) gitdir="$d/$gitdir" ;; esac
    elif [ -d "$d/.git" ]; then
      gitdir="$d/.git"
    else
      p="${d%/*}"
      if [ "$p" = "$d" ] || [ -z "$p" ]; then return 1; fi
      d="$p"; continue
    fi
    [ -f "$gitdir/HEAD" ] || return 1
    read -r head < "$gitdir/HEAD"
    case "$head" in
      "ref: refs/heads/"*) printf '%s' "${head#ref: refs/heads/}" ;;
      *)                   printf '%s' "${head:0:7}" ;;   # detached HEAD
    esac
    return 0
  done
}

BRANCH=""
if B=$(read_branch "${DIR:-$PWD}"); then
  BRANCH=" ${C_SEP}|${RESET} ${C_BRANCH}🌿 ${B}${RESET}"
fi

SEP="${C_SEP}|${RESET}"
printf -v COST_FMT '$%.2f' "$COST"

echo -e "${C_MODEL}🤖 [$MODEL]${RESET}${OPUSPLAN_TAG} ${EFFORT_COLOR}🔥 ${EFFORT}${RESET}"
echo -e "${C_DIR}📁 ${SHORT_DIR}${RESET}${BRANCH}"
echo -e "🧠 ${BAR_COLOR}${BAR}${RESET} ${PCT}% ${SEP} ${COST_COLOR}💰 ${COST_FMT}${RESET} ${SEP} ${DUR_COLOR}⏱️ ${MINS}m ${SECS}s${RESET}"
