import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateReport,summarize,filterRecords,frequency} from '../src/analysis.js';
// Preserve the reviewed first batch as a regression fixture as live data grows.
const source=JSON.parse(readFileSync(new URL('./fixtures/initial-report.json',import.meta.url),'utf8'));
const report=()=>structuredClone(source);
test('scan inventory reconciles to distinct forms, excluding missing and duplicate evidence',()=>{
 const d=validateReport(report());
 assert.equal(d.records.length,180);
 assert.deepEqual(d.periods.map(p=>p.observedForms===null?null:p.observedForms-p.duplicateForms),[null,26,26,7,18,12,44,40,7]);
 assert.equal(d.periods.reduce((n,p)=>n+p.scannedPages,0),127);
 assert.equal(d.periods.reduce((n,p)=>n+p.duplicateForms,0),5);
 const s=summarize(d.records);assert.deepEqual(s.sentiments,{Positive:92,Mixed:78,Negative:9,Neutral:0,Unclear:1});
 assert.equal(s.areas.find(a=>a.name==='Food variety').concerns,19);
 assert.equal(s.areas.find(a=>a.name==='Room security').concerns,2);
});
test('means use answered native items, with missing and unclear marks excluded',()=>{
 const a={scores:[4,null,2],uncertainItems:[1],sentiment:'Mixed',concerns:['Food variety'],praises:['Service']};
 const b={...a,scores:[1,null,null],sentiment:'Negative',uncertainItems:[]};
 const s=summarize([a,b]);assert.equal(s.average,7/3);assert.equal(s.answered,3);assert.equal(s.uncertain,1);assert.equal(s.concerns,2);assert.equal(summarize([]).average,null);
});
test('date selection includes complete crossing-month periods and preserves missing as unknown',()=>{
 const d=report();const rows=filterRecords(d,{from:'2026-07-27',through:'2026-08-03'});assert.equal(rows.length,33);
 assert.deepEqual(frequency(d,rows,'2026-07-27','2026-08-03').map(p=>p.count),[26,7]);
 const missing=frequency(d,filterRecords(d,{through:'2026-06-02'}),'','2026-06-02');assert.equal(missing[0].count,null);
 assert.equal(filterRecords(d,{from:'2026-07-13',through:'2026-07-13',sentiment:'Negative'}).length,0);
 assert.equal(frequency(d,[], '2026-07-13','2026-07-13')[0].count,0);
});
test('filters combine sentiment, areas and search without assigning whole-form polarity to each area',()=>{
 const d=report();const found=filterRecords(d,{area:'Pest control',sentiment:'Mixed'});assert.equal(found.length,3);
 assert.ok(found.every(r=>r.concerns.includes('Pest control')));
 assert.equal(filterRecords(d,{query:found[0].id}).length,1);
 const s=summarize([{scores:[],uncertainItems:[],sentiment:'Mixed',concerns:['Amenities'],praises:['Service']}]);
 assert.equal(s.areas.find(a=>a.name==='Service').concerns,0);assert.equal(s.areas.find(a=>a.name==='Service').praises,1);
});
test('schema rejects private fields, invented scales, inconsistent coverage and invalid source dates',()=>{
 for(const key of ['email','filename','roomNumber','guestName','rawText']){const d=report();d.records[0][key]='private';assert.throws(()=>validateReport(d),/Unexpected field/);}
 for(const mutate of [d=>d.records[0].scores[0]=5,d=>d.records[0].scores[0]='4',d=>d.records[0].periodId='period-001',d=>d.records[0].uncertainItems=[0],d=>d.periods[1].observedForms++,d=>d.periods[0].observedForms=0,d=>d.periods[1].start='2026-02-30',d=>d.records[0].concerns=['guest@example.com'],d=>d.records[0].id='Jane-Smith',d=>d.records[1].id=d.records[0].id]){const d=report();mutate(d);assert.throws(()=>validateReport(d));}
});
test('evidence references must exist and cannot be repeated',()=>{
 for(const ids of [['response-99999'],['response-001','response-001'],[]]){const d=report();d.insights[0].responseIds=ids;assert.throws(()=>validateReport(d),/existing, distinct/);}
});
test('priority findings reference only forms supporting the specific concern',()=>{
 for(const [title,area] of [['Check room locks promptly','Room security'],['Investigate pest reports','Pest control']]){
  const i=source.insights.find(i=>i.title===title);assert.equal(i.priority,'high');assert.ok(i.responseIds.every(id=>source.records.find(r=>r.id===id).concerns.includes(area)));
 }
});

test('selected periods use prepared findings with evidence restricted to their own period',async()=>{
 const {selectInsights}=await import('../src/analysis.js');
 assert.deepEqual(selectInsights(source),source.insights);
 for(const p of source.periods){
  const found=selectInsights(source,{from:p.start,through:p.start});
  if(p.status==='missing'){assert.deepEqual(found,[]);continue;}
  assert.ok(found.length>0);
  assert.ok(found.every(i=>i.periodId===p.id&&i.responseIds.every(id=>source.records.find(r=>r.id===id).periodId===p.id)));
 }
 const july=selectInsights(source,{from:'2026-07-13',through:'2026-07-19'});
 assert.ok(!july.some(i=>i.title.includes('locks')||i.title.includes('pest')));
 const range=selectInsights(source,{from:'2026-08-24',through:'2026-08-31'});
 assert.deepEqual([...new Set(range.map(i=>i.periodId))],['period-007','period-008']);
 const invalid=report();invalid.periodInsights[0].responseIds=[invalid.records.find(r=>r.periodId!==invalid.periodInsights[0].periodId).id];
 assert.throws(()=>validateReport(invalid),/Period insight evidence/);
});
