import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, CircleHelp, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Learn() {
  const studentsQuery = trpc.twin.students.useQuery();
  const students = studentsQuery.data ?? [];
  const daniel: any = useMemo(() => students.find((student: any) => student.name === "Daniel") ?? students[0], [students]);
  const [lesson, setLesson] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [signal, setSignal] = useState<any>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const generateMutation = trpc.twin.generate.useMutation({ onError: error => toast.error(error.message) });
  const evaluateMutation = trpc.twin.evaluate.useMutation({ onError: error => toast.error(error.message) });

  const generateLesson = async (different = false) => {
    if (!daniel) return;
    setLoadingLesson(true);
    setSignal(null);
    setAnswer("");
    try {
      const request = different
        ? "Try a different explanation of ATP for Daniel. Do not repeat the previous explanation. Use a new concrete analogy or real-world example while responding to the same ATP versus glucose misconception."
        : "Teach Daniel the current concept: Cellular Respiration → ATP. Start from what he is likely confusing, use the teacher's demonstrated style, and end with one short check-for-understanding question.";
      const result = await generateMutation.mutateAsync({ studentId: daniel.id, request });
      setLesson(result);
      setAttempt(value => different ? value + 1 : value);
    } finally {
      setLoadingLesson(false);
    }
  };

  useEffect(() => {
    if (daniel && !lesson && !loadingLesson) void generateLesson();
  }, [daniel, lesson, loadingLesson]);

  const submitAnswer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lesson || !daniel || !answer.trim()) return;
    const nextSignal = await evaluateMutation.mutateAsync({ interactionId: lesson.interactionId, studentId: daniel.id, interaction: lesson, answer });
    setSignal(nextSignal);
  };

  const currentMastery = signal?.mastery_estimate ?? daniel?.progress?.masteryScore ?? 0;
  const nextAction = signal?.correctness === "correct" ? "Continue to a new application" : signal?.correctness === "partial" ? "Practice this distinction once more" : "Try another explanation";
  if (studentsQuery.isLoading || !daniel) return <div className="learn-loading"><Loader2 className="animate-spin" size={20} /> Preparing your learning space…</div>;

  return <div className="learn-page"><header className="learn-header"><Link href="/workspace"><span className="learn-brand-mark">P</span><strong>praxis</strong></Link><span className="learn-header-label">A learning space shaped for you</span><Link className="learn-exit" href="/workspace"><ArrowLeft size={14} /> Teacher workspace</Link></header><main className="learn-main"><div className="learn-breadcrumb"><span>Biology 204</span><i>·</i><span>Cell Systems</span><i>·</i><strong>Cellular Respiration</strong></div><section className="learn-welcome"><div><span className="micro-label">PRAXIS LEARN / FOR {daniel.name.toUpperCase()}</span><h1>Let’s make ATP<br /><em>make sense.</em></h1><p>Praxis has shaped this lesson around how your teacher explains ideas and the part of this concept that is still getting in the way.</p></div><div className="learn-mastery"><span className="micro-label">CURRENT MASTERY</span><strong>{currentMastery}%</strong><div><i style={{ width: `${currentMastery}%` }} /></div><small>{signal ? "Updated from your answer" : "A starting point, not a grade"}</small></div></section><section className="learn-context"><div className="learn-context-icon"><CircleHelp size={19} /></div><div><span className="micro-label">WHAT PRAXIS THINKS YOU’RE WORKING ON</span><h2>{daniel.progress?.misconceptions?.[0] ?? "Connecting the process to the outcome"}</h2><p>It is easy to treat glucose and ATP as the same thing. This lesson will help you see the difference between stored energy and energy your cell can use right now.</p></div></section><section className="learn-lesson"><div className="learn-lesson-head"><div><span className="micro-label">YOUR PERSONALIZED LESSON {attempt > 0 ? `· TRY ${attempt + 1}` : ""}</span><h2>Cellular Respiration → ATP</h2></div><div className="learn-dna-note"><Sparkles size={14} /> Shaped by your teacher’s Teaching DNA</div></div>{loadingLesson ? <div className="learn-generating"><Loader2 className="animate-spin" size={18} /><span>Praxis is shaping a different explanation for you…</span></div> : lesson && <><div className="learn-explanation"><BrainCircuit size={19} /><div><p>{lesson.response}</p><div className="learn-strategy-row">{lesson.strategies_used.map((strategy: string) => <span key={strategy}>{strategy.replaceAll("_", " ")}</span>)}</div></div></div><div className="learn-question"><span className="micro-label">YOUR TURN</span><h3>{lesson.follow_up_question}</h3><form onSubmit={submitAnswer}><textarea value={answer} onChange={event => setAnswer(event.target.value)} rows={3} placeholder="Write what you think…" disabled={Boolean(signal) || evaluateMutation.isPending} /><button disabled={!answer.trim() || Boolean(signal) || evaluateMutation.isPending}>{evaluateMutation.isPending ? "Thinking…" : "Check my answer"} <ArrowRight size={15} /></button></form></div></>}</section>{signal && <section className={`learn-feedback ${signal.correctness}`}><div className="learn-feedback-icon">{signal.correctness === "correct" ? <Check size={20} /> : <CircleHelp size={20} />}</div><div><span className="micro-label">PRAXIS CHECKED YOUR THINKING</span><h2>{signal.correctness === "correct" ? "That connection is there." : signal.correctness === "partial" ? "You’re close. One part needs attention." : "Let’s take another route."}</h2><p>{signal.observation}</p><div className="learn-next-step"><strong>Next step</strong><span>{nextAction}</span></div></div><div className="learn-feedback-action">{signal.correctness === "correct" ? <Link className="learn-next-button" href="/workspace"><span>Return to workspace</span> <ArrowRight size={14} /></Link> : <button className="learn-next-button" onClick={() => void generateLesson(true)}><span>Try a different explanation</span> <ArrowRight size={14} /></button>}</div></section>}<footer className="learn-footer"><span><Sparkles size={13} /> Praxis learns with you, not instead of you.</span><span>Teacher-guided · Evidence-based · No grades here</span></footer></main></div>;
}
