import {readFile} from 'node:fs/promises';
import {validateReport} from '../src/analysis.js';
const data=validateReport(JSON.parse(await readFile(new URL('../public/data/dashboard.json',import.meta.url),'utf8')));
console.log(`Published report validated: ${data.records.length} responses, ${data.insights.length} findings.`);
