#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$project_dir"
umask 077
mkdir -p .feedback-work/automation

# Keep overlapping timer/manual runs from processing the same forms.
exec 9>.feedback-work/automation/run.lock
flock -n 9 || { printf '%s\n' 'Another feedback run is active.'; exit 0; }
run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
log_base="$project_dir/.feedback-work/automation/$run_id"
on_exit() {
  result=$?
  if [[ "$result" != 0 && "${1:-}" == --scheduled ]]; then
    notify-send 'Hotel feedback needs attention' "Run failed. Check $log_base.log and the user service journal. The live update has not been verified." || true
  fi
}
trap 'on_exit "${1:-}"' EXIT

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
if [[ "${1:-}" == --publish-only ]]; then pending=false; fi
if [[ "$pending" == false ]]; then
  printf '%s\n' 'No extraction requested or no completed new batches. Checking publishing status.'
else
  command -v codex >/dev/null || { printf '%s\n' 'Codex CLI is not installed or not on PATH.' >&2; exit 1; }
  printf 'Processing new batches. Private log: %s.log\n' "$log_base"
  codex exec --cd "$project_dir" --sandbox workspace-write \
  --output-last-message "$log_base-summary.txt" - \
  < docs/LOCAL_FEEDBACK_TASK.md > "$log_base.log" 2>&1
  cat -- "$log_base-summary.txt"
fi

# This trusted wrapper, not document content or the AI task, controls GitHub
# publishing. The separate publisher validates, stages only the report, and
# retries committed-but-unpushed updates without reading scans again.
node scripts/deploy-feedback.js 2>&1 | tee -a "$log_base.log"
if [[ "${1:-}" == --scheduled ]]; then
  notify-send 'Hotel feedback run finished' \
    "Dashboard deployment verified. Review the private log: $log_base.log" || true
fi
