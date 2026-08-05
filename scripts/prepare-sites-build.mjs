import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const workerDirectory = resolve('dist/server');
const workerPath = resolve(workerDirectory, 'index.js');

await mkdir(workerDirectory, { recursive: true });
await copyFile(resolve('server/index.js'), workerPath);
console.log('Prepared the Cloudflare-compatible Sites worker.');
