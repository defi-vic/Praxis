import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Circle,
  Command,
  Crosshair,
  Gauge,
  Layers3,
  Menu,
  MoveUpRight,
  Play,
  Plus,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";

const proofPoints = [
  { value: "38%", label: "faster strategic alignment" },
  { value: "2.6×", label: "more decisions shipped" },
  { value: "9 hrs", label: "returned per leader / mo" },
];

const playbooks = [
  {
    number: "01",
    title: "See the whole board",
    copy: "Turn scattered signals into a shared view of what matters now — and what can wait.",
    icon: Layers3,
  },
  {
    number: "02",
    title: "Name the real move",
    copy: "Pressure-test options against constraints, second-order effects, and your team's actual capacity.",
    icon: Crosshair,
  },
  {
    number: "03",
    title: "Make it stick",
    copy: "Translate a decision into owners, milestones, and a rhythm that survives the next fire drill.",
    icon: Zap,
  },
];

const healthRows = [
  { label: "North star clarity", value: 86, tone: "copper" },
  { label: "Decision velocity", value: 72, tone: "sand" },
  { label: "Execution confidence", value: 91, tone: "mint" },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSignal, setActiveSignal] = useState("Market signal");
  const [showConsole, setShowConsole] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNav = (id: string) => {
    setMenuOpen(false);
    scrollToSection(id);
  };

  const handleDemo = () => {
    setShowConsole(true);
    toast.success("Your strategy room is ready", {
      description: "Explore the live decision canvas below.",
    });
    window.setTimeout(() => scrollToSection("console"), 80);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-parchment selection:bg-copper selection:text-ink">
      <div className="grain" aria-hidden="true" />
      <header className={`site-nav ${scrolled ? "site-nav-scrolled" : ""}`}>
        <div className="container nav-inner">
          <button className="brand-mark" onClick={() => handleNav("top")} aria-label="Go to the top">
            <span className="brand-glyph">P</span>
            <span className="brand-name">praxis</span>
          </button>
          <nav className="desktop-nav" aria-label="Primary navigation">
            <button onClick={() => handleNav("method")}>Method</button>
            <button onClick={() => handleNav("console")}>The console</button>
            <button onClick={() => handleNav("proof")}>Proof</button>
            <button onClick={() => handleNav("contact")}>Contact</button>
          </nav>
          <div className="nav-actions">
            <button className="login-link" onClick={() => toast("Sign in is coming soon")}>Sign in</button>
            <button className="nav-cta" onClick={() => handleNav("contact")}>Book a walkthrough <ArrowUpRight size={15} /></button>
            <button className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="mobile-nav">
            {[
              ["method", "Method"],
              ["console", "The console"],
              ["proof", "Proof"],
              ["contact", "Contact"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => handleNav(id)}>{label}<ArrowUpRight size={15} /></button>
            ))}
          </div>
        )}
      </header>

      <section id="top" className="hero-section">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow reveal-in"><span className="eyebrow-dot" /> Decision intelligence for the consequential</div>
            <h1 className="hero-title reveal-in delay-1">Make the<br /><em>right</em> move.</h1>
            <p className="hero-subtitle reveal-in delay-2">Praxis turns strategic ambiguity into a clear next move — aligning the room, focusing the work, and keeping momentum when the stakes get high.</p>
            <div className="hero-actions reveal-in delay-3">
              <button className="button button-primary" onClick={handleDemo}>Enter the strategy room <ArrowRight size={16} /></button>
              <button className="button button-ghost" onClick={() => handleNav("method")}><Play size={13} fill="currentColor" /> See how it works</button>
            </div>
            <div className="hero-note reveal-in delay-4"><span>Built for</span> founders · chiefs of staff · leadership teams</div>
          </div>
          <div className="hero-art reveal-in delay-2" aria-label="Abstract topographic contour illustration">
            <div className="hero-art-label">Signal / 01</div>
            <div className="topo-ring ring-a" />
            <div className="topo-ring ring-b" />
            <div className="topo-ring ring-c" />
            <div className="topo-ring ring-d" />
            <div className="topo-ring ring-e" />
            <div className="hero-art-core"><span>clarity</span><span>over noise</span></div>
            <div className="axis axis-x" /><div className="axis axis-y" />
            <div className="hero-art-coordinates">51°30'26.0"N<br />0°07'39.0"W</div>
            <div className="hero-art-caption">A living map of the decisions<br />that shape the next quarter.</div>
          </div>
        </div>
        <div className="container hero-footer-line"><span>01 / 04</span><div className="line-progress"><span /></div><span>scroll to explore</span><ArrowDownRight size={15} /></div>
      </section>

      <section id="method" className="method-section section-pad">
        <div className="container">
          <div className="section-intro split-intro">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> The Praxis method</div><h2>Less theatre.<br /><span>More traction.</span></h2></div>
            <div className="intro-aside"><p>Most strategy work doesn't fail because teams lack intelligence. It fails in the gap between knowing and doing.</p><p className="muted-copy">Praxis is the operating layer for closing that gap.</p></div>
          </div>
          <div className="playbook-grid">
            {playbooks.map((item, index) => {
              const Icon = item.icon;
              return <article className={`playbook-card reveal-in delay-${index + 1}`} key={item.number}>
                <div className="card-topline"><span>{item.number}</span><Icon size={19} strokeWidth={1.5} /></div>
                <h3>{item.title}</h3><p>{item.copy}</p>
                <button onClick={() => toast(`${item.title}: full playbook coming soon`)} className="card-link">Explore principle <ArrowUpRight size={14} /></button>
              </article>;
            })}
          </div>
        </div>
      </section>

      <section id="console" className="console-section section-pad">
        <div className="container">
          <div className="console-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot copper-dot" /> The decision console</div><h2>A calmer way to<br /><em>move forward.</em></h2></div>
            <div className="console-heading-aside"><span className="live-pill"><span /> Live environment</span><p>One room for the signal, the trade-offs, and the move your team is actually ready to make.</p></div>
          </div>
          <div className={`console-shell ${showConsole ? "console-shell-active" : ""}`}>
            <div className="console-topbar"><div className="console-breadcrumb"><span className="console-logo">P</span><span>Northstar / Q3</span><ChevronDown size={14} /></div><div className="console-topbar-right"><span className="saved-state"><Check size={13} /> Saved just now</span><button onClick={() => toast("Invite link copied")} className="icon-text-button"><Plus size={15} /> Invite</button><button className="avatar">AM</button></div></div>
            <div className="console-body">
              <aside className="console-sidebar"><div className="sidebar-label">Workspace</div><button className="sidebar-item active"><Circle size={8} fill="currentColor" /> Decision room</button><button className="sidebar-item"><Target size={15} /> Objectives</button><button className="sidebar-item"><Gauge size={15} /> Signals</button><div className="sidebar-spacer" /><div className="sidebar-label">Recent rooms</div><button className="recent-room"><span className="room-dot room-dot-copper" />International launch</button><button className="recent-room"><span className="room-dot room-dot-sand" />Hiring plan</button><div className="sidebar-user"><div className="mini-avatar">AM</div><div><strong>Alex Morgan</strong><span>Workspace owner</span></div><ChevronDown size={14} /></div></aside>
              <div className="console-main"><div className="console-main-header"><div><span className="micro-label">Decision room · edited 4m ago</span><h3>Where should we place the next bet?</h3></div><button className="more-button" onClick={() => toast("More room actions coming soon")}>•••</button></div>
                <div className="signal-tabs" role="tablist" aria-label="Decision console tabs">{["Market signal", "Team reality", "Our edge"].map((signal) => <button key={signal} className={activeSignal === signal ? "active" : ""} onClick={() => setActiveSignal(signal)} role="tab" aria-selected={activeSignal === signal}>{signal}</button>)}</div>
                <div className="console-insight"><div className="insight-kicker"><Sparkles size={14} /> {activeSignal}</div><p>{activeSignal === "Market signal" ? "The category is moving from feature-led to outcome-led. The opening is not more product — it's more proof." : activeSignal === "Team reality" ? "Your team has the conviction to focus, but not the capacity for another parallel bet. Sequence before you scale." : "You win when you turn complexity into a story that customers can repeat. Make the case impossible to misread."}</p><div className="insight-footer"><span>Added by Praxis AI</span><span>2 sources <ArrowUpRight size={12} /></span></div></div>
                <div className="console-columns"><div className="console-panel"><div className="panel-heading"><span>Decision health</span><span className="panel-status"><span /> On track</span></div>{healthRows.map((row) => <div className="health-row" key={row.label}><div><span>{row.label}</span><strong>{row.value}%</strong></div><div className="health-track"><span className={`health-fill ${row.tone}`} style={{ width: `${row.value}%` }} /></div></div>)}</div><div className="console-panel next-move-panel"><div className="panel-heading"><span>Recommended next move</span><ArrowUpRight size={15} /></div><div className="next-move-number">02</div><h4>Commit to the narrow wedge.</h4><p>Choose the segment where urgency is already visible. Make the first proof point undeniable.</p><button onClick={() => toast.success("Move marked as ready")}>Mark as ready <Check size={14} /></button></div></div>
              </div>
            </div>
          </div>
          <div className="console-caption"><span>Designed to turn the room from a debate into a decision.</span><button onClick={handleDemo}>Open an example room <ArrowRight size={15} /></button></div>
        </div>
      </section>

      <section id="proof" className="proof-section section-pad">
        <div className="container">
          <div className="proof-top"><div className="eyebrow"><span className="eyebrow-dot" /> The compounding effect</div><div className="proof-quote">“Praxis gave us the confidence to stop adding ideas and start making choices.” <span>— VP Strategy, Series B software company</span></div></div>
          <div className="proof-stats">{proofPoints.map((point) => <div key={point.label} className="proof-stat"><strong>{point.value}</strong><span>{point.label}</span></div>)}</div>
        </div>
      </section>

      <section id="contact" className="contact-section section-pad">
        <div className="container contact-card"><div className="contact-card-mark"><span className="brand-glyph">P</span></div><div><div className="eyebrow"><span className="eyebrow-dot copper-dot" /> Your next move</div><h2>Clarity is a<br /><em>competitive edge.</em></h2><p>Bring the question that's keeping your team up at night. We'll bring the room to make it useful.</p></div><div className="contact-cta-wrap"><button className="button button-light" onClick={() => toast.success("Thanks — we'll be in touch shortly")}>Book a private walkthrough <ArrowUpRight size={16} /></button><span>No pitch deck required.</span></div></div>
      </section>

      <footer className="site-footer"><div className="container footer-inner"><div className="footer-brand"><button className="brand-mark" onClick={() => handleNav("top")}><span className="brand-glyph">P</span><span className="brand-name">praxis</span></button><p>The operating layer for<br />better decisions.</p></div><div className="footer-links"><div><span>Explore</span><button onClick={() => handleNav("method")}>Method</button><button onClick={() => handleNav("console")}>Console</button><button onClick={() => handleNav("proof")}>Proof</button></div><div><span>Connect</span><button onClick={() => toast("hello@praxis.work copied")}>Email us</button><button onClick={() => toast("LinkedIn link coming soon")}>LinkedIn</button><button onClick={() => toast("Journal coming soon")}>Journal</button></div></div><div className="footer-end"><span>© 2025 Praxis Works</span><span>London · New York · Everywhere</span></div></div></footer>
    </main>
  );
}
