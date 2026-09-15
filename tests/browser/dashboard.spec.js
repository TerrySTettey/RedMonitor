import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../../public/data/dashboard.json',import.meta.url),'utf8'));
test('real scan findings load with native scores, evidence and no document tools',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.locator('.stat-value').first()).toHaveText('180');await expect(page.locator('#hotel-name')).toHaveText('Reddington Chalets');
 await expect(page.getByRole('heading',{name:'Feedback frequency'})).toBeVisible();
 await expect(page.locator('.stat').nth(1)).toContainText('out of 4');
 await expect(page.getByRole('heading',{name:'Check room locks promptly'})).toBeVisible();
 await page.locator('.evidence summary').first().click();await expect(page.locator('.evidence').first().locator('li')).toHaveCount(2);
 await expect(page.locator('input[type=file]')).toHaveCount(0);await expect(page.getByRole('button',{name:/upload|ocr|scan documents/i})).toHaveCount(0);expect(errors).toEqual([]);
});
test('period range and sentiment filters reconcile to source data',async({page})=>{
 await page.goto('/');await expect(page.locator('.stat-value').first()).toHaveText('180');
 await page.locator('#from').selectOption('2026-07-27');await page.locator('#through').selectOption('2026-08-03');
 await expect(page.locator('.stat-value').first()).toHaveText('33');await expect(page.locator('.frequency-row')).toHaveCount(2);
 await page.locator('#reset').click();await page.getByRole('button',{name:'2–28 Jun 2026: scans missing'}).click();
 await expect(page.locator('.stat-value').first()).toHaveText('0');await expect(page.locator('.missing-label')).toHaveText('Scans missing');
 await expect(page.locator('.frequency-row strong')).toHaveText('—');await page.locator('#reset').click();
 await page.locator('#sentiment').selectOption('Mixed');await expect(page.locator('.stat-value').first()).toHaveText('78');
});
test('area drill-down, search, zero neutral and unclear evidence work',async({page})=>{
 await page.goto('/');await expect(page.locator('.stat-value').first()).toHaveText('180');
 await page.locator('.area-row[data-area="Pest control"]').click();await expect(page.locator('#result-count')).toHaveText('3 forms');
 await expect(page.locator('.response-card')).toHaveCount(3);await page.locator('.score-detail summary').first().click();
 await expect(page.locator('.score-detail[open] dt')).toHaveCount(18);
 await page.getByRole('searchbox').fill('conference');await expect(page.locator('.response-card')).toHaveCount(1);
 await page.locator('#reset').click();await page.locator('#sentiment').selectOption('Neutral');await expect(page.getByText('No feedback in this view')).toBeVisible();
 await page.locator('#sentiment').selectOption('Unclear');await expect(page.locator('.response-card')).toHaveCount(1);await expect(page.locator('.response-card')).toContainText('cut off');
 await page.locator('#reset').click();await expect(page.locator('.response-card')).toHaveCount(30);await page.locator('#show-more').click();await expect(page.locator('.response-card')).toHaveCount(60);
});
test('invalid report fails visibly without fictional replacement',async({page})=>{
 await page.route('**/data/dashboard.json',route=>route.fulfill({json:{version:2,records:[]}}));await page.goto('/');await expect(page.getByRole('alert')).toContainText('could not be loaded');await expect(page.locator('.stat-value').first()).toHaveText('0');
});
test('mobile and desktop report pages fit and produce no runtime errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.stat-value').first()).toHaveText(String(data.records.length));
 for(const name of ['Overview','Feedback','Insights']){await page.getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 await page.getByRole('button',{name:'Overview',exact:true}).click();await page.screenshot({path:'/tmp/redmonitor-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'/tmp/redmonitor-desktop.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('button',{name:'About this report',exact:true}).last().click();await expect(page.getByRole('heading',{name:'Source coverage & limitations'})).toBeVisible();expect(errors).toEqual([]);
});

test('recommendations and their evidence change with the reporting-period range',async({page})=>{
 await page.goto('/');await expect(page.locator('.stat-value').first()).toHaveText('180');
 await page.getByRole('button',{name:'Insights',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Check room locks promptly'})).toBeVisible();
 await page.locator('#from').selectOption('2026-07-13');await page.locator('#through').selectOption('2026-07-13');
 await expect(page.getByRole('heading',{name:'Check room locks promptly'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Investigate pest reports'})).toHaveCount(0);
 const july=data.periodInsights.filter(i=>i.periodId==='period-002');
 await expect(page.locator('.insight')).toHaveCount(july.length);
 await expect(page.locator('.insight-period').first()).toHaveText('13–19 Jul 2026');
 await page.locator('.evidence summary').first().click();
 await expect(page.locator('.evidence').first().locator('li')).toHaveCount(july[0].responseIds.length);
 await expect(page.locator('.insight').first()).toContainText(july[0].recommendation);
 await page.locator('#from').selectOption('2026-09-07');
 await expect(page.locator('.insight-period').first()).toHaveText('7–13 Sep 2026');
 await expect(page.getByRole('heading',{name:'Improve food choice and availability'})).toBeVisible();
 await page.locator('#from').selectOption('2026-06-02');await page.locator('#through').selectOption('2026-06-02');
 await expect(page.getByText('No prepared findings for this period')).toBeVisible();
 await page.locator('#reset').click();await expect(page.getByRole('heading',{name:'Check room locks promptly'})).toBeVisible();
});
