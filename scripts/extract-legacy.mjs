import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(projectRoot, 'reference/index.static.html');
const legacyDir = resolve(projectRoot, 'src/legacy');
const publicDir = resolve(projectRoot, 'public');

const source = await readFile(sourcePath, 'utf8');
const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

if (!bodyMatch) throw new Error('Static source does not contain a body element.');

const styles = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  .map((match) => match[1].trim())
  .join('\n\n');

const scripts = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1].trim())
  .filter((script) => script.includes('const translations') || script.includes("querySelector('#page-landing .hero')"))
  .join('\n\n');

const cleanBody = bodyMatch[1]
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replaceAll('./assets/', '/assets/');

const navStart = cleanBody.indexOf('<!-- NAV -->');
if (navStart === -1) throw new Error('Navigation marker was not found.');

const body = cleanBody.slice(navStart).trim();
const markers = [
  '<!-- ===== LANDING PAGE ===== -->',
  '<!-- ===== STUDENT DASHBOARD ===== -->',
  '<!-- ===== COMPANY DASHBOARD ===== -->',
  '<!-- ===== ADMIN PANEL ===== -->',
  '<!-- FLOATING DEMO MENU -->',
];

const positions = markers.map((marker) => body.indexOf(marker));
if (positions.some((position) => position === -1)) {
  throw new Error('One or more page boundary markers were not found.');
}

const fragments = {
  navigation: body.slice(0, positions[0]),
  landing: body.slice(positions[0], positions[1]),
  student: body.slice(positions[1], positions[2]),
  company: body.slice(positions[2], positions[3]),
  admin: body.slice(positions[3], positions[4]),
  overlays: body.slice(positions[4]),
};

await mkdir(legacyDir, { recursive: true });
await mkdir(publicDir, { recursive: true });

await Promise.all([
  ...Object.entries(fragments).map(([name, html]) =>
    writeFile(resolve(legacyDir, `${name}.html`), `${html.trim()}\n`, 'utf8'),
  ),
  writeFile(
    resolve(projectRoot, 'src/styles.css'),
    `${styles.replaceAll('./assets/', '/assets/')}\n\n/* React shell and rendering performance refinements. */\n.react-fragment { display: contents; }\nimg { max-width: 100%; }\n@supports (content-visibility: auto) {\n  #page-landing > .section,\n  #page-landing > .partners-section,\n  #page-landing > footer {\n    content-visibility: auto;\n    contain-intrinsic-size: auto 820px;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  html { scroll-behavior: auto !important; }\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    scroll-behavior: auto !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n`,
    'utf8',
  ),
  writeFile(resolve(publicDir, 'legacy.js'), `${scripts}\n`, 'utf8'),
]);

console.log(`Generated ${Object.keys(fragments).length} React page fragments, styles.css, and legacy.js.`);
