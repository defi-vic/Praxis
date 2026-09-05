import { z } from "zod";
import { invokeLLM } from "./_core/llm";

const dimensionSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(1).max(500),
  evidenceExcerpt: z.string().max(360),
  status: z.enum(["observed", "insufficient_evidence"]),
});

export const teachingAnalysisSchema = z.object({
  dimensions: z.object({
    explanation_style: dimensionSchema,
    analogy_usage: dimensionSchema,
    real_world_example_usage: dimensionSchema,
    questioning_style: dimensionSchema,
    concept_progression: dimensionSchema,
    feedback_style: dimensionSchema,
    tone: dimensionSchema,
    visual_structural_preference: dimensionSchema,
  }),
  styleCharacteristics: z.array(z.object({
    label: z.string().min(1).max(60),
    description: z.string().min(1).max(240),
  })).min(1).max(5),
  observations: z.array(z.object({
    dimension: z.string().min(1).max(80),
    observation: z.string().min(1).max(360),
    evidenceExcerpt: z.string().min(1).max(360),
  })).max(12),
});

export type TeachingAnalysisResult = z.infer<typeof teachingAnalysisSchema>;

const schemaForLLM = {
  type: "object",
  properties: {
    dimensions: {
      type: "object",
      properties: Object.fromEntries([
        "explanation_style",
        "analogy_usage",
        "real_world_example_usage",
        "questioning_style",
        "concept_progression",
        "feedback_style",
        "tone",
        "visual_structural_preference",
      ].map(key => [key, {
        type: "object",
        properties: {
          score: { type: "integer", minimum: 0, maximum: 100 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          explanation: { type: "string", minLength: 1, maxLength: 500 },
          evidenceExcerpt: { type: "string", maxLength: 360 },
          status: { type: "string", enum: ["observed", "insufficient_evidence"] },
        },
        required: ["score", "confidence", "explanation", "evidenceExcerpt", "status"],
        additionalProperties: false,
      }])),
      required: [
        "explanation_style",
        "analogy_usage",
        "real_world_example_usage",
        "questioning_style",
        "concept_progression",
        "feedback_style",
        "tone",
        "visual_structural_preference",
      ],
      additionalProperties: false,
    },
    styleCharacteristics: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          label: { type: "string", minLength: 1, maxLength: 60 },
          description: { type: "string", minLength: 1, maxLength: 240 },
        },
        required: ["label", "description"],
        additionalProperties: false,
      },
    },
    observations: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          dimension: { type: "string", minLength: 1, maxLength: 80 },
          observation: { type: "string", minLength: 1, maxLength: 360 },
          evidenceExcerpt: { type: "string", minLength: 1, maxLength: 360 },
        },
        required: ["dimension", "observation", "evidenceExcerpt"],
        additionalProperties: false,
      },
    },
  },
  required: ["dimensions", "styleCharacteristics", "observations"],
  additionalProperties: false,
};

const dimensionInstructions = `
Analyze these dimensions conservatively:
- explanation_style: step-by-step, conceptual-first, example-first, analogy-driven, or definition-first
- analogy_usage: frequency and usefulness of comparisons to familiar systems
- real_world_example_usage: connections to practical or lived situations
- questioning_style: Socratic, comprehension checks, rhetorical, recall, or application questions
- concept_progression: simple to complex, theory to application, definition to example, or overview to detail
- feedback_style: explaining errors, hints, direct answers, encouraging retry, or step-by-step correction
- tone: encouraging, conversational, formal, practical, direct, or curious
- visual_structural_preference: diagrams, tables, bullets, structured sections, or textual explanation
`;

export async function analyzeTeachingMaterial(input: { title: string; subject?: string; content: string }) {
  const responsePromise = invokeLLM({
    model: "gpt-5-mini",
    maxCompletionTokens: 5000,
    reasoning: { effort: "low" },
    messages: [
      {
        role: "system",
        content: `You are Praxis's Teaching DNA analyst. Identify how a teacher teaches, not what the lesson is about. Return only the requested JSON schema. Scores from 0-100 must reflect observed evidence, never random values. Confidence from 0-1 must reflect the amount and clarity of evidence. If a dimension lacks enough evidence, set status to insufficient_evidence, score to 0, confidence to 0, and evidenceExcerpt to an empty string. Every observed evidenceExcerpt must be a short verbatim excerpt from the supplied material. Style characteristics and observations must be grounded in the material. Do not invent names, institutions, student outcomes, or evidence. ${dimensionInstructions}`,
      },
      {
        role: "user",
        content: `Title: ${input.title}\nSubject/class: ${input.subject || "Not provided"}\n\nTeaching material to analyze:\n---\n${input.content}\n---`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "teaching_dna_analysis",
        strict: true,
        schema: schemaForLLM,
      },
    },
  });
  const response = await Promise.race([
    responsePromise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("The analysis service took too long to respond. Please retry.")), 45_000)),
  ]);

  const choice = response.choices[0];
  const rawContent = choice?.message?.content;
  if (choice?.finish_reason === "length") throw new Error("The analysis service truncated its structured result. Please retry.");
  const raw = Array.isArray(rawContent)
    ? rawContent.filter((part): part is { type: "text"; text: string } => part.type === "text").map(part => part.text).join("\n")
    : rawContent;
  if (typeof raw !== "string") throw new Error("The analysis service returned no structured result.");

  let parsed: unknown;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const firstObject = cleaned.indexOf("{");
      const lastObject = cleaned.lastIndexOf("}");
      if (firstObject < 0 || lastObject <= firstObject) throw new Error("No JSON object found");
      parsed = JSON.parse(cleaned.slice(firstObject, lastObject + 1));
    }
  } catch {
    console.warn(`[Teaching DNA] Invalid structured output length=${raw.length} finish_reason=${choice?.finish_reason ?? "unknown"}`);
    throw new Error("The analysis service returned invalid structured output. Please retry.");
  }

  const validated = teachingAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("The analysis service returned an invalid Teaching DNA profile.");
  }
  return validated.data;
}

export const dimensionLabels: Record<string, string> = {
  explanation_style: "Explanation style",
  analogy_usage: "Analogies",
  real_world_example_usage: "Real-world examples",
  questioning_style: "Question-driven teaching",
  concept_progression: "Concept progression",
  feedback_style: "Feedback style",
  tone: "Tone",
  visual_structural_preference: "Visual / structural preference",
};

export function getEvidenceDimensions(result: TeachingAnalysisResult) {
  return Object.entries(result.dimensions).map(([dimension, detail]) => ({
    dimension,
    ...detail,
  })).filter(detail => detail.status === "observed" && detail.evidenceExcerpt.trim().length > 0);
}
