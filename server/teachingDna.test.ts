import { describe, expect, it } from "vitest";
import { teachingAnalysisSchema } from "./teachingDna";

const dimensions = {
  explanation_style: { score: 82, confidence: 0.86, explanation: "Moves from overview to steps.", evidenceExcerpt: "First, we break glucose into smaller molecules.", status: "observed" },
  analogy_usage: { score: 91, confidence: 0.94, explanation: "Uses a power plant comparison.", evidenceExcerpt: "Think of the mitochondrion as a power plant.", status: "observed" },
  real_world_example_usage: { score: 88, confidence: 0.9, explanation: "Connects the concept to sprinting.", evidenceExcerpt: "When you sprint for the bus, your muscle cells need ATP quickly.", status: "observed" },
  questioning_style: { score: 74, confidence: 0.7, explanation: "Uses prediction and comprehension questions.", evidenceExcerpt: "What do you predict happens when oxygen becomes limited?", status: "observed" },
  concept_progression: { score: 93, confidence: 0.95, explanation: "Builds from overview to technical detail.", evidenceExcerpt: "Before we add the technical names, explain the journey in three steps.", status: "observed" },
  feedback_style: { score: 78, confidence: 0.71, explanation: "Returns to the overview to correct misconceptions.", evidenceExcerpt: "We will correct the mistake by returning to the overview.", status: "observed" },
  tone: { score: 80, confidence: 0.76, explanation: "Invites students into the reasoning.", evidenceExcerpt: "to a partner", status: "observed" },
  visual_structural_preference: { score: 0, confidence: 0, explanation: "Insufficient evidence across the supplied text.", evidenceExcerpt: "", status: "insufficient_evidence" },
} as const;

describe("teachingAnalysisSchema", () => {
  it("accepts evidence-backed structured output with insufficient dimensions", () => {
    const result = teachingAnalysisSchema.safeParse({
      dimensions,
      styleCharacteristics: [{ label: "Progressive", description: "Builds foundational knowledge before technical detail." }],
      observations: [{ dimension: "analogy_usage", observation: "Introduces a familiar comparison before the technical definition.", evidenceExcerpt: "Think of the mitochondrion as a power plant." }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects arbitrary scores outside the supported range", () => {
    const result = teachingAnalysisSchema.safeParse({
      dimensions: { ...dimensions, analogy_usage: { ...dimensions.analogy_usage, score: 140 } },
      styleCharacteristics: [{ label: "Made up", description: "This should not validate." }],
      observations: [],
    });
    expect(result.success).toBe(false);
  });
});
