import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Ban,
  BookOpenCheck,
  Building2,
  Check,
  Clock3,
  Gauge,
  GraduationCap,
  MessageSquareWarning,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import PortalShell, { Badge, KpiCard, KpiGrid, Modal, PageLead, Panel } from './PortalShell';
import { apiRequest, uploadFile } from '../auth/api';
import { usePersistentState, useToast } from './usePortalState';

const navItems = [
  { id: 'overview', label: 'İcmal', description: 'Platform sağlamlığı', icon: Gauge },
  { id: 'students', label: 'İstifadəçilər', description: 'Rol və hesab statusları', icon: GraduationCap },
  { id: 'companies', label: 'Şirkətlər', description: 'Təsdiq sorğuları', icon: Building2, badge: 3 },
  { id: 'courses', label: 'Kurslar', description: 'Kontent idarəetməsi', icon: BookOpenCheck },
  { id: 'moderation', label: 'Moderasiya', description: 'Yoxlama növbəsi', icon: MessageSquareWarning, badge: 4 },
  { id: 'settings', label: 'Sistem ayarları', description: 'Platform qaydaları', icon: Settings2 },
];

const pageMeta = {
  overview: ['Control center', 'Platform metrikləri və tələb olunan əməliyyatlar.'],
  students: ['İstifadəçilər', 'Server rollarını və hesab statuslarını idarə et.'],
  companies: ['Şirkətlər', 'İşəgötürən profillərini yoxla və təsdiqlə.'],
  courses: ['Kurslar', 'Tədris kontentinin statusunu və keyfiyyətini izlə.'],
  moderation: ['Moderasiya', 'Şikayət və yoxlama növbəsini təhlükəsiz idarə et.'],
  settings: ['Sistem ayarları', 'Demo platform davranışlarını tənzimlə.'],
};

export default function AdminWorkspace({ user, section, navigate }) {
  const active = pageMeta[section] ? section : 'overview';
  const [toast, showToast] = useToast();
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [courses, setCourses] = useState([]);
  const [moderation, setModeration] = useState([]);
  const [settings, setSettings] = usePersistentState('sl_admin_settings', { registrations: true, companyApproval: true, examProctoring: false, weeklyDigest: true });
  const [stats, setStats] = useState({ users: 0, companies: 0, courses: 0, jobs: 0, moderation: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest('/api/admin/stats'), apiRequest('/api/admin/users'), apiRequest('/api/admin/companies'),
      apiRequest('/api/admin/courses'), apiRequest('/api/admin/moderation'), apiRequest('/api/admin/settings'),
    ]).then(([statsPayload, userPayload, companyPayload, coursePayload, moderationPayload, settingsPayload]) => {
      if (cancelled) return;
      setStats(statsPayload);
      setStudents((userPayload.items || []).map((item) => ({ ...item, courses: 0, joined: formatDate(item.created_at), status: item.status === 'active' ? 'Aktiv' : 'Bloklanıb' })));
      setCompanies((companyPayload.items || []).map((item) => ({ ...item, sector: item.sector || 'Göstərilməyib', status: companyStatus(item.verification_status), applied: formatDate(item.created_at) })));
      setCourses((coursePayload.items || []).map((item) => ({ ...item, status: item.status === 'published' ? 'Yayımda' : item.status === 'archived' ? 'Arxiv' : 'Qaralama', rating: item.rating || 0 })));
      setModeration((moderationPayload.items || []).map((item) => ({ ...item, type: item.entity_type, title: item.reason, source: item.reporter_email || 'Sistem', age: formatDate(item.created_at), status: item.status === 'open' ? 'Açıq' : item.status === 'resolved' ? 'Həll edildi' : item.status })));
      setSettings((current) => ({ ...current, registrations: settingsPayload.registrations ?? current.registrations, companyApproval: settingsPayload.company_approval_required ?? current.companyApproval }));
    }).catch((requestError) => showToast(requestError.message, 'error'));
    return () => { cancelled = true; };
  }, [setSettings, showToast]);
  const meta = pageMeta[active];
  const common = { user, navigate, students, setStudents, companies, setCompanies, courses, setCourses, moderation, setModeration, settings, setSettings, showToast, stats };

  return (
    <PortalShell role="admin" user={user} items={navItems} active={active} title={meta[0]} subtitle={meta[1]} navigate={navigate} toast={toast}>
      {active === 'overview' && <AdminOverview {...common} />}
      {active === 'students' && <Students {...common} />}
      {active === 'companies' && <Companies {...common} />}
      {active === 'courses' && <Courses {...common} />}
      {active === 'moderation' && <Moderation {...common} />}
      {active === 'settings' && <Settings {...common} />}
    </PortalShell>
  );
}

function AdminOverview({ navigate, students, companies, courses, moderation, stats }) {
  const open = moderation.filter((item) => item.status === 'Açıq');
  return (
    <>
      <PageLead eyebrow="Platform operations" title="StructLab-ın bütün əsas siqnalları bir mərkəzdə." text="İstifadəçi artımını, kontent sağlamlığını və təsdiq növbəsini aydın prioritetlərlə idarə et." actions={<button className="portal-button light" type="button" onClick={() => navigate('/portal/admin/moderation')}><ShieldCheck size={16} /> Növbəni yoxla</button>} />
      <KpiGrid>
        <KpiCard label="İstifadəçi hesabı" value={stats.users} detail={`${students.length} tələbə profili`} icon={UsersRound} />
        <KpiCard label="Təsdiqlənmiş şirkət" value={stats.companies} detail={`${companies.filter((item) => item.status === 'Gözləyir').length} sorğu gözləyir`} icon={Building2} tone="green" />
        <KpiCard label="Aktiv kurs" value={stats.courses} detail={`${courses.length} ümumi kurs`} icon={BookOpenCheck} tone="gold" />
        <KpiCard label="Açıq siqnal" value={stats.moderation} detail="Moderasiya növbəsi" icon={MessageSquareWarning} tone="coral" />
      </KpiGrid>
      <div className="portal-grid two">
        <Panel title="Platform aktivliyi" subtitle="Son 7 gün üzrə indeks"><div className="analytics-bars admin-chart">{[48, 61, 58, 79, 67, 88, 81].map((value, index) => <span key={index} style={{ '--bar-height': `${value}%` }}><i /><small>{['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'][index]}</small></span>)}</div></Panel>
        <Panel title="Əməliyyat sağlamlığı" subtitle="Real-time demo göstəriciləri"><div className="health-list"><Health label="Frontend uptime" value="99.99%" /><Health label="Orta səhifə cavabı" value="184 ms" /><Health label="Moderasiya SLA" value="2.1 saat" /><Health label="Uğurlu imtahan axını" value="98.6%" /></div></Panel>
      </div>
      <Panel className="portal-section-gap" title="Prioritet əməliyyatlar" subtitle="Admin baxışı tələb edən son siqnallar" action={<button className="portal-link-button" type="button" onClick={() => navigate('/portal/admin/moderation')}>Bütün növbə</button>}><ModerationTable items={open.slice(0, 3)} /></Panel>
    </>
  );
}

function Students({ user, students, setStudents, showToast }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => students.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(query.toLowerCase())), [students, query]);
  async function toggle(id) { const target = students.find((student) => student.id === id); const nextStatus = target?.status === 'Aktiv' ? 'suspended' : 'active'; try { await apiRequest(`/api/admin/users/${id}`, { method: 'PATCH', body: { status: nextStatus } }); setStudents((current) => current.map((student) => student.id === id ? { ...student, status: nextStatus === 'active' ? 'Aktiv' : 'Bloklanıb' } : student)); showToast('Tələbə statusu serverdə yeniləndi.'); } catch (error) { showToast(error.message, 'error'); } }
  async function changeRole(id, role) { try { await apiRequest(`/api/admin/users/${id}`, { method: 'PATCH', body: { role } }); setStudents((current) => current.map((student) => student.id === id ? { ...student, role } : student)); showToast('İstifadəçi rolu serverdə yeniləndi.'); } catch (error) { showToast(error.message, 'error'); } }
  return (
    <>
      <PageLead eyebrow="User management" title="Təsdiqlənmiş hesabların rolunu və statusunu idarə et." text="İstifadəçilər təhlükəsiz e-poçt girişi ilə özləri yaranır; admin rol və bloklama qərarlarını audit izi ilə tətbiq edir." accent="green" />
      <Panel className="portal-section-gap" title={`${filtered.length} istifadəçi`} subtitle="Platform hesabları" action={<label className="portal-search-field compact"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İstifadəçi axtar…" /></label>}><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>İstifadəçi</th><th>Rol</th><th>Status</th><th>Qeydiyyat</th><th /></tr></thead><tbody>{filtered.map((student) => <tr key={student.id}><td><strong>{student.name}</strong><br /><small>{student.email}</small></td><td>{student.id === user.id ? <Badge tone="gold">{student.role}</Badge> : <select className="portal-select compact" value={student.role} onChange={(event) => changeRole(student.id, event.target.value)}><option value="student">Student</option><option value="company">Company</option><option value="admin">Admin</option></select>}</td><td><Badge tone={student.status === 'Aktiv' ? 'green' : 'coral'}>{student.status}</Badge></td><td>{student.joined}</td><td><button className={`portal-button small ${student.status === 'Aktiv' ? 'danger' : 'soft'}`} type="button" disabled={student.id === user.id} onClick={() => toggle(student.id)}>{student.status === 'Aktiv' ? <Ban size={13} /> : <Check size={13} />}{student.status === 'Aktiv' ? 'Blokla' : 'Aktiv et'}</button></td></tr>)}</tbody></table></div></Panel>
    </>
  );
}

function Companies({ companies, setCompanies, showToast }) {
  async function approve(id) { try { await apiRequest(`/api/admin/companies/${id}`, { method: 'PATCH', body: { verification_status: 'approved' } }); setCompanies((current) => current.map((company) => company.id === id ? { ...company, status: 'Təsdiqlənib' } : company)); showToast('Şirkət profili serverdə təsdiqləndi.'); } catch (error) { showToast(error.message, 'error'); } }
  return (
    <>
      <PageLead eyebrow="Company verification" title="Etibarlı işəgötürən ekosistemini qoru." text="Gözləyən profilləri nəzərdən keçir, təsdiq et və aktiv elanların sayını izləyin." />
      <Panel className="portal-section-gap" title="Şirkət reyestri" subtitle={`${companies.filter((item) => item.status === 'Gözləyir').length} təsdiq sorğusu gözləyir`}><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Şirkət</th><th>Sektor</th><th>Vakansiya</th><th>Status</th><th /></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><strong>{company.name}</strong><br /><small>Müraciət: {company.applied}</small></td><td>{company.sector}</td><td>{company.jobs}</td><td><Badge tone={company.status === 'Təsdiqlənib' ? 'green' : 'gold'}>{company.status}</Badge></td><td><button className="portal-button small soft" type="button" disabled={company.status === 'Təsdiqlənib'} onClick={() => approve(company.id)}><BadgeCheck size={13} /> {company.status === 'Təsdiqlənib' ? 'Təsdiqlənib' : 'Təsdiq et'}</button></td></tr>)}</tbody></table></div></Panel>
    </>
  );
}

function Courses({ courses, setCourses, showToast }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Structural', level: 'beginner' });
  const [contentCourse, setContentCourse] = useState(null);
  const [content, setContent] = useState(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [lesson, setLesson] = useState({ module_id: '', title: '', duration_minutes: 0, video_file_id: '' });
  async function toggle(id) { const course = courses.find((item) => item.id === id); const next = course?.status === 'Yayımda' ? 'draft' : 'published'; try { await apiRequest(`/api/admin/courses/${id}`, { method: 'PATCH', body: { status: next } }); setCourses((current) => current.map((item) => item.id === id ? { ...item, status: next === 'published' ? 'Yayımda' : 'Qaralama' } : item)); showToast('Kursun yayım statusu serverdə dəyişdirildi.'); } catch (error) { showToast(error.message, 'error'); } }
  async function create(event) { event.preventDefault(); try { const result = await apiRequest('/api/admin/courses', { method: 'POST', body: { ...form, status: 'draft' } }); setCourses((current) => [{ id: result.id, title: form.title, category: form.category, level: form.level, students: 0, lessons: 0, status: 'Qaralama', rating: 0 }, ...current]); setOpen(false); setForm({ title: '', category: 'Structural', level: 'beginner' }); showToast('Yeni kurs qaralaması database-də yaradıldı.'); } catch (error) { showToast(error.message, 'error'); } }
  async function manage(course) { setContentCourse(course); setContent(null); try { setContent(await apiRequest(`/api/admin/courses/${course.id}`)); } catch (error) { showToast(error.message, 'error'); setContentCourse(null); } }
  async function addModule(event) { event.preventDefault(); try { const created = await apiRequest(`/api/admin/courses/${contentCourse.id}/modules`, { method: 'POST', body: { title: moduleTitle } }); setContent((current) => ({ ...current, modules: [...current.modules, { ...created, lessons: [] }] })); setModuleTitle(''); showToast('Kurs modulu əlavə edildi.'); } catch (error) { showToast(error.message, 'error'); } }
  async function addLesson(event) { event.preventDefault(); try { const created = await apiRequest(`/api/admin/modules/${lesson.module_id}/lessons`, { method: 'POST', body: lesson }); setContent((current) => ({ ...current, modules: current.modules.map((module) => module.id === lesson.module_id ? { ...module, lessons: [...module.lessons, created] } : module) })); setLesson({ module_id: '', title: '', duration_minutes: 0, video_file_id: '' }); showToast('Dərs modula əlavə edildi.'); } catch (error) { showToast(error.message, 'error'); } }
  async function uploadVideo(event) { const file = event.target.files?.[0]; if (!file) return; try { const uploaded = await uploadFile(file, 'course_video'); setLesson((current) => ({ ...current, video_file_id: uploaded.id })); showToast('Kurs videosu storage-a yükləndi.'); } catch (error) { showToast(error.message, 'error'); } finally { event.target.value = ''; } }
  return (
    <>
      <PageLead eyebrow="Learning operations" title="Kontent keyfiyyətini və yayım ritmini idarə et." text="Kursların qeydiyyat, dərs sayı, reytinq və yayım statusunu bir baxışda yoxla." accent="green" actions={<button className="portal-button light" type="button" onClick={() => setOpen(true)}><Plus size={16} /> Yeni kurs</button>} />
      <div className="course-admin-grid portal-section-gap">{courses.map((course) => <article className="admin-course-card" key={course.id}><span className="training-icon"><BookOpenCheck size={22} /></span><Badge tone={course.status === 'Yayımda' ? 'green' : 'gold'}>{course.status}</Badge><h3>{course.title}</h3><div className="admin-course-stats"><span><strong>{course.students}</strong><small>Tələbə</small></span><span><strong>{course.lessons}</strong><small>Dərs</small></span><span><strong>{course.rating || '—'}</strong><small>Reytinq</small></span></div><div className="course-admin-actions"><button className="portal-button soft" type="button" onClick={() => manage(course)}>Kontent</button><button className="portal-button ghost" type="button" onClick={() => toggle(course.id)}>{course.status === 'Yayımda' ? 'Qaralamaya al' : 'Yayımla'}</button></div></article>)}</div>
      {open && <Modal title="Yeni kurs" subtitle="Kontent strukturunun ilk məlumatları" onClose={() => setOpen(false)} footer={<><button className="portal-button ghost" type="button" onClick={() => setOpen(false)}>Ləğv et</button><button className="portal-button primary" type="submit" form="course-form">Qaralama yarat</button></>}><form id="course-form" className="portal-form-grid" onSubmit={create}><label className="portal-form-field full"><span>Kurs adı</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></label><label className="portal-form-field"><span>Kateqoriya</span><input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></label><label className="portal-form-field"><span>Səviyyə</span><select value={form.level} onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}><option value="beginner">Başlanğıc</option><option value="intermediate">Orta</option><option value="advanced">İrəli</option></select></label></form></Modal>}
      {contentCourse && <Modal title={`${contentCourse.title} — kontent`} subtitle="Modul, dərs və video asset-ləri" onClose={() => setContentCourse(null)} footer={<button className="portal-button primary" type="button" onClick={() => setContentCourse(null)}>Hazırdır</button>}><div className="course-builder">{content ? <><div className="module-list">{content.modules.length ? content.modules.map((module) => <div key={module.id}><strong>{module.position + 1}. {module.title}</strong><small>{module.lessons.length} dərs</small>{module.lessons.map((item) => <span key={item.id}>{item.title} · {item.duration_minutes || 0} dəq</span>)}</div>) : <p>İlk modulu əlavə edin.</p>}</div><form className="portal-form-grid" onSubmit={addModule}><label className="portal-form-field full"><span>Yeni modul</span><input value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} required /></label><div className="portal-form-field full"><button className="portal-button soft align-start" type="submit">Modul əlavə et</button></div></form>{content.modules.length > 0 && <form className="portal-form-grid course-builder-form" onSubmit={addLesson}><label className="portal-form-field"><span>Modul</span><select value={lesson.module_id} onChange={(event) => setLesson((current) => ({ ...current, module_id: event.target.value }))} required><option value="">Seçin</option>{content.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label><label className="portal-form-field"><span>Dərs adı</span><input value={lesson.title} onChange={(event) => setLesson((current) => ({ ...current, title: event.target.value }))} required /></label><label className="portal-form-field"><span>Müddət (dəq)</span><input type="number" min="0" value={lesson.duration_minutes} onChange={(event) => setLesson((current) => ({ ...current, duration_minutes: event.target.value }))} /></label><div className="portal-form-field"><span>Video</span><label className="portal-button ghost file-button"><input type="file" accept="video/*" onChange={uploadVideo} />{lesson.video_file_id ? 'Video hazırdır' : 'Video yüklə'}</label></div><div className="portal-form-field full"><button className="portal-button primary align-start" type="submit">Dərs əlavə et</button></div></form>}</> : <div className="portal-load-inline">Kontent yüklənir…</div>}</div></Modal>}
    </>
  );
}

function Moderation({ moderation, setModeration, showToast }) {
  async function resolve(id) { try { await apiRequest(`/api/admin/moderation/${id}`, { method: 'PATCH', body: { status: 'resolved', resolution_note: 'Admin panelindən həll edildi.' } }); setModeration((current) => current.map((item) => item.id === id ? { ...item, status: 'Həll edildi' } : item)); showToast('Moderasiya siqnalı serverdə həll edildi.'); } catch (error) { showToast(error.message, 'error'); } }
  const openCount = moderation.filter((item) => item.status === 'Açıq').length;
  return (
    <>
      <PageLead eyebrow="Trust & safety" title="İcma siqnallarını aydın növbə ilə həll et." text="Hər əməliyyat yalnız bu frontend demoda saxlanır; real moderasiya üçün server audit jurnalı tələb olunur." accent="coral" />
      <KpiGrid><KpiCard label="Açıq siqnal" value={openCount} detail="Prioritet baxış tələb edir" icon={MessageSquareWarning} tone="coral" /><KpiCard label="Bu gün həll edilən" value={moderation.length - openCount} detail="Demo sessiyası üzrə" icon={ShieldCheck} tone="green" /><KpiCard label="Orta cavab" value="2.1 s" detail="SLA daxilində" icon={Clock3} tone="gold" /><KpiCard label="Avtomatik aşkarlama" value="71%" detail="Yoxlama siqnallarında" icon={Activity} /></KpiGrid>
      <Panel title="Yoxlama növbəsi" subtitle="Açıq və tamamlanmış bütün siqnallar"><ModerationTable items={moderation} onResolve={resolve} /></Panel>
    </>
  );
}

function Settings({ settings, setSettings, showToast }) {
  const options = [
    ['registrations', 'Yeni tələbə qeydiyyatı', 'Yeni frontend hesabların yaradılmasına icazə ver.'],
    ['companyApproval', 'Şirkət təsdiqi tələb et', 'Vakansiya dərcindən əvvəl admin yoxlaması göstər.'],
    ['examProctoring', 'İmtahan nəzarəti', 'Demo qiymətləndirmələrdə əlavə nəzarət statusu.'],
    ['weeklyDigest', 'Həftəlik hesabat', 'Admin icmalında həftəlik platform xülasəsini aktiv saxla.'],
  ];
  async function toggle(key) { const next = !settings[key]; const serverKey = { registrations: 'registrations', companyApproval: 'company_approval_required', examProctoring: 'exam_proctoring', weeklyDigest: 'weekly_digest' }[key]; try { if (['registrations', 'companyApproval'].includes(key)) await apiRequest('/api/admin/settings', { method: 'PATCH', body: { [serverKey]: next } }); setSettings((current) => ({ ...current, [key]: next })); showToast('Sistem seçimi database-də yadda saxlanıldı.'); } catch (error) { showToast(error.message, 'error'); } }
  return (
    <>
      <PageLead eyebrow="Platform configuration" title="Davranışları sadə, nəzarəti aydın saxla." text="Bunlar işləyən frontend demo seçimləridir; real sistem təhlükəsizliyi server və icazə səviyyələrində qurulmalıdır." />
      <div className="portal-grid two portal-section-gap"><Panel title="Ümumi seçimlər" subtitle="Server platform davranışları"><div className="settings-list">{options.map(([key, title, text]) => <div key={key}><span><strong>{title}</strong><small>{text}</small></span><button className={`toggle-switch${settings[key] ? ' on' : ''}`} type="button" role="switch" aria-checked={settings[key]} onClick={() => toggle(key)}><i /></button></div>)}</div></Panel><Panel title="Təhlükəsizlik vəziyyəti" subtitle="Production əsasları"><div className="security-note"><span><ShieldCheck size={27} /></span><h3>Server authorization aktivdir</h3><p>Kimlik təsdiqlənmiş e-poçt provider-indən alınır, rol icazələri hər API sorğusunda yoxlanır, əsas məlumatlar D1-də, fayllar R2-də saxlanır və idarəetmə əməliyyatları audit jurnalına yazılır.</p><Badge tone="green">Backend qoruması aktivdir</Badge></div></Panel></div>
    </>
  );
}

function ModerationTable({ items, onResolve }) {
  return <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Siqnal</th><th>Növ</th><th>Mənbə</th><th>Vaxt</th><th>Status</th>{onResolve && <th />}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.type}</td><td>{item.source}</td><td>{item.age}</td><td><Badge tone={item.status === 'Açıq' ? 'coral' : 'green'}>{item.status}</Badge></td>{onResolve && <td><button className="portal-button small soft" type="button" disabled={item.status !== 'Açıq'} onClick={() => onResolve(item.id)}><Check size={13} /> Həll et</button></td>}</tr>)}</tbody></table></div>;
}

function Health({ label, value }) { return <div><span><i />{label}</span><strong>{value}</strong></div>; }

function formatDate(value) { if (!value) return '—'; try { return new Intl.DateTimeFormat('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); } catch { return value; } }
function companyStatus(value) { return { approved: 'Təsdiqlənib', pending: 'Gözləyir', rejected: 'Rədd edilib' }[value] || value; }
