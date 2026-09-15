import {readFile, writeFile, rename, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {validateReport} from '../src/analysis.js';

const input=process.argv[2];
if(!input){console.error('Usage: npm run publish:report -- .feedback-work/report.json');process.exit(1);}
try {
 const candidate=JSON.parse(await readFile(resolve(input),'utf8'));
 const report=validateReport({...candidate,publishedAt:new Date().toISOString()});
 if(!report.records.length)throw new Error('The prepared report has no responses. The current public report has been preserved.');
 const destination=new URL('../public/data/dashboard.json',import.meta.url);
 const temporary=new URL('../public/data/dashboard.json.tmp',import.meta.url);
 await mkdir(new URL('../public/data/',import.meta.url),{recursive:true});
 await writeFile(temporary,JSON.stringify(report,null,2)+'\n');
 await rename(temporary,destination);
 console.log(`Updated public/data/dashboard.json: ${report.records.length} responses, ${report.insights.length} findings.`);
 console.log('This updates the local website data. Commit and push the public report to deploy through GitHub Pages.');
} catch(error){console.error(`Report not published: ${error.message}`);process.exit(1);}
