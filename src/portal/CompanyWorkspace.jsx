import { useMemo, useState } from 'react';
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
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { updateLocalProfile } from '../auth/session';
import PortalShell, { Badge, KpiCard, KpiGrid, Modal, PageLead, Panel } from './PortalShell';
import { usePersistentState, useToast } from './usePortalState';

const navItems = [
  { id: 'overview', label: 'İcmal', description: 'İşə qəbul görünüşü', icon: Gauge },
  { id: 'candidates', label: 'Namizədlər', description: 'Talent bazasını araşdır', icon: UsersRound, badge: 12 },
  { id: 'vacancies', label: 'Vakansiyalar', description: 'Elanları idarə et', icon: BriefcaseBusiness },
  { id: 'training', label: 'Təlimlər', description: 'Komanda inkişafı', icon: GraduationCap },
  { id: 'analytics', label: 'Analitika', description: 'Nəticələri ölç', icon: BarChart3 },
  { id: 'profile', label: 'Şirkət profili', description: 'Brend və əlaqə', icon: Building2 },
];

const pageMeta = {
  overview: ['İşə qəbul paneli', 'Namizəd axını, aktiv elanlar və komanda inkişafı.'],
  candidates: ['Namizədlər', 'Təsdiqlənmiş bacarıqlarla daha tez seçim et.'],
  vacancies: ['Vakansiyalar', 'Elan yarat, statusu dəyiş və müraciətləri izlə.'],
  training: ['Komanda təlimləri', 'İnkişaf proqramlarını əməkdaşlara təyin et.'],
  analytics: ['Analitika', 'İşə qəbul performansını aydın metriklərlə ölç.'],
  profile: ['Şirkət profili', 'Namizədlərin gördüyü brend məlumatlarını yenilə.'],
};

const baseCandidates = [
  { id: 1, name: 'Nigar Məmmədova', title: 'Structural Engineer', location: 'Bakı', match: 96, skills: ['ETABS', 'Revit', 'SAP2000'], status: 'Yeni' },
  { id: 2, name: 'Murad Əliyev', title: 'BIM Coordinator', location: 'Bakı', match: 92, skills: ['Revit', 'Navisworks', 'Dynamo'], status: 'Baxılıb' },
  { id: 3, name: 'Aysel Həsənli', title: 'Site Engineer', location: 'Sumqayıt', match: 88, skills: ['AutoCAD', 'HSE', 'Planning'], status: 'Yeni' },
  { id: 4, name: 'Orxan Quliyev', title: 'Project Engineer', location: 'Gəncə', match: 84, skills: ['Primavera', 'Excel', 'QA/QC'], status: 'Müsahibə' },
  { id: 5, name: 'Ləman Rzayeva', title: 'Junior Architect', location: 'Bakı', match: 79, skills: ['Revit', 'Lumion', 'AutoCAD'], status: 'Yeni' },
];

const baseVacancies = [
  { id: 1, title: 'Senior Structural Engineer', location: 'Bakı · Hibrid', applicants: 18, status: 'Aktiv', date: '12 gün qalıb' },
  { id: 2, title: 'BIM Coordinator', location: 'Bakı · Ofis', applicants: 27, status: 'Aktiv', date: '6 gün qalıb' },
  { id: 3, title: 'Site Engineering Intern', location: 'Sumqayıt', applicants: 34, status: 'Pauza', date: 'Qaralama' },
];

const trainingPrograms = [
  { id: 1, title: 'Advanced Revit Coordination', duration: '6 həftə', enrolled: 8, completion: 74 },
  { id: 2, title: 'Site Safety Leadership', duration: '3 həftə', enrolled: 14, completion: 61 },
  { id: 3, title: 'Project Controls Essentials', duration: '4 həftə', enrolled: 5, completion: 38 },
];

export default function CompanyWorkspace({ user, section, navigate }) {
  const active = pageMeta[section] ? section : 'overview';
  const [toast, showToast] = useToast();
  const [shortlist, setShortlist] = usePersistentState('sl_company_shortlist', [2]);
  const [vacancies, setVacancies] = usePersistentState('sl_company_vacancies', baseVacancies);
  const [assignments, setAssignments] = usePersistentState('sl_company_training_assignments', {});
  const meta = pageMeta[active];
  const common = { user, navigate, shortlist, setShortlist, vacancies, setVacancies, assignments, setAssignments, showToast };

  return (
    <PortalShell role="company" user={user} items={navItems} active={active} title={meta[0]} subtitle={meta[1]} navigate={navigate} toast={toast}>
      {active === 'overview' && <CompanyOverview {...common} />}
      {active === 'candidates' && <Candidates {...common} />}
      {active === 'vacancies' && <Vacancies {...common} />}
      {active === 'training' && <Training {...common} />}
      {active === 'analytics' && <Analytics {...common} />}
      {active === 'profile' && <CompanyProfile {...common} />}
    </PortalShell>
  );
}

function CompanyOverview({ user, navigate, shortlist, vacancies }) {
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
          <div className="portal-list">{baseCandidates.slice(0, 4).map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} />)}</div>
        </Panel>
        <Panel title="Namizəd axını" subtitle="Cari seçim mərhələləri">
          <div className="pipeline"><Pipeline value="79" label="Yeni müraciət" color="violet" /><Pipeline value="31" label="Profil baxışı" color="coral" /><Pipeline value="14" label="Shortlist" color="gold" /><Pipeline value="6" label="Müsahibə" color="green" /></div>
        </Panel>
      </div>
      <Panel className="portal-section-gap" title="Aktiv vakansiyalar" subtitle="Son müraciətlər və statuslar" action={<button className="portal-link-button" type="button" onClick={() => navigate('/portal/company/vacancies')}>İdarə et</button>}><VacancyTable vacancies={vacancies} /></Panel>
    </>
  );
}

function Candidates({ shortlist, setShortlist, showToast }) {
  const [query, setQuery] = useState('');
  const [minimum, setMinimum] = useState('0');
  const candidates = useMemo(() => baseCandidates.filter((candidate) => candidate.match >= Number(minimum) && `${candidate.name} ${candidate.title} ${candidate.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query, minimum]);
  function toggle(candidate) {
    const selected = shortlist.includes(candidate.id);
    setShortlist((current) => selected ? current.filter((id) => id !== candidate.id) : [...current, candidate.id]);
    showToast(selected ? `${candidate.name} shortlist-dən çıxarıldı.` : `${candidate.name} shortlist-ə əlavə edildi.`);
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
  function create(event) {
    event.preventDefault();
    setVacancies((current) => [{ id: Date.now(), title: form.title, location: form.location, type: form.type, applicants: 0, status: 'Aktiv', date: '30 gün qalıb' }, ...current]);
    setOpen(false);
    setForm({ title: '', location: 'Bakı · Hibrid', type: 'Tam iş günü' });
    showToast('Yeni vakansiya yayımlandı.');
  }
  function toggle(id) {
    setVacancies((current) => current.map((vacancy) => vacancy.id === id ? { ...vacancy, status: vacancy.status === 'Aktiv' ? 'Pauza' : 'Aktiv' } : vacancy));
    showToast('Vakansiya statusu yeniləndi.');
  }
  return (
    <>
      <PageLead eyebrow="Hiring workspace" title="Elanı yarat, müraciəti izləyib qərar ver." text="Bu demo panelində yaradılan elanlar və status dəyişiklikləri brauzerdə qalır." accent="coral" actions={<button className="portal-button light" type="button" onClick={() => setOpen(true)}><FilePlus2 size={16} /> Yeni vakansiya</button>} />
      <Panel className="portal-section-gap" title={`${vacancies.length} vakansiya`} subtitle="Aktiv və pauzada olan bütün elanlar"><VacancyTable vacancies={vacancies} onToggle={toggle} /></Panel>
      {open && <Modal title="Yeni vakansiya" subtitle="Əsas məlumatları daxil et" onClose={() => setOpen(false)} footer={<><button className="portal-button ghost" type="button" onClick={() => setOpen(false)}>Ləğv et</button><button className="portal-button primary" type="submit" form="vacancy-form">Yayımla</button></>}><form id="vacancy-form" className="portal-form-grid" onSubmit={create}><label className="portal-form-field full"><span>Vəzifə adı</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Məs: Structural Engineer" required /></label><label className="portal-form-field"><span>Məkan</span><input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} required /></label><label className="portal-form-field"><span>İş növü</span><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option>Tam iş günü</option><option>Part-time</option><option>Təcrübə</option></select></label><label className="portal-form-field full"><span>Qısa təsvir</span><textarea placeholder="Rolun əsas məqsədi və tələbləri…" /></label></form></Modal>}
    </>
  );
}

function Training({ assignments, setAssignments, showToast }) {
  function assign(program) {
    setAssignments((current) => ({ ...current, [program.id]: (current[program.id] || 0) + 1 }));
    showToast(`${program.title} bir əməkdaşa təyin edildi.`);
  }
  return (
    <>
      <PageLead eyebrow="Team academy" title="Komandanın bacarıqlarını layihələrdən əvvəl gücləndir." text="Təlim seç, əməkdaşa təyin et və ümumi tamamlanma göstəricisini izləməyə başla." accent="green" />
      <div className="training-grid portal-section-gap">{trainingPrograms.map((program) => <article className="training-card" key={program.id}><span className="training-icon"><GraduationCap size={23} /></span><Badge tone="green">{program.duration}</Badge><h3>{program.title}</h3><p>{program.enrolled + (assignments[program.id] || 0)} əməkdaş qeydiyyatda</p><div className="course-progress-label"><span>Orta tamamlanma</span><strong>{program.completion}%</strong></div><div className="portal-progress"><span style={{ width: `${program.completion}%` }} /></div><button className="portal-button soft" type="button" onClick={() => assign(program)}><UserCheck size={15} /> Əməkdaşa təyin et</button></article>)}</div>
    </>
  );
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

function CompanyProfile({ user, showToast }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, website: 'https://bakubuild.az', size: '51–200 əməkdaş', about: 'Müasir infrastruktur və dayanıqlı tikinti layihələri üzərində çalışan mühəndislik şirkəti.' });
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function save(event) { event.preventDefault(); updateLocalProfile({ name: form.name, email: form.email }); showToast('Şirkət profili yeniləndi.'); }
  return (
    <>
      <PageLead eyebrow="Employer brand" title="Güclü şirkət profili güclü namizədləri cəlb edir." text="Missiyanı, komandanı və iş mühitini aydın göstər; vakansiyaların daha etibarlı görünsün." accent="coral" />
      <div className="portal-grid two portal-section-gap"><Panel title="Şirkət məlumatları" subtitle="Namizədlərin gördüyü əsas profil"><form className="portal-form-grid" onSubmit={save}><label className="portal-form-field"><span>Şirkət adı</span><input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label className="portal-form-field"><span>Əlaqə e-poçtu</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required /></label><label className="portal-form-field"><span>Vebsayt</span><input value={form.website} onChange={(event) => update('website', event.target.value)} /></label><label className="portal-form-field"><span>Komanda ölçüsü</span><select value={form.size} onChange={(event) => update('size', event.target.value)}><option>1–50 əməkdaş</option><option>51–200 əməkdaş</option><option>201+ əməkdaş</option></select></label><label className="portal-form-field full"><span>Haqqımızda</span><textarea value={form.about} onChange={(event) => update('about', event.target.value)} /></label><div className="portal-form-field full"><button className="portal-button primary align-start" type="submit">Yadda saxla</button></div></form></Panel><Panel title="Profil önizləməsi" subtitle="Namizəd görünüşü"><div className="company-preview"><span className="company-mark large">BB</span><Badge tone="green"><Check size={12} /> Təsdiqlənmiş şirkət</Badge><h3>{form.name}</h3><p>{form.about}</p><div><span><Building2 size={15} /> {form.size}</span><span><MapPin size={15} /> Bakı, Azərbaycan</span></div><button className="portal-button ghost" type="button">Açıq vakansiyalar <ChevronRight size={14} /></button></div></Panel></div>
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
