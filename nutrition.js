// Nutrition education, calculator and plate tool. Everything runs on this device.
// Body measurements entered in the calculator are kept in memory only and are never saved or sent.

const root = document.getElementById('nutrition-root');

const ODS = (page) => `https://ods.od.nih.gov/factsheets/${page}-Consumer/`;
const NUTRIENTS = [
  { name: 'Protein', does: 'Builds and repairs muscle, and makes enzymes and immune cells.', foods: 'Eggs, daal, chana, dahi, milk, chicken, fish.', low: 'Slow recovery after training, and gradual muscle loss over time if intake stays low.', src: ['Harvard T.H. Chan: Protein', 'https://nutritionsource.hsph.harvard.edu/what-should-you-eat/protein/'] },
  { name: 'Carbohydrate', does: 'The main fuel for the brain and for muscles during exercise.', foods: 'Roti, rice, oats, potato, fruit, pulses. Whole grains and pulses also bring fibre.', low: 'Very low intake can leave you tired and weaker in harder sessions.', src: ['WHO: Healthy diet', 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'] },
  { name: 'Fat', does: 'Gives energy, builds cell walls and helps you absorb vitamins A, D, E and K.', foods: 'Nuts, fish, eggs, and cooking oil or ghee in modest amounts.', low: 'Too little makes it harder to absorb some vitamins. Too much adds many calories quickly: one teaspoon of oil is about 40 calories. WHO advises limiting saturated fat and avoiding trans fat.', src: ['WHO: Healthy diet', 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'] },
  { name: 'Fibre', does: 'Supports digestion, helps you feel full and keeps blood sugar steadier.', foods: 'Daal, chana, vegetables, fruit, whole wheat roti, oats.', low: 'Low intake is linked with constipation. WHO suggests at least 25 g a day for adults.', src: ['WHO: Carbohydrate intake guideline', 'https://www.who.int/publications/i/item/9789240073593'] },
  { name: 'Water', does: 'Helps control body temperature, moves nutrients and supports digestion and joints.', foods: 'Water, chaas, tea and food all count.', low: 'Needs rise with heat and exercise. Pale yellow urine is a rough sign you are drinking enough. Dark urine, dizziness or a very dry mouth suggest you need more.', src: ['NHS: Water, drinks and hydration', 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/'] },
  { name: 'Iron', does: 'Carries oxygen in the blood.', foods: 'Daal, chana, spinach, red meat, liver. Vitamin C foods such as lemon or orange help absorption. Tea with a meal reduces it.', low: 'Low iron can cause tiredness and breathlessness. Anaemia is common in South Asia, especially among women and children. Only a blood test can confirm it, so ask a doctor before taking iron tablets.', src: ['NIH: Iron', ODS('Iron')] },
  { name: 'Calcium', does: 'Builds bones and teeth and helps muscles contract.', foods: 'Milk, dahi, paneer, small fish eaten with bones.', low: 'Long-term low intake can weaken bones.', src: ['NIH: Calcium', ODS('Calcium')] },
  { name: 'Vitamin D', does: 'Helps the body absorb calcium and supports bone and muscle health.', foods: 'Sunlight on skin, eggs, oily fish and fortified foods.', low: 'Low levels are commonly reported even in sunny countries. A blood test and a doctor can tell you whether a supplement is needed.', src: ['NIH: Vitamin D', ODS('VitaminD')] },
  { name: 'Vitamin B12', does: 'Supports nerves and the making of red blood cells.', foods: 'Found naturally only in animal foods: meat, fish, eggs and dairy.', low: 'People who eat little or no animal food are at higher risk. Ask a doctor about testing.', src: ['NIH: Vitamin B12', ODS('VitaminB12')] },
  { name: 'Potassium', does: 'Helps nerves and muscles work and balances fluid and blood pressure.', foods: 'Banana, potato, daal, spinach, milk.', low: 'Very low levels can cause weakness and cramps. If you take blood pressure or kidney medicine, ask your doctor before changing potassium.', src: ['NIH: Potassium', ODS('Potassium')] },
  { name: 'Magnesium', does: 'Helps muscles and nerves work and supports energy production.', foods: 'Nuts, whole grains, pulses, spinach.', low: 'Most people get enough from food. Supplements can interact with some medicines.', src: ['NIH: Magnesium', ODS('Magnesium')] },
];

const MUSCLE_POINTS = [
  ['How muscle gets stronger', 'Training puts small, controlled stress on muscle. Over the next day or two the body repairs it using protein, enough total food and sleep, and rebuilds it slightly stronger. Training without recovery does not build strength.'],
  ['What fuels a workout', 'Carbohydrate is stored in muscle and liver as glycogen and is the main fuel for harder effort. Fat fuels longer, easier effort. Protein is mainly used for repair, not as the first fuel.'],
  ['Who does what', 'Quadriceps straighten the knee (squat). Glutes and hamstrings extend the hip (standing up, deadlift). Chest and triceps push. Upper back and lats pull. The core keeps the spine steady. Deep neck flexors help hold the head over the shoulders, which is what the chin tuck trains.'],
  ['Recovery', 'Sleep, rest days and regular meals matter as much as the session. If a muscle is still very sore, train a different area or move gently instead of pushing through.'],
  ['Protein and training', 'The usual adult minimum is 0.8 g of protein per kg of body weight. For people who train regularly, sports nutrition researchers commonly suggest 1.4 to 2.0 g per kg. Spread it across meals rather than eating it all at once.'],
];

const ACTIVITY = [
  ['1.2', 'Little or no exercise, desk work'],
  ['1.375', 'Light exercise 1 to 3 days a week'],
  ['1.55', 'Moderate exercise 3 to 5 days a week'],
  ['1.725', 'Hard exercise 6 to 7 days a week'],
];

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
};
const link = (label, href) => h('a', { href, target: '_blank', rel: 'noopener noreferrer', text: label });
const round = (n, step = 1) => Math.round(n / step) * step;
const short = (name) => name.split(/[,(]/)[0].trim();

let foods = [];
let estimate = null; // { maintenance } set by the calculator, in memory only
const plate = new Map(); // food id -> servings

function nutrientsView() {
  return h('div', { class: 'nutri-view' },
    h('p', { class: 'session-content', text: 'Plain-English basics. Each card names its source. This is general information, not a diet prescription.' }),
    ...NUTRIENTS.map((n) => h('details', { class: 'nutri-card' },
      h('summary', { text: n.name }),
      h('p', {}, h('b', { text: 'What it does: ' }), n.does),
      h('p', {}, h('b', { text: 'Where you find it: ' }), n.foods),
      h('p', {}, h('b', { text: 'Worth knowing: ' }), n.low),
      h('p', { class: 'attribution' }, 'Source: ', link(n.src[0], n.src[1])),
    )));
}

function musclesView() {
  return h('div', { class: 'nutri-view' },
    h('p', { class: 'session-content', text: 'How food, training and recovery fit together.' }),
    ...MUSCLE_POINTS.map(([title, body]) => h('details', { class: 'nutri-card' }, h('summary', { text: title }), h('p', { text: body }))),
    h('p', { class: 'attribution' }, 'Protein range: ', link('ISSN position stand on protein and exercise', 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8')),
  );
}

function calculatorView() {
  const out = h('div', { class: 'nutri-result', role: 'status', 'aria-live': 'polite' });
  const field = (label, input) => h('label', {}, label, input);
  const sex = h('select', { id: 'calc-sex' }, h('option', { value: 'male', text: 'Male' }), h('option', { value: 'female', text: 'Female' }));
  const age = h('input', { id: 'calc-age', type: 'number', min: '18', max: '80', inputmode: 'numeric', required: '' });
  const height = h('input', { id: 'calc-height', type: 'number', min: '120', max: '220', inputmode: 'numeric', required: '' });
  const weight = h('input', { id: 'calc-weight', type: 'number', min: '30', max: '250', step: '0.1', inputmode: 'decimal', required: '' });
  const activity = h('select', { id: 'calc-activity' }, ACTIVITY.map(([v, t]) => h('option', { value: v, text: t })));
  const care = h('input', { id: 'calc-care', type: 'checkbox' });
  const form = h('form', { class: 'calc-form', id: 'calc-form', novalidate: '' },
    field('Sex used in the formula', sex), field('Age (years, 18 to 80)', age), field('Height (cm)', height), field('Weight (kg)', weight), field('Activity', activity),
    h('label', { class: 'check' }, care, ' I am pregnant, breastfeeding, under a doctor’s diet plan, or have a medical condition'),
    h('button', { class: 'button button-primary', type: 'submit', text: 'Estimate my range' }),
    h('p', { class: 'attribution', text: 'Your numbers stay in this page only. Nothing is saved or sent.' }),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    estimate = null;
    out.replaceChildren();
    const a = Number(age.value), cm = Number(height.value), kg = Number(weight.value);
    if (care.checked) { out.append(h('p', { class: 'notice', text: 'Please ask your doctor or a registered dietitian for calorie and protein targets. A general formula is not suitable for you.' })); return; }
    if (!(a >= 18 && a <= 80 && cm >= 120 && cm <= 220 && kg >= 30 && kg <= 250)) { out.append(h('p', { class: 'notice', text: 'Enter an age from 18 to 80, a height from 120 to 220 cm and a weight from 30 to 250 kg. Under 18? Please talk to a doctor or dietitian, because growing bodies have different needs.' })); return; }
    const bmr = 10 * kg + 6.25 * cm - 5 * a + (sex.value === 'male' ? 5 : -161);
    const maintenance = bmr * Number(activity.value);
    const slowLoss = Math.max(bmr, maintenance * 0.9);
    const slowGain = maintenance * 1.1;
    estimate = { maintenance };
    out.append(
      h('div', { class: 'nutri-totals' },
        h('div', {}, h('small', { text: 'MAINTAIN WEIGHT' }), h('strong', { text: `about ${round(maintenance, 10)} kcal` })),
        h('div', {}, h('small', { text: 'SLOW LOSS (ABOUT 10% LESS)' }), h('strong', { text: `about ${round(slowLoss, 10)} kcal` })),
        h('div', {}, h('small', { text: 'SLOW GAIN (ABOUT 10% MORE)' }), h('strong', { text: `about ${round(slowGain, 10)} kcal` })),
      ),
      h('p', { text: `Protein: the usual adult minimum is ${round(0.8 * kg)} g a day (0.8 g per kg). If you train regularly, researchers commonly suggest ${round(1.4 * kg)} to ${round(2.0 * kg)} g a day (1.4 to 2.0 g per kg).` }),
      h('p', { class: 'attribution', text: 'Estimated with the Mifflin-St Jeor equation, which can be off by 10 to 15 percent for any one person. Weigh yourself under the same conditions for 2 to 4 weeks and adjust. Slow loss never goes below your estimated resting needs. If you have kidney disease or another condition, ask your doctor before changing protein. This is not medical advice.' }),
    );
    renderPlateTotals();
  });
  return h('div', { class: 'nutri-view' }, form, out);
}

const plateTotals = h('div', { class: 'plate-totals', role: 'status', 'aria-live': 'polite' });
const plateList = h('ul', { class: 'plate-list' });
const plateHints = h('div', { class: 'plate-hints' });

function renderPlateTotals() {
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  const rows = [];
  for (const [id, servings] of plate) {
    const f = foods.find((x) => x.id === id);
    const grams = f.serving.g * servings;
    for (const k of Object.keys(sum)) sum[k] += (f.per100[k] * grams) / 100;
    rows.push(f);
  }
  plateList.replaceChildren(...rows.map((f) => {
    const input = h('input', { type: 'number', min: '0.5', max: '10', step: '0.5', value: String(plate.get(f.id)), 'aria-label': `Servings of ${f.name}` });
    input.addEventListener('change', () => { const v = Number(input.value); if (v >= 0.5 && v <= 10) plate.set(f.id, v); renderPlateTotals(); });
    const remove = h('button', { type: 'button', class: 'button button-quiet', text: 'Remove', 'aria-label': `Remove ${f.name}` });
    remove.addEventListener('click', () => { plate.delete(f.id); renderPlateTotals(); });
    return h('li', {}, h('span', {}, h('b', { text: f.name }), h('small', { text: ` · ${f.serving.label} (${f.serving.g} g)` }), f.note ? h('small', { class: 'note', text: f.note }) : null), input, remove);
  }));
  plateHints.replaceChildren();
  if (!rows.length) { plateTotals.replaceChildren(h('p', { text: 'Add foods to see the total for your meal or day.' })); return; }
  const cell = (label, value) => h('div', {}, h('small', { text: label }), h('strong', { text: value }));
  plateTotals.replaceChildren(h('div', { class: 'nutri-totals' },
    cell('CALORIES', `${round(sum.kcal)} kcal`), cell('PROTEIN', `${round(sum.protein)} g`), cell('CARBS', `${round(sum.carbs)} g`), cell('FAT', `${round(sum.fat)} g`), cell('FIBRE', `${round(sum.fibre)} g`)));
  if (estimate) plateHints.append(h('p', { text: `That is about ${Math.round((sum.kcal / estimate.maintenance) * 100)}% of your estimated maintenance calories.` }));
  const groups = new Set(rows.map((f) => f.group));
  if (!groups.has('Vegetables') && !groups.has('Fruit')) plateHints.append(h('p', { text: 'Idea: many people add vegetables or fruit to a meal for fibre and vitamins.' }));
  if (!['Pulses', 'Protein foods', 'Dairy'].some((g) => groups.has(g))) plateHints.append(h('p', { text: 'Idea: daal, chana, eggs, dahi or chicken would add protein.' }));
  for (const f of rows) for (const s of f.swaps) {
    if (plate.has(s.id)) continue;
    const to = foods.find((x) => x.id === s.id);
    if (to) plateHints.append(h('p', { text: `Swap idea: ${short(f.name)} → ${short(to.name)}. ${s.why}` }));
  }
}

function plateView() {
  const select = h('select', { id: 'plate-food', 'aria-label': 'Choose a food' });
  const byGroup = new Map();
  for (const f of foods) { if (!byGroup.has(f.group)) byGroup.set(f.group, []); byGroup.get(f.group).push(f); }
  for (const [group, items] of byGroup) select.append(h('optgroup', { label: group }, items.map((f) => h('option', { value: f.id, text: f.name }))));
  const add = h('button', { type: 'button', class: 'button button-primary', text: 'Add to plate' });
  add.addEventListener('click', () => { if (!plate.has(select.value)) plate.set(select.value, 1); renderPlateTotals(); });
  const clear = h('button', { type: 'button', class: 'button button-quiet', text: 'Clear plate' });
  clear.addEventListener('click', () => { plate.clear(); renderPlateTotals(); });
  renderPlateTotals();
  return h('div', { class: 'nutri-view' },
    h('p', { class: 'session-content', text: 'Pick what you ate or plan to eat and add up the numbers. No food is labelled good or bad. The aim is to see what is on your plate.' }),
    h('div', { class: 'plate-add' }, select, add, clear), plateList, plateTotals, plateHints,
    h('p', { class: 'attribution' }, 'Values are approximate and rounded, per serving as listed. Source: ', link('USDA FoodData Central', 'https://fdc.nal.usda.gov/'), '. They were not live-checked, and home cooking varies with oil, salt and water.'),
  );
}

async function init() {
  if (!root) return;
  const tabs = [['Nutrients', nutrientsView], ['Muscle and recovery', musclesView], ['Calories and protein', calculatorView]];
  const panels = [];
  const tablist = h('div', { class: 'nutri-tabs', role: 'tablist', 'aria-label': 'Nutrition sections' });
  const body = h('div', {});
  const select = (i) => panels.forEach((p, j) => { p.el.hidden = j !== i; p.tab.setAttribute('aria-selected', String(j === i)); p.tab.tabIndex = j === i ? 0 : -1; });
  const add = (label, el) => {
    const i = panels.length;
    const tab = h('button', { type: 'button', role: 'tab', class: 'nutri-tab', text: label, 'aria-selected': 'false' });
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = (i + (e.key === 'ArrowRight' ? 1 : panels.length - 1)) % panels.length; select(n); panels[n].tab.focus(); } });
    el.setAttribute('role', 'tabpanel');
    panels.push({ tab, el }); tablist.append(tab); body.append(el);
  };
  for (const [label, build] of tabs) add(label, build());
  const plateHolder = h('div', { class: 'nutri-view' }, h('p', { class: 'session-content', role: 'status', text: 'Loading food list…' }));
  add('My plate', plateHolder);
  select(0);
  root.replaceChildren(tablist, body);
  try {
    const res = await fetch('foods.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    foods = (await res.json()).foods;
    plateHolder.replaceChildren(plateView());
  } catch {
    plateHolder.replaceChildren(h('p', { class: 'notice', text: 'The food list could not be loaded. Check your connection and refresh the page.' }));
  }
}
init();
