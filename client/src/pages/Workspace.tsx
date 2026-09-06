import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  Gauge,
  Layers3,
  Lightbulb,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type WorkspaceView = "Overview" | "My Twin" | "Teaching DNA" | "Classes" | "Insights" | "Content" | "Settings";

const navItems: Array<[WorkspaceView, typeof Gauge]> = [
  ["Overview", Gauge],
  ["My Twin", BrainCircuit],
  ["Teaching DNA", Sparkles],
  ["Classes", Users],
  ["Insights", Lightbulb],
  ["Content", FileText],
  ["Settings", Settings],
];

const dnaLabels: Record<string, string> = {
  explanation_style: "Explanation style",
  analogy_usage: "Analogies",
  real_world_example_usage: "Real-world examples",
  questioning_style: "Question-driven teaching",
  concept_progression: "Concept progression",
  feedback_style: "Feedback style",
  tone: "Tone",
  visual_structural_preference: "Visual / structural preference",
};

const stages = [
  ["Reading material", "Extracting teaching content"],
  ["Finding patterns", "Looking at explanations, examples, questions and structure"],
  ["Building Teaching DNA", "Mapping recurring teaching behaviors"],
  ["Generating insights", "Preparing an evidence-based teaching profile"],
] as const;

function dateLabel(value: number) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function scoreFromDna(dna: any) {
  if (!dna?.rawAnalysis?.dimensions) return null;
  const values = Object.values(dna.rawAnalysis.dimensions).filter((item: any) => item.status === "observed") as Array<{ score: number }>;
  return values.length ? Math.round(values.reduce((sum, item) => sum + item.score, 0) / values.length) : null;
}

export default function Workspace() {
  const [active, setActive] = useState<WorkspaceView>("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const dnaQuery = trpc.teachingDna.get.useQuery();
  const materialsQuery = trpc.materials.list.useQuery(undefined, {
    refetchInterval: analyzingId ? 850 : false,
  });
  const materials = materialsQuery.data ?? [];
  const dna = dnaQuery.data;
  const currentMaterial = materials.find(material => material.id === analyzingId);
  const showToast = (message: string) => toast(message);
  const go = (view: WorkspaceView) => {
    setActive(view);
    setMobileOpen(false);
  };

  const onAnalyze = async (materialId: number) => {
    setAnalyzingId(materialId);
    try {
      await analyzeMutation.mutateAsync({ materialId });
      await Promise.all([materialsQuery.refetch(), dnaQuery.refetch()]);
      setAnalyzingId(null);
      setActive("Teaching DNA");
      toast.success("Teaching DNA updated from this material.");
    } catch {
      await materialsQuery.refetch();
      setAnalyzingId(null);
      setActive("Content");
    }
  };

  const analyzeMutation = trpc.materials.analyze.useMutation({
    onError: error => toast.error(error.message),
    onSettled: () => {
      void materialsQuery.refetch();
      void dnaQuery.refetch();
    },
  });

  return (
    <main className="workspace-shell">
      <aside className={`workspace-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="workspace-brand"><Link href="/"><span className="brand-glyph">P</span><strong>praxis</strong></Link><button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="teacher-profile"><div className="teacher-avatar">SA</div><div><strong>Dr. Sarah Adeyemi</strong><span>Biology · Undergraduate</span></div><ChevronDown size={15} /></div>
        <span className="workspace-label">Workspace</span>
        <nav className="workspace-nav">{navItems.map(([label, Icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => go(label)}><Icon size={16} />{label}{label === "Insights" && <span className="nav-badge">1</span>}</button>)}</nav>
        <div className="sidebar-bottom"><button onClick={() => showToast("Help center coming soon")}><CircleHelp size={16} /> Help center</button><div className="sidebar-version">Praxis demo workspace<br />v0.5.0 · Teaching DNA</div></div>
      </aside>
      <section className="workspace-main">
        <header className="workspace-topbar"><button className="workspace-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="workspace-search"><Search size={15} /><span>Search your workspace</span><kbd>⌘ K</kbd></div><div className="workspace-actions"><button onClick={() => showToast("No new notifications")} className="notification-button"><span /> <Activity size={17} /></button><button onClick={() => showToast("Invite link copied")} className="invite-button"><Plus size={15} /> Invite</button><div className="small-avatar">SA</div></div></header>
        <div className="workspace-content">
          {active === "Overview" && <OverviewView showToast={showToast} setActive={go} dna={dna} />}
          {active === "My Twin" && <TwinView showToast={showToast} dna={dna} setActive={go} />}
          {active === "Teaching DNA" && <TeachingDNAView dna={dna} materials={materials} setActive={go} setSelectedMaterialId={setSelectedMaterialId} />}
          {active === "Content" && <ContentView materials={materials} selectedMaterialId={selectedMaterialId} setSelectedMaterialId={setSelectedMaterialId} onAnalyze={onAnalyze} analyzingId={analyzingId} currentMaterial={currentMaterial} />}
          {active === "Classes" && <ClassesView />}
          {active === "Insights" && <InsightsView />}
          {active === "Settings" && <PlaceholderView title="Settings" description="Workspace settings are coming soon. Your Teaching DNA remains stored and available to the future Praxis Twin." icon={<Settings size={23} />} />}
        </div>
      </section>
    </main>
  );
}

function OverviewView({ showToast, setActive, dna }: { showToast: (message: string) => void; setActive: (view: WorkspaceView) => void; dna: any }) {
  const dnaScore = scoreFromDna(dna);
  return <>
    <div className="workspace-heading"><div><span className="micro-label">THURSDAY, OCTOBER 24, 2025</span><h1>Good morning, Sarah.</h1><p>Here's what's happening across your classroom.</p></div><button className="workspace-primary" onClick={() => setActive("Content")}><Plus size={16} /> Add content</button></div>
    <div className="metric-row"><div className="metric-card"><span>Classes</span><strong>3</strong><small><span className="metric-up">↗ 1</span> this semester</small></div><div className="metric-card"><span>Students</span><strong>84</strong><small><span className="metric-up">↗ 6</span> this semester</small></div><div className="metric-card"><span>Average mastery</span><strong>76%</strong><small><span className="metric-up">↗ 4.2%</span> this week</small></div><div className="metric-card metric-card-accent"><span>Teaching DNA match</span><strong>{dnaScore ?? "—"}</strong><small>{dna?.sourceCount ? `Across ${dna.sourceCount} analyzed source${dna.sourceCount === 1 ? "" : "s"}` : "Analyze material to build"}</small></div></div>
    <div className="workspace-alert"><div className="alert-icon"><Sparkles size={18} /></div><div className="alert-copy"><span className="alert-label">PRAXIS NOTICED SOMETHING <span>2m ago</span></span><h2>Cellular respiration is becoming a learning bottleneck.</h2><p>41% of students are currently below expected mastery in <strong>Biology 204 · Cell Systems.</strong></p><div className="alert-actions"><button className="workspace-primary" onClick={() => showToast("Insight details opened")}>View insight <ArrowUpRight size={14} /></button><button className="plain-button" onClick={() => showToast("Insight dismissed")}>Dismiss</button></div></div><div className="alert-chart"><div className="chart-label"><span>MASTERY TREND</span><strong>−12%</strong></div><div className="line-chart"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="chart-axis"><span>OCT 01</span><span>OCT 24</span></div></div></div>
    <div className="dashboard-grid"><div className="workspace-panel"><div className="panel-title"><div><span className="micro-label">ACTIVE CLASSES</span><h3>Classroom pulse</h3></div><button onClick={() => setActive("Classes")}><MoreHorizontal size={17} /></button></div><div className="class-list"><div className="class-row"><div className="class-icon bio">BIO</div><div><strong>Biology 204 · Cell Systems</strong><span>32 students · Last active today</span></div><div className="mastery"><strong>68%</strong><span>mastery</span></div></div><div className="class-row"><div className="class-icon org">ORG</div><div><strong>Biology 101 · Foundations</strong><span>28 students · Last active yesterday</span></div><div className="mastery good"><strong>82%</strong><span>mastery</span></div></div><div className="class-row"><div className="class-icon evo">EVO</div><div><strong>Research Seminar</strong><span>24 students · Last active Oct 22</span></div><div className="mastery good"><strong>79%</strong><span>mastery</span></div></div></div></div><div className="workspace-panel quick-panel"><div className="panel-title"><div><span className="micro-label">QUICK ACCESS</span><h3>Keep going</h3></div></div><button onClick={() => setActive("My Twin")}><BrainCircuit size={18} /><span><strong>Review your Praxis Twin</strong><small>{dna ? "Teaching DNA is ready to use" : "Build Teaching DNA first"}</small></span><ArrowUpRight size={14} /></button><button onClick={() => setActive("Content")}><Layers3 size={18} /><span><strong>Continue building a lesson</strong><small>Cellular respiration · 72% complete</small></span><ArrowUpRight size={14} /></button><button onClick={() => setActive("Teaching DNA")}><Lightbulb size={18} /><span><strong>See your teaching patterns</strong><small>{dna ? `${dna.sourceCount} analyzed source${dna.sourceCount === 1 ? "" : "s"}` : "No live profile yet"}</small></span><ArrowUpRight size={14} /></button></div></div>
  </>;
}

function TwinView({ showToast, dna, setActive }: { showToast: (message: string) => void; dna: any; setActive: (view: WorkspaceView) => void }) {
  const score = scoreFromDna(dna);
  const studentsQuery = trpc.twin.students.useQuery();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [request, setRequest] = useState("Explain ATP to Daniel in the way I normally teach.");
  const [answer, setAnswer] = useState("");
  const [twinResponse, setTwinResponse] = useState<any>(null);
  const [learningSignal, setLearningSignal] = useState<any>(null);
  const [intervention, setIntervention] = useState<any>(null);
  const students = studentsQuery.data ?? [];
  const selectedStudent: any = students.find((student: any) => student.id === studentId) ?? null;
  const generateMutation = trpc.twin.generate.useMutation({ onError: error => toast.error(error.message) });
  const evaluateMutation = trpc.twin.evaluate.useMutation({ onError: error => toast.error(error.message) });
  const interventionMutation = trpc.twin.intervention.useMutation({ onError: error => toast.error(error.message) });
  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!request.trim()) return;
    setLearningSignal(null); setIntervention(null);
    try { setTwinResponse(await generateMutation.mutateAsync({ studentId, request })); } catch { /* toast handled by mutation */ }
  };
  const submitAnswer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || !twinResponse || !studentId) return;
    const signal = await evaluateMutation.mutateAsync({ interactionId: twinResponse.interactionId, studentId, interaction: twinResponse, answer });
    setLearningSignal(signal);
  };
  const generateTeacherIntervention = async () => {
    if (!studentId || !learningSignal) return;
    setIntervention(await interventionMutation.mutateAsync({ studentId, concept: twinResponse?.concept ?? "Cellular respiration", learningSignal }));
  };
  const dnaRows = Object.entries(dna?.rawAnalysis?.dimensions ?? {}).filter(([, detail]: any) => detail.status === "observed").slice(0, 4) as Array<[string, any]>;
  return <>
    <div className="workspace-heading twin-heading"><div><span className="micro-label">MY TWIN / ACTIVE COMPANION</span><h1>Your Praxis Twin.</h1><p>An AI teaching companion shaped by the way you teach.</p></div><div className="twin-status"><span /> Teaching DNA active</div></div>
    <div className="twin-summary-strip"><div><span className="micro-label">TWIN STATUS</span><strong><i /> Active</strong></div><div><span className="micro-label">TEACHING DNA</span><strong>{dna ? dna.confidence : "Developing"}</strong></div><div><span className="micro-label">SOURCES ANALYZED</span><strong>{dna?.sourceCount ?? 0} materials</strong></div><button onClick={() => setActive("Teaching DNA")}>View DNA <ArrowUpRight size={14} /></button></div>
    <div className="twin-workspace-grid">
      <section className="twin-conversation">
        <div className="twin-conversation-head"><div><span className="micro-label">PRAXIS TWIN</span><h3>Teaching with your approach, adapted for every learner.</h3></div><MessageCircle size={18} /></div>
        <div className="twin-context-row"><label>Explain this to<select value={studentId ?? ""} onChange={event => setStudentId(event.target.value ? Number(event.target.value) : null)}><option value="">General class</option>{students.map((student: any) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>{selectedStudent && <div className="student-context-chip"><UserRound size={14} /><span><strong>{selectedStudent.name}</strong> · {selectedStudent.progress?.masteryScore}% mastery · {selectedStudent.progress?.misconceptions?.join(", ") || "No major misconception"}</span></div>}</div>
        <div className="twin-thread"><div className="twin-thread-note"><span className="twin-thread-dot" /> Teaching DNA active · teacher-controlled recommendation</div>{twinResponse ? <><div className="twin-message teacher-message"><span className="message-label">YOUR REQUEST</span><p>{request}</p></div><div className="twin-message twin-response"><span className="message-label">PRAXIS TWIN · TEACHING DNA APPLIED</span><p>{twinResponse.response}</p><div className="strategy-tags">{twinResponse.strategies_used.map((strategy: string) => <span key={strategy}>{strategy.replaceAll("_", " ")}</span>)}</div><div className="why-twin"><strong>Why Praxis taught it this way</strong><div><span><b>Matched to your teaching style</b>{twinResponse.why_taught_this_way.teaching_style.join(" · ")}</span><span><b>Adapted for {selectedStudent?.name ?? "the class"}</b>{twinResponse.why_taught_this_way.student_adaptation.join(" · ")}</span></div></div></div><div className="twin-follow-up"><span className="message-label">ASK {selectedStudent?.name?.toUpperCase() ?? "THE CLASS"} TO TRY IT</span><p>{twinResponse.follow_up_question}</p><form onSubmit={submitAnswer}><input value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Type your answer..." disabled={!studentId || evaluateMutation.isPending} /><button disabled={!studentId || !answer.trim() || evaluateMutation.isPending}>{evaluateMutation.isPending ? "Checking…" : "Check my understanding"} <Send size={14} /></button></form></div></> : <div className="twin-empty-thread"><BrainCircuit size={25} /><h3>Make your Teaching DNA useful.</h3><p>Select a learner, then ask your Twin to explain a concept using the way you normally teach.</p></div>}</div>
        <form className="twin-request-form" onSubmit={submitRequest}><textarea value={request} onChange={event => setRequest(event.target.value)} placeholder="What would you like your Twin to teach?" rows={2} /><button disabled={generateMutation.isPending || !request.trim()}>{generateMutation.isPending ? "Generating…" : "Generate explanation"} <ArrowUpRight size={15} /></button></form>
      </section>
      <aside className="twin-side-panel"><div className="panel-title"><div><span className="micro-label">LEARNER CONTEXT</span><h3>{selectedStudent ? selectedStudent.name : "Choose a student"}</h3></div><UserRound size={18} /></div>{selectedStudent ? <div className="learner-details"><div className="learner-stat"><span>Mastery</span><strong>{selectedStudent.progress?.masteryScore}%</strong></div><div><span>Needs support with</span><strong>{selectedStudent.progress?.misconceptions?.join(", ") || "Transfer to a new context"}</strong></div><div><span>Preferred learning approach</span><strong>{selectedStudent.progress?.preferredExplanationStyle}</strong></div><div><span>Confidence</span><strong>{selectedStudent.progress?.confidenceScore < 40 ? "Low" : selectedStudent.progress?.confidenceScore < 70 ? "Developing" : "High"}</strong></div></div> : <p className="empty-copy">Choose Daniel to run the hackathon demo scenario, or select General class for a group explanation.</p>}<div className="twin-side-dna"><span className="micro-label">TEACHING DNA SUMMARY</span><DnaRows dna={dna} /><small>{dna ? `${dna.sourceCount} analyzed materials inform this Twin.` : "Analyze teaching material to activate the Twin."}</small></div></aside>
    </div>
    {learningSignal && <section className="learning-signal-panel"><div><span className="micro-label">LEARNING SIGNAL · TEACHER REVIEW</span><h3>Understanding detected</h3><p>{learningSignal.observation}</p></div><div className="signal-metrics"><strong>{selectedStudent?.progress?.masteryScore ?? "—"}% <small>→</small> {learningSignal.mastery_estimate}%<span>mastery estimate</span></strong><span><b>Next step</b>{learningSignal.recommended_next_step}</span></div><div className="signal-actions"><button className="workspace-secondary" onClick={generateTeacherIntervention} disabled={interventionMutation.isPending}>{interventionMutation.isPending ? "Generating…" : "Generate intervention"} <ArrowUpRight size={14} /></button>{learningSignal.misconception_detected && <small>Observation: {learningSignal.misconception_detected}</small>}</div></section>}
    {intervention && <section className="intervention-panel"><div><span className="micro-label">RECOMMENDED INTERVENTION · REVIEW BEFORE USE</span><h3>{intervention.title}</h3><p>{intervention.opening}</p></div><div className="intervention-grid"><span><b>Teaching approach</b>{intervention.teaching_approach.join(" + ")}</span><span><b>Guided question</b>{intervention.guided_question}</span><span><b>Check for understanding</b>{intervention.check_for_understanding}</span><span><b>Expected misconception</b>{intervention.expected_misconception}</span></div></section>}
  </>;
}

function DnaRows({ dna }: { dna: any }) {
  const dimensions = dna?.rawAnalysis?.dimensions ?? {};
  return <div className="twin-dna-rows">{Object.entries(dimensions).filter(([, detail]: any) => detail.status === "observed").slice(0, 6).map(([key, detail]: any) => <div className="twin-dna-row" key={key}><div><span>{dnaLabels[key] ?? key}</span><strong>{detail.score}%</strong></div><div className="twin-progress"><i style={{ width: `${detail.score}%` }} /></div></div>)}</div>;
}

function TeachingDNAView({ dna, materials, setActive, setSelectedMaterialId }: { dna: any; materials: any[]; setActive: (view: WorkspaceView) => void; setSelectedMaterialId: (id: number) => void }) {
  const dimensions = dna?.rawAnalysis?.dimensions ?? {};
  const observed = Object.entries(dimensions).filter(([, detail]: any) => detail.status === "observed");
  const characteristics = dna?.rawAnalysis?.styleCharacteristics ?? [];
  const observations = dna?.rawAnalysis?.observations ?? [];
  const contributingMaterials = dna?.materials ?? [];
  const score = scoreFromDna(dna);
  if (!dna) return <><div className="workspace-heading dna-page-heading"><div><span className="micro-label">TEACHING DNA / NOT YET BUILT</span><h1>Your Teaching DNA.</h1><p>A living profile of how you naturally teach.</p></div><button className="workspace-primary" onClick={() => setActive("Content")}><Plus size={16} /> Add teaching material</button></div><EmptyDnaPanel setActive={setActive} /><div className="dna-confidence-note"><span className="micro-label">TEACHING DNA CONFIDENCE</span><strong>Early profile</strong><p>Praxis has not analyzed a live teaching source yet. Add a lesson, transcript, or assessment response to begin building an evidence-based profile.</p></div></>;
  return <>
    <div className="workspace-heading dna-page-heading"><div><span className="micro-label">TEACHING DNA / {dna.confidence.toUpperCase()} PROFILE</span><h1>Your Teaching DNA.</h1><p>A living profile of how you naturally teach.</p></div><button className="workspace-primary" onClick={() => setActive("Content")}><Plus size={16} /> Add teaching material</button></div>
    <div className="dna-result-intro"><div><span className="dna-live-dot" /> Live profile · {dna.sourceCount} analyzed source{dna.sourceCount === 1 ? "" : "s"}</div><strong>{score ?? "—"}<small> overall pattern score</small></strong></div>
    <section className="dna-result-panel"><div className="panel-title"><div><span className="micro-label">OBSERVED TEACHING DIMENSIONS</span><h3>How your teaching tends to move</h3></div><span className="evidence-caption">Scores reflect evidence and model confidence</span></div><div className="dna-evidence-bars">{observed.map(([key, detail]: any) => <div className="dna-evidence-bar" key={key}><div className="dna-evidence-bar-head"><span>{dnaLabels[key] ?? key}</span><strong>{detail.score}<small>%</small></strong></div><div className="dna-evidence-track"><i style={{ width: `${detail.score}%` }} /></div><p>{detail.explanation}</p>{detail.evidenceExcerpt && <blockquote>“{detail.evidenceExcerpt}” <small>{Math.round(detail.confidence * 100)}% confidence</small></blockquote>}</div>)}</div></section>
    <div className="dna-two-column"><section className="dna-style-section"><div className="panel-title"><div><span className="micro-label">TEACHING STYLE</span><h3>Your teaching style</h3></div></div>{characteristics.map((item: any) => <article className="style-signal" key={item.label}><strong>{item.label}</strong><p>{item.description}</p></article>)}</section><section className="dna-confidence-note"><span className="micro-label">TEACHING DNA CONFIDENCE</span><strong>{dna.confidence === "early" ? "Early profile" : dna.confidence === "developing" ? "Developing profile" : "Established profile"}</strong><p>Praxis has analyzed {dna.sourceCount} teaching source{dna.sourceCount === 1 ? "" : "s"}. Add more material to improve the accuracy of your Teaching DNA.</p></section></div>
    <section className="learned-section dna-learned-section"><div className="panel-title"><div><span className="micro-label">EVIDENCE / {observations.length} OBSERVED PATTERN{observations.length === 1 ? "" : "S"}</span><h3>How Praxis learned your style</h3></div></div><div className="learned-grid">{observations.length ? observations.map((item: any, index: number) => <article className="learned-card" key={`${item.dimension}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{item.observation}</p><blockquote>“{item.evidenceExcerpt}”</blockquote><small>Based on analyzed teaching material</small></article>) : <p className="empty-copy">More evidence will appear as Praxis analyzes additional material.</p>}</div></section>
    <section className="sources-section"><div className="panel-title"><div><span className="micro-label">MATERIALS USED</span><h3>Sources contributing to this profile</h3></div><button onClick={() => setActive("Content")}>Manage sources <ArrowUpRight size={14} /></button></div><div className="source-list">{contributingMaterials.length ? contributingMaterials.map((material: any) => <button className="source-row" key={material.id} onClick={() => { setSelectedMaterialId(material.id); setActive("Content"); }}><span className="source-type">{material.type}</span><span className="source-copy"><strong>{material.title}</strong><small>{material.isDemo ? "Seeded demo material · " : "Analyzed "}{dateLabel(material.createdAt)}</small></span><span className="source-status">Analyzed <ArrowUpRight size={13} /></span></button>) : <p className="empty-copy">No contributing sources yet.</p>}</div></section>
  </>;
}

function ClassesView() {
  const studentsQuery = trpc.twin.students.useQuery();
  const students = studentsQuery.data ?? [];
  const needingSupport = students.filter((student: any) => (student.progress?.masteryScore ?? 100) < 60);
  return <><div className="workspace-heading"><div><span className="micro-label">WORKSPACE / CLASSES</span><h1>Classroom pulse.</h1><p>See where learners need a different path through the concept.</p></div><span className="class-mode-badge">Biology 204 · Cell Systems</span></div><div className="class-overview-strip"><div><span className="micro-label">STUDENTS</span><strong>32</strong></div><div><span className="micro-label">CELLULAR RESPIRATION</span><strong>74% <small>mastery</small></strong></div><div><span className="micro-label">POTENTIAL MISCONCEPTION</span><strong>ATP vs glucose</strong></div><div><span className="micro-label">NEEDING SUPPORT</span><strong>{needingSupport.length + 6}</strong></div></div><section className="class-support-panel"><div className="panel-title"><div><span className="micro-label">LEARNING SIGNAL</span><h3>Students needing support</h3></div><span className="evidence-caption">Demo data · teacher review required</span></div><div className="support-student-list">{students.map((student: any) => <div className={`support-student-row ${(student.progress?.masteryScore ?? 0) < 60 ? "needs-support" : ""}`} key={student.id}><div className="teacher-avatar">{student.name.slice(0, 2).toUpperCase()}</div><div><strong>{student.name}</strong><span>{student.progress?.misconceptions?.join(", ") || "No major misconception"}</span></div><div className="support-mastery"><strong>{student.progress?.masteryScore}%</strong><small>mastery</small></div><span className="support-preference">{student.progress?.preferredExplanationStyle}</span></div>)}</div></section></>;
}

function InsightsView() {
  const insightMutation = trpc.twin.classroomInsight.useMutation({ onError: error => toast.error(error.message) });
  return <><div className="workspace-heading"><div><span className="micro-label">WORKSPACE / INSIGHTS</span><h1>Praxis noticed a pattern.</h1><p>Learning signals become teacher-reviewed recommendations, not automated decisions.</p></div><button className="workspace-primary" onClick={() => insightMutation.mutate()} disabled={insightMutation.isPending}><Sparkles size={15} /> {insightMutation.isPending ? "Finding pattern…" : "Generate insight"}</button></div><section className="insight-hero"><div className="alert-icon"><Sparkles size={18} /></div><div><span className="micro-label">AI CLASSROOM INSIGHT · BIOLOGY 204</span><h2>{insightMutation.data?.headline ?? "A class-level pattern is ready to inspect."}</h2><p>{insightMutation.data?.what_this_means ?? "Praxis will compare the demo class learning signals with Sarah’s Teaching DNA and surface a concise, teacher-controlled recommendation."}</p></div></section>{insightMutation.data && <section className="insight-detail-grid"><div><span className="micro-label">WHAT THIS MEANS</span><p>{insightMutation.data.what_this_means}</p></div><div><span className="micro-label">RECOMMENDED ACTION</span><p>{insightMutation.data.recommended_action}</p><button className="workspace-secondary" onClick={() => toast("Open My Twin to generate the intervention from this context")}>Generate intervention <ArrowUpRight size={14} /></button></div><div><span className="micro-label">STUDENTS AFFECTED</span>{insightMutation.data.affected_students.map((student: any) => <div className="affected-student" key={student.name}><strong>{student.name}</strong><span>{student.mastery}% · {student.reason}</span></div>)}</div></section>}</>;
}

function ContentView({ materials, selectedMaterialId, setSelectedMaterialId, onAnalyze, analyzingId, currentMaterial }: { materials: any[]; selectedMaterialId: number | null; setSelectedMaterialId: (id: number | null) => void; onAnalyze: (id: number) => void; analyzingId: number | null; currentMaterial: any }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [source, setSource] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const createMutation = trpc.materials.create.useMutation();
  const utils = trpc.useUtils();
  const analysisQuery = trpc.materials.getAnalysis.useQuery({ materialId: selectedMaterialId ?? 0 }, { enabled: Boolean(selectedMaterialId) });
  const selectedMaterial = materials.find(material => material.id === selectedMaterialId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload: any = { title: title || file?.name?.replace(/\.[^.]+$/, "") || "Untitled teaching material", classId: classId || undefined, source };
      if (source === "paste") payload.content = content;
      if (source === "file") {
        if (!file) throw new Error("Choose a file first.");
        payload.fileName = file.name;
        payload.mimeType = file.type;
        payload.fileBase64 = await fileToBase64(file);
      }
      const created = await createMutation.mutateAsync(payload);
      await utils.materials.list.invalidate();
      setComposerOpen(false);
      setTitle(""); setClassId(""); setContent(""); setFile(null);
      onAnalyze(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not save that material.");
    }
  };
  return <>
    <div className="workspace-heading content-heading"><div><span className="micro-label">WORKSPACE / CONTENT</span><h1>Your teaching material.</h1><p>Give Praxis the material you already use. It will look for how you teach.</p></div><button className="workspace-primary" onClick={() => setComposerOpen(!composerOpen)}><Plus size={16} /> Add teaching material</button></div>
    {composerOpen && <form className="material-composer" onSubmit={submit}><div className="composer-top"><div><span className="micro-label">NEW SOURCE</span><h2>What should Praxis learn from?</h2></div><button type="button" onClick={() => setComposerOpen(false)} aria-label="Close composer"><X size={17} /></button></div><div className="composer-tabs"><button type="button" className={source === "paste" ? "active" : ""} onClick={() => setSource("paste")}><FileText size={15} /> Paste text</button><button type="button" className={source === "file" ? "active" : ""} onClick={() => setSource("file")}><Upload size={15} /> Upload PDF, DOCX, or TXT</button></div><div className="composer-fields"><label>Title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Cellular Respiration — Lecture Notes" /></label><label>Class or subject <span>(optional)</span><input value={classId} onChange={event => setClassId(event.target.value)} placeholder="e.g. Biology 204 · Cell Systems" /></label></div>{source === "paste" ? <label className="composer-textarea">Teaching material<textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Paste lesson notes, a transcript, an explanation, or assessment feedback here..." rows={9} /></label> : <label className="file-drop"><Upload size={22} /><strong>{file ? file.name : "Choose a teaching file"}</strong><span>{file ? `${Math.round(file.size / 1024)} KB · ready to analyze` : "PDF, DOCX, or TXT · up to 5MB"}</span><input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>}<div className="composer-foot"><span>Praxis stores structured evidence, not a generic summary.</span><button className="workspace-primary" type="submit" disabled={createMutation.isPending || analyzingId !== null}>{createMutation.isPending ? "Saving…" : "Analyze material"} <ArrowUpRight size={14} /></button></div></form>}
    {analyzingId && <AnalysisProgress material={currentMaterial} />}
    <div className="content-summary"><div><span className="micro-label">SOURCES</span><strong>{materials.length}</strong><small>{materials.length === 1 ? "teaching source" : "teaching sources"}</small></div><div><span className="micro-label">ANALYZED</span><strong>{materials.filter(item => item.analysisStatus === "analyzed").length}</strong><small>contributing to DNA</small></div><div><span className="micro-label">PROFILE STATUS</span><strong>{materials.some(item => item.analysisStatus === "analyzed") ? "Live" : "Early"}</strong><small>evidence layer</small></div></div>
    <section className="content-list-section"><div className="panel-title"><div><span className="micro-label">TEACHING MATERIALS</span><h3>Every source, visible</h3></div><span className="evidence-caption">Click a source to inspect its analysis</span></div><div className="material-list">{materials.length ? materials.map(material => <button className={`material-row ${selectedMaterialId === material.id ? "selected" : ""}`} key={material.id} onClick={() => setSelectedMaterialId(material.id)}><span className={`material-file-icon ${material.isDemo ? "demo" : ""}`}><FileText size={17} /></span><span className="material-copy"><strong>{material.title}</strong><small>{material.type} · {material.classId || "Class not specified"}{material.isDemo ? " · Seeded demo" : ""}</small></span><span className={`material-status ${material.analysisStatus}`}><i />{material.analysisStatus === "analyzed" ? "Analyzed" : material.analysisStatus === "processing" ? material.analysisStage || "Processing" : material.analysisStatus === "failed" ? "Failed" : material.analysisStatus === "ready" ? "Ready" : "Uploaded"}</span>{material.analysisStatus !== "analyzed" && material.analysisStatus !== "processing" && <span className="material-action" onClick={event => { event.stopPropagation(); onAnalyze(material.id); }}>Analyze <ArrowUpRight size={13} /></span>}<span className="material-date">{dateLabel(material.createdAt)}</span></button>) : <div className="empty-materials"><FileText size={27} /><h3>No teaching material yet.</h3><p>Add a lesson note, transcript, assessment response, or file to begin.</p><button className="workspace-primary" onClick={() => setComposerOpen(true)}><Plus size={15} /> Add your first source</button></div>}</div></section>
    {selectedMaterial && <MaterialAnalysisDetail material={selectedMaterial} analysis={analysisQuery.data} onAnalyze={onAnalyze} />}
  </>;
}

function AnalysisProgress({ material }: { material: any }) {
  const status = material?.analysisStatus;
  const stage = material?.analysisStage || "Reading material";
  const currentIndex = stages.findIndex(([label]) => stage.includes(label));
  return <section className={`analysis-progress ${status === "failed" ? "failed" : ""}`}><div className="analysis-progress-head"><div><span className="micro-label">LIVE PROCESSING</span><h2>{status === "failed" ? "Praxis could not finish this analysis." : "Analyzing your teaching material"}</h2><p>{material?.title || "Your source"}</p></div><Sparkles size={21} /></div><div className="analysis-stages">{stages.map(([label, description], index) => { const done = status === "analyzed" || (status === "processing" && currentIndex > index); const current = status === "processing" && currentIndex === index; return <div className={`analysis-stage ${done ? "done" : ""} ${current ? "current" : ""}`} key={label}><span>{done ? <Check size={13} /> : `0${index + 1}`}</span><div><strong>{label}</strong><small>{description}</small></div>{current && <i />}</div>; })}</div>{status === "failed" && <p className="analysis-error">{material?.analysisError || "Try again with a different source."}</p>}</section>;
}

function MaterialAnalysisDetail({ material, analysis, onAnalyze }: { material: any; analysis: any; onAnalyze: (id: number) => void }) {
  const evidence = analysis?.analysisJson?.dimensions ? Object.entries(analysis.analysisJson.dimensions).filter(([, detail]: any) => detail.status === "observed") : [];
  return <section className="material-detail"><div className="panel-title"><div><span className="micro-label">SOURCE ANALYSIS / {material.type}</span><h3>{material.title}</h3></div><span className={`material-status ${material.analysisStatus}`}><i />{material.analysisStatus === "analyzed" ? "Analyzed" : material.analysisStatus}</span></div>{material.isDemo && <div className="demo-notice"><Sparkles size={15} /><span>This is seeded demo material. Analyze it to create a live profile from the source text.</span></div>}{analysis ? <><p className="detail-intro">Praxis found {analysis.analysisJson.observations.length} evidence-backed teaching pattern{analysis.analysisJson.observations.length === 1 ? "" : "s"} in this source.</p><div className="detail-evidence-list">{evidence.map(([key, detail]: any) => <article key={key}><div><strong>{dnaLabels[key] ?? key}</strong><span>{detail.score}% · {Math.round(detail.confidence * 100)}% confidence</span></div><p>{detail.explanation}</p><blockquote>“{detail.evidenceExcerpt}”</blockquote></article>)}</div></> : <div className="analysis-empty"><FileText size={21} /><p>{material.analysisStatus === "failed" ? material.analysisError : "This source has not been analyzed yet."}</p>{material.analysisStatus !== "processing" && <button className="workspace-primary" onClick={() => onAnalyze(material.id)}>Analyze source <ArrowUpRight size={14} /></button>}</div>}</section>;
}

function EmptyDnaPanel({ setActive }: { setActive: (view: WorkspaceView) => void }) {
  return <section className="dna-empty-panel"><div className="dna-empty-symbol"><Sparkles size={23} /></div><div><span className="micro-label">THE INTELLIGENCE LAYER</span><h2>Upload a lesson.<br /><em>See how you teach.</em></h2><p>Praxis will read your explanations, examples, questions, and feedback, then build a profile you can inspect and reuse.</p><button className="workspace-primary" onClick={() => setActive("Content")}>Add teaching material <ArrowUpRight size={14} /></button></div></section>;
}

function PlaceholderView({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return <div className="placeholder-view"><div className="placeholder-icon">{icon}</div><span className="micro-label">PRAXIS WORKSPACE</span><h1>{title}</h1><p>{description}</p><button className="workspace-secondary" onClick={() => toast("This workspace area is coming soon")}>Coming soon <ArrowUpRight size={14} /></button></div>;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("We could not read that file."));
    reader.readAsDataURL(file);
  });
}
