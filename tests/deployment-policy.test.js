import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeploymentPolicy, reportPath} from '../scripts/deployment-policy.js';
const base = {origin:'https://github.com/TerrySTettey/RedMonitor.git', branch:'main', stagedPaths:[], changedPaths:[], aheadPaths:[], behind:0};
test('publishing allows new reports and retrying a report-only unpushed commit', () => {
  assert.doesNotThrow(() => checkDeploymentPolicy({...base, changedPaths:[reportPath]}));
  assert.doesNotThrow(() => checkDeploymentPolicy({...base, aheadPaths:[reportPath]}));
});
test('publishing rejects unrelated work, existing staging and remote divergence', () => {
  for (const change of [{changedPaths:['src/main.js']}, {changedPaths:['new-note.txt']},
    {stagedPaths:[reportPath]}, {aheadPaths:['.feedback-work/readings.json']},
    {aheadPaths:['tests/analysis.test.js']}, {behind:1}]) {
    assert.throws(() => checkDeploymentPolicy({...base,...change}));
  }
});
test('publishing cannot accidentally target another repository or branch', () => {
  assert.throws(() => checkDeploymentPolicy({...base,origin:'https://github.com/other/repo.git'}));
  assert.throws(() => checkDeploymentPolicy({...base,branch:'experiment'}));
});
