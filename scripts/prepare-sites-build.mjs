import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workerDirectory = resolve('dist/server');
const workerPath = resolve(workerDirectory, 'index.js');

const workerSource = `const HTML_HEADERS = {
  'Cache-Control': 'no-cache',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
};

function withHeaders(response, additions = {}) {
  const headers = new Headers(response.headers);
  Object.entries(additions).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);

    if (response.status === 404 && request.headers.get('Accept')?.includes('text/html')) {
      response = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      const html = (await response.text()).replaceAll('__SITE_ORIGIN__', url.origin);
      const headers = new Headers(response.headers);
      Object.entries(HTML_HEADERS).forEach(([name, value]) => headers.set(name, value));
      headers.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(html, { status: response.status, statusText: response.statusText, headers });
    }

    if (/\\/assets\\/.*-[A-Za-z0-9_-]+\\.(?:js|css)$/.test(url.pathname)) {
      return withHeaders(response, { 'Cache-Control': 'public, max-age=31536000, immutable' });
    }

    return withHeaders(response, { 'X-Content-Type-Options': 'nosniff' });
  },
};
`;

await mkdir(workerDirectory, { recursive: true });
await writeFile(workerPath, workerSource, 'utf8');
console.log('Prepared the Cloudflare-compatible Sites worker.');
