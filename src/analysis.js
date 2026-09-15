// Totals and validation only. AI readings and classifications are prepared offline.
export const SENTIMENTS = ['Positive', 'Mixed', 'Negative', 'Neutral', 'Unclear'];
export const AREA_GROUPS = {
  'Food & dining': ['Food', 'Food variety', 'Food availability', 'Food flavour', 'Food freshness', 'Food portions', 'Food presentation', 'Food temperature', 'Order accuracy'],
  'Rooms & housekeeping': ['Amenities', 'Bathroom supplies', 'Room cleanliness', 'Room comfort', 'Room maintenance', 'Housekeeping speed'],
  'Service': ['Service', 'Service attentiveness', 'Service speed', 'Staff friendliness', 'Staff professionalism', 'Staff presentation', 'Menu explanation', 'Order communication', 'Communication', 'Complaint resolution', 'Guest orientation', 'Table clearing'],
  'Recreation': ['Recreation', 'Recreation quality', 'Recreation variety', 'Recreation availability', 'Activity information'],
  'Setting & facilities': ['Access road', 'Wayfinding', 'Entrance appearance', 'Ambience', 'Location', 'Venue cleanliness', 'Outdoor comfort', 'Outdoor lighting', 'Noise', 'Wi-Fi', 'Power reliability', 'Water supply', 'Facilities'],
  'Safety & hygiene': ['Pest control', 'Room security'],
  'Overall experience & value': ['Overall experience', 'Value', 'General improvement'],
};
export const AREAS = Object.values(AREA_GROUPS).flat();
export const ITEMS = [
  ['Accommodation', 'Room cleanliness', 'Room cleanliness'], ['Accommodation', 'Overall room condition', 'Room maintenance'], ['Accommodation', 'Amenities', 'Amenities'],
  ['Food', 'Portion size', 'Food portions'], ['Food', 'Flavour', 'Food flavour'], ['Food', 'Presentation', 'Food presentation'], ['Food', 'Choice', 'Food variety'], ['Food', 'Freshness', 'Food freshness'],
  ['Recreation', 'Quality of activities', 'Recreation quality'], ['Recreation', 'Variety of activities', 'Recreation variety'],
  ['Service', 'Friendliness', 'Staff friendliness'], ['Service', 'Professionalism', 'Staff professionalism'], ['Service', 'Explanation of menu', 'Menu explanation'], ['Service', 'Speediness of service', 'Service speed'], ['Service', 'Staff presentation', 'Staff presentation'],
  ['Venue', 'Ambience', 'Ambience'], ['Venue', 'Cleanliness', 'Venue cleanliness'], ['Venue', 'Location', 'Location'],
];
export const SCALE = ['Needs improvement', 'Average', 'Good', 'Excellent'];
function object(v, keys, label) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Invalid ${label}.`);
  if (Object.keys(v).some(k => !keys.includes(k))) throw new Error(`Unexpected field in ${label}. Remove private or unsupported fields.`);
}
function text(v, max, label, empty = false) {
  if (typeof v !== 'string' || v.length > max || (!empty && !v.trim())) throw new Error(`Invalid ${label}.`);
  return v.trim();
}
function list(v, label, max = 50000) { if (!Array.isArray(v) || v.length > max) throw new Error(`Invalid ${label}.`); }
function date(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v; }
function integer(v) { return Number.isInteger(v) && v >= 0; }
export function validateReport(data) {
  object(data, ['version','hotelName','publishedAt','executiveSummary','periods','records','insights','periodInsights'], 'report');
  if (data.version !== 3) throw new Error('Expected report version 3.');
  text(data.hotelName,100,'hotel name'); text(data.executiveSummary,4000,'executive summary',true);
  if (data.publishedAt !== null && (typeof data.publishedAt !== 'string' || !Number.isFinite(Date.parse(data.publishedAt)))) throw new Error('Invalid publication timestamp.');
  list(data.periods,'periods',1000); list(data.records,'records'); list(data.insights,'insights',50);
  const periods = new Map();
  for (const p of data.periods) {
    object(p,['id','label','start','end','status','scannedPages','blankPages','observedForms','duplicateForms','note'],'reporting period');
    if (!/^period-\d{3,8}$/.test(p.id) || periods.has(p.id)) throw new Error('Invalid or duplicate reporting period ID.');
    if (!date(p.start) || !date(p.end) || p.start > p.end) throw new Error('Invalid period dates.');
    text(p.label,100,'period label'); text(p.note,1500,'period note',true);
    if (!['scanned','missing'].includes(p.status)) throw new Error('Invalid source status.');
    if (![p.scannedPages,p.blankPages,p.duplicateForms].every(integer) || p.blankPages > p.scannedPages) throw new Error('Invalid source counts.');
    if (p.status === 'missing' ? p.observedForms !== null || p.scannedPages !== 0 || p.duplicateForms !== 0 : !integer(p.observedForms) || p.scannedPages === 0 || p.duplicateForms > p.observedForms) throw new Error('Invalid source coverage.');
    periods.set(p.id,p);
  }
  const ids = new Set();
  for (const r of data.records) {
    object(r,['id','periodId','scores','uncertainItems','sentiment','concerns','praises','summary'],'feedback record');
    if (typeof r.id !== 'string' || !/^response-\d{3,8}$/.test(r.id) || ids.has(r.id)) throw new Error('Use a unique anonymous ID such as response-001.');
    ids.add(r.id);
    if (periods.get(r.periodId)?.status !== 'scanned') throw new Error('Every response must belong to a scanned reporting period.');
    if (!Array.isArray(r.scores) || r.scores.length !== ITEMS.length || r.scores.some(v => v !== null && (!Number.isInteger(v) || v < 1 || v > 4))) throw new Error('Provide 18 native item scores: 1–4 or null.');
    list(r.uncertainItems,'uncertain items',18);
    if (new Set(r.uncertainItems).size !== r.uncertainItems.length || r.uncertainItems.some(i => !integer(i) || i >= 18 || r.scores[i] !== null)) throw new Error('Uncertain items must point to distinct null scores.');
    if (!SENTIMENTS.includes(r.sentiment)) throw new Error('Invalid sentiment.');
    for (const field of ['concerns','praises']) {
      list(r[field],field,AREAS.length);
      if (new Set(r[field]).size !== r[field].length || r[field].some(t => !AREAS.includes(t))) throw new Error('Invalid feedback areas.');
    }
    text(r.summary,1500,'anonymous summary');
  }
  for (const p of periods.values()) {
    if (p.status === 'scanned' && data.records.filter(r => r.periodId === p.id).length + p.duplicateForms !== p.observedForms) throw new Error('Source form counts do not reconcile with responses and duplicates.');
  }
  if (data.periodInsights !== undefined) list(data.periodInsights,'period insights',10000);
  for (const i of [...data.insights, ...(data.periodInsights || [])]) {
    object(i,['type','priority','title','detail','recommendation','responseIds','periodId'],'insight');
    if (!['strength','opportunity','observation'].includes(i.type) || !['high','routine'].includes(i.priority)) throw new Error('Invalid insight type or priority.');
    list(i.responseIds,'insight evidence');
    if (!i.responseIds.length || new Set(i.responseIds).size !== i.responseIds.length || i.responseIds.some(id => !ids.has(id))) throw new Error('Insights must reference existing, distinct response IDs.');
    if ((data.periodInsights || []).includes(i) && (periods.get(i.periodId)?.status !== 'scanned' || i.responseIds.some(id => data.records.find(r => r.id === id).periodId !== i.periodId))) throw new Error('Period insight evidence must belong to its scanned reporting period.');
    text(i.title,150,'insight title'); text(i.detail,2000,'insight detail'); text(i.recommendation,1000,'recommendation',true);
  }
  return structuredClone(data);
}
export function summarize(rows) {
  const scores = rows.flatMap(r => r.scores).filter(v => v !== null);
  const sentiments = Object.fromEntries(SENTIMENTS.map(s => [s, rows.filter(r => r.sentiment === s).length]));
  return {count:rows.length, sentiments, answered:scores.length, average:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,
    uncertain:rows.reduce((n,r)=>n+r.uncertainItems.length,0), concerns:rows.filter(r=>r.concerns.length).length,
    areas:AREAS.map(name=>({name,concerns:rows.filter(r=>r.concerns.includes(name)).length,praises:rows.filter(r=>r.praises.includes(name)).length})).filter(a=>a.concerns||a.praises).sort((a,b)=>b.concerns-a.concerns||b.praises-a.praises||a.name.localeCompare(b.name))};
}
export function filterRecords(report, {from='',through='',sentiment='all',area='all',query=''} = {}) {
  const selected = new Set(report.periods.filter(p=>(!from||p.start>=from)&&(!through||p.start<=through)).map(p=>p.id));
  return report.records.filter(r => selected.has(r.periodId) && (sentiment==='all'||r.sentiment===sentiment) && (area==='all'||r.concerns.includes(area)||r.praises.includes(area)) && (!query||`${r.id} ${r.summary} ${r.concerns.join(' ')} ${r.praises.join(' ')}`.toLowerCase().includes(query.toLowerCase())));
}
export function frequency(report, rows, from='', through='') {
  return [...report.periods].sort((a,b)=>a.start.localeCompare(b.start)).filter(p=>(!from||p.start>=from)&&(!through||p.start<=through)).map(p=>({...p,count:p.status==='missing'?null:rows.filter(r=>r.periodId===p.id).length}));
}

// Select prepared findings only; never generate recommendations in the browser.
export function selectInsights(report, {from='',through=''} = {}) {
  if (!from && !through) return report.insights;
  const ids = new Set(report.periods.filter(p=>(!from||p.start>=from)&&(!through||p.start<=through)).map(p=>p.id));
  return (report.periodInsights || []).filter(i=>ids.has(i.periodId));
}
