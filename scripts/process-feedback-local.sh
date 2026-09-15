#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$project_dir"
umask 077
mkdir -p .feedback-work/automation

# Keep overlapping timer/manual runs from processing the same forms.
exec 9>.feedback-work/automation/run.lock
flock -n 9 || { printf '%s\n' 'Another feedback run is active.'; exit 0; }

if [[ "${1:-}" == --scheduled ]]; then
  notify-send 'Hotel feedback reminder' \
    'Add the latest forms to a dated feedback-inbox folder, then create READY. Run npm run feedback:process after uploading to process them today.' || true
fi

pending=false
for batch in feedback-inbox/*/; do
  if [[ -f "${batch}READY" && ! -e "${batch}PROCESSED" ]]; then
    pending=true
    break
  fi
done
if [[ "$pending" == false ]]; then
  printf '%s\n' 'No completed new batches. Add forms to a dated inbox folder, then create READY.'
  exit 0
fi

command -v codex >/dev/null || { printf '%s\n' 'Codex CLI is not installed or not on PATH.' >&2; exit 1; }
run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
log_base="$project_dir/.feedback-work/automation/$run_id"
printf 'Processing new batches. Private log: %s.log\n' "$log_base"
codex exec --cd "$project_dir" --skip-git-repo-check --sandbox workspace-write \
  --output-last-message "$log_base-summary.txt" - \
  < docs/LOCAL_FEEDBACK_TASK.md > "$log_base.log" 2>&1
cat -- "$log_base-summary.txt"
if [[ "${1:-}" == --scheduled ]]; then
  notify-send 'Hotel feedback run finished' \
    "Review the private summary: $log_base-summary.txt. GitHub publishing is not configured." || true
fi
