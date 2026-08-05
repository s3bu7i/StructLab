import { useState } from 'react';
import {
  Award,
  Bookmark,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Gauge,
  GraduationCap,
  MapPin,
  Play,
  Search,
  Send,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import { updateLocalProfile } from '../auth/session';
import PortalShell, { Badge, KpiCard, KpiGrid, Modal, PageLead, Panel } from './PortalShell';
import { usePersistentState, useToast } from './usePortalState';

const navItems = [
  { id: 'overview', label: 'İcmal', description: 'Günün ümumi görünüşü', icon: Gauge },
  { id: 'courses', label: 'Kurslarım', description: 'Öyrənməyə davam et', icon: BookOpen, badge: 4 },
  { id: 'exams', label: 'İmtahanlar', description: 'Biliklərini yoxla', icon: FileCheck2 },
  { id: 'jobs', label: 'İş imkanları', description: 'Uyğun vakansiyalar', icon: BriefcaseBusiness, badge: 6 },
  { id: 'certificates', label: 'Sertifikatlar', description: 'Nəticələrin və sənədlərin', icon: Award },
  { id: 'profile', label: 'Profil', description: 'Bacarıq və məlumatların', icon: UserRound },
];

const pageMeta = {
  overview: ['Salam,', 'Öyrənmə ritmin və yeni imkanların bir baxışda.'],
  courses: ['Kurslarım', 'Davam edən və tövsiyə olunan proqramları idarə et.'],
  exams: ['İmtahanlar', 'Hazır olduğunda qısa qiymətləndirməyə başla.'],
  jobs: ['İş imkanları', 'Profilinə uyğun vakansiyaları araşdır və müraciət et.'],
  certificates: ['Sertifikatlar', 'Təsdiqlənmiş nailiyyətlərini göstər və endir.'],
  profile: ['Profil', 'İşəgötürənlərin gördüyü peşəkar məlumatları yenilə.'],
};

const baseCourses = [
  { id: 1, title: 'Structural Analysis Fundamentals', category: 'Structural', lessons: 18, progress: 68, color: 'violet', next: 'Load combinations' },
  { id: 2, title: 'BIM Coordination with Revit', category: 'BIM', lessons: 24, progress: 42, color: 'coral', next: 'Clash detection' },
  { id: 3, title: 'Construction Site Safety', category: 'Safety', lessons: 12, progress: 91, color: 'gold', next: 'Final assessment' },
  { id: 4, title: 'Project Planning Essentials', category: 'Management', lessons: 16, progress: 24, color: 'green', next: 'Critical path' },
];

const jobs = [
  { id: 1, title: 'Junior Structural Engineer', company: 'BakuBuild Co.', location: 'Bakı · Hibrid', match: 94, type: 'Tam iş günü' },
  { id: 2, title: 'BIM Modeler', company: 'Caspian Design Group', location: 'Bakı · Ofis', match: 89, type: 'Tam iş günü' },
  { id: 3, title: 'Site Engineering Intern', company: 'North Construction', location: 'Sumqayıt', match: 82, type: 'Təcrübə' },
  { id: 4, title: 'Project Assistant', company: 'UrbanArc', location: 'Uzaqdan', match: 78, type: 'Part-time' },
];

const quiz = [
  { q: 'Daşıyıcı elementlərdə “dead load” nəyi ifadə edir?', options: ['Daimi yükü', 'Külək yükünü', 'Seysmik yükü'], correct: 0 },
  { q: 'BIM koordinasiyasının əsas üstünlüyü hansıdır?', options: ['Materialı ağırlaşdırmaq', 'Toqquşmaları erkən tapmaq', 'Çertyoju gizlətmək'], correct: 1 },
  { q: 'Tikinti sahəsində PPE nə üçündür?', options: ['Şəxsi mühafizə üçün', 'Planlama üçün', 'Maliyyə hesabatı üçün'], correct: 0 },
];

export default function StudentWorkspace({ user, section, navigate }) {
  const active = pageMeta[section] ? section : 'overview';
  const [toast, showToast] = useToast();
  const [progress, setProgress] = usePersistentState('sl_student_course_progress', Object.fromEntries(baseCourses.map((course) => [course.id, course.progress])));
  const [savedJobs, setSavedJobs] = usePersistentState('sl_student_saved_jobs', []);
  const [applications, setApplications] = usePersistentState('sl_student_applications', []);
  const [examScore, setExamScore] = usePersistentState('sl_student_exam_score', null);

  const common = { user, navigate, progress, setProgress, savedJobs, setSavedJobs, applications, setApplications, examScore, setExamScore, showToast };
  const meta = pageMeta[active];

  return (
    <PortalShell role="student" user={user} items={navItems} active={active} title={active === 'overview' ? `${meta[0]} ${user.name.split(' ')[0]}` : meta[0]} subtitle={meta[1]} navigate={navigate} toast={toast}>
      {active === 'overview' && <StudentOverview {...common} />}
      {active === 'courses' && <StudentCourses {...common} />}
      {active === 'exams' && <StudentExams {...common} />}
      {active === 'jobs' && <StudentJobs {...common} />}
      {active === 'certificates' && <StudentCertificates {...common} />}
      {active === 'profile' && <StudentProfile {...common} />}
    </PortalShell>
  );
}

function StudentOverview({ user, navigate, progress, applications, examScore }) {
  const average = Math.round(Object.values(progress).reduce((sum, value) => sum + value, 0) / baseCourses.length);
  return (
    <>
      <PageLead eyebrow="Sənin inkişaf panelin" title={`${user.name.split(' ')[0]}, növbəti mühəndislik addımın hazırdır.`} text="Kurslarını tamamla, təsdiqlənmiş bacarıqlar qazan və uyğun şirkətlərlə daha tez əlaqə qur." actions={<button className="portal-button light" type="button" onClick={() => navigate('/portal/student/courses')}><Play size={16} /> Davam et</button>} />
      <KpiGrid>
        <KpiCard label="Ümumi irəliləyiş" value={`${average}%`} detail="Bu həftə +8%" icon={Target} />
        <KpiCard label="Aktiv kurs" value="4" detail="2 dərs bu həftə" icon={BookOpen} tone="coral" />
        <KpiCard label="İmtahan balı" value={examScore === null ? '—' : `${examScore}%`} detail={examScore === null ? 'İlk imtahanı tamamla' : 'Nəticə yadda saxlanıb'} icon={FileCheck2} tone="gold" />
        <KpiCard label="Müraciət" value={applications.length} detail="Yerli cihazda saxlanır" icon={Send} tone="green" />
      </KpiGrid>
      <div className="portal-grid two">
        <Panel title="Öyrənməyə davam et" subtitle="Ən son açdığın proqram" action={<button className="portal-link-button" type="button" onClick={() => navigate('/portal/student/courses')}>Hamısına bax</button>}>
          <CourseRow course={baseCourses[0]} value={progress[1]} onContinue={() => navigate('/portal/student/courses')} />
        </Panel>
        <Panel title="Həftəlik ritm" subtitle="Son 7 gün üzrə aktivlik">
          <div className="mini-chart" aria-label="Weekly learning activity chart">
            {[32, 58, 44, 76, 55, 88, 68].map((height, index) => <span key={index} style={{ '--bar-height': `${height}%` }}><i /> <small>{['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'][index]}</small></span>)}
          </div>
        </Panel>
      </div>
      <div className="portal-grid equal portal-section-gap">
        <Panel title="Sənə uyğun vakansiyalar" subtitle="Profil uyğunluğuna görə sıralanıb" action={<button className="portal-link-button" type="button" onClick={() => navigate('/portal/student/jobs')}>Kəşf et</button>}>
          <div className="portal-list">{jobs.slice(0, 3).map((job) => <JobRow key={job.id} job={job} compact />)}</div>
        </Panel>
        <Panel title="Bu həftənin planı" subtitle="Kiçik addımlar, davamlı nəticə">
          <div className="plan-list">
            <PlanItem done title="Structural Analysis — Lesson 9" detail="Tamamlandı · 28 dəq" />
            <PlanItem title="Safety final assessment" detail="Sabah · təxminən 12 dəq" />
            <PlanItem title="Profil bacarıqlarını yenilə" detail="Cümə günü · 5 dəq" />
          </div>
        </Panel>
      </div>
    </>
  );
}

function StudentCourses({ progress, setProgress, showToast }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const filtered = baseCourses.filter((course) => (category === 'All' || course.category === category) && course.title.toLowerCase().includes(query.toLowerCase()));

  function continueCourse(course) {
    const next = Math.min(100, (progress[course.id] || 0) + 6);
    setProgress((current) => ({ ...current, [course.id]: next }));
    showToast(next === 100 ? `${course.title} tamamlandı.` : `Növbəti dərs tamamlandı — ${next}%`);
  }

  return (
    <>
      <PageLead eyebrow="Strukturlaşdırılmış öyrənmə" title="Hər dərs səni real layihəyə yaxınlaşdırır." text="İrəliləyişin avtomatik bu cihazda saxlanır; istədiyin yerdən davam et." accent="green" actions={<button className="portal-button light" type="button" onClick={() => continueCourse(baseCourses[0])}><Play size={16} /> Son dərsə davam et</button>} />
      <div className="portal-search-row portal-section-gap"><label className="portal-search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kurs axtar…" /></label><select className="portal-select" value={category} onChange={(event) => setCategory(event.target.value)}>{['All', 'Structural', 'BIM', 'Safety', 'Management'].map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="course-grid">{filtered.map((course) => <CourseCard key={course.id} course={course} value={progress[course.id] || 0} onContinue={() => continueCourse(course)} />)}</div>
      {!filtered.length && <EmptyState icon={BookOpen} title="Uyğun kurs tapılmadı" text="Axtarışı və ya kateqoriya filtrini dəyiş." />}
    </>
  );
}

function StudentExams({ examScore, setExamScore, showToast }) {
  const [examOpen, setExamOpen] = useState(false);
  const [answers, setAnswers] = useState({});

  function submitExam() {
    const correct = quiz.filter((question, index) => answers[index] === question.correct).length;
    const score = Math.round((correct / quiz.length) * 100);
    setExamScore(score);
    setExamOpen(false);
    setAnswers({});
    showToast(`İmtahan tamamlandı: ${score}%`);
  }

  return (
    <>
      <PageLead eyebrow="Bilik yoxlaması" title="Hazırlığını üç qısa sualla ölç." text="Bu demo qiymətləndirmə dərhal hesablanır və nəticə panelində saxlanır." actions={<button className="portal-button light" type="button" onClick={() => setExamOpen(true)}><FileCheck2 size={16} /> İmtahana başla</button>} />
      <KpiGrid>
        <KpiCard label="Son nəticə" value={examScore === null ? '—' : `${examScore}%`} detail={examScore >= 70 ? 'Keçid balı tamamlandı' : '70% keçid balı'} icon={Award} tone="gold" />
        <KpiCard label="Suallar" value={quiz.length} detail="Təxminən 4 dəqiqə" icon={Clock3} />
        <KpiCard label="Cəhd" value={examScore === null ? '0' : '1'} detail="Yenidən cəhd mümkündür" icon={Target} tone="coral" />
        <KpiCard label="Status" value={examScore >= 70 ? 'Passed' : 'Ready'} detail="Nəticə dərhal görünür" icon={CheckCircle2} tone="green" />
      </KpiGrid>
      <Panel title="Structural Essentials Assessment" subtitle="Structural · BIM · Safety">
        <div className="exam-card"><span><FileCheck2 size={26} /></span><div><Badge tone="violet">Başlanğıc səviyyə</Badge><h3>Fundamental knowledge check</h3><p>Əsas mühəndislik anlayışlarını yoxlayan qısa, interaktiv qiymətləndirmə.</p><div className="exam-meta"><span><Clock3 size={15} /> 4 dəq</span><span><FileCheck2 size={15} /> 3 sual</span><span><Award size={15} /> 70% keçid</span></div></div><button className="portal-button primary" type="button" onClick={() => setExamOpen(true)}>{examScore === null ? 'Başla' : 'Yenidən cəhd et'}</button></div>
      </Panel>
      {examOpen && <Modal title="Structural Essentials" subtitle={`${Object.keys(answers).length}/${quiz.length} cavab seçilib`} onClose={() => setExamOpen(false)} footer={<><button className="portal-button ghost" type="button" onClick={() => setExamOpen(false)}>Sonra</button><button className="portal-button primary" type="button" disabled={Object.keys(answers).length !== quiz.length} onClick={submitExam}>Nəticəni hesabla</button></>}><div className="quiz-list">{quiz.map((question, index) => <fieldset key={question.q}><legend><span>{index + 1}</span>{question.q}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`q-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))} /><span>{option}</span></label>)}</fieldset>)}</div></Modal>}
    </>
  );
}

function StudentJobs({ savedJobs, setSavedJobs, applications, setApplications, showToast }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Hamısı');
  const filtered = jobs.filter((job) => (filter === 'Hamısı' || job.type === filter) && `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(query.toLowerCase()));
  const toggleSaved = (id) => setSavedJobs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const apply = (job) => {
    if (!applications.includes(job.id)) setApplications((current) => [...current, job.id]);
    showToast(applications.includes(job.id) ? 'Bu vakansiyaya artıq müraciət etmisən.' : `${job.company} üçün müraciət göndərildi.`);
  };
  return (
    <>
      <PageLead eyebrow="Smart matching" title="Bacarıqlarına uyğun işi daha az axtarışla tap." text="Uyğunluq faizi kursların, bacarıqların və vakansiya tələblərinin demo müqayisəsidir." accent="coral" />
      <div className="portal-search-row portal-section-gap"><label className="portal-search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Vəzifə, şirkət və ya şəhər…" /></label><select className="portal-select" value={filter} onChange={(event) => setFilter(event.target.value)}>{['Hamısı', 'Tam iş günü', 'Təcrübə', 'Part-time'].map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="job-grid">{filtered.map((job) => <article className="job-card" key={job.id}><div className="job-card-head"><span className="company-mark">{job.company.slice(0, 2).toUpperCase()}</span><button className={savedJobs.includes(job.id) ? 'saved' : ''} type="button" aria-label="Save job" onClick={() => toggleSaved(job.id)}><Bookmark size={18} fill={savedJobs.includes(job.id) ? 'currentColor' : 'none'} /></button></div><Badge tone="green">{job.match}% uyğunluq</Badge><h3>{job.title}</h3><strong>{job.company}</strong><p><MapPin size={15} /> {job.location}</p><div className="job-card-foot"><Badge>{job.type}</Badge><button className="portal-button primary" type="button" disabled={applications.includes(job.id)} onClick={() => apply(job)}>{applications.includes(job.id) ? 'Müraciət edilib' : 'Müraciət et'} <Send size={14} /></button></div></article>)}</div>
      {!filtered.length && <EmptyState icon={BriefcaseBusiness} title="Uyğun vakansiya tapılmadı" text="Axtarış sözünü və ya iş növünü dəyiş." />}
    </>
  );
}

function StudentCertificates({ showToast }) {
  const certificates = [
    { title: 'Construction Site Safety', issued: '18 iyul 2026', id: 'SL-SAF-2084', tone: 'gold' },
    { title: 'Structural Fundamentals', issued: '02 iyun 2026', id: 'SL-STR-1751', tone: 'violet' },
  ];
  function download(certificate) {
    const blob = new Blob([`STRUCTLAB CERTIFICATE\n\n${certificate.title}\nCredential: ${certificate.id}\nIssued: ${certificate.issued}\n\nDemo certificate for portfolio preview.`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${certificate.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Demo sertifikat endirildi.');
  }
  return (
    <>
      <PageLead eyebrow="Verified skills" title="Nailiyyətlərin paylaşmağa hazırdır." text="Sertifikatlarını portfolioda göstər və iş müraciətlərində profilini gücləndir." />
      <div className="certificate-grid portal-section-gap">{certificates.map((certificate) => <article className={`certificate-card ${certificate.tone}`} key={certificate.id}><div className="certificate-watermark"><Award /></div><span>StructLab verified credential</span><h3>{certificate.title}</h3><p>Credential ID: <strong>{certificate.id}</strong></p><small>Verilib: {certificate.issued}</small><button className="portal-button ghost" type="button" onClick={() => download(certificate)}><Download size={15} /> Endir</button></article>)}</div>
    </>
  );
}

function StudentProfile({ user, showToast }) {
  const [form, setForm] = useState(() => ({ name: user.name, email: user.email, location: 'Bakı, Azərbaycan', headline: 'Junior Structural Engineer', about: 'Daşıyıcı konstruksiyalar və BIM koordinasiyası ilə maraqlanan inkişaf yönümlü mühəndis.' }));
  const [skills, setSkills] = usePersistentState('sl_student_skills', ['AutoCAD', 'Revit', 'Structural Analysis']);
  const [newSkill, setNewSkill] = useState('');
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function submit(event) { event.preventDefault(); updateLocalProfile({ name: form.name, email: form.email }); showToast('Profil məlumatları yadda saxlanıldı.'); }
  function addSkill() { const value = newSkill.trim(); if (value && !skills.includes(value)) setSkills((current) => [...current, value]); setNewSkill(''); }
  return (
    <>
      <PageLead eyebrow="Professional profile" title="Profilin sənin rəqəmsal vizit kartındır." text="Dəqiq bacarıqlar və qısa təqdimat uyğun vakansiyalarda görünməyini artırır." accent="green" />
      <div className="portal-grid two portal-section-gap">
        <Panel title="Şəxsi məlumatlar" subtitle="Dəyişikliklər bu cihazda saxlanır"><form className="portal-form-grid" onSubmit={submit}><label className="portal-form-field"><span>Ad və soyad</span><input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label><label className="portal-form-field"><span>E-poçt</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required /></label><label className="portal-form-field"><span>Məkan</span><input value={form.location} onChange={(event) => update('location', event.target.value)} /></label><label className="portal-form-field"><span>Peşə başlığı</span><input value={form.headline} onChange={(event) => update('headline', event.target.value)} /></label><label className="portal-form-field full"><span>Haqqımda</span><textarea value={form.about} onChange={(event) => update('about', event.target.value)} /></label><div className="portal-form-field full"><button className="portal-button primary align-start" type="submit">Yadda saxla</button></div></form></Panel>
        <Panel title="Bacarıqlar" subtitle="Profil uyğunluğu üçün istifadə olunur"><div className="skill-cloud">{skills.map((skill) => <button key={skill} type="button" title="Sil" onClick={() => setSkills((current) => current.filter((item) => item !== skill))}>{skill}<span>×</span></button>)}</div><div className="skill-add"><input value={newSkill} onChange={(event) => setNewSkill(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } }} placeholder="Yeni bacarıq" /><button className="portal-button soft" type="button" onClick={addSkill}>Əlavə et</button></div><div className="profile-completion"><div><strong>Profil doluluğu</strong><span>86%</span></div><div className="portal-progress"><span style={{ width: '86%' }} /></div><p><Sparkles size={15} /> Bir layihə nümunəsi əlavə etsən, profil daha güclü görünəcək.</p></div></Panel>
      </div>
    </>
  );
}

function CourseCard({ course, value, onContinue }) {
  return <article className="course-card"><div className={`course-cover ${course.color}`}><GraduationCap size={30} /><span>{course.category}</span></div><div className="course-body"><Badge tone={course.color === 'gold' ? 'gold' : course.color === 'green' ? 'green' : course.color === 'coral' ? 'coral' : 'violet'}>{course.lessons} dərs</Badge><h3>{course.title}</h3><p>Növbəti: {course.next}</p><div className="course-progress-label"><span>İrəliləyiş</span><strong>{value}%</strong></div><div className="portal-progress"><span style={{ width: `${value}%` }} /></div><button className="portal-button soft" type="button" onClick={onContinue}><Play size={14} /> {value >= 100 ? 'Yenidən bax' : 'Davam et'}</button></div></article>;
}

function CourseRow({ course, value, onContinue }) {
  return <div className="featured-course"><div className={`course-cover ${course.color}`}><GraduationCap size={29} /></div><div><Badge tone="violet">{course.category}</Badge><h3>{course.title}</h3><p>Növbəti mövzu: {course.next}</p><div className="portal-progress"><span style={{ width: `${value}%` }} /></div><small>{value}% tamamlanıb</small></div><button className="portal-button soft" type="button" onClick={onContinue}><Play size={14} /> Davam et</button></div>;
}

function JobRow({ job, compact }) {
  return <div className="portal-list-row"><span className="portal-list-icon">{job.company.slice(0, 2).toUpperCase()}</span><span className="portal-list-copy"><strong>{job.title}</strong><small>{job.company} · {job.location}</small></span><Badge tone={compact ? 'green' : 'violet'}>{job.match}%</Badge></div>;
}

function PlanItem({ done, title, detail }) {
  return <div className={`plan-item${done ? ' done' : ''}`}><span>{done ? <CheckCircle2 size={18} /> : <CalendarDays size={18} />}</span><div><strong>{title}</strong><small>{detail}</small></div></div>;
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="portal-empty"><span><Icon size={26} /></span><h3>{title}</h3><p>{text}</p></div>;
}
