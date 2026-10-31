import { cervicalAngle, jointAngle, grade, RepCounter } from './pose-math.js';

const $ = (id) => document.getElementById(id);
const cameraDialog = $('camera-dialog');
const resetDialog = $('reset-dialog');
const profileDialog = $('profile-dialog');
const emptyMessage = 'No data yet, run your first scan';
let profile = { name: '', shield: false };
let history = [];
let historyAvailable = false;
let onboardingShown = false;
let latestResult = null;
let toastTimer;
function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 6000);
}
function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
async function api(method = 'GET', data) {
  const response = await fetch('/api/history', {
    method, credentials: 'same-origin', cache: 'no-store',
    signal: globalThis.AbortSignal?.timeout?.(15000),
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) throw new Error('Saved history is unavailable. Check your connection and retry.');
  return response.json();
}
function sessionText(item) {
  const r = item.result;
  return item.kind === 'scan' ? `Scan · ${r.average.toFixed(1)}° average · ${r.worst.toFixed(1)}° worst · Grade ${grade(r.average)}` : item.kind === 'rep' ? `${r.exercise} · ${r.reps} reps · ${r.duration}s` : 'Movement break completed';
}
function renderHistory() {
  const scan = history.find((s) => s.kind === 'scan');
  const rep = history.find((s) => s.kind === 'rep');
  const breaks = history.filter((s) => s.kind === 'break' && s.day === dayKey()).length;
  $('today-angle').textContent = scan ? `${scan.result.average.toFixed(1)}°` : '—';
  $('today-reps').textContent = rep ? `${rep.result.reps} ${rep.result.exercise} reps` : '—';
  $('today-breaks').textContent = `${breaks} / 5`;
  $('scan-summary').textContent = scan ? `Average ${scan.result.average.toFixed(1)}° · worst ${scan.result.worst.toFixed(1)}° at ${Math.round(scan.result.worstAt)}s` : emptyMessage;
  $('scan-grade').textContent = scan ? `Grade ${grade(scan.result.average)}` : 'Awaiting your scan';
  $('rep-summary').textContent = rep ? `Latest flow: ${rep.result.reps} ${rep.result.exercise} reps, ${rep.result.validSeconds.toFixed(1)}s of usable tracking.` : 'No rep sessions yet.';
  $('break-progress').textContent = `${breaks} of 5 movement breaks completed today`;
  $('break-percent').textContent = `${Math.min(100, breaks * 20)}%`;
  document.dispatchEvent(new CustomEvent('apex:history', { detail: { history, today: dayKey() } }));
  $('session-empty').hidden = history.length > 0;
  $('session-list').replaceChildren(...history.slice(0, 30).map((item) => {
    const li = document.createElement('li');
    li.textContent = sessionText(item);
    const time = document.createElement('time');
    time.dateTime = item.createdAt;
    time.textContent = new Date(item.createdAt).toLocaleString();
    li.append(time);
    return li;
  }));
  $('greeting').textContent = profile.name ? `Welcome back, ${profile.name}.` : 'Welcome to your workspace.';
  document.querySelector('.profile-button strong').textContent = profile.name || 'Your profile';
  $('shield-toggle').checked = profile.shield;
  document.querySelector('.shield-toggle b').textContent = profile.shield ? 'ON' : 'OFF';
  if (!latestResult) latestResult = history.find((s) => s.kind !== 'break') || null;
  updateShare();
}
function maybeOnboard() {
  if (!onboardingShown && historyAvailable && !document.querySelector('dialog[open]')) {
    onboardingShown = true;
    $('profile-name').value = '';
    profileDialog.showModal();
  }
}
async function loadHistory() {
  $('history-status').textContent = 'Loading saved history…';
  try {
    const data = await api();
    history = data.history;
    if (data.profile) {
      profile = { name: data.profile.name, shield: data.profile.shield === 'on' };
      onboardingShown = true;
    }
    historyAvailable = true;
    $('history-status').textContent = history.length ? 'Showing your saved measurements. Summaries only; no camera footage is stored.' : emptyMessage;
    renderHistory();
    scheduleShield();
    maybeOnboard();
  } catch (error) {
    historyAvailable = false;
    $('history-status').textContent = `${error.message} Camera sessions and exercises still work; keep the result open to retry saving.`;
  }
}
const historyReady = loadHistory();
$('reload-history').addEventListener('click', loadHistory);
function newSession(kind, result) { return { id: crypto.randomUUID(), kind, day: dayKey(), result, createdAt: new Date().toISOString() }; }
async function saveSession(session) {
  await historyReady;
  await api('POST', session);
  if (!history.some((s) => s.id === session.id)) history.unshift(session);
  historyAvailable = true;
  $('history-status').textContent = 'Saved to your private browser history on Netlify. Video stays on your device.';
  renderHistory();
}
function openProfile() {
  $('profile-name').value = profile.name;
  $('profile-status').textContent = '';
  profileDialog.showModal();
}
profileDialog.addEventListener('close', () => {
  $('delete-history').dataset.confirm = '';
  $('delete-history').textContent = 'Delete my saved data';
});
$('edit-profile').addEventListener('click', openProfile);
document.querySelector('.profile-button').addEventListener('click', openProfile);
async function persistProfile(name) {
  const next = { name: name.trim(), shield: profile.shield };
  await historyReady;
  await api('PUT', next);
  profile = next;
  onboardingShown = true;
  renderHistory();
}
$('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try { await persistProfile($('profile-name').value); profileDialog.close(); }
  catch (error) { $('profile-status').textContent = error.message; }
  finally { button.disabled = false; }
});
$('skip-profile').addEventListener('click', async () => {
  // A blank profile records the optional name prompt as answered.
  try { await persistProfile(profile.name); } catch { notify('Name preference was not saved; you may be asked again next visit.'); }
  profileDialog.close();
});
profileDialog.addEventListener('cancel', (event) => { event.preventDefault(); $('skip-profile').click(); });
$('delete-history').addEventListener('click', async () => {
  const button = $('delete-history');
  if (button.dataset.confirm !== 'yes') {
    button.dataset.confirm = 'yes';
    button.textContent = 'Confirm: permanently delete my data';
    return;
  }
  button.disabled = true;
  try {
    await api('DELETE');
    history = []; profile = { name: '', shield: false }; latestResult = null;
    renderHistory(); scheduleShield();
    $('history-status').textContent = 'Your saved data was deleted.';
    profileDialog.close();
  } catch (error) { $('profile-status').textContent = error.message; }
  finally { button.disabled = false; button.dataset.confirm = ''; button.textContent = 'Delete my saved data'; }
});

let shieldDue = null;
function scheduleShield() { shieldDue = profile.shield ? Date.now() + 30 * 60 * 1000 : null; }
$('shield-toggle').addEventListener('change', async (event) => {
  profile.shield = event.target.checked;
  document.querySelector('.shield-toggle b').textContent = profile.shield ? 'ON' : 'OFF';
  scheduleShield();
  if (!profile.shield) $('shield-reminder').hidden = true;
  try { await persistProfile(profile.name); }
  catch { notify('Reminder works on this page; its preference could not be saved.'); }
});
$('dismiss-reminder').addEventListener('click', () => { $('shield-reminder').hidden = true; });
let currentDay = dayKey();
setInterval(() => {
  if (dayKey() !== currentDay) { currentDay = dayKey(); renderHistory(); renderDate(); }
  if (shieldDue && Date.now() >= shieldDue) {
    $('shield-reminder').hidden = false;
    notify('Slouch Shield: take a comfortable movement break.');
    shieldDue = Date.now() + 30 * 60 * 1000;
  }
}, 1000);
function renderDate() { $('today-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
renderDate();

// MediaPipe is loaded on demand. Only the model/library are fetched; frames are never sent.
let landmarkerPromise;
async function getLandmarker() {
  if (!landmarkerPromise) landmarkerPromise = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' },
      runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.6, minPosePresenceConfidence: 0.6, minTrackingConfidence: 0.6,
    });
  })().catch((error) => { landmarkerPromise = null; throw error; });
  return landmarkerPromise;
}
const video = $('camera-video');
const canvas = $('camera-canvas');
const ctx = canvas.getContext('2d');
let camera = null;
let cameraRun = 0;
let cameraFrame;
let sessionTimer;
let cameraSavePending = null;
let saveInProgress = false;
const lines = [[7,11],[8,12],[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const sidePoints = { left: { ear: 7, shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 }, right: { ear: 8, shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 } };
function visible(point) { return point && (point.visibility ?? 0) >= 0.6 && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1; }
function stopCamera() {
  cameraRun++;
  cancelAnimationFrame(cameraFrame);
  clearInterval(sessionTimer);
  if (camera?.stream) camera.stream.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
  camera = null;
}
function closeCamera() { stopCamera(); cameraDialog.close(); maybeOnboard(); }
$('close-camera').addEventListener('click', closeCamera);
cameraDialog.addEventListener('cancel', () => { stopCamera(); });
cameraDialog.addEventListener('close', () => { stopCamera(); maybeOnboard(); });
let lastMode = 'scan';
$('retry-camera').addEventListener('click', () => startCamera(lastMode));
function cameraError(message) {
  stopCamera();
  $('camera-status').textContent = message;
  $('retry-camera').hidden = false;
}
async function startCamera(mode) {
  stopCamera();
  lastMode = mode;
  cameraSavePending = null;
  $('save-result').hidden = true;
  $('retry-camera').hidden = true;
  $('camera-result').replaceChildren();
  $('camera-title').textContent = mode === 'scan' ? '60s posture check-in' : `45s ${$('rep-exercise').value} flow`;
  $('camera-instructions').textContent = mode === 'scan' ? 'Turn side-on. Keep your ear, shoulder and hip in view. Video stays on your device.' : 'Place the camera side-on with your full body visible. Start extended, lower with control, then return up.';
  $('camera-time').textContent = mode === 'scan' ? '60s' : '45s';
  $('metric-label').textContent = mode === 'scan' ? 'CERVICAL ANGLE' : 'JOINT ANGLE / DEPTH';
  $('count-label').textContent = mode === 'scan' ? 'SLOUCH INDEX' : 'REPS';
  $('camera-metric').textContent = '—';
  $('camera-count').textContent = mode === 'scan' ? '—' : '0';
  $('camera-status').textContent = 'Requesting camera access…';
  $('camera-cue').textContent = 'Waiting for a visible side-on pose. The timer starts with usable tracking.';
  canvas.width = 640; canvas.height = 480; ctx.clearRect(0,0,640,480);
  if (!cameraDialog.open) cameraDialog.showModal();
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return cameraError('Camera access needs HTTPS and a browser with camera support. You can still browse exercise guides.');
  const run = cameraRun;
  const state = camera = { mode, duration: mode === 'scan' ? 60 : 45, exercise: $('rep-exercise').value, started: null, stream: null, counter: new RepCounter($('rep-exercise').value), side: null, validSeconds: 0, sum: 0, worst: 0, worstAt: 0, lastValid: null, lastFrame: 0, videoTime: -1, lastAnnouncement: 0, lastRep: 0, lostAt: null };
  try {
    // Start camera from the user gesture, before downloading the model.
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    if (run !== cameraRun) { stream.getTracks().forEach((t) => t.stop()); return; }
    state.stream = stream;
    stream.getVideoTracks()[0].addEventListener('ended', () => { if (camera === state) cameraError('The camera disconnected. Reconnect it and try again.'); });
    video.srcObject = stream;
    await video.play();
    $('camera-status').textContent = 'Loading the free pose model. The first download may take a moment…';
    const model = await getLandmarker();
    if (run !== cameraRun) return;
    $('camera-status').textContent = 'Camera ready. Turn side-on and step into view.';
    sessionTimer = setInterval(() => {
      if (camera !== state) return;
      if (state.started !== null) {
        const elapsed = (performance.now() - state.started) / 1000;
        $('camera-time').textContent = `${Math.max(0, Math.ceil(state.duration - elapsed))}s`;
        if (elapsed >= state.duration) finishCamera(state);
      }
    }, 100);
    function frame(now) {
      if (camera !== state || run !== cameraRun) return;
      if (now - state.lastFrame < 90 || video.currentTime === state.videoTime || video.readyState < 2) { cameraFrame = requestAnimationFrame(frame); return; }
      state.lastFrame = now; state.videoTime = video.currentTime;
      try {
        const result = model.detectForVideo(video, now);
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        document.querySelector('.camera-stage').style.aspectRatio = `${canvas.width} / ${canvas.height}`;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const landmarks = result.landmarks[0];
        if (landmarks) drawPose(landmarks);
        measure(state, landmarks, now);
      } catch { cameraError('Pose tracking stopped unexpectedly. Close other camera apps and retry.'); return; }
      cameraFrame = requestAnimationFrame(frame);
    }
    cameraFrame = requestAnimationFrame(frame);
  } catch (error) {
    if (run !== cameraRun) return;
    const message = error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser’s site settings, then try again.' : error.name === 'NotFoundError' ? 'No camera was found. Connect a camera or try a phone with a camera.' : ['NotReadableError', 'AbortError'].includes(error.name) ? 'Camera is busy or unavailable. Close other camera apps and try again.' : 'Camera or pose model could not load. Check your connection, browser support and camera availability, then try again.';
    cameraError(message);
  }
}
function drawPose(points) {
  ctx.lineWidth = 3; ctx.strokeStyle = '#8dd7ad'; ctx.fillStyle = '#ff8589';
  for (const [a,b] of lines) {
    if (!visible(points[a]) || !visible(points[b])) continue;
    ctx.beginPath(); ctx.moveTo(points[a].x * canvas.width, points[a].y * canvas.height); ctx.lineTo(points[b].x * canvas.width, points[b].y * canvas.height); ctx.stroke();
  }
  for (const p of points) if (visible(p)) { ctx.beginPath(); ctx.arc(p.x * canvas.width,p.y * canvas.height,4,0,Math.PI*2); ctx.fill(); }
}
function measure(state, landmarks, now) {
  const needed = state.mode === 'scan' ? ['ear','shoulder','hip'] : state.exercise === 'squat' ? ['shoulder','hip','knee','ankle'] : ['shoulder','elbow','wrist','hip','ankle'];
  const usable = (side) => landmarks && needed.every((key) => visible(landmarks[sidePoints[side][key]]));
  if (!state.side) {
    const choices = ['left','right'].filter(usable);
    choices.sort((a,b) => needed.reduce((sum,k) => sum + landmarks[sidePoints[b][k]].visibility - landmarks[sidePoints[a][k]].visibility,0));
    state.side = choices[0] || null;
  }
  const points = landmarks?.map((p) => ({ ...p, x: p.x * canvas.width / canvas.height }));
  let warning = '';
  if (!state.side || !usable(state.side)) warning = 'Tracking lost. Keep your full working side visible and improve lighting.';
  const side = sidePoints[state.side];
  if (!warning && visible(landmarks[11]) && visible(landmarks[12])) {
    const width = Math.hypot(points[11].x-points[12].x, points[11].y-points[12].y);
    const torso = Math.hypot(points[side.shoulder].x-points[side.hip].x, points[side.shoulder].y-points[side.hip].y);
    if (width > torso * .8) warning = 'Turn side-on to the camera for a more useful angle estimate.';
  }
  if (warning) {
    if (state.lostAt === null) state.lostAt = now;
    if (now - state.lostAt > 500) { state.counter.lost(); state.side = null; }
    state.lastValid = null;
    $('camera-metric').textContent = '—';
    $('camera-cue').textContent = warning;
    if (now - state.lastAnnouncement > 2500) { $('camera-status').textContent = warning; state.lastAnnouncement = now; }
    return;
  }
  state.lostAt = null;
  const p = (key) => points[side[key]];
  const angle = state.mode === 'scan' ? cervicalAngle(p('ear'),p('shoulder')) : state.exercise === 'squat' ? jointAngle(p('hip'),p('knee'),p('ankle')) : jointAngle(p('shoulder'),p('elbow'),p('wrist'));
  if (angle === null) { state.lastValid = null; state.counter.lost(); return; }
  if (state.started === null) state.started = now;
  if (now - state.started >= state.duration * 1000) { finishCamera(state); return; }
  const dt = state.lastValid === null ? 0 : Math.min(.2,(now-state.lastValid)/1000);
  state.lastValid = now;
  state.validSeconds += dt;
  if (state.mode === 'scan') {
    state.sum += angle * dt;
    if (angle > state.worst) { state.worst = angle; state.worstAt = (now-state.started)/1000; }
    $('camera-metric').textContent = `${angle.toFixed(1)}°`;
    const label = `Grade ${grade(angle)}`;
    if ($('camera-count').textContent !== label) $('camera-count').textContent = label;
    $('camera-cue').textContent = 'Keep a natural position; this is an estimate, not a diagnosis.';
  } else {
    const reps = state.counter.update(angle, now);
    const depth = Math.min(100,Math.max(0, (180-angle)/(180-state.counter.low)*100));
    $('camera-metric').textContent = `${Math.round(angle)}° / ${Math.round(depth)}%`;
    if ($('camera-count').textContent !== String(reps)) $('camera-count').textContent = String(reps);
    const bodyAngle = state.exercise === 'push-up' ? jointAngle(p('shoulder'),p('hip'),p('ankle')) : 180;
    $('camera-cue').textContent = bodyAngle !== null && bodyAngle < 150 ? 'Try to keep shoulders, hips and ankles in a comfortable line.' : state.counter.phase === 'ready' ? 'Begin with knees or elbows comfortably extended.' : state.counter.phase === 'down' ? 'Return to extension with control.' : 'Lower slowly within your comfortable range.';
    if (reps !== state.lastRep) { $('camera-status').textContent = `${reps} reps counted.`; state.lastRep = reps; state.lastAnnouncement = now; }
  }
  if (now - state.lastAnnouncement > 5000) {
    $('camera-status').textContent = `${state.mode === 'scan' ? `Grade ${grade(angle)}` : `${state.counter.reps} reps`}. ${Math.max(0,Math.ceil(state.duration-(now-state.started)/1000))} seconds remaining.`;
    state.lastAnnouncement = now;
  }
}
function finishCamera(state) {
  if (camera !== state) return;
  stopCamera();
  $('camera-time').textContent = '0s';
  if (state.validSeconds < 5) {
    $('camera-status').textContent = 'Not enough usable tracking to save a result. At least 5 seconds are needed. Improve lighting and framing, then try again.';
    $('retry-camera').hidden = false;
    return;
  }
  const result = state.mode === 'scan' ? { average: Math.min(state.worst, state.sum / state.validSeconds), worst: state.worst, worstAt: state.worstAt, validSeconds: state.validSeconds, duration: 60 } : { exercise: state.exercise, reps: state.counter.reps, validSeconds: state.validSeconds, duration: 45 };
  const item = newSession(state.mode === 'scan' ? 'scan' : 'rep', result);
  latestResult = item; updateShare();
  cameraSavePending = item;
  const summary = document.createElement('p');
  summary.textContent = `${sessionText(item)}. Usable tracking: ${state.validSeconds.toFixed(1)} of ${state.duration}s.${state.mode === 'scan' ? ` Worst moment at ${Math.round(state.worstAt)}s.` : ''} Not medical advice.`;
  $('camera-result').replaceChildren(summary);
  $('camera-cue').textContent = 'Session finished. Your camera is off.';
  saveCameraResult();
}
async function saveCameraResult() {
  if (!cameraSavePending || saveInProgress) return;
  saveInProgress = true;
  const item = cameraSavePending;
  $('save-result').hidden = true;
  $('camera-status').textContent = 'Session complete. Saving summary…';
  try {
    await saveSession(item);
    if (cameraSavePending === item) { cameraSavePending = null; $('camera-status').textContent = 'Summary saved. Your camera is off.'; }
  } catch (error) {
    if (cameraSavePending === item) { $('camera-status').textContent = `Result not saved. ${error.message} You can still export this result.`; $('save-result').hidden = false; }
  } finally { saveInProgress = false; }
}
$('save-result').addEventListener('click', saveCameraResult);
document.querySelectorAll('[data-action="scan"],[data-action="rep"]').forEach((button) => button.addEventListener('click', () => startCamera(button.dataset.action)));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && camera) cameraError('Session canceled because the page was hidden. Your camera is off. Keep this page visible and retry.');
});
window.addEventListener('pagehide', stopCamera);

const resets = {
  chin: { title: 'Cervical Chin Tuck', seconds: 45, cues: ['Sit comfortably and look ahead. Gently draw your chin straight back, without tipping your head.', 'Release and repeat gently. Keep breathing and avoid forcing the movement.', 'Continue slow, comfortable repetitions. Relax your shoulders.'] },
  piriformis: { title: 'Seated Piriformis Reset', seconds: 60, cues: ['Sit on a stable chair. If comfortable, rest one ankle over the opposite thigh and sit tall.', 'Ease into a gentle stretch without pushing your knee. Release if uncomfortable.', 'Switch sides slowly. Keep your back comfortable and breathe naturally.'] },
  doorway: { title: 'Doorway Pectoral Opener', seconds: 50, cues: ['Stand at a doorway. Place your forearm on the frame below shoulder height.', 'Take a small step forward for a gentle chest stretch. Do not force your shoulder.', 'Switch sides and keep the stretch gentle. Step back to release.'] },
};
let resetState = null;
let resetFrame;
let pendingBreak = null;
let breakSaveBusy = false;
function cancelReset() { cancelAnimationFrame(resetFrame); resetState = null; }
function openReset(id) {
  cancelReset(); pendingBreak = null;
  const config = resets[id];
  $('reset-title').textContent = config.title;
  $('reset-time').textContent = `${config.seconds}s`;
  $('reset-cue').textContent = config.cues[0];
  $('reset-status').textContent = 'Ready when you are. The timer pauses while this page is hidden.';
  $('begin-reset').hidden = false; $('retry-reset-save').hidden = true;
  resetState = { id, ...config, elapsed: 0, last: null, cue: 0 };
  $('shield-reminder').hidden = true;
  resetDialog.showModal();
}
document.querySelectorAll('[data-reset]').forEach((button) => button.addEventListener('click', () => openReset(button.dataset.reset)));
$('begin-reset').addEventListener('click', () => {
  const state = resetState;
  if (!state) return;
  $('begin-reset').hidden = true;
  $('reset-status').textContent = 'Countdown started.';
  function tick(now) {
    if (resetState !== state) return;
    if (state.last !== null && !document.hidden) state.elapsed += Math.min(.5, (now-state.last)/1000);
    state.last = now;
    $('reset-time').textContent = `${Math.max(0, Math.ceil(state.seconds-state.elapsed))}s`;
    const cue = Math.min(2,Math.floor(state.elapsed/state.seconds*3));
    if (state.cue !== cue) { state.cue = cue; $('reset-cue').textContent = state.cues[cue]; $('reset-status').textContent = state.cues[cue]; }
    if (state.elapsed >= state.seconds) {
      pendingBreak = newSession('break', { reset: state.id });
      resetState = null;
      $('reset-status').textContent = 'Break complete. Saving…';
      saveBreak();
      return;
    }
    resetFrame = requestAnimationFrame(tick);
  }
  resetFrame = requestAnimationFrame(tick);
});
async function saveBreak() {
  if (!pendingBreak || breakSaveBusy) return;
  const item = pendingBreak;
  breakSaveBusy = true;
  $('retry-reset-save').hidden = true;
  try {
    await saveSession(item);
    if (pendingBreak === item) { pendingBreak = null; $('reset-status').textContent = 'Break complete and saved. Nice work taking a moment.'; }
  } catch (error) {
    if (pendingBreak === item) { $('reset-status').textContent = `Break complete, but not saved. ${error.message}`; $('retry-reset-save').hidden = false; }
  } finally { breakSaveBusy = false; }
}
$('retry-reset-save').addEventListener('click', saveBreak);
$('cancel-reset').addEventListener('click', () => resetDialog.close());
resetDialog.addEventListener('close', () => { cancelReset(); maybeOnboard(); });
document.addEventListener('visibilitychange', () => { if (resetState) resetState.last = null; });

// Exercise metadata is bundled locally; only the source images load remotely.
let exercises = [];
let catalogPage = 0;
const pageSize = 10;
function renderExercises() {
  const query = $('exercise-search').value.trim().toLowerCase();
  const muscle = $('muscle-filter').value;
  const equipment = $('equipment-filter').value;
  const matches = exercises.filter((ex) => (!query || `${ex.name} ${ex.instructions.join(' ')}`.toLowerCase().includes(query)) && (!muscle || [...ex.primaryMuscles,...ex.secondaryMuscles].includes(muscle)) && (!equipment || (ex.equipment || 'none') === equipment));
  const pages = Math.max(1,Math.ceil(matches.length/pageSize));
  catalogPage = Math.min(catalogPage,pages-1);
  $('exercise-status').textContent = matches.length ? `${matches.length} exercise guides found.` : 'No exercises match. Try another search or clear the filters.';
  $('exercise-page').textContent = `${catalogPage+1} / ${pages}`;
  $('exercise-prev').disabled = catalogPage === 0;
  $('exercise-next').disabled = catalogPage >= pages-1;
  $('exercise-results').replaceChildren(...matches.slice(catalogPage*pageSize,(catalogPage+1)*pageSize).map((ex) => {
    const details = document.createElement('details'); details.className = 'exercise-guide';
    const title = document.createElement('summary'); title.textContent = ex.name;
    const meta = document.createElement('p'); meta.className = 'exercise-meta'; meta.textContent = `${ex.primaryMuscles.join(', ')} · ${ex.equipment || 'none'} · ${ex.level}`;
    details.append(title, meta);
    // Create image elements on expansion to avoid downloading the whole catalog.
    details.addEventListener('toggle', () => {
      if (!details.open || details.dataset.loaded) return;
      details.dataset.loaded = 'yes';
      const images = document.createElement('div'); images.className = 'exercise-images';
      for (const [i,path] of ex.images.entries()) {
        const img = document.createElement('img');
        img.src = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${path.split('/').map(encodeURIComponent).join('/')}`;
        img.alt = `${ex.name}, reference position ${i+1}`; img.loading = 'lazy'; img.width = 320; img.height = 320;
        img.addEventListener('error', () => { const fallback = document.createElement('p'); fallback.textContent = 'Reference image unavailable; follow the written steps below.'; img.replaceWith(fallback); }, { once: true });
        images.append(img);
      }
      const steps = document.createElement('ol');
      for (const instruction of ex.instructions) { const li = document.createElement('li'); li.textContent = instruction; steps.append(li); }
      details.append(images, steps);
    });
    return details;
  }));
}
async function loadExercises() {
  try {
    const response = await fetch('./exercises.json');
    if (!response.ok) throw new Error();
    exercises = await response.json();
    for (const [id,values] of [['muscle-filter',exercises.flatMap((ex) => [...ex.primaryMuscles,...ex.secondaryMuscles])],['equipment-filter',exercises.map((ex) => ex.equipment || 'none')]]) {
      for (const value of [...new Set(values)].sort()) { const option = document.createElement('option'); option.value = value; option.textContent = value; $(id).append(option); }
    }
    renderExercises();
  } catch { $('exercise-status').textContent = 'Exercise guides could not load. Reload the page to try again.'; }
}
$('exercise-filters').addEventListener('submit', (event) => event.preventDefault());
for (const id of ['exercise-search','muscle-filter','equipment-filter']) $(id).addEventListener('input', () => { catalogPage = 0; renderExercises(); });
$('exercise-prev').addEventListener('click', () => { catalogPage--; renderExercises(); });
$('exercise-next').addEventListener('click', () => { catalogPage++; renderExercises(); });
loadExercises();

function updateShare() {
  document.querySelectorAll('[data-action="share"],[data-action="export"]').forEach((button) => { button.disabled = !latestResult; });
  $('share-summary').textContent = latestResult ? sessionText(latestResult) : 'Complete a scan or rep flow to create your result card.';
}
async function resultPNG() {
  if (!latestResult) throw new Error('Complete a scan or rep flow first.');
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
  const g = c.getContext('2d');
  g.fillStyle = '#14151c'; g.fillRect(0,0,1080,1080);
  g.fillStyle = '#f15c64'; g.fillRect(64,90,70,8);
  g.fillStyle = '#f3f2f4'; g.font = 'bold 36px sans-serif'; g.fillText('APEX / BIO',64,160);
  g.font = '28px sans-serif'; g.fillStyle = '#b0b1bc'; g.fillText(new Date(latestResult.createdAt).toLocaleString(),64,220);
  const r = latestResult.result;
  g.fillStyle = '#ff8589'; g.font = 'bold 100px sans-serif';
  g.fillText(latestResult.kind === 'scan' ? `${r.average.toFixed(1)}°` : `${r.reps} reps`,64,420);
  g.fillStyle = '#f3f2f4'; g.font = '36px sans-serif';
  if (latestResult.kind === 'scan') {
    g.fillText(`Average ear-to-shoulder angle · Grade ${grade(r.average)}`,64,500);
    g.fillText(`Worst ${r.worst.toFixed(1)}° at ${Math.round(r.worstAt)}s`,64,580);
  } else { g.fillText(`${r.exercise} · ${r.duration}s flow`,64,500); }
  g.font = '28px sans-serif'; g.fillStyle = '#b0b1bc';
  g.fillText(`${r.validSeconds.toFixed(1)} seconds of usable tracking`,64,680);
  g.fillText('Small moves. At your own pace.',64,810);
  g.font = '24px sans-serif';
  g.fillText('2D camera estimates. App-defined feedback bands.',64,920);
  g.fillText('Not medical advice. No camera footage shared.',64,965);
  return new Promise((resolve,reject) => c.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed. Try another browser.')), 'image/png'));
}
function download(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'apex-movement-result.png';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),30000);
}
document.querySelectorAll('[data-action="export"],[data-action="share"]').forEach((button) => button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const blob = await resultPNG();
    const file = new File([blob],'apex-movement-result.png',{ type: 'image/png' });
    if (button.dataset.action === 'share' && navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: 'My movement check-in', files: [file] }); }
      catch (error) { if (error.name !== 'AbortError') { download(blob); notify('Sharing is unavailable. Your PNG is downloaded instead.'); } }
    } else { download(blob); notify('Your result PNG is downloaded.'); }
  } catch (error) { notify(error.message); }
  finally { button.disabled = !latestResult; }
}));
document.querySelectorAll('[data-section]').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('[data-section]').forEach((item) => item.classList.toggle('active',item.dataset.section === link.dataset.section));
}));
