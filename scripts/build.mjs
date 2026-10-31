// Copies the static site into public/ for Netlify. Server code, tests, zips and images in the
// repository root are not published. New .html, .css, .js and .json files are picked up automatically.
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('public/', root);
const skip = new Set(['package.json', 'package-lock.json']);
const keep = new Set(['_redirects', 'EXERCISE-DATA-LICENSE.md']);

const names = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && !skip.has(entry.name) && (keep.has(entry.name) || /\.(html|css|js|json)$/.test(entry.name)))
  .map((entry) => entry.name);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(names.map((name) => copyFile(new URL(name, root), new URL(name, output))));
console.log(`Copied ${names.length} files to public/: ${names.join(', ')}`);
