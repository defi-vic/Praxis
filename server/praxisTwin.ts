import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { getStudentContext, getTeachingDNA, listDemoStudents } from "./db";

const twinResponseSchema = z.object({
  response: z.string().min(1).max(3000),
  strategies_used: z.array(z.enum(["analogy", "step_by_step", "practical_example", "guided_question", "simpler_explanation"])).min(1).max(5),
  personalization: z.array(z.string().min(1).max(180)).max(5),
  follow_up_question: z.string().min(1).max(300),
  why_taught_this_way: z.object({
    teaching_style: z.array(z.string().min(1).max(120)).max(4),
    student_adaptation: z.array(z.string().min(1).max(160)).max(4),
  }),
  concept: z.string().min(1).max(160),
});

const learningSignalSchema = z.object({
  correctness: z.enum(["correct", "partial", "needs_support"]),
  mastery_estimate: z.number().int().min(0).max(100),
  confidence_signal: z.enum(["high", "medium", "low"]),
  misconception_detected: z.string().max(240),
  observation: z.string().min(1).max(360),
  recommended_next_step: z.string().min(1).max(300),
  intervention_focus: z.string().min(1).max(220),
});

const interventionSchema = z.object({
  title: z.string().min(1).max(120),
  concept: z.string().min(1).max(160),
  teaching_approach: z.array(z.string().min(1).max(220)).min(1).max(4),
  opening: z.string().min(1).max(500),
  guided_question: z.string().min(1).max(300),
  check_for_understanding: z.string().min(1).max(300),
  expected_misconception: z.string().min(1).max(500),
});

export type TwinResponse = z.infer<typeof twinResponseSchema>;
export type LearningSignal = z.infer<typeof learningSignalSchema>;
export type TwinIntervention = z.infer<typeof interventionSchema>;

const classroomInsightSchema = z.object({
  headline: z.string().min(1).max(180),
  what_this_means: z.string().min(1).max(420),
  recommended_action: z.string().min(1).max(420),
  affected_students: z.array(z.object({ name: z.string(), mastery: z.number().int().min(0).max(100), reason: z.string().max(180) })).max(8),
});

const responseSchema = {
  type: "object", additionalProperties: false,
  properties: {
    response: { type: "string", minLength: 1, maxLength: 3000 },
    strategies_used: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", enum: ["analogy", "step_by_step", "practical_example", "guided_question", "simpler_explanation"] } },
    personalization: { type: "array", maxItems: 5, items: { type: "string", minLength: 1, maxLength: 180 } },
    follow_up_question: { type: "string", minLength: 1, maxLength: 300 },
    why_taught_this_way: { type: "object", additionalProperties: false, properties: { teaching_style: { type: "array", maxItems: 4, items: { type: "string" } }, student_adaptation: { type: "array", maxItems: 4, items: { type: "string" } } }, required: ["teaching_style", "student_adaptation"] },
    concept: { type: "string", minLength: 1, maxLength: 160 },
  }, required: ["response", "strategies_used", "personalization", "follow_up_question", "why_taught_this_way", "concept"],
};

const signalSchema = {
  type: "object", additionalProperties: false,
  properties: {
    correctness: { type: "string", enum: ["correct", "partial", "needs_support"] }, mastery_estimate: { type: "integer", minimum: 0, maximum: 100 }, confidence_signal: { type: "string", enum: ["high", "medium", "low"] }, misconception_detected: { type: "string", maxLength: 240 }, observation: { type: "string", minLength: 1, maxLength: 360 }, recommended_next_step: { type: "string", minLength: 1, maxLength: 300 }, intervention_focus: { type: "string", minLength: 1, maxLength: 220 },
  }, required: ["correctness", "mastery_estimate", "confidence_signal", "misconception_detected", "observation", "recommended_next_step", "intervention_focus"],
};

function parseStructured<T>(response: Awaited<ReturnType<typeof invokeLLM>>, schema: z.ZodType<T>): T {
  const choice = response.choices[0];
  if (choice?.finish_reason === "length") throw new Error("Praxis Twin could not finish its structured response. Please retry.");
  const content = choice?.message?.content;
  const raw = Array.isArray(content) ? content.filter(part => part.type === "text").map(part => part.text).join("\n") : content;
  if (typeof raw !== "string") throw new Error("Praxis Twin returned no response. Please retry.");
  let parsed: unknown;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try { parsed = JSON.parse(cleaned); } catch { parsed = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1)); }
  } catch { throw new Error("Praxis Twin returned invalid structured output. Please retry."); }
  const result = schema.safeParse(parsed);
  if (!result.success) { console.warn("[Praxis Twin] structured response validation failed", result.error.issues.map(issue => issue.path.join(".") + ": " + issue.message)); throw new Error("Praxis Twin returned an invalid structured response. Please retry."); }
  return result.data;
}

function dnaContext(dna: any) {
  if (!dna) return "No Teaching DNA is established yet. Use a neutral, teacher-controlled explanation and say that the profile is still developing.";
  const dimensions = dna.rawAnalysis?.dimensions ?? {};
  return JSON.stringify(Object.fromEntries(Object.entries(dimensions).map(([key, value]: [string, any]) => [key, { score: value.score, confidence: value.confidence, explanation: value.explanation }])));
}

export async function generateTwinExplanation(input: { teacherId: number; studentId: number | null; request: string }) {
  const [dna, studentContext] = await Promise.all([getTeachingDNA(input.teacherId), getStudentContext(input.studentId, input.teacherId)]);
  const student = studentContext?.student;
  const progress = studentContext?.progress;
  const prompt = `Teacher request: ${input.request}\n\nTeaching DNA (use these demonstrated patterns as active constraints, not decoration): ${dnaContext(dna)}\n\nStudent context: ${student ? JSON.stringify({ name: student.name, mastery: progress?.masteryScore, confidence: progress?.confidenceScore, misconceptions: progress?.misconceptions, strengths: progress?.strengths, preferredApproach: progress?.preferredExplanationStyle, recommendedStrategy: progress?.recommendedStrategy }) : "General class; no individual profile selected."}\n\nGenerate a personalized explanation. If a misconception is present, address it directly without shaming. Use only strategies that are genuinely reflected in the explanation and return those strategies. Keep the teacher in control; this is a recommendation, not an automated grade.`;
  const response = await invokeLLM({ model: "gpt-5-mini", maxCompletionTokens: 4200, reasoning: { effort: "low" }, messages: [{ role: "system", content: "You are Praxis Twin, an AI teaching companion. You learn how a teacher explains concepts and adapt that approach for individual learners. Return only valid JSON." }, { role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "praxis_twin_response", strict: true, schema: responseSchema } } });
  return { result: parseStructured(response, twinResponseSchema), dna, studentContext };
}

export async function evaluateStudentAnswer(input: { teacherId: number; studentId: number; interaction: TwinResponse; answer: string }) {
  const [dna, studentContext] = await Promise.all([getTeachingDNA(input.teacherId), getStudentContext(input.studentId, input.teacherId)]);
  const response = await invokeLLM({ model: "gpt-5-mini", maxCompletionTokens: 2200, reasoning: { effort: "low" }, messages: [{ role: "system", content: "You are Praxis Twin evaluating a student's answer. Be evidence-based, never assign a grade, and return only valid JSON." }, { role: "user", content: `Teaching DNA: ${dnaContext(dna)}\nStudent context: ${JSON.stringify(studentContext?.progress)}\nExplanation given: ${input.interaction.response}\nFollow-up question: ${input.interaction.follow_up_question}\nStudent answer: ${input.answer}\nReturn a learning signal with a conservative mastery estimate and an adaptive next step.` }], response_format: { type: "json_schema", json_schema: { name: "praxis_learning_signal", strict: true, schema: signalSchema } } });
  return parseStructured(response, learningSignalSchema);
}

export async function generateIntervention(input: { teacherId: number; studentId: number; concept: string; learningSignal: LearningSignal }) {
  const [dna, studentContext] = await Promise.all([getTeachingDNA(input.teacherId), getStudentContext(input.studentId, input.teacherId)]);
  const response = await invokeLLM({ model: "gpt-5-mini", maxCompletionTokens: 2600, reasoning: { effort: "low" }, messages: [{ role: "system", content: "You are Praxis Twin creating a short teacher-reviewed intervention. Return only valid JSON; do not make high-stakes decisions." }, { role: "user", content: `Teaching DNA: ${dnaContext(dna)}\nStudent: ${JSON.stringify(studentContext?.student)}\nProgress: ${JSON.stringify(studentContext?.progress)}\nConcept: ${input.concept}\nLearning signal: ${JSON.stringify(input.learningSignal)}\nCreate a 5-minute intervention that uses the teacher's demonstrated style and targets the detected misconception. Keep each teaching_approach item under 180 characters and expected_misconception under 400 characters.` }], response_format: { type: "json_schema", json_schema: { name: "praxis_intervention", strict: true, schema: { type: "object", additionalProperties: false, properties: { title: { type: "string", maxLength: 120 }, concept: { type: "string", maxLength: 160 }, teaching_approach: { type: "array", items: { type: "string", maxLength: 220 }, minItems: 1, maxItems: 4 }, opening: { type: "string", maxLength: 500 }, guided_question: { type: "string", maxLength: 300 }, check_for_understanding: { type: "string", maxLength: 300 }, expected_misconception: { type: "string", maxLength: 500 } }, required: ["title", "concept", "teaching_approach", "opening", "guided_question", "check_for_understanding", "expected_misconception"] } } } });
  return parseStructured(response, interventionSchema);
}

export async function generateClassroomInsight(input: { teacherId: number }) {
  const [dna, students] = await Promise.all([getTeachingDNA(input.teacherId), listDemoStudents(input.teacherId)]);
  const response = await invokeLLM({ model: "gpt-5-mini", maxCompletionTokens: 1800, reasoning: { effort: "low" }, messages: [{ role: "system", content: "You are Praxis generating a teacher-reviewed classroom insight from demo learning data. Return only valid JSON. Do not make grading decisions." }, { role: "user", content: `Teaching DNA: ${dnaContext(dna)}\nClass: Biology 204 · Cell Systems\nConcept: Cellular respiration\nStudent progress: ${JSON.stringify(students.map(student => ({ name: student.name, mastery: student.progress?.masteryScore, misconceptions: student.progress?.misconceptions })))}\nIdentify a meaningful shared pattern, explain it, and recommend a practical teacher action that reflects the Teaching DNA.` }], response_format: { type: "json_schema", json_schema: { name: "praxis_classroom_insight", strict: true, schema: { type: "object", additionalProperties: false, properties: { headline: { type: "string" }, what_this_means: { type: "string" }, recommended_action: { type: "string" }, affected_students: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, mastery: { type: "integer", minimum: 0, maximum: 100 }, reason: { type: "string" } }, required: ["name", "mastery", "reason"] } } }, required: ["headline", "what_this_means", "recommended_action", "affected_students"] } } } });
  return parseStructured(response, classroomInsightSchema);
}
