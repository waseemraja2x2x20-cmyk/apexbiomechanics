import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
const context = await browser.newContext({ viewport:{width:390,height:844} });
const page = await context.newPage();
page.setDefaultTimeout(15000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
let profile=null, sessions=[], rejectSaves=false;
await page.route('**/api/history',async route=>{
  const req=route.request();
  const method=req.method();
  if (rejectSaves && method==='POST') return route.fulfill({status:503,json:{error:'unavailable'}});
  if(method==='PUT') { const b=req.postDataJSON(); profile={name:b.name,shield:b.shield?'on':'off'}; }
  if(method==='POST') { const b=req.postDataJSON(); if(!sessions.some(x=>x.id===b.id)) sessions.unshift(b); }
  if(method==='DELETE') { sessions=[]; profile=null; }
  return route.fulfill({json:method==='GET'?{profile,history:sessions}:{ok:true}});
});
await page.addInitScript(()=>{
  const stream=document.createElement('canvas').captureStream();
  navigator.mediaDevices.getUserMedia=async()=>stream;
  HTMLMediaElement.prototype.play=async()=>{};
  Object.defineProperties(HTMLVideoElement.prototype,{videoWidth:{get:()=>640},videoHeight:{get:()=>480},readyState:{get:()=>4},currentTime:{get:()=>performance.now()/1000}});
});
await page.route('**/vision_bundle.mjs', route=>route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:`
export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={createFromOptions:async()=>({detectForVideo(video,now){
const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99}));
p[7]={x:.52,y:.15,visibility:.99};p[8]={x:.53,y:.15,visibility:.99};
p[11]={x:.5,y:.3,visibility:.99};p[12]={x:.51,y:.3,visibility:.99};
p[23]={x:.5,y:.55,visibility:.99};p[24]={x:.51,y:.55,visibility:.99};
const low=now%2400>1200;
p[25]={x:low?.6:.5,y:.7,visibility:.99};p[26]={x:low?.61:.51,y:.7,visibility:.99};
p[27]={x:.5,y:.85,visibility:.99};p[28]={x:.51,y:.85,visibility:.99};
p[13]={x:low?.6:.5,y:.4,visibility:.99};p[14]={x:low?.61:.51,y:.4,visibility:.99};
p[15]={x:.5,y:.5,visibility:.99};p[16]={x:.51,y:.5,visibility:.99};
return {landmarks:window.__noPose?[]:[p]};}})};
`}));
await page.clock.install({time:new Date('2026-10-30T12:00:00Z')});
await page.goto(process.env.APEX_TEST_URL || 'http://localhost:8889'); 
await page.locator('#profile-dialog').waitFor({state:'visible'});
await page.locator('#profile-name').fill('River');
await page.getByRole('button',{name:'Save preferences'}).click();
await page.locator('#profile-dialog').waitFor({state:'hidden'}); 
assert.match(await page.locator('#greeting').textContent(),/River/);
assert.equal(await page.locator('#scan-summary').textContent(),'No data yet, run your first scan');
await page.waitForFunction(()=>document.querySelector('#exercise-status').textContent.includes('found'));
await page.locator('#exercise-search').fill('squat');
assert.ok(await page.locator('.exercise-guide').count()>0);
await page.locator('.exercise-guide summary').first().click();
await page.locator('.exercise-guide ol li').first().waitFor();
assert.ok(await page.locator('.exercise-guide img').count()>0);
await page.locator('#muscle-filter').selectOption('quadriceps');
await page.locator('#equipment-filter').selectOption('body only');
assert.ok(await page.locator('.exercise-guide').count()>0);
await page.locator('#exercise-search').fill('zzzznonexistent');
assert.match(await page.locator('#exercise-status').textContent(),/No exercises match/);
await page.locator('[data-action="scan"]').click();
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('ready'));
await page.clock.runFor(61000);
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('saved'));
assert.equal(sessions[0].kind,'scan'); assert.ok(sessions[0].result.average>0);
assert.match(await page.locator('#scan-summary').textContent(),/Average/);
await page.locator('#close-camera').click();
const downloadPromise=page.waitForEvent('download');
await page.locator('[data-action="export"]').click();
const downloaded=await downloadPromise; assert.equal(downloaded.suggestedFilename(),'apex-movement-result.png');
const filePath=await downloaded.path();
const {readFile}=await import('node:fs/promises');
const bytes=await readFile(filePath); assert.equal(bytes.subarray(1,4).toString(),'PNG');
await page.locator('[data-action="rep"]').click();
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('ready'));
await page.clock.runFor(46000);
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('saved'));
assert.equal(sessions[0].kind,'rep'); assert.ok(sessions[0].result.reps>5);
await page.locator('#close-camera').click();
await page.locator('#rep-exercise').selectOption('push-up');
await page.locator('[data-action="rep"]').click();
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('ready'));
await page.clock.runFor(46000);
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('saved'));
assert.equal(sessions[0].result.exercise,'push-up'); assert.ok(sessions[0].result.reps>5);
await page.locator('#close-camera').click();
await page.locator('[data-reset="chin"]').first().click();
await page.locator('#begin-reset').click();
await page.clock.runFor(46000);
await page.waitForFunction(()=>document.querySelector('#reset-status').textContent.includes('complete and saved'));
assert.equal(sessions[0].kind,'break');
await page.locator('#cancel-reset').click();
assert.equal(await page.locator('#today-breaks').textContent(),'1 / 5');
await page.locator('#shield-toggle').check();
await page.clock.fastForward(30*60*1000+1000);
assert.equal(await page.locator('#shield-reminder').isVisible(),true);
await page.locator('#dismiss-reminder').click();
assert.equal(await page.locator('#shield-reminder').isVisible(),false);
// Crossing the user's local midnight clears the daily count without deleting history.
await page.clock.setSystemTime(new Date('2026-10-31T01:00:00Z'));
await page.clock.runFor(1100);
assert.equal(await page.locator('#today-breaks').textContent(),'0 / 5');
// A failed save keeps the result available and a retry does not duplicate it.
rejectSaves=true;
await page.locator('[data-action="scan"]').click();
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('ready'));
await page.clock.runFor(61000);
await page.locator('#save-result').waitFor({state:'visible'});
const count=sessions.length; rejectSaves=false;
await page.locator('#save-result').click();
await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('saved'));
assert.equal(sessions.length,count+1);
await page.locator('#close-camera').click();
// The first-scan onboarding is not shown on reload after saving a profile.
await page.reload();
await page.waitForFunction(()=>document.querySelector('#history-status').textContent.includes('Showing'));
assert.equal(await page.locator('#profile-dialog').isVisible(),false);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
// Browser integration fixtures use synthetic landmarks and a mocked history API.
// They do not write test records to the deployed database.
// Browser camera failures are actionable, and the dialog remains keyboard-dismissable.
for (const [name, expected] of [['NotAllowedError','denied'],['NotFoundError','No camera'],['NotReadableError','busy']]) {
  await page.evaluate((name)=>{ navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('test',name)}; },name);
  await page.locator('[data-action="scan"]').click();
  await page.waitForFunction((expected)=>document.querySelector('#camera-status').textContent.includes(expected),expected);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#camera-dialog').isVisible(),false);
}
assert.deepEqual(errors,[]);
console.log('Browser checks passed: onboarding, 876-exercise catalog, filters, 60s scan, squat and push-up reps, timer completion, reminders, midnight reset, save retry, PNG bytes, reload, mobile overflow, camera denial/missing/busy, keyboard dismissal.');
await browser.close();
