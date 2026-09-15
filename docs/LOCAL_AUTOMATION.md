# Local automation setup

## Current state

The local runner and Linux user timer are installed and enabled on this computer. The schedule is Monday at 09:00 Africa/Accra for both a desktop reminder and an inbox check; activation was verified on September 15, 2026, with the next run September 21. GitHub publishing is not configured. Codex CLI must be installed and signed in. The runner uses its saved authentication and account usage limits. Linux `flock` prevents overlapping runner invocations.

The timer files in `automation/` reference this computer's project path. Install them in the user's systemd configuration and enable `redmonitor-feedback.timer` to activate scheduling. Verify activation with `systemctl --user list-timers redmonitor-feedback.timer`. A persistent timer catches up a missed run when the user service manager next starts; it does not wake a powered-off computer. Desktop notifications require a running notification session. Logs are available with `journalctl --user -u redmonitor-feedback.service`.

The reminder and check happen together. Files uploaded afterward can be processed with `npm run feedback:process`, or wait until the next Monday. The task does not wait for a chat response or watch for uploads continuously.

## Add a batch

1. Create `feedback-inbox/YYYY-MM-DD_to_YYYY-MM-DD/` using the supplied reporting period.
2. Copy all scans/photos into it. Keep original files and private manifests backed up privately.
3. Once copying is finished, create an empty file called `READY` inside that folder.
4. Run `npm run feedback:process`, or let the configured timer run it once scheduling is installed.

The task visually reads ready batches using Codex and follows `docs/LOCAL_FEEDBACK_TASK.md`. It records a `PROCESSED` marker after a successful local update. Logs and summaries stay under `.feedback-work/automation/`. Existing historical inbox files are not automatically reprocessed. Ask interactively for corrections to an already processed batch.

The first real batch must be checked end to end before enabling unattended processing. AI visual reading and anonymity still need quality review; passing programmatic checks does not prove either.

## Remaining setup

- Test the first real batch and confirm desktop notification delivery. The enabled timer sends a local desktop notification, not a ChatGPT message. It needs the computer on and network access for Codex, but not the desktop app. It uses this existing checkout because private inbox files are excluded from Git worktrees.
- Create/connect the GitHub repository, configure Git authentication and enable Pages using the existing workflow.
- Extend publishing with explicit staging of intended website changes, validation, push and deployment verification. Never stage scans, private logs or source manifests.

Until that publishing step is configured, this runner updates the local dashboard only. A failed push must be retryable without processing the forms again.
