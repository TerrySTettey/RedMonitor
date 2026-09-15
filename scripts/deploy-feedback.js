import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {validateReport} from '../src/analysis.js';
import {checkDeploymentPolicy, repository, reportPath} from './deployment-policy.js';

// Called under the inbox runner's exclusive lock. Git/gh own authentication;
// credentials are never placed in prompts, public files or log arguments.
function command(bin, args, {inherit = false, timeout = 120000} = {}) {
  return execFileSync(bin, args, {encoding: 'utf8', timeout,
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: {...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1'}})?.trim() ?? '';
}
const git = (...args) => command('git', args);
const paths = output => output.split('\0').filter(Boolean);

try {
  const origin = git('remote', 'get-url', 'origin');
  const branch = git('branch', '--show-current');
  const stagedPaths = paths(git('diff', '--cached', '--name-only', '-z'));
  const changedPaths = [...paths(git('diff', '--name-only', '-z')),
    ...paths(git('ls-files', '--others', '--exclude-standard', '-z'))];
  checkDeploymentPolicy({origin, branch, stagedPaths, changedPaths, aheadPaths: [], behind: 0});
  const privateTracked = git('ls-files', '--', '.feedback-work', 'feedback-inbox')
    .split('\n').filter(path => path && path !== 'feedback-inbox/.gitkeep');
  if (privateTracked.length) throw new Error('Private source files are tracked by Git; publishing stopped.');

  command('gh', ['auth', 'status', '--hostname', 'github.com']);
  git('fetch', 'origin', 'main');
  const behind = Number(git('rev-list', '--count', 'HEAD..origin/main'));
  const aheadPaths = git('log', '--format=', '--name-only', 'origin/main..HEAD').split('\n').filter(Boolean);
  checkDeploymentPolicy({origin, branch, stagedPaths, changedPaths, aheadPaths, behind});

  const report = validateReport(JSON.parse(await readFile(reportPath, 'utf8')));
  if (!report.records.length) throw new Error('Refusing to publish an empty report.');
  command('npm', ['test'], {inherit: true});
  command('npm', ['run', 'build'], {inherit: true});
  if (changedPaths.includes(reportPath)) {
    git('add', '--', reportPath);
    git('commit', '-m', `Update anonymous feedback report (${report.records.length} forms)`);
  }
  const head = git('rev-parse', 'HEAD');
  // A failed push leaves a committed report to retry on the next run, even
  // when every source batch is already marked PROCESSED. Never force-push.
  git('push', 'origin', 'HEAD:main');

  let run;
  for (let attempt = 0; attempt < 20; attempt++) {
    const runs = JSON.parse(command('gh', ['run', 'list', '--repo', repository,
      '--workflow', 'deploy.yml', '--commit', head, '--limit', '1',
      '--json', 'databaseId,status,conclusion']));
    run = runs[0];
    if (run) break;
    await delay(3000);
  }
  if (!run) throw new Error('Report pushed, but no Pages workflow run was found. Check GitHub Actions.');
  if (run.status !== 'completed') command('gh', ['run', 'watch', String(run.databaseId),
    '--repo', repository, '--exit-status', '--interval', '10'], {inherit: true, timeout: 15 * 60 * 1000});
  else if (run.conclusion !== 'success') throw new Error(`Pages workflow ${run.databaseId} ended with ${run.conclusion}. Fix/rerun it in GitHub Actions.`);

  const pages = JSON.parse(command('gh', ['api', `repos/${repository}/pages`]));
  const base = new URL(pages.html_url);
  if (base.protocol !== 'https:') throw new Error('Pages did not return an HTTPS website URL.');
  let verified = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const url = new URL(`data/dashboard.json?commit=${head}`, base);
      const response = await fetch(url, {signal: AbortSignal.timeout(20000)});
      if (response.ok && JSON.stringify(await response.json()) === JSON.stringify(report)) {
        verified = true; break;
      }
    } catch { /* Retry while Pages/CDN propagation completes. */ }
    await delay(5000);
  }
  if (!verified) throw new Error('Pages workflow succeeded, but the live report could not be verified. No live-update claim made.');
  console.log(`Verified live dashboard: ${base.href} (${report.records.length} forms; commit ${head}).`);
} catch (error) {
  console.error(`Publishing incomplete: ${error.message}`);
  console.error('The local report is retained. Resolve the issue and run npm run feedback:deploy; do not remove PROCESSED markers.');
  process.exitCode = 1;
}
