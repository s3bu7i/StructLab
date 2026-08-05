const databaseKey = 'sl_local_api_database_v1';
const sessionKey = 'sl_local_api_session_v1';

const rolePermissions = {
  student: ['profile:write', 'courses:read', 'learning:write', 'jobs:read', 'applications:write', 'files:upload'],
  company: ['company:read', 'company:write', 'jobs:read', 'jobs:write', 'applications:read', 'applications:write', 'candidates:read', 'training:read', 'training:write', 'files:upload'],
  admin: ['platform:read', 'platform:manage', 'users:manage', 'companies:approve', 'courses:manage', 'moderation:manage', 'files:manage'],
};

export async function localApiRequest(path, options = {}) {
  const url = new URL(path, 'http://structlab.local');
  const method = (options.method || 'GET').toUpperCase();
  const data = readBody(options.body);
  const database = loadDatabase();

  if (url.pathname === '/api/auth/onboarding' && method === 'POST') {
    const result = createLocalSession(database, data);
    saveDatabase(database);
    return clone(result);
  }

  const user = currentUser(database);
  if (!user) throw apiError(401, 'authentication_required', 'Lokal sessiya tapılmadı. Yenidən daxil olun.');

  if (url.pathname === '/api/auth/session' && method === 'GET') return clone(sessionPayload(database, user));
  if (url.pathname === '/api/profile' && method === 'PATCH') return updateProfile(database, user, data);
  if (url.pathname === '/api/files' && method === 'POST') return localUpload(user, options);

  if (url.pathname.startsWith('/api/student/')) return handleStudent(database, user, url.pathname, method, data);
  if (url.pathname.startsWith('/api/company/')) return handleCompany(database, user, url.pathname, method, data);
  if (url.pathname.startsWith('/api/admin/')) return handleAdmin(database, user, url.pathname, method, data);

  throw apiError(404, 'route_not_found', 'Lokal API marşrutu tapılmadı.');
}

export function clearLocalSession() {
  storage().removeItem(sessionKey);
}

function handleStudent(database, user, path, method, data) {
  requireRole(user, 'student');
  const progress = database.enrollments[user.id] || {};
  const saved = database.savedJobs[user.id] || [];
  const applications = database.applications.filter((item) => item.student_user_id === user.id);

  if (path === '/api/student/courses' && method === 'GET') {
    return clone({ items: database.courses.filter((course) => course.status === 'published').map((course) => ({
      ...course,
      progress: progress[course.id] ?? 0,
      enrollment_status: Object.hasOwn(progress, course.id) ? (progress[course.id] === 100 ? 'completed' : 'active') : null,
    })) });
  }
  if (path === '/api/student/enrollments' && method === 'POST') {
    database.enrollments[user.id] ||= {};
    database.enrollments[user.id][data.course_id] ??= 0;
    saveDatabase(database);
    return { enrolled: true };
  }
  if (path === '/api/student/progress' && method === 'PATCH') {
    database.enrollments[user.id] ||= {};
    if (!Object.hasOwn(database.enrollments[user.id], data.course_id)) throw apiError(404, 'enrollment_not_found', 'Əvvəlcə kursa qeydiyyatdan keçin.');
    const value = Math.max(0, Math.min(100, Number(data.progress) || 0));
    database.enrollments[user.id][data.course_id] = value;
    if (value === 100 && !database.certificates.some((item) => item.student_user_id === user.id && item.course_id === data.course_id)) {
      const course = database.courses.find((item) => item.id === data.course_id);
      database.certificates.push({ id: id('certificate'), student_user_id: user.id, course_id: course?.id, title: course?.title || 'StructLab kursu', credential_code: `SL-LOCAL-${Date.now().toString(36).toUpperCase()}`, issued_at: now(), revoked_at: null });
    }
    saveDatabase(database);
    return { progress: value };
  }
  if (path === '/api/student/jobs' && method === 'GET') {
    return clone({ items: database.jobs.filter((job) => job.status === 'published').map((job) => ({
      ...job,
      company: database.companies.find((company) => company.id === job.company_id)?.name || 'StructLab partner',
      skills: job.skills || [],
      saved: saved.includes(job.id),
      application_status: applications.find((item) => item.job_id === job.id)?.status || null,
    })) });
  }
  if (path === '/api/student/certificates' && method === 'GET') return clone({ items: database.certificates.filter((item) => item.student_user_id === user.id) });
  if (path === '/api/student/saved-jobs' && method === 'POST') {
    database.savedJobs[user.id] ||= [];
    const items = database.savedJobs[user.id];
    const index = items.indexOf(data.job_id);
    if (index >= 0) items.splice(index, 1); else items.push(data.job_id);
    saveDatabase(database);
    return { saved: index < 0 };
  }
  if (path === '/api/student/applications' && method === 'POST') {
    const existing = database.applications.find((item) => item.student_user_id === user.id && item.job_id === data.job_id);
    if (existing) throw apiError(409, 'already_applied', 'Bu vakansiyaya artıq müraciət etmisiniz.');
    const application = { id: id('application'), job_id: data.job_id, student_user_id: user.id, status: 'submitted', applied_at: now(), cover_letter: data.cover_letter || '', resume_file_id: data.resume_file_id || null };
    database.applications.push(application);
    saveDatabase(database);
    return clone(application);
  }
  throw apiError(404, 'route_not_found', 'Tələbə əməliyyatı tapılmadı.');
}

function handleCompany(database, user, path, method, data) {
  requireRole(user, 'company');
  const company = database.companies.find((item) => item.owner_user_id === user.id || item.member_ids.includes(user.id));
  if (!company) throw apiError(403, 'company_required', 'Lokal şirkət profili tapılmadı.');

  if (path === '/api/company/jobs' && method === 'GET') {
    return clone({ items: database.jobs.filter((job) => job.company_id === company.id).map((job) => ({ ...job, applicants: database.applications.filter((item) => item.job_id === job.id).length })) });
  }
  if (path === '/api/company/jobs' && method === 'POST') {
    const job = { id: id('job'), company_id: company.id, title: data.title, description: data.description || '', location: data.location || 'Bakı', employment_type: data.employment_type || 'full_time', skills: data.skills || [], status: data.status === 'published' ? 'published' : 'draft', applicants: 0, created_at: now(), closes_at: data.closes_at || null };
    database.jobs.unshift(job);
    saveDatabase(database);
    return { id: job.id, status: job.status };
  }
  const jobMatch = path.match(/^\/api\/company\/jobs\/([^/]+)$/);
  if (jobMatch && method === 'PATCH') {
    const job = database.jobs.find((item) => item.id === jobMatch[1] && item.company_id === company.id);
    if (!job) throw apiError(404, 'job_not_found', 'Vakansiya tapılmadı.');
    Object.assign(job, data, { updated_at: now() });
    saveDatabase(database);
    return { id: job.id, status: job.status };
  }
  if (path === '/api/company/candidates' && method === 'GET') {
    const jobIds = database.jobs.filter((job) => job.company_id === company.id).map((job) => job.id);
    const items = database.applications.filter((application) => jobIds.includes(application.job_id)).map((application) => {
      const candidate = database.users.find((item) => item.id === application.student_user_id);
      const profile = database.profiles[candidate.id] || {};
      const job = database.jobs.find((item) => item.id === application.job_id);
      return { id: candidate.id, name: candidate.name, email: candidate.email, title: profile.headline, location: profile.location, skills: profile.skills || [], match: 88, application_id: application.id, application_status: application.status, job_id: job.id, applied_job: job.title };
    });
    return clone({ items });
  }
  const applicationMatch = path.match(/^\/api\/company\/applications\/([^/]+)$/);
  if (applicationMatch && method === 'PATCH') {
    const application = database.applications.find((item) => item.id === applicationMatch[1]);
    if (!application) throw apiError(404, 'application_not_found', 'Müraciət tapılmadı.');
    application.status = data.status || application.status;
    saveDatabase(database);
    return { id: application.id, status: application.status };
  }
  if (path === '/api/company/members' && method === 'GET') {
    return clone({ items: company.member_ids.map((userId) => {
      const member = database.users.find((item) => item.id === userId);
      return { ...publicUser(member), member_role: company.member_roles[userId] || 'viewer', created_at: member.created_at };
    }) });
  }
  if (path === '/api/company/members' && method === 'POST') {
    let member = database.users.find((item) => item.email.toLowerCase() === String(data.email || '').toLowerCase());
    if (!member) {
      member = { id: id('user'), email: data.email, name: nameFromEmail(data.email), role: 'company', status: 'active', email_verified: true, created_at: now() };
      database.users.push(member);
    }
    member.role = 'company';
    if (!company.member_ids.includes(member.id)) company.member_ids.push(member.id);
    company.member_roles[member.id] = data.member_role || 'viewer';
    saveDatabase(database);
    return clone({ ...publicUser(member), member_role: company.member_roles[member.id], created_at: member.created_at });
  }
  const memberMatch = path.match(/^\/api\/company\/members\/([^/]+)$/);
  if (memberMatch && method === 'PATCH') {
    const memberId = memberMatch[1];
    if (company.member_roles[memberId] === 'owner') throw apiError(400, 'owner_locked', 'Owner rolu dəyişdirilə bilməz.');
    if (data.remove) {
      company.member_ids = company.member_ids.filter((item) => item !== memberId);
      delete company.member_roles[memberId];
    } else company.member_roles[memberId] = data.member_role || 'viewer';
    saveDatabase(database);
    return { id: memberId, removed: Boolean(data.remove), member_role: company.member_roles[memberId] };
  }
  if (path === '/api/company/training' && method === 'GET') return clone({ courses: database.courses.filter((course) => course.status === 'published'), assignments: database.training.filter((item) => item.company_id === company.id) });
  if (path === '/api/company/training' && method === 'POST') {
    const assignment = { id: id('training'), company_id: company.id, course_id: data.course_id, assignee_email: data.assignee_email, assignee_user_id: null, status: 'assigned', progress: 0, due_at: data.due_at || null, created_at: now() };
    database.training.unshift(assignment);
    saveDatabase(database);
    return clone(assignment);
  }
  throw apiError(404, 'route_not_found', 'Şirkət əməliyyatı tapılmadı.');
}

function handleAdmin(database, user, path, method, data) {
  requireRole(user, 'admin');

  if (path === '/api/admin/stats' && method === 'GET') return { users: database.users.length, companies: database.companies.filter((item) => item.verification_status === 'approved').length, courses: database.courses.filter((item) => item.status === 'published').length, jobs: database.jobs.filter((item) => item.status === 'published').length, moderation: database.moderation.filter((item) => ['open', 'reviewing'].includes(item.status)).length };
  if (path === '/api/admin/users' && method === 'GET') return clone({ items: database.users });
  if (path === '/api/admin/companies' && method === 'GET') return clone({ items: database.companies.map((company) => ({ ...company, jobs: database.jobs.filter((job) => job.company_id === company.id).length })) });
  if (path === '/api/admin/courses' && method === 'GET') return clone({ items: database.courses.map((course) => ({ ...course, students: enrollmentCount(database, course.id), lessons: lessonCount(database, course.id) })) });
  if (path === '/api/admin/moderation' && method === 'GET') return clone({ items: database.moderation });
  if (path === '/api/admin/settings' && method === 'GET') return clone(database.settings);
  if (path === '/api/admin/settings' && method === 'PATCH') {
    Object.assign(database.settings, data);
    saveDatabase(database);
    return { updated: Object.keys(data) };
  }
  if (path === '/api/admin/courses' && method === 'POST') {
    const course = { id: id('course'), title: data.title, slug: slug(data.title), summary: data.summary || '', category: data.category || 'General', level: data.level || 'beginner', duration_minutes: Number(data.duration_minutes) || 0, status: data.status || 'draft', created_at: now() };
    database.courses.unshift(course);
    database.modules[course.id] = [];
    saveDatabase(database);
    return { id: course.id, slug: course.slug, status: course.status };
  }
  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && method === 'PATCH') {
    const target = database.users.find((item) => item.id === userMatch[1]);
    if (!target) throw apiError(404, 'user_not_found', 'İstifadəçi tapılmadı.');
    if (data.role) target.role = data.role;
    if (data.status) target.status = data.status;
    saveDatabase(database);
    return { id: target.id, role: target.role, status: target.status };
  }
  const companyMatch = path.match(/^\/api\/admin\/companies\/([^/]+)$/);
  if (companyMatch && method === 'PATCH') {
    const company = database.companies.find((item) => item.id === companyMatch[1]);
    if (!company) throw apiError(404, 'company_not_found', 'Şirkət tapılmadı.');
    company.verification_status = data.verification_status || company.verification_status;
    saveDatabase(database);
    return { id: company.id, verification_status: company.verification_status };
  }
  const moduleMatch = path.match(/^\/api\/admin\/courses\/([^/]+)\/modules$/);
  if (moduleMatch && method === 'POST') {
    const modules = database.modules[moduleMatch[1]] ||= [];
    const module = { id: id('module'), course_id: moduleMatch[1], title: data.title, position: modules.length, lessons: [] };
    modules.push(module);
    saveDatabase(database);
    return clone(module);
  }
  const lessonMatch = path.match(/^\/api\/admin\/modules\/([^/]+)\/lessons$/);
  if (lessonMatch && method === 'POST') {
    const module = Object.values(database.modules).flat().find((item) => item.id === lessonMatch[1]);
    if (!module) throw apiError(404, 'module_not_found', 'Kurs modulu tapılmadı.');
    const lesson = { id: id('lesson'), module_id: module.id, title: data.title, duration_minutes: Number(data.duration_minutes) || 0, video_file_id: data.video_file_id || null, position: module.lessons.length };
    module.lessons.push(lesson);
    saveDatabase(database);
    return clone(lesson);
  }
  const courseMatch = path.match(/^\/api\/admin\/courses\/([^/]+)$/);
  if (courseMatch && method === 'GET') {
    const course = database.courses.find((item) => item.id === courseMatch[1]);
    if (!course) throw apiError(404, 'course_not_found', 'Kurs tapılmadı.');
    return clone({ course, modules: database.modules[course.id] || [] });
  }
  if (courseMatch && method === 'PATCH') {
    const course = database.courses.find((item) => item.id === courseMatch[1]);
    if (!course) throw apiError(404, 'course_not_found', 'Kurs tapılmadı.');
    Object.assign(course, data, { updated_at: now() });
    saveDatabase(database);
    return { id: course.id, status: course.status };
  }
  const moderationMatch = path.match(/^\/api\/admin\/moderation\/([^/]+)$/);
  if (moderationMatch && method === 'PATCH') {
    const item = database.moderation.find((entry) => entry.id === moderationMatch[1]);
    if (!item) throw apiError(404, 'case_not_found', 'Moderasiya işi tapılmadı.');
    Object.assign(item, data, { updated_at: now() });
    saveDatabase(database);
    return { id: item.id, status: item.status };
  }
  throw apiError(404, 'route_not_found', 'Admin əməliyyatı tapılmadı.');
}

function updateProfile(database, user, data) {
  user.name = String(data.name || user.name).trim() || user.name;
  if (user.role === 'student') database.profiles[user.id] = { ...database.profiles[user.id], headline: data.headline || '', bio: data.bio || '', location: data.location || '', skills: Array.isArray(data.skills) ? data.skills : [], visibility: data.visibility || 'companies' };
  if (user.role === 'company') {
    const company = database.companies.find((item) => item.owner_user_id === user.id || item.member_ids.includes(user.id));
    if (company) Object.assign(company, { name: data.company_name || company.name, website: data.website || '', team_size: data.team_size || '', description: data.description || '', location: data.location || '' });
  }
  saveDatabase(database);
  return clone(sessionPayload(database, user));
}

function localUpload(user, options) {
  const file = options.body;
  const headers = options.headers || {};
  const header = (name) => headers instanceof Headers ? headers.get(name) : headers[name] || headers[name.toLowerCase()];
  const kind = header('x-file-kind') || 'attachment';
  return { id: id('file'), kind, original_name: header('x-file-name') || file?.name || 'local-file', content_type: header('Content-Type') || file?.type || 'application/octet-stream', size_bytes: file?.size || 0, url: '', owner_user_id: user.id };
}

function createLocalSession(database, data) {
  const role = ['student', 'company', 'admin'].includes(data.role) ? data.role : 'student';
  const user = database.users.find((item) => item.id === `local-${role}`);
  if (data.name?.trim()) user.name = data.name.trim();
  if (role === 'company' && data.company_name?.trim()) database.companies.find((item) => item.owner_user_id === user.id).name = data.company_name.trim();
  storage().setItem(sessionKey, JSON.stringify({ userId: user.id }));
  return sessionPayload(database, user);
}

function sessionPayload(database, user) {
  const company = user.role === 'company' ? database.companies.find((item) => item.owner_user_id === user.id || item.member_ids.includes(user.id)) : null;
  return { user: publicUser(user), company: company ? { ...company, member_role: company.member_roles[user.id] || 'viewer' } : null, profile: user.role === 'student' ? database.profiles[user.id] || null : null, permissions: rolePermissions[user.role] || [] };
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, email_verified: true, avatar_file_id: user.avatar_file_id || null };
}

function currentUser(database) {
  try {
    const session = JSON.parse(storage().getItem(sessionKey) || 'null');
    return database.users.find((user) => user.id === session?.userId && user.status === 'active') || null;
  } catch { return null; }
}

function requireRole(user, role) {
  if (user.role !== role) throw apiError(403, 'forbidden', 'Bu lokal workspace üçün icazəniz yoxdur.');
}

function loadDatabase() {
  try {
    const parsed = JSON.parse(storage().getItem(databaseKey) || 'null');
    if (parsed?.version === 1) return parsed;
  } catch { /* Reset an invalid local development database. */ }
  const database = seedDatabase();
  saveDatabase(database);
  return database;
}

function saveDatabase(database) {
  storage().setItem(databaseKey, JSON.stringify(database));
}

function seedDatabase() {
  const created = '2026-08-01T09:00:00.000Z';
  const users = [
    { id: 'local-student', email: 'student@structlab.local', name: 'Aylin Məmmədova', role: 'student', status: 'active', email_verified: true, created_at: created },
    { id: 'local-company', email: 'company@structlab.local', name: 'Kamran Əliyev', role: 'company', status: 'active', email_verified: true, created_at: created },
    { id: 'local-admin', email: 'admin@structlab.local', name: 'StructLab Admin', role: 'admin', status: 'active', email_verified: true, created_at: created },
    { id: 'local-candidate', email: 'nigar@structlab.local', name: 'Nigar Həsənli', role: 'student', status: 'active', email_verified: true, created_at: '2026-08-02T10:15:00.000Z' },
  ];
  const courses = [
    { id: 'course-structural', title: 'Structural Design Fundamentals', slug: 'structural-design-fundamentals', summary: 'Daşıyıcı sistemlərin layihələndirilməsi üçün praktik baza.', category: 'Structural', level: 'beginner', duration_minutes: 420, lessons: 12, status: 'published', created_at: created },
    { id: 'course-bim', title: 'BIM Coordination Workflow', slug: 'bim-coordination-workflow', summary: 'Model koordinasiyası və clash detection prosesi.', category: 'BIM', level: 'intermediate', duration_minutes: 360, lessons: 9, status: 'published', created_at: created },
    { id: 'course-safety', title: 'Construction Site Safety', slug: 'construction-site-safety', summary: 'Sahədə risklərin idarə edilməsi və təhlükəsizlik.', category: 'Safety', level: 'beginner', duration_minutes: 180, lessons: 6, status: 'published', created_at: created },
  ];
  const companies = [
    { id: 'company-local', owner_user_id: 'local-company', name: 'Caspian Structures', slug: 'caspian-structures', sector: 'Engineering & Construction', team_size: '51-200', website: 'https://example.com', description: 'Mühəndislik və tikinti layihələri.', location: 'Bakı, Azərbaycan', verification_status: 'approved', member_ids: ['local-company'], member_roles: { 'local-company': 'owner' }, created_at: created },
    { id: 'company-pending', owner_user_id: null, name: 'Baku Build Studio', slug: 'baku-build-studio', sector: 'Architecture', team_size: '11-50', website: '', description: '', location: 'Bakı, Azərbaycan', verification_status: 'pending', member_ids: [], member_roles: {}, created_at: '2026-08-04T08:30:00.000Z' },
  ];
  const jobs = [
    { id: 'job-structural', company_id: 'company-local', title: 'Junior Structural Engineer', description: 'Layihə komandası üçün junior mühəndis.', location: 'Bakı · Hibrid', employment_type: 'full_time', skills: ['ETABS', 'AutoCAD', 'Eurocode'], salary_min: 1200, salary_max: 1800, currency: 'AZN', status: 'published', closes_at: '2026-09-30', created_at: created },
    { id: 'job-bim', company_id: 'company-local', title: 'BIM Coordinator', description: 'BIM koordinasiya prosesinə rəhbərlik.', location: 'Bakı · Ofis', employment_type: 'full_time', skills: ['Revit', 'Navisworks', 'BIM'], salary_min: 2200, salary_max: 3200, currency: 'AZN', status: 'published', closes_at: '2026-10-15', created_at: created },
  ];
  return {
    version: 1,
    users,
    companies,
    courses,
    jobs,
    profiles: {
      'local-student': { headline: 'Junior Structural Engineer', bio: 'Daşıyıcı sistemlər və BIM ilə maraqlanıram.', location: 'Bakı, Azərbaycan', skills: ['ETABS', 'AutoCAD', 'Revit'], visibility: 'companies' },
      'local-candidate': { headline: 'BIM Specialist', bio: 'Koordinasiya və model idarəetməsi.', location: 'Bakı, Azərbaycan', skills: ['Revit', 'Navisworks', 'Dynamo'], visibility: 'companies' },
    },
    enrollments: { 'local-student': { 'course-structural': 64, 'course-bim': 28 }, 'local-candidate': { 'course-bim': 100 } },
    savedJobs: { 'local-student': ['job-bim'] },
    applications: [{ id: 'application-local', job_id: 'job-bim', student_user_id: 'local-candidate', status: 'shortlisted', applied_at: '2026-08-03T12:00:00.000Z' }],
    certificates: [{ id: 'certificate-local', student_user_id: 'local-student', course_id: 'course-safety', title: 'Construction Site Safety', credential_code: 'SL-LOCAL-SAFETY', issued_at: '2026-07-28T09:00:00.000Z', revoked_at: null }],
    training: [{ id: 'training-local', company_id: 'company-local', course_id: 'course-safety', assignee_email: 'nigar@structlab.local', assignee_user_id: 'local-candidate', status: 'assigned', progress: 72, due_at: '2026-09-10', created_at: created }],
    moderation: [
      { id: 'moderation-1', reporter_email: 'student@structlab.local', entity_type: 'job', reason: 'Vakansiya məlumatının yoxlanılması', status: 'open', created_at: '2026-08-04T14:00:00.000Z' },
      { id: 'moderation-2', reporter_email: null, entity_type: 'course', reason: 'Yeni kurs üçün keyfiyyət baxışı', status: 'resolved', created_at: '2026-08-03T09:00:00.000Z' },
    ],
    settings: { registrations: true, company_approval_required: true, max_upload_mb: 25, maintenance_mode: false },
    modules: Object.fromEntries(courses.map((course) => [course.id, []])),
  };
}

function enrollmentCount(database, courseId) {
  return Object.values(database.enrollments).filter((items) => Object.hasOwn(items, courseId)).length;
}

function lessonCount(database, courseId) {
  const modules = database.modules[courseId] || [];
  return modules.length ? modules.reduce((total, module) => total + module.lessons.length, 0) : Number(database.courses.find((course) => course.id === courseId)?.lessons || 0);
}

function readBody(body) {
  if (!body || typeof body !== 'string') return body || {};
  try { return JSON.parse(body); } catch { return {}; }
}

function storage() {
  return globalThis.localStorage;
}

function apiError(status, code, message) {
  const error = new Error(message);
  error.name = 'ApiRequestError';
  error.status = status;
  error.code = code;
  return error;
}

function id(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function now() { return new Date().toISOString(); }
function clone(value) { return structuredClone(value); }
function slug(value) { return String(value || 'course').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'course'; }
function nameFromEmail(email) { return String(email || 'Local Member').split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
