const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};
globalThis.window = { location: { hostname: 'localhost' } };

const { clearLocalSession, localApiRequest } = await import('../src/auth/localApi.js');
const { secureSignInUrl, secureSignOutUrl } = await import('../src/auth/api.js');

assert(secureSignInUrl('/signup?verified=1') === '/signup?verified=1', 'Local sign-in still points to the hosted identity route.');

await expectStatus('/api/auth/session', {}, 401);

const student = await localApiRequest('/api/auth/onboarding', { method: 'POST', body: { role: 'student' } });
assert(student.user.role === 'student', 'Student session was not created.');
const coursePayload = await localApiRequest('/api/student/courses');
assert(coursePayload.items.length >= 3, 'Student course catalog is empty.');
await localApiRequest('/api/student/enrollments', { method: 'POST', body: { course_id: coursePayload.items[0].id } });
const progress = await localApiRequest('/api/student/progress', { method: 'PATCH', body: { course_id: coursePayload.items[0].id, progress: 72 } });
assert(progress.progress === 72, 'Course progress was not persisted.');

const company = await localApiRequest('/api/auth/onboarding', { method: 'POST', body: { role: 'company' } });
assert(company.company?.member_role === 'owner', 'Company owner permissions are missing.');
const companyData = await Promise.all([
  localApiRequest('/api/company/jobs'),
  localApiRequest('/api/company/candidates'),
  localApiRequest('/api/company/members'),
  localApiRequest('/api/company/training'),
]);
assert(companyData.every(Boolean), 'A company workspace endpoint failed.');

const admin = await localApiRequest('/api/auth/onboarding', { method: 'POST', body: { role: 'admin' } });
assert(admin.user.role === 'admin', 'Admin session was not created.');
const stats = await localApiRequest('/api/admin/stats');
assert(stats.users >= 4 && stats.courses >= 3, 'Admin statistics are incomplete.');

assert(secureSignOutUrl('/') === '/', 'Local sign-out did not return to the landing page.');
await expectStatus('/api/auth/session', {}, 401);
clearLocalSession();
process.stdout.write('Local API smoke test passed.\n');

async function expectStatus(path, options, status) {
  try {
    await localApiRequest(path, options);
  } catch (error) {
    assert(error.status === status, `Expected ${status}, received ${error.status}.`);
    return;
  }
  throw new Error(`Expected ${path} to fail with ${status}.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
