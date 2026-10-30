import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSession } from '../session-validation.mjs';
const scan = () => ({ id: 'b598f60e-82ae-47ea-903e-329443bd41f4', day: '2026-10-30', kind: 'scan', result: { average: 20, worst: 38, worstAt: 42, validSeconds: 52 } });
test('accepts only summary measurements and drops extra video or identity fields', () => {
  const s=scan(); s.result.video='unwanted'; s.result.owner='unwanted';
  assert.deepEqual(validateSession(s),{average:20,worst:38,worstAt:42,validSeconds:52,duration:60});
});
test('rejects non-finite, insufficient, impossible and malformed summaries', () => {
  for (const [key,value] of [['average',NaN],['average',-1],['average',181],['worst',10],['validSeconds',4],['worstAt',61]]) {
    const s=scan(); s.result[key]=value; assert.equal(validateSession(s),null);
  }
  const s=scan(); s.id='------------------------------------'; assert.equal(validateSession(s),null);
  assert.equal(validateSession(null),null);
});
test('rep and break inputs are constrained to supported movements', () => {
  const s=scan(); s.kind='rep'; s.result={exercise:'squat',reps:12,validSeconds:40};
  assert.equal(validateSession(s).reps,12);
  s.result.reps=1.5; assert.equal(validateSession(s),null);
  s.kind='break'; s.result={reset:'chin'}; assert.deepEqual(validateSession(s),{reset:'chin'});
  s.result.reset='unsupported'; assert.equal(validateSession(s),null);
});
