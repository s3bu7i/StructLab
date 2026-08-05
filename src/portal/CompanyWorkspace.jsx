import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  Eye,
  FilePlus2,
  Gauge,
  GraduationCap,
  Mail,
  MapPin,
  Search,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { apiRequest, saveProfile, uploadFile } from '../auth/api';
import PortalShell, { Badge, KpiCard, KpiGrid, Modal, PageLead, Panel } from './PortalShell';
import { usePersistentState, useToast } from './usePortalState';

const navItems = [
  { id: 'overview', label: 'İcmal', description: 'İşə qəbul görünüşü', icon: Gauge },
  { id: 'candidates', label: 'Namizədlər', description: 'Talent bazasını araşdır', icon: UsersRound, badge: 12 },
  { id: 'vacancies', label: 'Vakansiyalar', description: 'Elanları idarə et', icon: BriefcaseBusiness },
  { id: 'training', label: 'Təlimlər', description: 'Komanda inkişafı', icon: GraduationCap },
  { id: 'team', label: 'Komanda', description: 'Üzvlər və icazələr', icon: UserCheck },
  { id: 'analytics', label: 'Analitika', description: 'Nəticələri ölç', icon: BarChart3 },
  { id: 'profile', label: 'Şirkət profili', description: 'Brend və əlaqə', icon: Building2 },
];

const pageMeta = {
  overview: ['İşə qəbul paneli', 'Namizəd axını, aktiv elanlar və komanda inkişafı.'],
  candidates: ['Namizədlər', 'Təsdiqlənmiş bacarıqlarla daha tez seçim et.'],
  vacancies: ['Vakansiyalar', 'Elan yarat, statusu dəyiş və müraciətləri izlə.'],
  training: ['Komanda təlimləri', 'İnkişaf proqramlarını əməkdaşlara təyin et.'],
  team: ['Komanda və icazələr', 'Owner, recruiter və read-only səlahiyyətlərini idarə et.'],
  analytics: ['Analitika', 'İşə qəbul performansını aydın metriklərlə ölç.'],
  profile: ['Şirkət profili', 'Namizədlərin gördüyü brend məlumatlarını yenilə.'],
};

export default function CompanyWorkspace({ user, company, section, navigate }) {
  const active = pageMeta[section] ? section : 'overview';
  const [toast, showToast] = useToast();
  const [shortlist, setShortlist] = usePersistentState('sl_company_shortlist', [2]);
  const [vacancies, setVacancies] = usePersistentState('sl_company_vacancies', []);
  const [candidates, setCandidates] = useState([]);
  const [members, setMembers] = useState([]);
  const [trainingData, setTrainingData] = useState({ courses: [], assignments: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiRequest('/api/company/jobs'), apiRequest('/api/company/candidates'), apiRequest('/api/company/members'), apiRequest('/api/company/training')]).then(([jobPayload, candidatePayload, memberPayload, trainingPayload]) => {
      if (cancelled) return;
      setVacancies((jobPayload.items || []).map((job) => ({ ...job, applicants: Number(job.applicants || 0), status: job.status === 'published' ? 'Aktiv' : job.status === 'paused' ? 'Pauza' : 'Qaralama', date: job.closes_at || 'Müddət yoxdur' })));
      setCandidates((candidatePayload.items || []).map((candidate) => ({ ...candidate, status: applicationLabel(candidate.application_status) })));
      setMembers(memberPayload.items || []);
      setTrainingData(trainingPayload);
      setShortlist((candidatePayload.items || []).filter((candidate) => candidate.application_status === 'shortlisted').map((candidate) => candidate.id));
    }).catch((requestError) => showToast(requestError.message, 'error'));
    return () => { cancelled = true; };
  }, [setShortlist, setVacancies, showToast]);
  const meta = pageMeta[active];
  const common = { user, company, navigate, shortlist, setShortlist, vacancies, setVacancies, showToast, candidates, members, setMembers, trainingData, setTrainingData };

  return (
    <PortalShell role="company" user={user} items={navItems} active={active} title={meta[0]} subtitle={meta[1]} navigate={navigate} toast={toast}>
      {active === 'overview' && <CompanyOverview {...common} />}
      {active === 'candidates' && <Candidates {...common} />}
      {active === 'vacancies' && <Vacancies {...common} />}
      {active === 'training' && <Training {...common} />}
      {active === 'team' && <Team {...common} />}
      {active === 'analytics' && <Analytics {...common} />}
      {active === 'profile' && <CompanyProfile {...common} />}
    </PortalShell>
  );
}

function CompanyOverview({ user, navigate, shortlist, vacancies, candidates }) {
  const applicants = vacancies.reduce((sum, vacancy) => sum + Number(vacancy.applicants || 0), 0);
  return (
    <>
      <PageLead eyebrow="Talent intelligence" title={`${user.name}, doğru namizədlər artıq daha yaxındır.`} text="Təsdiqlənmiş bacarıqlara əsaslanan seçimlə işə qəbul vaxtını qısalt və komandanı davamlı inkişaf etdir." accent="coral" actions={<button className="portal-button light" type="button" onClick={() => navigate('/portal/company/vacancies')}><FilePlus2 size={16} /> Vakansiya yarat</button>} />
      <KpiGrid>
        <KpiCard label="Aktiv vakansiya" value={vacancies.filter((item) => item.status === 'Aktiv').length} detail="Bu ay +1" icon={BriefcaseBusiness} tone="coral" />
        <KpiCard label="Ümumi namizəd" value={applicants} detail="Son 30 gündə +22%" icon={UsersRound} />
        <KpiCard label="Shortlist" value={shortlist.length} detail="Baxışa hazırdır" icon={UserCheck} tone="green" />
        <KpiCard label="Orta uyğunluq" value="89%" detail="Sənaye ortalamasından yüksək" icon={Sparkles} tone="gold" />
      </KpiGrid>
      <div className="portal-grid two">
        <Panel title="Tövsiyə olunan namizədlər" subtitle="Aktiv elanlara uyğun ilk seçim" action={<button className="portal-link-button" type="button" onClick={() => navigate('/portal/company/candidates')}>Hamısına bax</button>}>
          <div className="portal-list">{candidates.slice(0, 4).map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} />)}</div>
        </Panel>
        <Panel title="Namizəd axını" subtitle="Cari seçim mərhələləri">
          <div className="pipeline"><Pipeline value="79" label="Yeni müraciət" color="violet" /><Pipeline value="31" label="Profil baxışı" color="coral" /><Pipeline value="14" label="Shortlist" color="gold" /><Pipeline value="6" label="Müsahibə" color="green" /></div>
        </Panel>
      </div>
      <Panel className="portal-section-gap" title="Aktiv vakansiyalar" subtitle="Son müraciətlər və statuslar" action={<button className="portal-link-button" type="button" onClick={() => navigate('/portal/company/vacancies')}>İdarə et</button>}><VacancyTable vacancies={vacancies} /></Panel>
    </>
  );
}

function Candidates({ shortlist, setShortlist, showToast, candidates: candidateData }) {
  const [query, setQuery] = useState('');
  const [minimum, setMinimum] = useState('0');
  const candidates = useMemo(() => candidateData.filter((candidate) => candidate.match >= Number(minimum) && `${candidate.name} ${candidate.title || ''} ${(candidate.skills || []).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [candidateData, query, minimum]);
  async function toggle(candidate) {
    const selected = shortlist.includes(candidate.id);
    try {
      await apiRequest(`/api/company/applications/${candidate.application_id}`, { method: 'PATCH', body: { status: selected ? 'reviewing' : 'shortlisted' } });
      setShortlist((current) => selected ? current.filter((id) => id !== candidate.id) : [...current, candidate.id]);
      showToast(selected ? `${candidate.name} shortlist-dən çıxarıldı.` : `${candidate.name} shortlist-ə əlavə edildi.`);
    } catch (error) { showToast(error.message, 'error'); }
  }
  return (
    <>
      <PageLead eyebrow="Verified talent" title="CV-dən əlavə, real bacarıqları da gör." text="Namizədləri uyğunluq, yer və təsdiqlənmiş texniki bacarıqlarla sürətli müqayisə et." accent="coral" />
      <div className="portal-search-row portal-section-gap"><label className="portal-search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, rol və ya bacarıq…" /></label><select className="portal-select" value={minimum} onChange={(event) => setMinimum(event.target.value)}><option value="0">Bütün uyğunluqlar</option><option value="80">80%+</option><option value="90">90%+</option></select></div>
      <div className="candidate-grid">{candidates.map((candidate) => <article className="candidate-card" key={candidate.id}><div className="candidate-head"><span className="candidate-avatar">{initials(candidate.name)}</span><Badge tone={candidate.match >= 90 ? 'green' : 'violet'}>{candidate.match}% match</Badge></div><h3>{candidate.name}</h3><p>{candidate.title}</p><small><MapPin size={14} /> {candidate.location}</small><div className="skill-cloud compact">{candidate.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="candidate-actions"><button className="portal-button ghost" type="button" onClick={() => showToast(`${candidate.name} profili önizləməyə hazırdır.`)}><Eye size={14} /> Profil</button><button className={`portal-button ${shortlist.includes(candidate.id) ? 'soft' : 'primary'}`} type="button" onClick={() => toggle(candidate)}><Star size={14} fill={shortlist.includes(candidate.id) ? 'currentColor' : 'none'} /> {shortlist.includes(candidate.id) ? 'Seçilib' : 'Shortlist'}</button></div></article>)}</div>
    </>
  );
}

function Vacancies({ vacancies, setVacancies, showToast }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', location: 'Bakı · Hibrid', type: 'Tam iş günü' });
  async function create(event) {
    event.preventDefault();
    try {
      const result = await apiRequest('/api/company/jobs', { method: 'POST', body: { title: form.title, location: form.location, employment_type: employmentValue(form.type), status: 'published' } });
      setVacancies((current) => [{ id: result.id, title: form.title, location: form.location, applicants: 0, status: 'Aktiv', date: 'Müddət yoxdur' }, ...current]);
      setOpen(false);
      setForm({ title: '', location: 'Bakı · Hibrid', type: 'Tam iş günü' });
      showToast('Yeni vakansiya database-də yayımlandı.');
    } catch (error) { showToast(error.message, 'error'); }
  }
  async function toggle(id) {
    const vacancy = vacancies.find((item) => item.id === id);
    const nextStatus = vacancy?.status === 'Aktiv' ? 'paused' : 'published';
    try { await apiRequest(`/api/company/jobs/${id}`, { method: 'PATCH', body: { status: nextStatus } }); setVacancies((current) => current.map((item) => item.id === id ? { ...item, status: nextStatus === 'published' ? 'Aktiv' : 'Pauza' } : item)); showToast('Vakansiya statusu database-də yeniləndi.'); } catch (error) { showToast(error.message, 'error'); }
  }
  return (
    <>
      <PageLead eyebrow="Hiring workspace" title="Elanı yarat, müraciəti izləyib qərar ver." text="Bu demo panelində yaradılan elanlar və status dəyişiklikləri brauzerdə qalır." accent="coral" actions={<button className="portal-button light" type="button" onClick={() => setOpen(true)}><FilePlus2 size={16} /> Yeni vakansiya</button>} />
      <Panel className="portal-section-gap" title={`${vacancies.length} vakansiya`} subtitle="Aktiv və pauzada olan bütün elanlar"><VacancyTable vacancies={vacancies} onToggle={toggle} /></Panel>
      {open && <Modal title="Yeni vakansiya" subtitle="Əsas məlumatları daxil et" onClose={() => setOpen(false)} footer={<><button className="portal-button ghost" type="button" onClick={() => setOpen(false)}>Ləğv et</button><button className="portal-button primary" type="submit" form="vacancy-form">Yayımla</button></>}><form id="vacancy-form" className="portal-form-grid" onSubmit={create}><label className="portal-form-field full"><span>Vəzifə adı</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Məs: Structural Engineer" required /></label><label className="portal-form-field"><span>Məkan</span><input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} required /></label><label className="portal-form-field"><span>İş növü</span><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option>Tam iş günü</option><option>Part-time</option><option>Təcrübə</option></select></label><label className="portal-form-field full"><span>Qısa təsvir</span><textarea placeholder="Rolun əsas məqsədi və tələbləri…" /></label></form></Modal>}
    </>
  );
}

function Training({ company, trainingData, setTrainingData, showToast }) {
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ assignee_email: '', due_at: '' });
  const canAssign = ['owner', 'training_manager'].includes(company?.member_role);
  async function assign(event) {
    event.preventDefault();
    try { const assignment = await apiRequest('/api/company/training', { method: 'POST', body: { course_id: selected.id, ...form } }); setTrainingData((current) => ({ ...current, assignments: [{ ...assignment, course_title: selected.title }, ...current.assignments] })); setSelected(null); setForm({ assignee_email: '', due_at: '' }); showToast(`${selected.title} əməkdaşa təyin edildi.`); } catch (error) { showToast(error.message, 'error'); }
  }
  return (
    <>
      <PageLead eyebrow="Team academy" title="Komandanın bacarıqlarını layihələrdən əvvəl gücləndir." text="Təlim seç, əməkdaşa təyin et və ümumi tamamlanma göstəricisini izləməyə başla." accent="green" />
      <div className="training-grid portal-section-gap">{trainingData.courses.map((program) => { const assigned = trainingData.assignments.filter((item) => item.course_id === program.id); const completion = assigned.length ? Math.round(assigned.reduce((sum, item) => sum + Number(item.progress || 0), 0) / assigned.length) : 0; return <article className="training-card" key={program.id}><span className="training-icon"><GraduationCap size={23} /></span><Badge tone="green">{Math.max(1, Math.round(Number(program.duration_minutes || 0) / 60))} saat</Badge><h3>{program.title}</h3><p>{assigned.length} əməkdaşa təyin edilib</p><div className="course-progress-label"><span>Orta tamamlanma</span><strong>{completion}%</strong></div><div className="portal-progress"><span style={{ width: `${completion}%` }} /></div>{canAssign && <button className="portal-button soft" type="button" onClick={() => setSelected(program)}><UserCheck size={15} /> Əməkdaşa təyin et</button>}</article>; })}</div>
      {!trainingData.courses.length && <div className="portal-empty"><span><GraduationCap size={26} /></span><h3>Yayımlanmış kurs yoxdur</h3><p>Admin ilk kursu yayımladıqda təlim kataloqu burada görünəcək.</p></div>}
      {selected && <Modal title={selected.title} subtitle="Təlimi əməkdaşa təyin et" onClose={() => setSelected(null)} footer={<><button className="portal-button ghost" type="button" onClick={() => setSelected(null)}>Ləğv et</button><button className="portal-button primary" type="submit" form="training-form">Təyin et</button></>}><form id="training-form" className="portal-form-grid" onSubmit={assign}><label className="portal-form-field full"><span>Əməkdaşın e-poçtu</span><input type="email" value={form.assignee_email} onChange={(event) => setForm((current) => ({ ...current, assignee_email: event.target.value }))} required /></label><label className="portal-form-field full"><span>Son tarix</span><input type="date" value={form.due_at} onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value }))} /></label></form></Modal>}
    </>
  );
}

function Team({ company, members, setMembers, showToast }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', member_role: 'recruiter' });
  const isOwner = company?.member_role === 'owner';
  async function add(event) {
    event.preventDefault();
    try {
      const member = await apiRequest('/api/company/members', { method: 'POST', body: form });
      setMembers((current) => [...current.filter((item) => item.id !== member.id), member]);
      setOpen(false); setForm({ email: '', member_role: 'recruiter' }); showToast('Komanda üzvü və server icazəsi əlavə edildi.');
    } catch (error) { showToast(error.message, 'error'); }
  }
  async function changeRole(member, memberRole) {
    try { await apiRequest(`/api/company/members/${member.id}`, { method: 'PATCH', body: { member_role: memberRole } }); setMembers((current) => current.map((item) => item.id === member.id ? { ...item, member_role: memberRole } : item)); showToast('Üzv icazəsi yeniləndi.'); } catch (error) { showToast(error.message, 'error'); }
  }
  async function remove(member) {
    try { await apiRequest(`/api/company/members/${member.id}`, { method: 'PATCH', body: { remove: true } }); setMembers((current) => current.filter((item) => item.id !== member.id)); showToast('Üzv şirkət workspace-indən çıxarıldı.'); } catch (error) { showToast(error.message, 'error'); }
  }
  return <>
    <PageLead eyebrow="Company access" title="Hər əməkdaşa yalnız ehtiyacı olan icazəni ver." text="Owner tam idarə edir, recruiter vakansiya və namizədlərlə işləyir, training manager təlimləri idarə edir, viewer isə yalnız oxuyur." accent="green" actions={isOwner ? <button className="portal-button light" type="button" onClick={() => setOpen(true)}><UserCheck size={16} /> Üzv əlavə et</button> : null} />
    <Panel className="portal-section-gap" title={`${members.length} komanda üzvü`} subtitle="İcazələr serverdə hər sorğu üçün yoxlanır"><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Üzv</th><th>Rol</th><th>Status</th><th>Qoşulub</th>{isOwner && <th />}</tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><br /><small>{member.email}</small></td><td>{isOwner && member.member_role !== 'owner' ? <select className="portal-select compact" value={member.member_role} onChange={(event) => changeRole(member, event.target.value)}><option value="recruiter">Recruiter</option><option value="training_manager">Training manager</option><option value="viewer">Viewer</option></select> : <Badge tone={member.member_role === 'owner' ? 'gold' : 'violet'}>{memberRoleLabel(member.member_role)}</Badge>}</td><td><Badge tone={member.status === 'active' ? 'green' : 'coral'}>{member.status}</Badge></td><td>{member.created_at ? new Date(member.created_at).toLocaleDateString('az-AZ') : '—'}</td>{isOwner && <td>{member.member_role !== 'owner' && <button className="portal-button danger small" type="button" onClick={() => remove(member)}><Trash2 size={13} /> Sil</button>}</td>}</tr>)}</tbody></table></div></Panel>
    {open && <Modal title="Komanda üzvü əlavə et" subtitle="İstifadəçinin e-poçtu əvvəlcə StructLab-da təsdiqlənməlidir" onClose={() => setOpen(false)} footer={<><button className="portal-button ghost" type="button" onClick={() => setOpen(false)}>Ləğv et</button><button className="portal-button primary" type="submit" form="member-form">Əlavə et</button></>}><form id="member-form" className="portal-form-grid" onSubmit={add}><label className="portal-form-field full"><span>Təsdiqlənmiş e-poçt</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label><label className="portal-form-field full"><span>İcazə rolu</span><select value={form.member_role} onChange={(event) => setForm((current) => ({ ...current, member_role: event.target.value }))}><option value="recruiter">Recruiter — vakansiya və namizədlər</option><option value="training_manager">Training manager — təlimlər</option><option value="viewer">Viewer — yalnız oxuma</option></select></label></form></Modal>}
  </>;
}

function Analytics() {
  return (
    <>
      <PageLead eyebrow="Recruitment analytics" title="Hansı kanalın və qərarın nəticə verdiyini gör." text="Demo məlumatlarla işə qəbul hunisi, həftəlik müraciətlər və bacarıq tələbləri bir paneldə." />
      <KpiGrid><KpiCard label="Time to shortlist" value="4.2 gün" detail="Əvvəlki aya görə -1.3 gün" icon={CalendarClock} tone="green" /><KpiCard label="Baxış → müsahibə" value="19%" detail="Bu ay +3.8%" icon={UserCheck} /><KpiCard label="Vakansiya baxışı" value="3.4K" detail="Son 30 gündə +18%" icon={Eye} tone="coral" /><KpiCard label="Cavab faizi" value="86%" detail="Orta müddət 9 saat" icon={Mail} tone="gold" /></KpiGrid>
      <div className="portal-grid two"><Panel title="Həftəlik müraciətlər" subtitle="Son 8 həftə"><div className="analytics-bars">{[46, 64, 51, 78, 68, 91, 74, 86].map((value, index) => <span key={index} style={{ '--bar-height': `${value}%` }}><i /><small>H{index + 1}</small></span>)}</div></Panel><Panel title="Ən çox tələb olunan bacarıqlar" subtitle="Aktiv vakansiyalar üzrə"><div className="rank-list">{[['Revit', 92], ['Structural Analysis', 81], ['Navisworks', 73], ['Project Planning', 64]].map(([label, value], index) => <div key={label}><span>{index + 1}</span><strong>{label}</strong><div className="portal-progress"><i style={{ width: `${value}%` }} /></div><small>{value}%</small></div>)}</div></Panel></div>
    </>
  );
}

function CompanyProfile({ user, company, showToast }) {
  const [form, setForm] = useState({ name: company?.name || user.name, email: user.email, website: company?.website || '', size: company?.team_size || '', about: company?.description || '' });
  const [uploading, setUploading] = useState('');
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  async function save(event) { event.preventDefault(); try { await saveProfile({ name: form.name, company_name: form.name, website: form.website, team_size: form.size, description: form.about, location: 'Bakı, Azərbaycan' }); showToast('Şirkət profili database-də yeniləndi.'); } catch (error) { showToast(error.message, 'error'); } }
  async function handleUpload(event, kind) { const file = event.target.files?.[0]; if (!file) return; setUploading(kind); try { await uploadFile(file, kind); showToast(kind === 'company_logo' ? 'Şirkət loqosu yükləndi.' : 'Şirkət sənədi təhlükəsiz storage-a yükləndi.'); } catch (error) { showToast(error.message, 'error'); } finally { setUploading(''); event.target.value = ''; } }
  return (
    <>
      <PageLead eyebrow="Employer brand" title="Güclü şirkət profili güclü namizədləri cəlb edir." text="Missiyanı, komandanı və iş mühitini aydın göstər; vakansiyaların daha etibarlı görünsün." accent="coral" />
      <div className="portal-grid two portal-section-gap"><Panel title="Şirkət məlumatları" subtitle="Namizədlərin gördüyü əsas profil"><form className="portal-form-grid" onSubmit={save}><label className="portal-form-field"><span>Şirkət adı</span><input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label className="portal-form-field"><span>Təsdiqlənmiş e-poçt</span><input type="email" value={form.email} readOnly /></label><label className="portal-form-field"><span>Vebsayt</span><input value={form.website} onChange={(event) => update('website', event.target.value)} /></label><label className="portal-form-field"><span>Komanda ölçüsü</span><select value={form.size} onChange={(event) => update('size', event.target.value)}><option value="">Seçin</option><option>1–50 əməkdaş</option><option>51–200 əməkdaş</option><option>201+ əməkdaş</option></select></label><label className="portal-form-field full"><span>Haqqımızda</span><textarea value={form.about} onChange={(event) => update('about', event.target.value)} /></label><div className="portal-form-field full upload-actions"><label className="portal-button ghost file-button"><input type="file" accept="image/*" onChange={(event) => handleUpload(event, 'company_logo')} />{uploading === 'company_logo' ? 'Loqo yüklənir…' : 'Şirkət loqosu'}</label><label className="portal-button ghost file-button"><input type="file" accept="application/pdf,image/*" onChange={(event) => handleUpload(event, 'company_document')} />{uploading === 'company_document' ? 'Sənəd yüklənir…' : 'Təsdiq sənədi'}</label></div><div className="portal-form-field full"><button className="portal-button primary align-start" type="submit">Yadda saxla</button></div></form></Panel><Panel title="Profil önizləməsi" subtitle="Namizəd görünüşü"><div className="company-preview"><span className="company-mark large">{form.name.slice(0, 2).toUpperCase()}</span><Badge tone={company?.verification_status === 'approved' ? 'green' : 'gold'}><Check size={12} /> {company?.verification_status === 'approved' ? 'Təsdiqlənmiş şirkət' : 'Admin yoxlaması'}</Badge><h3>{form.name}</h3><p>{form.about || 'Şirkət təsvirini əlavə edin.'}</p><div><span><Building2 size={15} /> {form.size || 'Komanda ölçüsü yoxdur'}</span><span><MapPin size={15} /> {company?.location || 'Məkan yoxdur'}</span></div><button className="portal-button ghost" type="button">Açıq vakansiyalar <ChevronRight size={14} /></button></div></Panel></div>
    </>
  );
}

function VacancyTable({ vacancies, onToggle }) {
  return <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Vakansiya</th><th>Status</th><th>Müraciət</th><th>Müddət</th>{onToggle && <th />}</tr></thead><tbody>{vacancies.map((vacancy) => <tr key={vacancy.id}><td><strong>{vacancy.title}</strong><br /><small>{vacancy.location}</small></td><td><Badge tone={vacancy.status === 'Aktiv' ? 'green' : 'gold'}>{vacancy.status}</Badge></td><td>{vacancy.applicants}</td><td>{vacancy.date}</td>{onToggle && <td><button className="portal-button ghost small" type="button" onClick={() => onToggle(vacancy.id)}>{vacancy.status === 'Aktiv' ? 'Pauza et' : 'Aktiv et'}</button></td>}</tr>)}</tbody></table></div>;
}

function CandidateRow({ candidate }) {
  return <div className="portal-list-row"><span className="candidate-avatar small">{initials(candidate.name)}</span><span className="portal-list-copy"><strong>{candidate.name}</strong><small>{candidate.title} · {candidate.location}</small></span><Badge tone="green">{candidate.match}%</Badge></div>;
}

function Pipeline({ value, label, color }) {
  return <div className={`pipeline-item ${color}`}><span>{value}</span><strong>{label}</strong><ChevronRight size={15} /></div>;
}

function initials(name) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }

function employmentValue(label) { return { 'Tam iş günü': 'full_time', 'Part-time': 'part_time', Təcrübə: 'internship', Müqavilə: 'contract' }[label] || 'full_time'; }
function applicationLabel(value) { return { submitted: 'Yeni', reviewing: 'Baxılır', shortlisted: 'Shortlist', interview: 'Müsahibə', offer: 'Təklif', hired: 'İşə qəbul' }[value] || value; }
function memberRoleLabel(value) { return { owner: 'Owner', recruiter: 'Recruiter', training_manager: 'Training manager', viewer: 'Viewer' }[value] || value; }
