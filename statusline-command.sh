#!/bin/bash
input=$(cat)

MODEL=$(echo "$input" | jq -r '.model.display_name')
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
EFFORT=$(jq -r '.effortLevel // "medium"' "$CLAUDE_DIR/settings.json" 2>/dev/null)
DIR=$(echo "$input" | jq -r '.workspace.current_dir')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
DURATION_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')

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

# Cost tier
COST_TIER=$(awk -v c="$COST" 'BEGIN{ if(c>5)print "bad"; else if(c>1)print "warn"; else print "good" }')
case "$COST_TIER" in
  bad) COST_COLOR="$C_BAD" ;;
  warn) COST_COLOR="$C_WARN" ;;
  *) COST_COLOR="$C_GOOD" ;;
esac

# Effort tier
case "$EFFORT" in
  lite|low|min*) EFFORT_COLOR="$DIM$C_GOOD" ;;
  high|max|ultra) EFFORT_COLOR="$BOLD$C_BAD" ;;
  *) EFFORT_COLOR="$C_WARN" ;;
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
else
  SHORT_DIR="${PARTS[N-1]}"
fi
if [ "${#SHORT_DIR}" -gt 30 ]; then
  SHORT_DIR="…${SHORT_DIR: -29}"
fi

BRANCH=""
if git rev-parse --git-dir > /dev/null 2>&1; then
  B=$(git branch --show-current 2>/dev/null)
  BRANCH=" ${C_SEP}|${RESET} ${C_BRANCH}🌿 ${B}${RESET}"
fi

SEP="${C_SEP}|${RESET}"
COST_FMT=$(printf '$%.2f' "$COST")

echo -e "${C_MODEL}🤖 [$MODEL]${RESET} ${EFFORT_COLOR}🔥 ${EFFORT}${RESET}"
echo -e "${C_DIR}📁 ${SHORT_DIR}${RESET}${BRANCH}"
echo -e "🧠 ${BAR_COLOR}${BAR}${RESET} ${PCT}% ${SEP} ${COST_COLOR}💰 ${COST_FMT}${RESET} ${SEP} ${DUR_COLOR}⏱️ ${MINS}m ${SECS}s${RESET}"
