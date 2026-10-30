// All angles use aspect-corrected, two-dimensional image coordinates.
export function jointAngle(a, b, c) {
  const u = { x: a.x - b.x, y: a.y - b.y };
  const v = { x: c.x - b.x, y: c.y - b.y };
  const length = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
  if (length < 1e-8) return null;
  return Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / length))) * 180 / Math.PI;
}
export function cervicalAngle(ear, shoulder) {
  if (Math.hypot(ear.x - shoulder.x, ear.y - shoulder.y) < 1e-8) return null;
  return Math.atan2(Math.abs(ear.x - shoulder.x), shoulder.y - ear.y) * 180 / Math.PI;
}
export function grade(angle) { return angle < 15 ? 1 : angle < 30 ? 2 : angle < 45 ? 3 : 4; }
export class RepCounter {
  constructor(exercise) {
    this.low = exercise === 'squat' ? 100 : 90;
    this.high = exercise === 'squat' ? 160 : 155;
    this.phase = 'ready'; this.reps = 0; this.candidate = ''; this.since = 0;
  }
  lost() { this.phase = 'ready'; this.candidate = ''; }
  update(angle, now) {
    // Require an extended start, a deep position, then full extension.
    const next = this.phase === 'ready' && angle >= this.high ? 'up' : this.phase === 'up' && angle <= this.low ? 'down' : this.phase === 'down' && angle >= this.high ? 'count' : '';
    if (!next) { this.candidate = ''; return this.reps; }
    if (this.candidate !== next) { this.candidate = next; this.since = now; }
    if (now - this.since >= 200) {
      if (next === 'count') { this.reps++; this.phase = 'up'; }
      else this.phase = next;
      this.candidate = '';
    }
    return this.reps;
  }
}
