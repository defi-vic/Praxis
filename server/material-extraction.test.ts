import { describe, expect, it } from "vitest";
import { normalizePastedTeachingText } from "./material-extraction";

describe("material extraction guards", () => {
  it("normalizes pasted teaching material and removes null bytes", () => {
    const result = normalizePastedTeachingText("Explain the idea step by step.\u0000 Ask students to predict what happens next.");
    expect(result).toContain("Explain the idea step by step.");
    expect(result).not.toContain("\u0000");
  });

  it("rejects text that cannot support evidence-backed analysis", () => {
    expect(() => normalizePastedTeachingText("Too short")).toThrow(/at least a few sentences/i);
  });
});
