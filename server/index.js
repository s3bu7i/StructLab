const HTML_HEADERS = {
  'Cache-Control': 'no-cache',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const ROLE_SET = new Set(['student', 'company', 'admin']);
const COMPANY_WRITE_ROLES = new Set(['owner', 'recruiter']);
const EMPLOYMENT_TYPES = new Set(['full_time', 'part_time', 'internship', 'contract']);
const APPLICATION_STATUSES = new Set(['submitted', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']);
const COURSE_STATUSES = new Set(['draft', 'review', 'published', 'archived']);
const UPLOAD_RULES = {
  avatar: { roles: ['student', 'company', 'admin'], max: 5 * 1024 * 1024, mime: ['image/'] },
  resume: { roles: ['student'], max: 25 * 1024 * 1024, mime: ['application/pdf'] },
  company_logo: { roles: ['company', 'admin'], max: 5 * 1024 * 1024, mime: ['image/'] },
  company_document: { roles: ['company', 'admin'], max: 25 * 1024 * 1024, mime: ['application/pdf', 'image/'] },
  course_cover: { roles: ['admin'], max: 8 * 1024 * 1024, mime: ['image/'] },
  course_video: { roles: ['admin'], max: 200 * 1024 * 1024, mime: ['video/'] },
  course_document: { roles: ['admin'], max: 25 * 1024 * 1024, mime: ['application/pdf'] },
  certificate: { roles: ['admin'], max: 25 * 1024 * 1024, mime: ['application/pdf'] },
};

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function withHeaders(response, additions = {}) {
  const headers = new Headers(response.headers);
  Object.entries(additions).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function cleanText(value, max = 500) {
  return String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'invalid_email', 'Düzgün e-poçt ünvanı tələb olunur.');
  return email;
}

function cleanSlug(value) {
  const slug = cleanText(value, 100).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `item-${crypto.randomUUID().slice(0, 8)}`;
}

function parseJsonColumn(value, fallback = []) {
  try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; }
}

async function bodyJson(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) throw new ApiError(415, 'json_required', 'JSON sorğusu tələb olunur.');
  try { return await request.json(); } catch { throw new ApiError(400, 'invalid_json', 'Sorğunun JSON məlumatı yanlışdır.'); }
}

function assertSameOrigin(request, url) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return;
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  const origin = request.headers.get('Origin');
  if (fetchSite === 'cross-site' || (origin && origin !== url.origin)) throw new ApiError(403, 'cross_site_write_blocked', 'Cross-site yazma sorğusu bloklandı.');
}

function requireBindings(env, needsUpload = false) {
  if (!env.DB) throw new ApiError(503, 'database_unavailable', 'Database bağlantısı hazır deyil.');
  if (needsUpload && !env.UPLOADS) throw new ApiError(503, 'storage_unavailable', 'Fayl storage bağlantısı hazır deyil.');
}

function decodeDisplayName(request, email) {
  const encoded = request.headers.get('oai-authenticated-user-full-name');
  const encoding = request.headers.get('oai-authenticated-user-full-name-encoding');
  if (encoded && encoding === 'percent-encoded-utf-8') {
    try { return cleanText(decodeURIComponent(encoded), 120) || email.split('@')[0]; } catch { /* fall back to email */ }
  }
  return email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function authenticatedIdentity(request) {
  const subject = cleanText(request.headers.get('oai-authenticated-user-id'), 200);
  const rawEmail = request.headers.get('oai-authenticated-user-email');
  if (!subject || !rawEmail) {
    throw new ApiError(401, 'authentication_required', 'Davam etmək üçün təsdiqlənmiş e-poçtla giriş tələb olunur.', { login_url: '/signin-with-chatgpt?return_to=/login' });
  }
  const email = cleanEmail(rawEmail);
  return { subject, email, name: decodeDisplayName(request, email) };
}

async function ensureUser(env, request) {
  const identity = await authenticatedIdentity(request);
  let user = await env.DB.prepare('SELECT * FROM users WHERE auth_subject = ?').bind(identity.subject).first();
  if (!user) {
    const existingEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').bind(identity.email).first();
    if (existingEmail) throw new ApiError(409, 'email_conflict', 'Bu e-poçt başqa platform hesabına bağlıdır. Dəstəyə müraciət edin.');
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first();
    const role = Number(count?.count || 0) === 0 ? 'admin' : 'student';
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO users (id, auth_subject, email, name, role, email_verified) VALUES (?, ?, ?, ?, ?, 1)`).bind(id, identity.subject, identity.email, identity.name, role).run();
    if (role === 'student') await env.DB.prepare('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)').bind(id).run();
    await audit(env, id, 'user.created', 'user', id, { role, verified_email: identity.email });
    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  } else {
    await env.DB.prepare('UPDATE users SET last_seen_at = CURRENT_TIMESTAMP, email = ?, name = CASE WHEN name = \'\' THEN ? ELSE name END WHERE id = ?').bind(identity.email, identity.name, user.id).run();
  }
  if (user.status !== 'active') throw new ApiError(403, 'account_suspended', 'Hesabınız aktiv deyil. Platform admini ilə əlaqə saxlayın.');
  return { ...user, email_verified: Boolean(user.email_verified) };
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw new ApiError(403, 'forbidden', 'Bu əməliyyat üçün icazəniz yoxdur.');
}

async function audit(env, actorId, action, entityType, entityId = null, metadata = {}) {
  await env.DB.prepare('INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), actorId || null, action, entityType, entityId, JSON.stringify(metadata)).run();
}

async function getCompanyContext(env, user, write = false) {
  requireRole(user, 'company', 'admin');
  if (user.role === 'admin') return { company: null, membership: { member_role: 'owner' } };
  const membership = await env.DB.prepare(`SELECT cm.member_role, c.* FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE cm.user_id = ? LIMIT 1`).bind(user.id).first();
  if (!membership) throw new ApiError(403, 'company_required', 'Şirkət profili tapılmadı.');
  if (write && !COMPANY_WRITE_ROLES.has(membership.member_role)) throw new ApiError(403, 'company_write_forbidden', 'Şirkət məlumatlarını dəyişmək üçün owner və ya recruiter icazəsi lazımdır.');
  return { company: membership, membership };
}

async function sessionPayload(env, user) {
  let company = null;
  let profile = null;
  if (user.role === 'company') company = await env.DB.prepare(`SELECT c.*, cm.member_role FROM companies c JOIN company_members cm ON cm.company_id = c.id WHERE cm.user_id = ? LIMIT 1`).bind(user.id).first();
  if (user.role === 'student') {
    profile = await env.DB.prepare('SELECT * FROM student_profiles WHERE user_id = ?').bind(user.id).first();
    if (profile) {
      profile.skills = parseJsonColumn(profile.skills_json);
      delete profile.skills_json;
    }
  }
  return { user: publicUser(user), company, profile, permissions: permissionsFor(user, company) };
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, email_verified: Boolean(user.email_verified), avatar_file_id: user.avatar_file_id || null };
}

function permissionsFor(user, company) {
  if (user.role === 'admin') return ['platform:read', 'platform:manage', 'users:manage', 'companies:approve', 'courses:manage', 'moderation:manage', 'files:manage'];
  if (user.role === 'company') {
    const permissions = ['company:read', 'jobs:read', 'applications:read', 'candidates:read', 'training:read', 'files:upload'];
    if (COMPANY_WRITE_ROLES.has(company?.member_role)) permissions.push('company:write', 'jobs:write', 'applications:write');
    if (['owner', 'training_manager'].includes(company?.member_role)) permissions.push('training:write');
    return permissions;
  }
  return ['profile:write', 'courses:read', 'learning:write', 'jobs:read', 'applications:write', 'files:upload'];
}

async function completeOnboarding(env, user, data) {
  if (user.role === 'admin') return sessionPayload(env, user);
  const requestedRole = ROLE_SET.has(data.role) && data.role !== 'admin' ? data.role : 'student';
  if (user.role === 'company' && requestedRole !== 'company') throw new ApiError(409, 'role_locked', 'Şirkət hesabının rolunu admin dəyişə bilər.');
  const name = cleanText(data.name || user.name, 120) || user.name;

  if (requestedRole === 'company') {
    const existingEnrollment = await env.DB.prepare('SELECT id FROM enrollments WHERE student_user_id = ? LIMIT 1').bind(user.id).first();
    if (existingEnrollment) throw new ApiError(409, 'student_has_learning_data', 'Təhsil məlumatı olan hesabı şirkət roluna yalnız admin keçirə bilər.');
    const companyName = cleanText(data.company_name || name, 140) || 'New company';
    const baseSlug = cleanSlug(companyName);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
    const companyId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET name = ?, role = \'company\', updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(name, user.id),
      env.DB.prepare('DELETE FROM student_profiles WHERE user_id = ?').bind(user.id),
      env.DB.prepare(`INSERT INTO companies (id, owner_user_id, name, slug) VALUES (?, ?, ?, ?)`).bind(companyId, user.id, companyName, slug),
      env.DB.prepare(`INSERT INTO company_members (company_id, user_id, member_role) VALUES (?, ?, 'owner')`).bind(companyId, user.id),
    ]);
    await audit(env, user.id, 'company.created', 'company', companyId, { name: companyName });
  } else {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET name = ?, role = \'student\', updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(name, user.id),
      env.DB.prepare('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)').bind(user.id),
    ]);
  }
  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
  return sessionPayload(env, updated);
}

async function updateProfile(env, user, data) {
  const name = cleanText(data.name || user.name, 120) || user.name;
  await env.DB.prepare('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(name, user.id).run();
  if (user.role === 'student') {
    const skills = Array.isArray(data.skills) ? data.skills.slice(0, 40).map((item) => cleanText(item, 60)).filter(Boolean) : [];
    await env.DB.prepare(`INSERT INTO student_profiles (user_id, headline, bio, location, skills_json, visibility, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET headline = excluded.headline, bio = excluded.bio, location = excluded.location, skills_json = excluded.skills_json, visibility = excluded.visibility, updated_at = CURRENT_TIMESTAMP`)
      .bind(user.id, cleanText(data.headline, 160), cleanText(data.bio, 2000), cleanText(data.location, 160), JSON.stringify(skills), ['private', 'companies', 'public'].includes(data.visibility) ? data.visibility : 'companies').run();
  } else if (user.role === 'company') {
    const { company } = await getCompanyContext(env, user, true);
    await env.DB.prepare(`UPDATE companies SET name = ?, sector = ?, team_size = ?, website = ?, description = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(cleanText(data.company_name || company.name, 140), cleanText(data.sector, 120), cleanText(data.team_size, 60), cleanText(data.website, 300), cleanText(data.description, 3000), cleanText(data.location, 160), company.id).run();
  }
  await audit(env, user.id, 'profile.updated', user.role === 'company' ? 'company' : 'user', user.id);
  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
  return sessionPayload(env, updated);
}

async function listStudentCourses(env, user) {
  requireRole(user, 'student');
  const result = await env.DB.prepare(`SELECT c.id, c.title, c.slug, c.summary, c.category, c.level, c.duration_minutes,
    COUNT(DISTINCT l.id) AS lessons, COALESCE(e.progress, 0) AS progress, e.status AS enrollment_status
    FROM courses c
    LEFT JOIN course_modules m ON m.course_id = c.id
    LEFT JOIN lessons l ON l.module_id = m.id
    LEFT JOIN enrollments e ON e.course_id = c.id AND e.student_user_id = ?
    WHERE c.status = 'published'
    GROUP BY c.id, e.id ORDER BY c.published_at DESC, c.created_at DESC`).bind(user.id).all();
  return result.results || [];
}

async function enrollCourse(env, user, courseId) {
  requireRole(user, 'student');
  const course = await env.DB.prepare(`SELECT id FROM courses WHERE id = ? AND status = 'published'`).bind(courseId).first();
  if (!course) throw new ApiError(404, 'course_not_found', 'Kurs tapılmadı.');
  await env.DB.prepare(`INSERT INTO enrollments (id, course_id, student_user_id) VALUES (?, ?, ?) ON CONFLICT(course_id, student_user_id) DO UPDATE SET status = 'active'`).bind(crypto.randomUUID(), courseId, user.id).run();
  await audit(env, user.id, 'course.enrolled', 'course', courseId);
  return { enrolled: true };
}

async function updateCourseProgress(env, user, courseId, progress) {
  requireRole(user, 'student');
  const value = Math.max(0, Math.min(100, Number(progress) || 0));
  const result = await env.DB.prepare(`UPDATE enrollments SET progress = ?, status = CASE WHEN ? = 100 THEN 'completed' ELSE 'active' END, completed_at = CASE WHEN ? = 100 THEN CURRENT_TIMESTAMP ELSE NULL END WHERE course_id = ? AND student_user_id = ?`).bind(value, value, value, courseId, user.id).run();
  if (!result.meta?.changes) throw new ApiError(404, 'enrollment_not_found', 'Kursa qeydiyyat tapılmadı.');
  if (value === 100) {
    const course = await env.DB.prepare('SELECT title FROM courses WHERE id = ?').bind(courseId).first();
    if (course) await env.DB.prepare(`INSERT OR IGNORE INTO certificates (id, student_user_id, course_id, title, credential_code) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), user.id, courseId, course.title, `SL-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`).run();
  }
  return { progress: value };
}

async function studentCertificates(env, user) {
  requireRole(user, 'student');
  const result = await env.DB.prepare(`SELECT id, course_id, title, credential_code, file_id, issued_at, revoked_at FROM certificates WHERE student_user_id = ? ORDER BY issued_at DESC`).bind(user.id).all();
  return result.results || [];
}

async function listStudentJobs(env, user) {
  requireRole(user, 'student');
  const result = await env.DB.prepare(`SELECT j.id, j.title, j.description, j.location, j.employment_type, j.skills_json, j.salary_min, j.salary_max, j.currency, j.closes_at,
    c.name AS company, c.logo_file_id, CASE WHEN s.job_id IS NULL THEN 0 ELSE 1 END AS saved,
    a.status AS application_status
    FROM jobs j JOIN companies c ON c.id = j.company_id
    LEFT JOIN saved_jobs s ON s.job_id = j.id AND s.student_user_id = ?
    LEFT JOIN applications a ON a.job_id = j.id AND a.student_user_id = ?
    WHERE j.status = 'published' AND c.verification_status = 'approved'
    ORDER BY j.published_at DESC, j.created_at DESC LIMIT 100`).bind(user.id, user.id).all();
  return (result.results || []).map((row) => ({ ...row, saved: Boolean(row.saved), skills: parseJsonColumn(row.skills_json) }));
}

async function toggleSavedJob(env, user, jobId) {
  requireRole(user, 'student');
  const existing = await env.DB.prepare('SELECT job_id FROM saved_jobs WHERE job_id = ? AND student_user_id = ?').bind(jobId, user.id).first();
  if (existing) await env.DB.prepare('DELETE FROM saved_jobs WHERE job_id = ? AND student_user_id = ?').bind(jobId, user.id).run();
  else await env.DB.prepare('INSERT INTO saved_jobs (job_id, student_user_id) SELECT id, ? FROM jobs WHERE id = ? AND status = \'published\'').bind(user.id, jobId).run();
  return { saved: !existing };
}

async function applyToJob(env, user, data) {
  requireRole(user, 'student');
  const jobId = cleanText(data.job_id, 80);
  const job = await env.DB.prepare(`SELECT j.id FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = ? AND j.status = 'published' AND c.verification_status = 'approved'`).bind(jobId).first();
  if (!job) throw new ApiError(404, 'job_not_found', 'Aktiv vakansiya tapılmadı.');
  if (data.resume_file_id) {
    const resume = await env.DB.prepare(`SELECT id FROM files WHERE id = ? AND owner_user_id = ? AND kind = 'resume' AND status = 'ready'`).bind(cleanText(data.resume_file_id, 80), user.id).first();
    if (!resume) throw new ApiError(400, 'invalid_resume', 'Seçilmiş CV faylı istifadəçiyə aid deyil.');
  }
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`INSERT INTO applications (id, job_id, student_user_id, cover_letter, resume_file_id) VALUES (?, ?, ?, ?, ?)`).bind(id, jobId, user.id, cleanText(data.cover_letter, 4000), data.resume_file_id || null).run();
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new ApiError(409, 'already_applied', 'Bu vakansiyaya artıq müraciət etmisiniz.');
    throw error;
  }
  await audit(env, user.id, 'job.applied', 'job', jobId, { application_id: id });
  return { id, status: 'submitted' };
}

async function listCompanyJobs(env, user) {
  const { company } = await getCompanyContext(env, user);
  const result = await env.DB.prepare(`SELECT j.*, COUNT(a.id) AS applicants FROM jobs j LEFT JOIN applications a ON a.job_id = j.id WHERE j.company_id = ? GROUP BY j.id ORDER BY j.created_at DESC`).bind(company.id).all();
  return result.results || [];
}

async function createCompanyJob(env, user, data) {
  const { company } = await getCompanyContext(env, user, true);
  if (company.verification_status !== 'approved') throw new ApiError(403, 'company_not_approved', 'Vakansiya dərc etmək üçün şirkət admin tərəfindən təsdiqlənməlidir.');
  const title = cleanText(data.title, 180);
  if (title.length < 3) throw new ApiError(400, 'title_required', 'Vakansiya adı tələb olunur.');
  const status = data.status === 'published' ? 'published' : 'draft';
  const id = crypto.randomUUID();
  const skills = Array.isArray(data.skills) ? data.skills.slice(0, 30).map((item) => cleanText(item, 60)).filter(Boolean) : [];
  await env.DB.prepare(`INSERT INTO jobs (id, company_id, title, description, location, employment_type, skills_json, salary_min, salary_max, currency, status, created_by, published_at, closes_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END, ?)`)
    .bind(id, company.id, title, cleanText(data.description, 6000), cleanText(data.location, 180), EMPLOYMENT_TYPES.has(data.employment_type) ? data.employment_type : 'full_time', JSON.stringify(skills), Number(data.salary_min) || null, Number(data.salary_max) || null, cleanText(data.currency || 'AZN', 6), status, user.id, status, data.closes_at || null).run();
  await audit(env, user.id, 'job.created', 'job', id, { company_id: company.id, status });
  return { id, status };
}

async function updateCompanyJob(env, user, jobId, data) {
  const { company } = await getCompanyContext(env, user, true);
  const existing = await env.DB.prepare('SELECT * FROM jobs WHERE id = ? AND company_id = ?').bind(jobId, company.id).first();
  if (!existing) throw new ApiError(404, 'job_not_found', 'Vakansiya tapılmadı.');
  const status = ['draft', 'published', 'paused', 'closed'].includes(data.status) ? data.status : existing.status;
  await env.DB.prepare(`UPDATE jobs SET title = ?, description = ?, location = ?, employment_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP, published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id = ? AND company_id = ?`)
    .bind(cleanText(data.title || existing.title, 180), cleanText(data.description ?? existing.description, 6000), cleanText(data.location ?? existing.location, 180), EMPLOYMENT_TYPES.has(data.employment_type) ? data.employment_type : existing.employment_type, status, status, jobId, company.id).run();
  await audit(env, user.id, 'job.updated', 'job', jobId, { status });
  return { id: jobId, status };
}

async function companyCandidates(env, user) {
  const { company } = await getCompanyContext(env, user);
  const result = await env.DB.prepare(`SELECT DISTINCT u.id, u.name, u.email, sp.headline AS title, sp.location, sp.skills_json,
    a.id AS application_id, a.status AS application_status, a.job_id, j.title AS applied_job
    FROM applications a
    JOIN jobs j ON j.id = a.job_id AND j.company_id = ?
    JOIN users u ON u.id = a.student_user_id AND u.status = 'active'
    JOIN student_profiles sp ON sp.user_id = u.id AND sp.visibility IN ('companies', 'public')
    ORDER BY a.applied_at DESC LIMIT 200`).bind(company.id).all();
  return (result.results || []).map((row) => ({ ...row, skills: parseJsonColumn(row.skills_json), match: 85 }));
}

async function companyApplications(env, user, jobId) {
  const { company } = await getCompanyContext(env, user);
  const result = await env.DB.prepare(`SELECT a.*, u.name, u.email, sp.headline, sp.location, sp.skills_json
    FROM applications a JOIN jobs j ON j.id = a.job_id AND j.company_id = ?
    JOIN users u ON u.id = a.student_user_id LEFT JOIN student_profiles sp ON sp.user_id = u.id
    WHERE (? = '' OR a.job_id = ?) ORDER BY a.applied_at DESC`).bind(company.id, jobId || '', jobId || '').all();
  return (result.results || []).map((row) => ({ ...row, skills: parseJsonColumn(row.skills_json) }));
}

async function updateApplication(env, user, applicationId, data) {
  const { company } = await getCompanyContext(env, user, true);
  if (!APPLICATION_STATUSES.has(data.status) || ['withdrawn', 'submitted'].includes(data.status)) throw new ApiError(400, 'invalid_status', 'Müraciət statusu yanlışdır.');
  const result = await env.DB.prepare(`UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND job_id IN (SELECT id FROM jobs WHERE company_id = ?)`).bind(data.status, applicationId, company.id).run();
  if (!result.meta?.changes) throw new ApiError(404, 'application_not_found', 'Müraciət tapılmadı.');
  await audit(env, user.id, 'application.status_updated', 'application', applicationId, { status: data.status });
  return { id: applicationId, status: data.status };
}

async function companyMembers(env, user) {
  const { company } = await getCompanyContext(env, user);
  const result = await env.DB.prepare(`SELECT u.id, u.name, u.email, u.status, cm.member_role, cm.created_at
    FROM company_members cm JOIN users u ON u.id = cm.user_id
    WHERE cm.company_id = ? ORDER BY CASE cm.member_role WHEN 'owner' THEN 0 WHEN 'recruiter' THEN 1 WHEN 'training_manager' THEN 2 ELSE 3 END, cm.created_at`).bind(company.id).all();
  return result.results || [];
}

async function addCompanyMember(env, user, data) {
  const { company, membership } = await getCompanyContext(env, user, true);
  if (membership.member_role !== 'owner') throw new ApiError(403, 'owner_required', 'Komanda üzvünü yalnız şirkət sahibi əlavə edə bilər.');
  const email = cleanEmail(data.email);
  const memberRole = ['recruiter', 'training_manager', 'viewer'].includes(data.member_role) ? data.member_role : 'viewer';
  const target = await env.DB.prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE AND status = 'active'`).bind(email).first();
  if (!target) throw new ApiError(404, 'verified_user_required', 'Bu e-poçtla təsdiqlənmiş StructLab hesabı tapılmadı. İstifadəçi əvvəlcə hesab yaratmalıdır.');
  const otherMembership = await env.DB.prepare('SELECT company_id FROM company_members WHERE user_id = ? LIMIT 1').bind(target.id).first();
  if (otherMembership && otherMembership.company_id !== company.id) throw new ApiError(409, 'already_in_company', 'İstifadəçi başqa şirkət workspace-inə bağlıdır.');
  if (target.role === 'student') {
    const studentData = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM enrollments WHERE student_user_id = ?) + (SELECT COUNT(*) FROM applications WHERE student_user_id = ?) AS count`).bind(target.id, target.id).first();
    if (Number(studentData?.count || 0) > 0) throw new ApiError(409, 'student_data_exists', 'Aktiv təhsil və ya müraciət məlumatı olan tələbəni şirkət roluna yalnız admin keçirə bilər.');
  }
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO company_members (company_id, user_id, member_role) VALUES (?, ?, ?) ON CONFLICT(company_id, user_id) DO UPDATE SET member_role = excluded.member_role`).bind(company.id, target.id, memberRole),
    env.DB.prepare(`UPDATE users SET role = 'company', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(target.id),
    env.DB.prepare('DELETE FROM student_profiles WHERE user_id = ?').bind(target.id),
  ]);
  await audit(env, user.id, 'company.member_added', 'user', target.id, { company_id: company.id, member_role: memberRole });
  return { id: target.id, name: target.name, email: target.email, member_role: memberRole, status: target.status };
}

async function updateCompanyMember(env, user, memberId, data) {
  const { company, membership } = await getCompanyContext(env, user, true);
  if (membership.member_role !== 'owner') throw new ApiError(403, 'owner_required', 'Komanda icazələrini yalnız şirkət sahibi dəyişə bilər.');
  const target = await env.DB.prepare('SELECT member_role FROM company_members WHERE company_id = ? AND user_id = ?').bind(company.id, memberId).first();
  if (!target) throw new ApiError(404, 'member_not_found', 'Komanda üzvü tapılmadı.');
  if (target.member_role === 'owner') throw new ApiError(400, 'owner_locked', 'Owner rolu bu paneldən dəyişdirilə və silinə bilməz.');
  if (data.remove === true) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM company_members WHERE company_id = ? AND user_id = ?').bind(company.id, memberId),
      env.DB.prepare(`UPDATE users SET role = 'student', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(memberId),
      env.DB.prepare('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)').bind(memberId),
    ]);
    await audit(env, user.id, 'company.member_removed', 'user', memberId, { company_id: company.id });
    return { id: memberId, removed: true };
  }
  const memberRole = ['recruiter', 'training_manager', 'viewer'].includes(data.member_role) ? data.member_role : null;
  if (!memberRole) throw new ApiError(400, 'invalid_member_role', 'Komanda rolu yanlışdır.');
  await env.DB.prepare('UPDATE company_members SET member_role = ? WHERE company_id = ? AND user_id = ?').bind(memberRole, company.id, memberId).run();
  await audit(env, user.id, 'company.member_role_updated', 'user', memberId, { company_id: company.id, member_role: memberRole });
  return { id: memberId, member_role: memberRole };
}

async function companyTraining(env, user) {
  const { company } = await getCompanyContext(env, user);
  const [courses, assignments] = await env.DB.batch([
    env.DB.prepare(`SELECT id, title, category, level, duration_minutes FROM courses WHERE status = 'published' ORDER BY published_at DESC, created_at DESC LIMIT 100`),
    env.DB.prepare(`SELECT ta.*, c.title AS course_title, u.name AS assignee_name FROM company_training_assignments ta JOIN courses c ON c.id = ta.course_id LEFT JOIN users u ON u.id = ta.assignee_user_id WHERE ta.company_id = ? ORDER BY ta.created_at DESC LIMIT 300`).bind(company.id),
  ]);
  return { courses: courses.results || [], assignments: assignments.results || [] };
}

async function assignCompanyTraining(env, user, data) {
  const { company, membership } = await getCompanyContext(env, user);
  if (!['owner', 'training_manager'].includes(membership.member_role)) throw new ApiError(403, 'training_write_forbidden', 'Təlim təyin etmək üçün owner və ya training manager icazəsi lazımdır.');
  const courseId = cleanText(data.course_id, 80);
  const email = cleanEmail(data.assignee_email);
  const course = await env.DB.prepare(`SELECT id FROM courses WHERE id = ? AND status = 'published'`).bind(courseId).first();
  if (!course) throw new ApiError(404, 'course_not_found', 'Yayımlanmış kurs tapılmadı.');
  const assignee = await env.DB.prepare(`SELECT id, role FROM users WHERE email = ? COLLATE NOCASE AND status = 'active'`).bind(email).first();
  const id = crypto.randomUUID();
  const statements = [env.DB.prepare(`INSERT INTO company_training_assignments (id, company_id, course_id, assignee_user_id, assignee_email, assigned_by, due_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, company.id, courseId, assignee?.id || null, email, user.id, data.due_at || null)];
  if (assignee?.role === 'student') statements.push(env.DB.prepare(`INSERT OR IGNORE INTO enrollments (id, course_id, student_user_id) VALUES (?, ?, ?)`).bind(crypto.randomUUID(), courseId, assignee.id));
  await env.DB.batch(statements);
  await audit(env, user.id, 'training.assigned', 'training_assignment', id, { company_id: company.id, course_id: courseId, assignee_email: email });
  return { id, course_id: courseId, assignee_user_id: assignee?.id || null, assignee_email: email, status: 'assigned', progress: 0, due_at: data.due_at || null };
}

async function adminStats(env, user) {
  requireRole(user, 'admin');
  const [users, companies, courses, jobs, moderation] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS count FROM users WHERE status != \'deleted\''),
    env.DB.prepare('SELECT COUNT(*) AS count FROM companies WHERE verification_status = \'approved\''),
    env.DB.prepare('SELECT COUNT(*) AS count FROM courses WHERE status = \'published\''),
    env.DB.prepare('SELECT COUNT(*) AS count FROM jobs WHERE status = \'published\''),
    env.DB.prepare('SELECT COUNT(*) AS count FROM moderation_cases WHERE status IN (\'open\', \'reviewing\')'),
  ]);
  return { users: users.results?.[0]?.count || 0, companies: companies.results?.[0]?.count || 0, courses: courses.results?.[0]?.count || 0, jobs: jobs.results?.[0]?.count || 0, moderation: moderation.results?.[0]?.count || 0 };
}

async function adminList(env, user, entity) {
  requireRole(user, 'admin');
  const queries = {
    users: `SELECT id, email, name, role, status, email_verified, created_at, last_seen_at FROM users WHERE status != 'deleted' ORDER BY created_at DESC LIMIT 500`,
    companies: `SELECT c.*, u.email AS owner_email, COUNT(DISTINCT j.id) AS jobs FROM companies c LEFT JOIN users u ON u.id = c.owner_user_id LEFT JOIN jobs j ON j.company_id = c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500`,
    courses: `SELECT c.*, COUNT(DISTINCT e.id) AS students, COUNT(DISTINCT l.id) AS lessons FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id LEFT JOIN course_modules m ON m.course_id = c.id LEFT JOIN lessons l ON l.module_id = m.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500`,
    moderation: `SELECT mc.*, u.email AS reporter_email, a.email AS assignee_email FROM moderation_cases mc LEFT JOIN users u ON u.id = mc.reporter_user_id LEFT JOIN users a ON a.id = mc.assignee_user_id ORDER BY CASE mc.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, mc.created_at DESC LIMIT 500`,
    audit: `SELECT al.*, u.email AS actor_email FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_user_id ORDER BY al.created_at DESC LIMIT 500`,
  };
  if (!queries[entity]) throw new ApiError(404, 'admin_resource_not_found', 'Admin resursu tapılmadı.');
  const result = await env.DB.prepare(queries[entity]).all();
  return result.results || [];
}

async function adminUpdateUser(env, actor, userId, data) {
  requireRole(actor, 'admin');
  if (actor.id === userId && (data.status === 'suspended' || (data.role && data.role !== 'admin'))) throw new ApiError(400, 'cannot_lock_self', 'Öz admin hesabınızı bloklaya və ya rolunu azalda bilməzsiniz.');
  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!target) throw new ApiError(404, 'user_not_found', 'İstifadəçi tapılmadı.');
  const role = ROLE_SET.has(data.role) ? data.role : target.role;
  const status = ['active', 'suspended'].includes(data.status) ? data.status : target.status;
  if (role === 'company') {
    const membership = await env.DB.prepare('SELECT company_id FROM company_members WHERE user_id = ? LIMIT 1').bind(userId).first();
    if (!membership) throw new ApiError(409, 'company_membership_required', 'Company rolu üçün istifadəçini əvvəlcə şirkət owner-i komandasına əlavə etməlidir.');
  }
  if (target.role === 'company' && role !== 'company') {
    const owner = await env.DB.prepare(`SELECT company_id FROM company_members WHERE user_id = ? AND member_role = 'owner' LIMIT 1`).bind(userId).first();
    if (owner) throw new ApiError(409, 'company_owner_locked', 'Şirkət owner rolunu dəyişməzdən əvvəl ownership transfer tələb olunur.');
    await env.DB.prepare('DELETE FROM company_members WHERE user_id = ?').bind(userId).run();
  }
  await env.DB.prepare('UPDATE users SET role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(role, status, userId).run();
  if (role === 'student') await env.DB.prepare('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)').bind(userId).run();
  await audit(env, actor.id, 'admin.user_updated', 'user', userId, { before: { role: target.role, status: target.status }, after: { role, status } });
  return { id: userId, role, status };
}

async function adminUpdateCompany(env, actor, companyId, data) {
  requireRole(actor, 'admin');
  const status = ['pending', 'approved', 'rejected'].includes(data.verification_status) ? data.verification_status : null;
  if (!status) throw new ApiError(400, 'invalid_company_status', 'Şirkət statusu yanlışdır.');
  const result = await env.DB.prepare('UPDATE companies SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, companyId).run();
  if (!result.meta?.changes) throw new ApiError(404, 'company_not_found', 'Şirkət tapılmadı.');
  await audit(env, actor.id, 'admin.company_verified', 'company', companyId, { status });
  return { id: companyId, verification_status: status };
}

async function adminCreateCourse(env, user, data) {
  requireRole(user, 'admin');
  const title = cleanText(data.title, 180);
  if (title.length < 3) throw new ApiError(400, 'title_required', 'Kurs adı tələb olunur.');
  const id = crypto.randomUUID();
  const slug = `${cleanSlug(data.slug || title)}-${crypto.randomUUID().slice(0, 6)}`;
  const status = COURSE_STATUSES.has(data.status) ? data.status : 'draft';
  await env.DB.prepare(`INSERT INTO courses (id, title, slug, summary, description, category, level, duration_minutes, status, created_by, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)`)
    .bind(id, title, slug, cleanText(data.summary, 600), cleanText(data.description, 10000), cleanText(data.category || 'General', 100), ['beginner', 'intermediate', 'advanced'].includes(data.level) ? data.level : 'beginner', Math.max(0, Number(data.duration_minutes) || 0), status, user.id, status).run();
  await audit(env, user.id, 'course.created', 'course', id, { status });
  return { id, slug, status };
}

async function adminUpdateCourse(env, user, courseId, data) {
  requireRole(user, 'admin');
  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) throw new ApiError(404, 'course_not_found', 'Kurs tapılmadı.');
  const status = COURSE_STATUSES.has(data.status) ? data.status : course.status;
  await env.DB.prepare(`UPDATE courses SET title = ?, summary = ?, description = ?, category = ?, level = ?, duration_minutes = ?, status = ?, updated_at = CURRENT_TIMESTAMP, published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id = ?`)
    .bind(cleanText(data.title || course.title, 180), cleanText(data.summary ?? course.summary, 600), cleanText(data.description ?? course.description, 10000), cleanText(data.category || course.category, 100), ['beginner', 'intermediate', 'advanced'].includes(data.level) ? data.level : course.level, Math.max(0, Number(data.duration_minutes ?? course.duration_minutes) || 0), status, status, courseId).run();
  await audit(env, user.id, 'course.updated', 'course', courseId, { status });
  return { id: courseId, status };
}

async function adminCourseContent(env, user, courseId) {
  requireRole(user, 'admin');
  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) throw new ApiError(404, 'course_not_found', 'Kurs tapılmadı.');
  const rows = await env.DB.prepare(`SELECT m.id AS module_id, m.title AS module_title, m.position AS module_position,
    l.id AS lesson_id, l.title AS lesson_title, l.position AS lesson_position, l.duration_minutes, l.is_preview, l.video_file_id, l.content_json
    FROM course_modules m LEFT JOIN lessons l ON l.module_id = m.id WHERE m.course_id = ? ORDER BY m.position, l.position`).bind(courseId).all();
  const modules = [];
  for (const row of rows.results || []) {
    let module = modules.find((item) => item.id === row.module_id);
    if (!module) { module = { id: row.module_id, title: row.module_title, position: row.module_position, lessons: [] }; modules.push(module); }
    if (row.lesson_id) module.lessons.push({ id: row.lesson_id, title: row.lesson_title, position: row.lesson_position, duration_minutes: row.duration_minutes, is_preview: Boolean(row.is_preview), video_file_id: row.video_file_id, content: parseJsonColumn(row.content_json, {}) });
  }
  return { course, modules };
}

async function adminCreateModule(env, user, courseId, data) {
  requireRole(user, 'admin');
  const course = await env.DB.prepare('SELECT id FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) throw new ApiError(404, 'course_not_found', 'Kurs tapılmadı.');
  const title = cleanText(data.title, 180);
  if (title.length < 2) throw new ApiError(400, 'module_title_required', 'Modul adı tələb olunur.');
  const positionRow = await env.DB.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM course_modules WHERE course_id = ?').bind(courseId).first();
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO course_modules (id, course_id, title, position) VALUES (?, ?, ?, ?)').bind(id, courseId, title, Number(positionRow?.position || 0)).run();
  await audit(env, user.id, 'course.module_created', 'course_module', id, { course_id: courseId });
  return { id, course_id: courseId, title, position: Number(positionRow?.position || 0) };
}

async function adminCreateLesson(env, user, moduleId, data) {
  requireRole(user, 'admin');
  const module = await env.DB.prepare('SELECT id, course_id FROM course_modules WHERE id = ?').bind(moduleId).first();
  if (!module) throw new ApiError(404, 'module_not_found', 'Kurs modulu tapılmadı.');
  const title = cleanText(data.title, 180);
  if (title.length < 2) throw new ApiError(400, 'lesson_title_required', 'Dərs adı tələb olunur.');
  if (data.video_file_id) {
    const video = await env.DB.prepare(`SELECT id FROM files WHERE id = ? AND kind = 'course_video' AND status = 'ready'`).bind(cleanText(data.video_file_id, 80)).first();
    if (!video) throw new ApiError(400, 'invalid_course_video', 'Kurs video faylı tapılmadı.');
  }
  const positionRow = await env.DB.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM lessons WHERE module_id = ?').bind(moduleId).first();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO lessons (id, module_id, title, content_json, video_file_id, duration_minutes, position, is_preview) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, moduleId, title, JSON.stringify(data.content || {}), data.video_file_id || null, Math.max(0, Number(data.duration_minutes) || 0), Number(positionRow?.position || 0), data.is_preview ? 1 : 0).run();
  await audit(env, user.id, 'course.lesson_created', 'lesson', id, { course_id: module.course_id, module_id: moduleId });
  return { id, module_id: moduleId, title, position: Number(positionRow?.position || 0) };
}

async function adminUpdateModeration(env, user, caseId, data) {
  requireRole(user, 'admin');
  const status = ['open', 'reviewing', 'resolved', 'dismissed'].includes(data.status) ? data.status : null;
  if (!status) throw new ApiError(400, 'invalid_moderation_status', 'Moderasiya statusu yanlışdır.');
  const result = await env.DB.prepare('UPDATE moderation_cases SET status = ?, assignee_user_id = ?, resolution_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, user.id, cleanText(data.resolution_note, 3000), caseId).run();
  if (!result.meta?.changes) throw new ApiError(404, 'case_not_found', 'Moderasiya işi tapılmadı.');
  await audit(env, user.id, 'moderation.updated', 'moderation_case', caseId, { status });
  return { id: caseId, status };
}

async function platformSettings(env, user, data) {
  requireRole(user, 'admin');
  if (!data) {
    const rows = await env.DB.prepare('SELECT key, value_json FROM platform_settings ORDER BY key').all();
    return Object.fromEntries((rows.results || []).map((row) => [row.key, parseJsonColumn(row.value_json, row.value_json)]));
  }
  const allowed = new Set(['registrations', 'company_approval_required', 'max_upload_mb', 'maintenance_mode']);
  const entries = Object.entries(data).filter(([key]) => allowed.has(key));
  if (!entries.length) throw new ApiError(400, 'settings_required', 'Dəyişdiriləcək sistem seçimi tapılmadı.');
  await env.DB.batch(entries.map(([key, value]) => env.DB.prepare(`INSERT INTO platform_settings (key, value_json, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`).bind(key, JSON.stringify(value), user.id)));
  await audit(env, user.id, 'settings.updated', 'platform', null, Object.fromEntries(entries));
  return { updated: entries.map(([key]) => key) };
}

async function uploadFile(env, request, user) {
  requireBindings(env, true);
  const kind = cleanText(request.headers.get('x-file-kind'), 50);
  const rule = UPLOAD_RULES[kind];
  if (!rule || !rule.roles.includes(user.role)) throw new ApiError(403, 'upload_forbidden', 'Bu fayl növünü yükləmək üçün icazəniz yoxdur.');
  const contentType = cleanText(request.headers.get('Content-Type') || 'application/octet-stream', 120).split(';')[0];
  if (!rule.mime.some((allowed) => allowed.endsWith('/') ? contentType.startsWith(allowed) : contentType === allowed)) throw new ApiError(415, 'file_type_not_allowed', 'Bu fayl formatına icazə verilmir.');
  const declaredSize = Number(request.headers.get('Content-Length') || 0);
  if (declaredSize > rule.max) throw new ApiError(413, 'file_too_large', 'Fayl icazə verilən ölçüdən böyükdür.');
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > rule.max) throw new ApiError(413, 'file_too_large', 'Fayl boşdur və ya icazə verilən ölçüdən böyükdür.');
  const originalName = cleanText(request.headers.get('x-file-name') || 'upload', 180).replace(/[\\/]/g, '_');
  let companyId = null;
  if (user.role === 'company') companyId = (await getCompanyContext(env, user, true)).company.id;
  const id = crypto.randomUUID();
  const storageKey = `${user.role}/${user.id}/${kind}/${id}`;
  await env.UPLOADS.put(storageKey, bytes, { httpMetadata: { contentType }, customMetadata: { owner: user.id, kind, originalName } });
  try {
    await env.DB.prepare(`INSERT INTO files (id, owner_user_id, company_id, kind, storage_key, original_name, content_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, companyId, kind, storageKey, originalName, contentType, bytes.byteLength).run();
  } catch (error) {
    await env.UPLOADS.delete(storageKey);
    throw error;
  }
  if (kind === 'avatar') await env.DB.prepare('UPDATE users SET avatar_file_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id, user.id).run();
  if (kind === 'company_logo' && companyId) await env.DB.prepare('UPDATE companies SET logo_file_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id, companyId).run();
  await audit(env, user.id, 'file.uploaded', 'file', id, { kind, size_bytes: bytes.byteLength });
  return { id, kind, original_name: originalName, content_type: contentType, size_bytes: bytes.byteLength, url: `/api/files/${id}` };
}

async function downloadFile(env, user, fileId) {
  requireBindings(env, true);
  const file = await env.DB.prepare('SELECT * FROM files WHERE id = ? AND status = \'ready\'').bind(fileId).first();
  if (!file) throw new ApiError(404, 'file_not_found', 'Fayl tapılmadı.');
  let allowed = user.role === 'admin' || file.owner_user_id === user.id;
  if (!allowed && user.role === 'company' && file.company_id) {
    const membership = await env.DB.prepare('SELECT 1 AS allowed FROM company_members WHERE company_id = ? AND user_id = ?').bind(file.company_id, user.id).first();
    allowed = Boolean(membership);
  }
  if (!allowed && file.kind === 'resume' && user.role === 'company') {
    const application = await env.DB.prepare(`SELECT 1 AS allowed FROM applications a JOIN jobs j ON j.id = a.job_id JOIN company_members cm ON cm.company_id = j.company_id WHERE a.resume_file_id = ? AND cm.user_id = ? LIMIT 1`).bind(fileId, user.id).first();
    allowed = Boolean(application);
  }
  if (!allowed) throw new ApiError(403, 'file_forbidden', 'Bu faylı görmək üçün icazəniz yoxdur.');
  const object = await env.UPLOADS.get(file.storage_key);
  if (!object) throw new ApiError(404, 'file_blob_missing', 'Fayl storage-da tapılmadı.');
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', file.content_type);
  headers.set('Content-Disposition', `inline; filename="${file.original_name.replace(/["\r\n]/g, '')}"`);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
}

async function apiRouter(request, env) {
  const url = new URL(request.url);
  assertSameOrigin(request, url);
  requireBindings(env);

  if (url.pathname === '/api/health' && request.method === 'GET') {
    const db = await env.DB.prepare('SELECT 1 AS ok').first();
    return json({ ok: Boolean(db?.ok), service: 'structlab-api' });
  }

  const user = await ensureUser(env, request);
  const path = url.pathname;

  if (path === '/api/auth/session' && request.method === 'GET') return json(await sessionPayload(env, user));
  if (path === '/api/auth/onboarding' && request.method === 'POST') return json(await completeOnboarding(env, user, await bodyJson(request)));
  if (path === '/api/profile' && request.method === 'PATCH') return json(await updateProfile(env, user, await bodyJson(request)));

  if (path === '/api/student/courses' && request.method === 'GET') return json({ items: await listStudentCourses(env, user) });
  if (path === '/api/student/enrollments' && request.method === 'POST') return json(await enrollCourse(env, user, cleanText((await bodyJson(request)).course_id, 80)), 201);
  if (path === '/api/student/progress' && request.method === 'PATCH') { const data = await bodyJson(request); return json(await updateCourseProgress(env, user, cleanText(data.course_id, 80), data.progress)); }
  if (path === '/api/student/jobs' && request.method === 'GET') return json({ items: await listStudentJobs(env, user) });
  if (path === '/api/student/certificates' && request.method === 'GET') return json({ items: await studentCertificates(env, user) });
  if (path === '/api/student/saved-jobs' && request.method === 'POST') return json(await toggleSavedJob(env, user, cleanText((await bodyJson(request)).job_id, 80)));
  if (path === '/api/student/applications' && request.method === 'POST') return json(await applyToJob(env, user, await bodyJson(request)), 201);

  if (path === '/api/company/jobs' && request.method === 'GET') return json({ items: await listCompanyJobs(env, user) });
  if (path === '/api/company/jobs' && request.method === 'POST') return json(await createCompanyJob(env, user, await bodyJson(request)), 201);
  if (path === '/api/company/candidates' && request.method === 'GET') return json({ items: await companyCandidates(env, user) });
  if (path === '/api/company/applications' && request.method === 'GET') return json({ items: await companyApplications(env, user, cleanText(url.searchParams.get('job_id'), 80)) });
  if (path === '/api/company/members' && request.method === 'GET') return json({ items: await companyMembers(env, user) });
  if (path === '/api/company/members' && request.method === 'POST') return json(await addCompanyMember(env, user, await bodyJson(request)), 201);
  if (path === '/api/company/training' && request.method === 'GET') return json(await companyTraining(env, user));
  if (path === '/api/company/training' && request.method === 'POST') return json(await assignCompanyTraining(env, user, await bodyJson(request)), 201);

  const companyJobMatch = path.match(/^\/api\/company\/jobs\/([^/]+)$/);
  if (companyJobMatch && request.method === 'PATCH') return json(await updateCompanyJob(env, user, companyJobMatch[1], await bodyJson(request)));
  const applicationMatch = path.match(/^\/api\/company\/applications\/([^/]+)$/);
  if (applicationMatch && request.method === 'PATCH') return json(await updateApplication(env, user, applicationMatch[1], await bodyJson(request)));
  const companyMemberMatch = path.match(/^\/api\/company\/members\/([^/]+)$/);
  if (companyMemberMatch && request.method === 'PATCH') return json(await updateCompanyMember(env, user, companyMemberMatch[1], await bodyJson(request)));

  if (path === '/api/admin/stats' && request.method === 'GET') return json(await adminStats(env, user));
  for (const entity of ['users', 'companies', 'courses', 'moderation', 'audit']) {
    if (path === `/api/admin/${entity}` && request.method === 'GET') return json({ items: await adminList(env, user, entity) });
  }
  if (path === '/api/admin/courses' && request.method === 'POST') return json(await adminCreateCourse(env, user, await bodyJson(request)), 201);
  if (path === '/api/admin/settings' && request.method === 'GET') return json(await platformSettings(env, user));
  if (path === '/api/admin/settings' && request.method === 'PATCH') return json(await platformSettings(env, user, await bodyJson(request)));

  const adminUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUserMatch && request.method === 'PATCH') return json(await adminUpdateUser(env, user, adminUserMatch[1], await bodyJson(request)));
  const adminCompanyMatch = path.match(/^\/api\/admin\/companies\/([^/]+)$/);
  if (adminCompanyMatch && request.method === 'PATCH') return json(await adminUpdateCompany(env, user, adminCompanyMatch[1], await bodyJson(request)));
  const adminCourseMatch = path.match(/^\/api\/admin\/courses\/([^/]+)$/);
  if (adminCourseMatch && request.method === 'GET') return json(await adminCourseContent(env, user, adminCourseMatch[1]));
  if (adminCourseMatch && request.method === 'PATCH') return json(await adminUpdateCourse(env, user, adminCourseMatch[1], await bodyJson(request)));
  const adminModuleCreateMatch = path.match(/^\/api\/admin\/courses\/([^/]+)\/modules$/);
  if (adminModuleCreateMatch && request.method === 'POST') return json(await adminCreateModule(env, user, adminModuleCreateMatch[1], await bodyJson(request)), 201);
  const adminLessonCreateMatch = path.match(/^\/api\/admin\/modules\/([^/]+)\/lessons$/);
  if (adminLessonCreateMatch && request.method === 'POST') return json(await adminCreateLesson(env, user, adminLessonCreateMatch[1], await bodyJson(request)), 201);
  const adminModerationMatch = path.match(/^\/api\/admin\/moderation\/([^/]+)$/);
  if (adminModerationMatch && request.method === 'PATCH') return json(await adminUpdateModeration(env, user, adminModerationMatch[1], await bodyJson(request)));

  if (path === '/api/files' && request.method === 'POST') return json(await uploadFile(env, request, user), 201);
  const fileMatch = path.match(/^\/api\/files\/([^/]+)$/);
  if (fileMatch && request.method === 'GET') return downloadFile(env, user, fileMatch[1]);

  throw new ApiError(404, 'api_not_found', 'API endpoint tapılmadı.');
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    try {
      return await apiRouter(request, env);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message, details: error.details || null } }, error.status);
      console.error('StructLab API error', error);
      return json({ error: { code: 'internal_error', message: 'Gözlənilməyən server xətası baş verdi.' } }, 500);
    }
  }

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
  if (/\/assets\/.*-[A-Za-z0-9_-]+\.(?:js|css)$/.test(url.pathname)) return withHeaders(response, { 'Cache-Control': 'public, max-age=31536000, immutable' });
  return withHeaders(response, { 'X-Content-Type-Options': 'nosniff' });
}

export default { fetch: handleRequest };
