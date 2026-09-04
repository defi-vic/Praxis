import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Circle,
  FileText,
  GraduationCap,
  Lightbulb,
  Menu,
  Network,
  Play,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const dnaRows = [
  ["Analogies", "87%"],
  ["Real-world examples", "91%"],
  ["Step-by-step reasoning", "78%"],
];

const steps = [
  { num: "01", icon: FileText, title: "Teach", text: "Upload your existing lessons, notes, slides, and assessments." },
  { num: "02", icon: BrainCircuit, title: "Understand", text: "Praxis learns your teaching approach and identifies how your students are learning." },
  { num: "03", icon: Sparkles, title: "Amplify", text: "Create personalized explanations and interventions in your teaching style." },
];

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = (id: string) => { setMenuOpen(false); scrollTo(id); };
  return (
    <main className="praxis-site">
      <header className="site-nav light-nav">
        <div className="container nav-inner">
          <button className="brand-mark dark-brand" onClick={() => scrollTo("top")}><span className="brand-glyph">P</span><span>praxis</span></button>
          <nav className="desktop-nav"><button onClick={() => nav("how")}>How it works</button><button onClick={() => nav("dna")}>Teaching DNA</button><button onClick={() => nav("teacher")}>For teachers</button></nav>
          <div className="nav-actions"><button className="nav-text" onClick={() => toast("Praxis is open for demo access")}>About</button><Link className="nav-cta light-cta" href="/workspace">Enter Praxis <ArrowUpRight size={15} /></Link><button className="mobile-menu-button dark-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
        </div>
        {menuOpen && <div className="mobile-nav light-mobile">{[["how", "How it works"], ["dna", "Teaching DNA"], ["teacher", "For teachers"]].map(([id, label]) => <button key={id} onClick={() => nav(id)}>{label}<ArrowUpRight size={15} /></button>)}<Link href="/workspace" onClick={() => setMenuOpen(false)}>Enter Praxis <ArrowUpRight size={15} /></Link></div>}
      </header>

      <section id="top" className="edu-hero">
        <div className="container edu-hero-grid">
          <div className="edu-hero-copy reveal-in"><div className="eyebrow ink-eyebrow"><span /> AI FOR BETTER TEACHING</div><h1>Your teaching.<br /><em>Intelligently amplified.</em></h1><p>Praxis learns how you teach, understands where your students struggle, and helps you deliver more personalized learning without adding more work to your day.</p><div className="hero-actions"><Link className="button button-copper" href="/workspace">Enter Praxis <ArrowRight size={16} /></Link><button className="button button-outline" onClick={() => nav("how")}><Play size={13} fill="currentColor" /> See how it works</button></div><div className="hero-trust"><span><Check size={14} /> Built around your voice</span><span><Check size={14} /> No new lesson plans required</span></div></div>
          <div className="teacher-dashboard-visual reveal-in delay-2"><div className="visual-glow" /><div className="visual-window"><div className="window-bar"><div className="window-brand"><span className="mini-p">P</span> Praxis</div><span className="window-status"><span /> Live classroom view</span></div><div className="window-layout"><aside className="visual-sidebar"><span className="sidebar-mini-title">Workspace</span><span className="visual-nav active"><Circle size={7} fill="currentColor" /> Overview</span><span className="visual-nav"><BrainCircuit size={13} /> My Twin</span><span className="visual-nav"><Users size={13} /> Classes</span><span className="visual-nav"><Lightbulb size={13} /> Insights</span><span className="visual-nav"><FileText size={13} /> Content</span></aside><div className="visual-content"><div className="visual-greeting"><span className="micro-label">THURSDAY · OCT 24</span><strong>Good morning, Sarah.</strong></div><div className="visual-notice"><div className="notice-top"><span className="notice-icon"><Sparkles size={15} /></span><span>PRAXIS NOTICED SOMETHING</span><span className="notice-time">2m ago</span></div><h3>Cellular respiration is becoming a learning bottleneck.</h3><div className="notice-bottom"><div className="notice-stat"><strong>41%</strong><span>of students are below<br />expected mastery</span></div><button onClick={() => toast("Insight detail opened")}>View insight <ArrowUpRight size={13} /></button></div></div><div className="visual-panels"><div className="mini-panel"><div className="mini-panel-head"><span>Classroom pulse</span><span className="pulse-up">+8.4%</span></div><div className="pulse-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="pulse-labels"><span>Mon</span><span>Today</span></div></div><div className="mini-panel dna-mini"><div className="mini-panel-head"><span>Teaching DNA</span><ArrowUpRight size={13} /></div>{dnaRows.map(([label, value]) => <div className="dna-row" key={label}><span>{label}</span><strong>{value}</strong><i><b style={{ width: value }} /></i></div>)}</div></div></div></div></div><div className="visual-note"><span className="note-line" /> A clear signal, in the middle of the noise.</div></div>
        </div>
      </section>

      <section className="problem-section section-pad"><div className="container problem-grid"><div><div className="eyebrow"><span /> THE CHALLENGE</div><h2>Every student<br /><em>learns differently.</em></h2></div><div className="problem-copy"><p>Teachers already know personalization matters. The hard part is creating a different explanation, intervention, and learning path for every student — while keeping up with everything else.</p><div className="problem-bridge"><div className="bridge-icon"><Network size={21} /></div><span>Praxis helps bridge that gap.</span></div></div></div></section>

      <section id="how" className="how-section section-pad"><div className="container"><div className="section-heading"><div><div className="eyebrow"><span /> HOW PRAXIS WORKS</div><h2>One approach.<br /><em>Many paths to understanding.</em></h2></div><p>Praxis takes what is already yours — your materials, your patterns, your instincts — and helps you extend it to every student.</p></div><div className="steps-grid">{steps.map(({ num, icon: Icon, title, text }) => <article className="step-card" key={num}><div className="step-number">{num}</div><Icon className="step-icon" size={23} strokeWidth={1.5} /><h3>{title}</h3><p>{text}</p><span className="step-arrow"><ChevronRight size={16} /></span></article>)}</div></div></section>

      <section id="dna" className="dna-section section-pad"><div className="container dna-layout"><div className="dna-copy"><div className="eyebrow copper-eyebrow"><span /> TEACHING DNA</div><h2>Praxis learns<br /><em>how you teach.</em></h2><p>Every teacher has a way of making ideas click. Praxis studies the patterns in your teaching materials — your analogies, examples, questions, and feedback — to build a living profile of your approach.</p><button className="text-link" onClick={() => toast("Teaching DNA profile opened")}>Explore Teaching DNA <ArrowRight size={15} /></button></div><div className="dna-visual"><div className="dna-visual-head"><div><span className="micro-label">PROFILE / DR. SARAH ADEYEMI</span><h3>Teaching DNA</h3></div><div className="dna-score"><strong>84</strong><span>overall<br />match</span></div></div><div className="dna-radar"><div className="radar-ring r1" /><div className="radar-ring r2" /><div className="radar-ring r3" /><div className="radar-line line-one" /><div className="radar-line line-two" /><div className="radar-shape" /><span className="radar-label l1">Analogies</span><span className="radar-label l2">Examples</span><span className="radar-label l3">Reasoning</span><span className="radar-label l4">Questions</span><span className="radar-label l5">Visuals</span></div><div className="dna-list">{[["Analogies", "87%"], ["Real-world examples", "91%"], ["Step-by-step reasoning", "78%"], ["Socratic questioning", "64%"], ["Visual explanations", "72%"]].map(([label, value]) => <div className="dna-list-row" key={label}><span>{label}</span><div><i><b style={{ width: value }} /></i><strong>{value}</strong></div></div>)}</div><div className="dna-footnote"><Sparkles size={13} /> Values reflect patterns detected across 42 teaching materials.</div></div></div></section>

      <section id="teacher" className="teacher-section section-pad"><div className="container teacher-grid"><div className="teacher-quote"><span className="quote-mark">“</span><h2>Not a replacement for the teacher.<br /><em>An extension of the teacher.</em></h2><p>Praxis doesn't flatten your expertise into a generic AI voice. It makes your expertise available in more moments, for more students.</p><div className="quote-author"><span className="author-avatar">SA</span><span><strong>Dr. Sarah Adeyemi</strong><small>Biology · Undergraduate Education</small></span></div></div><div className="teacher-cards"><div className="teacher-card"><span className="card-index">01</span><GraduationCap size={20} /><h3>Your voice stays yours.</h3><p>Personalized support built from the way you already explain, question, and encourage.</p></div><div className="teacher-card offset-card"><span className="card-index">02</span><Users size={20} /><h3>Every learner gets a way in.</h3><p>See who needs a new angle, a slower step, or a little more confidence.</p></div></div></div></section>

      <section className="paths-section section-pad"><div className="container"><div className="section-heading paths-heading"><div><div className="eyebrow"><span /> STUDENT PERSONALIZATION</div><h2>Same lesson.<br /><em>Different paths to understanding.</em></h2></div><p>Praxis helps you meet students where they are — without creating three separate classes.</p></div><div className="student-grid"><div className="student-card"><span className="student-tag">STUDENT A</span><div className="student-symbol symbol-analogy">≈</div><h3>Analogy</h3><p>“Think of the mitochondria like a power plant — it turns fuel into energy the cell can use.”</p><span className="student-footer">Best for connecting new ideas to the familiar</span></div><div className="student-card featured-student"><span className="student-tag">STUDENT B</span><div className="student-symbol symbol-world"><Lightbulb size={25} /></div><h3>Real-world example</h3><p>“When you sprint, your cells need more ATP — cellular respiration is the process making that possible.”</p><span className="student-footer">Best for grounding concepts in lived experience</span></div><div className="student-card"><span className="student-tag">STUDENT C</span><div className="student-symbol symbol-steps">1<span />2<span />3</div><h3>Step-by-step</h3><p>“First, glucose is broken down. Next, energy is captured. Finally, ATP is produced.”</p><span className="student-footer">Best for building confidence one step at a time</span></div></div></div></section>

      <section className="final-cta"><div className="container final-cta-inner"><div className="cta-orbit" /><div className="eyebrow"><span /> BEGIN WITH WHAT YOU HAVE</div><h2>Give your teaching<br /><em>room to scale.</em></h2><p>Your materials are already full of the way you teach. Praxis helps you make more of it.</p><Link className="button button-dark" href="/workspace">Enter Praxis <ArrowRight size={16} /></Link><span className="cta-footnote">Demo workspace · No login required</span></div></section>
      <footer className="site-footer light-footer"><div className="container footer-inner"><div className="footer-brand"><button className="brand-mark dark-brand" onClick={() => scrollTo("top")}><span className="brand-glyph">P</span><span>praxis</span></button><p>Your teaching.<br />Intelligently amplified.</p></div><div className="footer-links"><div><span>Explore</span><button onClick={() => nav("how")}>How it works</button><button onClick={() => nav("dna")}>Teaching DNA</button><button onClick={() => nav("teacher")}>For teachers</button></div><div><span>Product</span><Link href="/workspace">Enter Praxis</Link><button onClick={() => toast("Contact flow coming soon")}>Contact</button><button onClick={() => toast("Privacy page coming soon")}>Privacy</button></div></div><div className="footer-end"><span>© 2025 Praxis</span><span>Built for the people who teach</span></div></div></footer>
    </main>
  );
}
