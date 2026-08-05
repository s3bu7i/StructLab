import { useMemo, useState } from 'react';
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
import { usePersistentState, useToast } from './usePortalState';

const navItems = [
  { id: 'overview', label: 'İcmal', description: 'Platform sağlamlığı', icon: Gauge },
  { id: 'students', label: 'Tələbələr', description: 'Hesab və statuslar', icon: GraduationCap, badge: 8 },
  { id: 'companies', label: 'Şirkətlər', description: 'Təsdiq sorğuları', icon: Building2, badge: 3 },
  { id: 'courses', label: 'Kurslar', description: 'Kontent idarəetməsi', icon: BookOpenCheck },
  { id: 'moderation', label: 'Moderasiya', description: 'Yoxlama növbəsi', icon: MessageSquareWarning, badge: 4 },
  { id: 'settings', label: 'Sistem ayarları', description: 'Platform qaydaları', icon: Settings2 },
];

const pageMeta = {
  overview: ['Control center', 'Platform metrikləri və tələb olunan əməliyyatlar.'],
  students: ['Tələbələr', 'İstifadəçi hesablarını və giriş statuslarını idarə et.'],
  companies: ['Şirkətlər', 'İşəgötürən profillərini yoxla və təsdiqlə.'],
  courses: ['Kurslar', 'Tədris kontentinin statusunu və keyfiyyətini izlə.'],
  moderation: ['Moderasiya', 'Şikayət və yoxlama növbəsini təhlükəsiz idarə et.'],
  settings: ['Sistem ayarları', 'Demo platform davranışlarını tənzimlə.'],
};

const baseStudents = [
  { id: 1, name: 'Nigar Məmmədova', email: 'nigar@example.az', courses: 5, status: 'Aktiv', joined: '04 avq 2026' },
  { id: 2, name: 'Murad Əliyev', email: 'murad@example.az', courses: 3, status: 'Aktiv', joined: '02 avq 2026' },
  { id: 3, name: 'Aysel Həsənli', email: 'aysel@example.az', courses: 7, status: 'Aktiv', joined: '29 iyl 2026' },
  { id: 4, name: 'Orxan Quliyev', email: 'orxan@example.az', courses: 2, status: 'Bloklanıb', joined: '25 iyl 2026' },
  { id: 5, name: 'Ləman Rzayeva', email: 'leman@example.az', courses: 4, status: 'Aktiv', joined: '21 iyl 2026' },
];

const baseCompanies = [
  { id: 1, name: 'BakuBuild Co.', sector: 'Construction', jobs: 4, status: 'Təsdiqlənib', applied: '12 iyl 2026' },
  { id: 2, name: 'Caspian Design Group', sector: 'Architecture & BIM', jobs: 2, status: 'Gözləyir', applied: '03 avq 2026' },
  { id: 3, name: 'UrbanArc', sector: 'Urban development', jobs: 1, status: 'Gözləyir', applied: '02 avq 2026' },
  { id: 4, name: 'North Construction', sector: 'Infrastructure', jobs: 3, status: 'Təsdiqlənib', applied: '17 iyn 2026' },
];

const baseCourses = [
  { id: 1, title: 'Structural Analysis Fundamentals', students: 328, lessons: 18, status: 'Yayımda', rating: 4.9 },
  { id: 2, title: 'BIM Coordination with Revit', students: 214, lessons: 24, status: 'Yayımda', rating: 4.8 },
  { id: 3, title: 'Construction Site Safety', students: 402, lessons: 12, status: 'Yayımda', rating: 4.7 },
  { id: 4, title: 'Sustainable Materials 2026', students: 0, lessons: 9, status: 'Qaralama', rating: 0 },
];

const moderationSeed = [
  { id: 1, type: 'Vakansiya', title: 'Maaş məlumatı qeyri-müəyyəndir', source: 'İstifadəçi şikayəti', age: '18 dəq', status: 'Açıq' },
  { id: 2, type: 'Şirkət profili', title: 'Şirkət sənədlərinin yoxlanması', source: 'Avtomatik yoxlama', age: '1 saat', status: 'Açıq' },
  { id: 3, type: 'Kurs rəyi', title: 'Uyğunsuz dil barədə bildiriş', source: 'İcma siqnalı', age: '3 saat', status: 'Açıq' },
  { id: 4, type: 'Sertifikat', title: 'Credential təkrar yoxlanmalıdır', source: 'Sistem siqnalı', age: 'Dünən', status: 'Açıq' },
];

export default function AdminWorkspace({ user, section, navigate }) {
  const active = pageMeta[section] ? section : 'overview';
  const [toast, showToast] = useToast();
  const [students, setStudents] = usePersistentState('sl_admin_students', baseStudents);
  const [companies, setCompanies] = usePersistentState('sl_admin_companies', baseCompanies);
  const [courses, setCourses] = usePersistentState('sl_admin_courses', baseCourses);
  const [moderation, setModeration] = usePersistentState('sl_admin_moderation', moderationSeed);
  const [settings, setSettings] = usePersistentState('sl_admin_settings', { registrations: true, companyApproval: true, examProctoring: false, weeklyDigest: true });
  const meta = pageMeta[active];
  const common = { user, navigate, students, setStudents, companies, setCompanies, courses, setCourses, moderation, setModeration, settings, setSettings, showToast };

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

function AdminOverview({ navigate, students, companies, courses, moderation }) {
  const open = moderation.filter((item) => item.status === 'Açıq');
  return (
    <>
      <PageLead eyebrow="Platform operations" title="StructLab-ın bütün əsas siqnalları bir mərkəzdə." text="İstifadəçi artımını, kontent sağlamlığını və təsdiq növbəsini aydın prioritetlərlə idarə et." actions={<button className="portal-button light" type="button" onClick={() => navigate('/portal/admin/moderation')}><ShieldCheck size={16} /> Növbəni yoxla</button>} />
      <KpiGrid>
        <KpiCard label="Tələbə hesabı" value={(1284 + students.length).toLocaleString()} detail="Son 30 gündə +12.4%" icon={UsersRound} />
        <KpiCard label="Təsdiqlənmiş şirkət" value={companies.filter((item) => item.status === 'Təsdiqlənib').length + 46} detail={`${companies.filter((item) => item.status === 'Gözləyir').length} sorğu gözləyir`} icon={Building2} tone="green" />
        <KpiCard label="Aktiv kurs" value={courses.filter((item) => item.status === 'Yayımda').length} detail="Orta reytinq 4.8" icon={BookOpenCheck} tone="gold" />
        <KpiCard label="Açıq siqnal" value={open.length} detail="Ən köhnəsi 1 gün" icon={MessageSquareWarning} tone="coral" />
      </KpiGrid>
      <div className="portal-grid two">
        <Panel title="Platform aktivliyi" subtitle="Son 7 gün üzrə indeks"><div className="analytics-bars admin-chart">{[48, 61, 58, 79, 67, 88, 81].map((value, index) => <span key={index} style={{ '--bar-height': `${value}%` }}><i /><small>{['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'][index]}</small></span>)}</div></Panel>
        <Panel title="Əməliyyat sağlamlığı" subtitle="Real-time demo göstəriciləri"><div className="health-list"><Health label="Frontend uptime" value="99.99%" /><Health label="Orta səhifə cavabı" value="184 ms" /><Health label="Moderasiya SLA" value="2.1 saat" /><Health label="Uğurlu imtahan axını" value="98.6%" /></div></Panel>
      </div>
      <Panel className="portal-section-gap" title="Prioritet əməliyyatlar" subtitle="Admin baxışı tələb edən son siqnallar" action={<button className="portal-link-button" type="button" onClick={() => navigate('/portal/admin/moderation')}>Bütün növbə</button>}><ModerationTable items={open.slice(0, 3)} /></Panel>
    </>
  );
}

function Students({ students, setStudents, showToast }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const filtered = useMemo(() => students.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(query.toLowerCase())), [students, query]);
  function add(event) {
    event.preventDefault();
    setStudents((current) => [{ id: Date.now(), name: form.name, email: form.email, courses: 0, status: 'Aktiv', joined: 'Bu gün' }, ...current]);
    setOpen(false); setForm({ name: '', email: '' }); showToast('Yeni demo tələbə hesabı yaradıldı.');
  }
  function toggle(id) { setStudents((current) => current.map((student) => student.id === id ? { ...student, status: student.status === 'Aktiv' ? 'Bloklanıb' : 'Aktiv' } : student)); showToast('Tələbə statusu yeniləndi.'); }
  return (
    <>
      <PageLead eyebrow="User management" title="Tələbə hesablarını sürətli və təhlükəsiz idarə et." text="Axtarış, status nəzarəti və yeni demo hesab yaradılması bir cədvəldə birləşir." accent="green" actions={<button className="portal-button light" type="button" onClick={() => setOpen(true)}><Plus size={16} /> Tələbə əlavə et</button>} />
      <Panel className="portal-section-gap" title={`${filtered.length} tələbə`} subtitle="Demo idarəetmə siyahısı" action={<label className="portal-search-field compact"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tələbə axtar…" /></label>}><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Tələbə</th><th>Kurs</th><th>Status</th><th>Qeydiyyat</th><th /></tr></thead><tbody>{filtered.map((student) => <tr key={student.id}><td><strong>{student.name}</strong><br /><small>{student.email}</small></td><td>{student.courses}</td><td><Badge tone={student.status === 'Aktiv' ? 'green' : 'coral'}>{student.status}</Badge></td><td>{student.joined}</td><td><button className={`portal-button small ${student.status === 'Aktiv' ? 'danger' : 'soft'}`} type="button" onClick={() => toggle(student.id)}>{student.status === 'Aktiv' ? <Ban size={13} /> : <Check size={13} />}{student.status === 'Aktiv' ? 'Blokla' : 'Aktiv et'}</button></td></tr>)}</tbody></table></div></Panel>
      {open && <Modal title="Tələbə əlavə et" subtitle="Frontend demo hesabı" onClose={() => setOpen(false)} footer={<><button className="portal-button ghost" type="button" onClick={() => setOpen(false)}>Ləğv et</button><button className="portal-button primary" type="submit" form="student-form">Yarat</button></>}><form id="student-form" className="portal-form-grid" onSubmit={add}><label className="portal-form-field full"><span>Ad və soyad</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label><label className="portal-form-field full"><span>E-poçt</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label></form></Modal>}
    </>
  );
}

function Companies({ companies, setCompanies, showToast }) {
  function approve(id) { setCompanies((current) => current.map((company) => company.id === id ? { ...company, status: 'Təsdiqlənib' } : company)); showToast('Şirkət profili təsdiqləndi.'); }
  return (
    <>
      <PageLead eyebrow="Company verification" title="Etibarlı işəgötürən ekosistemini qoru." text="Gözləyən profilləri nəzərdən keçir, təsdiq et və aktiv elanların sayını izləyin." />
      <Panel className="portal-section-gap" title="Şirkət reyestri" subtitle={`${companies.filter((item) => item.status === 'Gözləyir').length} təsdiq sorğusu gözləyir`}><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Şirkət</th><th>Sektor</th><th>Vakansiya</th><th>Status</th><th /></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><strong>{company.name}</strong><br /><small>Müraciət: {company.applied}</small></td><td>{company.sector}</td><td>{company.jobs}</td><td><Badge tone={company.status === 'Təsdiqlənib' ? 'green' : 'gold'}>{company.status}</Badge></td><td><button className="portal-button small soft" type="button" disabled={company.status === 'Təsdiqlənib'} onClick={() => approve(company.id)}><BadgeCheck size={13} /> {company.status === 'Təsdiqlənib' ? 'Təsdiqlənib' : 'Təsdiq et'}</button></td></tr>)}</tbody></table></div></Panel>
    </>
  );
}

function Courses({ courses, setCourses, showToast }) {
  function toggle(id) { setCourses((current) => current.map((course) => course.id === id ? { ...course, status: course.status === 'Yayımda' ? 'Qaralama' : 'Yayımda' } : course)); showToast('Kursun yayım statusu dəyişdirildi.'); }
  return (
    <>
      <PageLead eyebrow="Learning operations" title="Kontent keyfiyyətini və yayım ritmini idarə et." text="Kursların qeydiyyat, dərs sayı, reytinq və yayım statusunu bir baxışda yoxla." accent="green" />
      <div className="course-admin-grid portal-section-gap">{courses.map((course) => <article className="admin-course-card" key={course.id}><span className="training-icon"><BookOpenCheck size={22} /></span><Badge tone={course.status === 'Yayımda' ? 'green' : 'gold'}>{course.status}</Badge><h3>{course.title}</h3><div className="admin-course-stats"><span><strong>{course.students}</strong><small>Tələbə</small></span><span><strong>{course.lessons}</strong><small>Dərs</small></span><span><strong>{course.rating || '—'}</strong><small>Reytinq</small></span></div><button className="portal-button ghost" type="button" onClick={() => toggle(course.id)}>{course.status === 'Yayımda' ? 'Qaralamaya al' : 'Yayımla'}</button></article>)}</div>
    </>
  );
}

function Moderation({ moderation, setModeration, showToast }) {
  function resolve(id) { setModeration((current) => current.map((item) => item.id === id ? { ...item, status: 'Həll edildi' } : item)); showToast('Moderasiya siqnalı həll edildi.'); }
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
  function toggle(key) { setSettings((current) => ({ ...current, [key]: !current[key] })); showToast('Sistem seçimi bu cihazda yadda saxlanıldı.'); }
  return (
    <>
      <PageLead eyebrow="Platform configuration" title="Davranışları sadə, nəzarəti aydın saxla." text="Bunlar işləyən frontend demo seçimləridir; real sistem təhlükəsizliyi server və icazə səviyyələrində qurulmalıdır." />
      <div className="portal-grid two portal-section-gap"><Panel title="Ümumi seçimlər" subtitle="Demo platform davranışları"><div className="settings-list">{options.map(([key, title, text]) => <div key={key}><span><strong>{title}</strong><small>{text}</small></span><button className={`toggle-switch${settings[key] ? ' on' : ''}`} type="button" role="switch" aria-checked={settings[key]} onClick={() => toggle(key)}><i /></button></div>)}</div></Panel><Panel title="Təhlükəsizlik qeydi" subtitle="Production hazırlığı"><div className="security-note"><span><ShieldCheck size={27} /></span><h3>Frontend demo rejimi</h3><p>Hazırkı giriş və əməliyyat məlumatları yalnız brauzerin localStorage sahəsindədir. Həqiqi istifadəçi məlumatı üçün parol hash-i, server sessiyası, rol icazələri və audit jurnalından istifadə edilməlidir.</p><Badge tone="gold">Server inteqrasiyası tələb olunur</Badge></div></Panel></div>
    </>
  );
}

function ModerationTable({ items, onResolve }) {
  return <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Siqnal</th><th>Növ</th><th>Mənbə</th><th>Vaxt</th><th>Status</th>{onResolve && <th />}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.type}</td><td>{item.source}</td><td>{item.age}</td><td><Badge tone={item.status === 'Açıq' ? 'coral' : 'green'}>{item.status}</Badge></td>{onResolve && <td><button className="portal-button small soft" type="button" disabled={item.status !== 'Açıq'} onClick={() => onResolve(item.id)}><Check size={13} /> Həll et</button></td>}</tr>)}</tbody></table></div>;
}

function Health({ label, value }) { return <div><span><i />{label}</span><strong>{value}</strong></div>; }
