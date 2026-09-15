# Local automation setup

## Current state

The local runner and Linux user timer are installed and enabled on this computer. The schedule is Monday at 09:00 Africa/Accra for both a desktop reminder and an inbox check; activation was verified on September 15, 2026, with the next run September 21. Publishing targets `TerrySTettey/RedMonitor` on `main`. Codex CLI and GitHub CLI must be installed and signed in. The runner uses saved authentication and account usage limits. Linux `flock` prevents overlapping processing and publishing invocations.

The timer files in `automation/` reference this computer's project path. Install them in the user's systemd configuration and enable `redmonitor-feedback.timer` to activate scheduling. Verify activation with `systemctl --user list-timers redmonitor-feedback.timer`. A persistent timer catches up a missed run when the user service manager next starts; it does not wake a powered-off computer. Desktop notifications require a running notification session. Logs are available with `journalctl --user -u redmonitor-feedback.service`.

The reminder and check happen together. Files uploaded afterward can be processed with `npm run feedback:process`, or wait until the next Monday. The task does not wait for a chat response or watch for uploads continuously.

## Add a batch

1. Create `feedback-inbox/YYYY-MM-DD_to_YYYY-MM-DD/` using the supplied reporting period.
2. Copy all scans/photos into it. Keep original files and private manifests backed up privately.
3. Once copying is finished, create an empty file called `READY` inside that folder.
4. Run `npm run feedback:process`, or let the enabled Monday timer run it.

The task visually reads ready batches using Codex and follows `docs/LOCAL_FEEDBACK_TASK.md`. It records a `PROCESSED` marker after a successful local update. Logs and summaries stay under `.feedback-work/automation/`. Existing historical inbox files are not automatically reprocessed. Ask interactively for corrections to an already processed batch.

Review the first automated real batch end to end. AI visual reading and anonymity still need quality review; passing programmatic checks does not prove either. Existing analysis tests use an anonymous historical fixture so new forms do not require changing test expectations; `scripts/validate-data.js` validates the current published report.

## Publishing and retries

After extraction, or when no new batches are ready, the runner executes `scripts/deploy-feedback.js` under the same exclusive lock. It checks the expected repository, branch, uncommitted work and remote history; runs tests and the build; stages only `public/data/dashboard.json`; commits and pushes; waits for the Pages workflow; and compares the live JSON with the local report.

Unrelated edits, staged files, unexpected remotes, tracked private source files, remote commits requiring reconciliation, or unpushed commits changing files outside the report stop publication. Resolve these interactively; the task does not force-push or merge your work automatically. Keep the checkout free of unrelated edits before a scheduled run.

If a push or deployment fails, the valid local report and `PROCESSED` markers stay intact. Run `npm run feedback:deploy` to retry publishing without extracting again. A failed Actions run must be fixed/rerun in GitHub. A successful local extraction is not proof of deployment: look for `Verified live dashboard` in the private run log.

The publisher needs GitHub CLI on PATH, Git configured to use its credentials, and Pages set to GitHub Actions. Authentication can expire; reauthenticate locally if the logs request it. Never paste credentials into prompts or commit them.

## Remaining setup

- Test the first real batch and confirm desktop notification delivery. The enabled timer sends a local desktop notification, not a ChatGPT message. It needs the computer on and network access for Codex, but not the desktop app. It uses this existing checkout because private inbox files are excluded from Git worktrees.
- Pages is enabled using GitHub Actions. With the owner's approval, the repository was made public on September 15, 2026, to use free Pages hosting. The dashboard URL is https://terrystettey.github.io/RedMonitor/.

Never stage scans, private logs or source manifests. The raw inbox is not uploaded to GitHub.
