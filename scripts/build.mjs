import { copyFile, mkdir, rm } from 'node:fs/promises';

const output = new URL('../public/', import.meta.url);
const assets = [
  'index.html',
  'not-found.html',
  'styles.css',
  'app.js',
  'pose-math.js',
  'exercises.json',
  'EXERCISE-DATA-LICENSE.md',
  '_redirects',
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(assets.map((asset) => copyFile(
  new URL(`../${asset}`, import.meta.url),
  new URL(asset, output),
)));
