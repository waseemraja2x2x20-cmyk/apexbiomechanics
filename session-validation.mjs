export function validateSession(body) {
  if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || '') || !/^\d{4}-\d{2}-\d{2}$/.test(body.day || '')) return null;
  const r = body.result;
  const finite = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  if (body.kind === 'scan' && r && finite(r.average, 0, 180) && finite(r.worst, r.average, 180) && finite(r.validSeconds, 5, 60) && finite(r.worstAt, 0, 60)) {
    return { average: r.average, worst: r.worst, worstAt: r.worstAt, validSeconds: r.validSeconds, duration: 60 };
  }
  if (body.kind === 'rep' && r && ['squat', 'push-up'].includes(r.exercise) && Number.isInteger(r.reps) && finite(r.reps, 0, 150) && finite(r.validSeconds, 5, 45)) {
    return { exercise: r.exercise, reps: r.reps, validSeconds: r.validSeconds, duration: 45 };
  }
  if (body.kind === 'break' && r && ['chin', 'piriformis', 'doorway'].includes(r.reset)) return { reset: r.reset };
  return null;
}
