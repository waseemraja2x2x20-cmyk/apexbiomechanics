import { grade } from './pose-math.js';

// Builds "Today's plan" from the history app.js already loads. It reads only; it saves nothing.
const FOOD_HABITS = [
  'Add one katori of daal, chana or vegetables to your main meal.',
  'Drink a glass of water with each meal.',
  'Swap one sugary drink for water or plain chaas.',
  'Have a piece of fruit instead of a packaged snack.',
  'Add a bowl of dahi to one meal.',
  'Choose roti over paratha for one meal.',
  'Eat slowly and stop when you feel comfortably full.',
];
const BREAKS = ['chin', 'piriformis', 'doorway'];
const BREAK_NAMES = { chin: 'Cervical Chin Tuck (45 seconds)', piriformis: 'Seated Piriformis Reset (60 seconds)', doorway: 'Doorway Pectoral Opener (50 seconds)' };

const el = document.getElementById('daily-plan');

function dayOfYear(d = new Date()) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}

function item(text, href, action) {
  const li = document.createElement('li');
  li.append(text);
  if (href) { const a = document.createElement('a'); a.href = href; a.textContent = action; li.append(' ', a); }
  return li;
}

function render({ history, today }) {
  if (!el) return;
  const scan = history.find((s) => s.kind === 'scan');
  const repToday = history.some((s) => s.kind === 'rep' && s.day === today);
  const done = history.filter((s) => s.kind === 'break' && s.day === today).length;
  const list = el.querySelector('ul');
  const steps = [];

  if (done >= 5) steps.push(item('You have reached today’s five movement breaks. Well done.'));
  else {
    // A larger forward-head angle (grade 3 or 4) gets the neck and chest resets more often.
    const order = scan && grade(scan.result.average) >= 3 ? ['chin', 'doorway', 'chin', 'piriformis', 'chin'] : BREAKS.concat(['chin', 'piriformis']);
    const id = order[done];
    steps.push(item(`Movement break ${done + 1} of 5: ${BREAK_NAMES[id]}.`, '#desk-relief', 'Open breaks'));
  }
  steps.push(scan
    ? item(`Latest scan: ${scan.result.average.toFixed(1)}° average, grade ${grade(scan.result.average)}. Scan again in a few days to compare.`, '#scan', 'Scan again')
    : item('Run a 60 second side-on scan to set your starting point.', '#scan', 'Start a scan'));
  steps.push(repToday
    ? item('Rep flow done today.')
    : item('Try a 45 second squat or push-up rep flow, at an easy pace.', '#scan', 'Start a rep flow'));
  steps.push(item(`Food habit for today: ${FOOD_HABITS[dayOfYear() % FOOD_HABITS.length]}`, '#nutrition', 'Nutrition basics'));
  list.replaceChildren(...steps);
}

document.addEventListener('apex:history', (e) => render(e.detail));
render({ history: [], today: '' });
