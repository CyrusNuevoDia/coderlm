#!/usr/bin/env bash
# ============================================================================
# bashrlm.sh — Bash RLM Context Guard
# https://github.com/cyrusnuevodia/bashrlm
#
# Wraps common high-output commands with truncation guards to prevent
# AI coding agents from blowing up their own context windows.
#
# Usage:
#   source ~/.bashrlm.sh
#
# Or add to your .bashrc / .zshrc:
#   [ -f ~/.bashrlm.sh ] && source ~/.bashrlm.sh
#
# Configuration (set before sourcing, or export in your shell):
#   BASHRLM_MAX_CHARS=2000      # Default character limit per command
#   BASHRLM_ENABLED=1           # Set to 0 to disable all guards
# ============================================================================

# --- Configuration -----------------------------------------------------------

export BASHRLM_MAX_CHARS="${BASHRLM_MAX_CHARS:-2000}"
export BASHRLM_ENABLED="${BASHRLM_ENABLED:-1}"

# Registry of guarded commands (space-delimited)
export __BASHRLM_GUARDED=""

# Per-command character limits
declare -A __BASHRLM_LIMITS

# --- Core truncation engine --------------------------------------------------
# - Redirect-aware: skips truncation when stdout is a file (> /tmp/foo.txt)
# - Head+tail mode: shows beginning and end of output, omitting the middle

__bashrlm_truncate() {
  local cmd_name="${1:-unknown}"

  # Disabled — pass through
  if [ "$BASHRLM_ENABLED" != "1" ]; then
    command cat
    return
  fi

  # Redirect-aware: if stdout is a regular file, the agent is saving
  # output for later processing — pass through untruncated
  if [ -f /proc/self/fd/1 ]; then
    command cat
    return
  fi

  local output
  output=$(command cat)
  local len=${#output}

  # Per-command limit, falling back to global default
  local limit="${__BASHRLM_LIMITS[$cmd_name]:-$BASHRLM_MAX_CHARS}"

  if [ "$len" -gt "$limit" ]; then
    local half=$(( limit / 2 ))
    printf '%s' "${output:0:$half}"
    printf '\n\n[TRUNCATED — showing %s of %s chars, first and last %s]\n\n' \
      "$limit" "$len" "$half"
    printf '%s\n' "${output: -$half}"
  else
    printf '%s\n' "$output"
  fi
}

export -f __bashrlm_truncate

# --- Dynamic guard registration ---------------------------------------------

bashrlm_guard() {
  # Register commands as guarded.
  #
  # Usage:
  #   bashrlm_guard rg ast-grep my_tool
  #   bashrlm_guard cat --limit 4000
  #   bashrlm_guard tree --limit 1500

  local cmd_limit=""
  local commands=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --limit)
        shift; cmd_limit="$1"; shift ;;
      *)
        commands+=("$1"); shift ;;
    esac
  done

  # Builtins that must never be guarded
  local -a _dangerous=(echo printf read source eval exec)

  for cmd in "${commands[@]}"; do
    local is_dangerous=0
    for d in "${_dangerous[@]}"; do
      if [ "$cmd" = "$d" ]; then
        printf '[bashrlm] Refusing to guard "%s" — overriding this builtin will break the shell.\n' "$cmd"
        is_dangerous=1; break
      fi
    done
    [ "$is_dangerous" = "1" ] && continue

    if ! command -v "$cmd" &>/dev/null; then
      printf '[bashrlm] Note: "%s" not found on PATH (registered for when available)\n' "$cmd"
    fi

    [ -n "$cmd_limit" ] && __BASHRLM_LIMITS[$cmd]="$cmd_limit"

    eval "
      ${cmd}() {
        command ${cmd} \"\$@\" | __bashrlm_truncate ${cmd}
      }
      export -f ${cmd}
    "

    if [[ ! " $__BASHRLM_GUARDED " =~ " $cmd " ]]; then
      __BASHRLM_GUARDED="${__BASHRLM_GUARDED} ${cmd}"
      export __BASHRLM_GUARDED
    fi
  done
}

export -f bashrlm_guard

# --- Register default guards -------------------------------------------------

bashrlm_guard cat less
bashrlm_guard jq
bashrlm_guard grep rg ast-grep
bashrlm_guard awk sed
bashrlm_guard find tree ls
bashrlm_guard curl wget
bashrlm_guard diff

# --- Utility functions -------------------------------------------------------

bashrlm_status() {
  printf 'bashrlm — Context Guard Status\n'
  printf '  Enabled:       %s\n' "${BASHRLM_ENABLED}"
  printf '  Default limit: %s chars\n' "${BASHRLM_MAX_CHARS}"
  printf '  Guarded:      %s\n' "${__BASHRLM_GUARDED}"
  printf '\n'
  local has_overrides=0
  for cmd in "${!__BASHRLM_LIMITS[@]}"; do
    [ "$has_overrides" = "0" ] && printf '  Per-command limits:\n' && has_overrides=1
    printf '    %s: %s chars\n' "$cmd" "${__BASHRLM_LIMITS[$cmd]}"
  done
  [ "$has_overrides" = "0" ] && printf '  Per-command limits: (none — all using default)\n'
  printf '\n'
  printf '  bashrlm_guard <cmd> [--limit N]   Register a guard\n'
  printf '  bashrlm_set_limit <chars>          Change default limit\n'
  printf '  bashrlm_off / bashrlm_on           Toggle guards\n'
  printf '  command <cmd> <args>               Bypass guard\n'
}

bashrlm_off() { export BASHRLM_ENABLED=0; printf '[bashrlm] Guards disabled.\n'; }
bashrlm_on()  { export BASHRLM_ENABLED=1; printf '[bashrlm] Guards enabled (%s char limit).\n' "${BASHRLM_MAX_CHARS}"; }

bashrlm_set_limit() {
  [ -z "$1" ] && printf 'Usage: bashrlm_set_limit <chars>\n' && return 1
  export BASHRLM_MAX_CHARS="$1"
  printf '[bashrlm] Default limit set to %s chars.\n' "${BASHRLM_MAX_CHARS}"
}

export -f bashrlm_status bashrlm_off bashrlm_on bashrlm_set_limit

# --- Startup -----------------------------------------------------------------

[ "$BASHRLM_ENABLED" = "1" ] && printf '[bashrlm] Context guards active (%s char limit). bashrlm_status for info.\n' "${BASHRLM_MAX_CHARS}"
