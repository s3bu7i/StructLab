import assert from 'node:assert/strict';
import worker from '../server/index.js';

const env = {
  DB: {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() { return sql.includes('SELECT 1 AS ok') ? { ok: 1 } : null; },
        async all() { return { results: [] }; },
        async run() { return { meta: { changes: 0 } }; },
      };
    },
  },
  ASSETS: {
    async fetch() { return new Response('<!doctype html><title>StructLab</title>', { headers: { 'Content-Type': 'text/html' } }); },
  },
};

const health = await worker.fetch(new Request('https://structlab.test/api/health'), env);
assert.equal(health.status, 200);
assert.equal((await health.json()).ok, true);

const anonymous = await worker.fetch(new Request('https://structlab.test/api/auth/session'), env);
assert.equal(anonymous.status, 401);
assert.equal((await anonymous.json()).error.code, 'authentication_required');

const crossSite = await worker.fetch(new Request('https://structlab.test/api/profile', {
  method: 'PATCH',
  headers: { Origin: 'https://attacker.test', 'Content-Type': 'application/json' },
  body: '{}',
}), env);
assert.equal(crossSite.status, 403);
assert.equal((await crossSite.json()).error.code, 'cross_site_write_blocked');

const page = await worker.fetch(new Request('https://structlab.test/portal/student/overview', { headers: { Accept: 'text/html' } }), env);
assert.equal(page.status, 200);
assert.match(await page.text(), /StructLab/);
assert.equal(page.headers.get('X-Content-Type-Options'), 'nosniff');

console.log('Worker smoke tests passed.');
