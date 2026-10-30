import test from 'node:test';
import assert from 'node:assert/strict';
import { jointAngle, cervicalAngle, grade, RepCounter } from '../pose-math.js';

const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} should equal ${b}`);
test('cervical estimate measures against upward vertical on either camera side', () => {
  near(cervicalAngle({x:1,y:0},{x:1,y:1}),0);
  near(cervicalAngle({x:2,y:0},{x:1,y:1}),45);
  near(cervicalAngle({x:0,y:0},{x:1,y:1}),45);
  assert.equal(cervicalAngle({x:0,y:0},{x:0,y:0}),null);
});
test('app-defined grades include every documented boundary', () => {
  assert.deepEqual([0,14.99,15,29.99,30,44.99,45,90].map(grade),[1,1,2,2,3,3,4,4]);
});
test('joint angles recognize extended, bent and degenerate joints', () => {
  near(jointAngle({x:0,y:0},{x:0,y:1},{x:0,y:2}),180);
  near(jointAngle({x:0,y:0},{x:0,y:1},{x:1,y:1}),90);
  assert.equal(jointAngle({x:0,y:0},{x:0,y:0},{x:1,y:1}),null);
});
for (const exercise of ['squat','push-up']) test(`${exercise}: complete cycles count; jitter, partial starts and tracking gaps do not`, () => {
  const c = new RepCounter(exercise);
  let t = 0;
  function hold(angle, duration=300) { c.update(angle,t); t += duration; c.update(angle,t); t += 100; }
  hold(80); hold(170); // a low initial pose must not count
  assert.equal(c.reps,0);
  for (let i=0;i<4;i++) { c.update(80,t); t+=50; c.update(130,t); t+=50; }
  assert.equal(c.reps,0);
  hold(80); hold(170);
  assert.equal(c.reps,1);
  hold(170); hold(170); assert.equal(c.reps,1);
  hold(80); c.lost(); hold(170); assert.equal(c.reps,1);
  hold(80); hold(170); assert.equal(c.reps,2);
});
