export const repository = 'TerrySTettey/RedMonitor';
export const reportPath = 'public/data/dashboard.json';

export function checkDeploymentPolicy({origin, branch, changedPaths, stagedPaths, aheadPaths, behind}) {
  const allowedOrigins = [`https://github.com/${repository}.git`, `https://github.com/${repository}`, `git@github.com:${repository}.git`];
  if (!allowedOrigins.includes(origin)) throw new Error('Unexpected Git remote; publishing is restricted to TerrySTettey/RedMonitor.');
  if (branch !== 'main') throw new Error('Switch to main before publishing feedback.');
  if (stagedPaths.length) throw new Error('There are staged changes. Finish or unstage that work before automated publishing.');
  if (changedPaths.some(path => path !== reportPath)) throw new Error('Unrelated working-tree changes are present. Commit or resolve them before automated publishing.');
  if (behind > 0) throw new Error('GitHub has new commits. Reconcile the local branch interactively before publishing.');
  if (aheadPaths.some(path => path !== reportPath)) throw new Error('Unpushed commits include changes outside the report. Publish those changes interactively first.');
}
