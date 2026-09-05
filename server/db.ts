import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  teachingAnalyses,
  teachingDna as teachingDnaTable,
  teachingDnaEvidence,
  teachingMaterials,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { TeachingAnalysisResult } from "./teachingDna";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const DEMO_TEACHER_ID = 1;
const demoMaterial = {
  title: "Cellular Respiration — Demo Lecture Notes",
  classId: "Biology 204 · Cell Systems",
  type: "DEMO",
  content: `Today we are going to build cellular respiration from the student's point of view. Think of the mitochondrion as a power plant: glucose is the fuel, and ATP is the spendable energy that keeps the cell moving. First we will break glucose into smaller molecules, then we will move those molecules through the cycle, and finally we will use the electron transport chain to capture most of the ATP.\n\nWhen you sprint for the bus, your muscle cells need ATP quickly. What do you predict happens when oxygen becomes limited? That question is a useful check: fermentation can keep glycolysis moving, but it produces far less ATP. A common misconception is that the mitochondrion makes energy from nothing; it actually transfers energy from food into a form the cell can use.\n\nBefore we add the technical names, explain the journey in three steps to a partner. If a student says the Krebs cycle happens in the cytoplasm, ask them to locate the mitochondrion and retrace the route. We will correct the mistake by returning to the overview, then add the detail.`,
};

export async function ensureDemoMaterial(teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(teachingMaterials).where(eq(teachingMaterials.teacherId, teacherId)).limit(1);
  if (existing[0]) return existing[0];
  const now = Date.now();
  await db.insert(teachingMaterials).values({
    teacherId,
    classId: demoMaterial.classId,
    title: demoMaterial.title,
    type: demoMaterial.type,
    content: demoMaterial.content,
    isDemo: true,
    analysisStatus: "ready",
    analysisStage: "Seeded demo material",
    createdAt: now,
  });
  const inserted = await db.select().from(teachingMaterials).where(eq(teachingMaterials.teacherId, teacherId)).orderBy(desc(teachingMaterials.id)).limit(1);
  return inserted[0];
}

export async function listTeachingMaterials(teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return [];
  await ensureDemoMaterial(teacherId);
  return db.select().from(teachingMaterials).where(eq(teachingMaterials.teacherId, teacherId)).orderBy(desc(teachingMaterials.createdAt));
}

export async function getTeachingMaterial(materialId: number, teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(teachingMaterials).where(and(eq(teachingMaterials.id, materialId), eq(teachingMaterials.teacherId, teacherId))).limit(1);
  return rows[0];
}

export async function createTeachingMaterial(input: {
  teacherId?: number;
  title: string;
  classId?: string;
  type: string;
  content: string;
  fileUrl?: string;
  isDemo?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  await db.insert(teachingMaterials).values({
    teacherId: input.teacherId ?? DEMO_TEACHER_ID,
    title: input.title,
    classId: input.classId || null,
    type: input.type,
    content: input.content,
    fileUrl: input.fileUrl || null,
    isDemo: input.isDemo ?? false,
    analysisStatus: "uploaded",
    analysisStage: "Ready to analyze",
    createdAt: Date.now(),
  });
  const rows = await db.select().from(teachingMaterials).where(eq(teachingMaterials.teacherId, input.teacherId ?? DEMO_TEACHER_ID)).orderBy(desc(teachingMaterials.id)).limit(1);
  return rows[0];
}

export async function updateTeachingMaterialStatus(materialId: number, status: string, stage: string | null, error: string | null = null, teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  await db.update(teachingMaterials).set({ analysisStatus: status, analysisStage: stage, analysisError: error }).where(and(eq(teachingMaterials.id, materialId), eq(teachingMaterials.teacherId, teacherId)));
}

export async function updateTeachingMaterialContent(materialId: number, content: string, fileUrl: string | null = null, teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  await db.update(teachingMaterials).set({ content, fileUrl }).where(and(eq(teachingMaterials.id, materialId), eq(teachingMaterials.teacherId, teacherId)));
}

function asAnalysis(value: unknown): TeachingAnalysisResult {
  return typeof value === "string" ? JSON.parse(value) as TeachingAnalysisResult : value as TeachingAnalysisResult;
}

function aggregateDimension(analyses: TeachingAnalysisResult[], key: keyof TeachingAnalysisResult["dimensions"]) {
  const observed = analyses.map(analysis => analysis.dimensions[key]).filter(detail => detail.status === "observed");
  if (!observed.length) return { score: 0, confidence: 0, explanation: "Insufficient evidence across analyzed material.", evidenceExcerpt: "", status: "insufficient_evidence" as const };
  const weight = observed.reduce((sum, detail) => sum + Math.max(detail.confidence, 0.05), 0);
  const score = Math.round(observed.reduce((sum, detail) => sum + detail.score * Math.max(detail.confidence, 0.05), 0) / weight);
  const confidence = Number((1 - observed.reduce((product, detail) => product * (1 - detail.confidence), 1)).toFixed(2));
  const strongest = [...observed].sort((a, b) => b.confidence - a.confidence)[0];
  return { score, confidence, explanation: strongest.explanation, evidenceExcerpt: strongest.evidenceExcerpt, status: "observed" as const };
}

export async function saveTeachingAnalysis(input: {
  materialId: number;
  teacherId?: number;
  result: TeachingAnalysisResult;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const teacherId = input.teacherId ?? DEMO_TEACHER_ID;
  const now = Date.now();
  await db.insert(teachingAnalyses).values({
    teachingMaterialId: input.materialId,
    teacherId,
    analysisJson: input.result,
    observationCount: input.result.observations.length,
    createdAt: now,
  });

  const analysesRows = await db.select().from(teachingAnalyses).where(eq(teachingAnalyses.teacherId, teacherId)).orderBy(desc(teachingAnalyses.createdAt));
  const analyses = analysesRows.map(row => asAnalysis(row.analysisJson));
  const dimensionKeys = Object.keys(input.result.dimensions) as Array<keyof TeachingAnalysisResult["dimensions"]>;
  const dimensions = Object.fromEntries(dimensionKeys.map(key => [key, aggregateDimension(analyses, key)])) as TeachingAnalysisResult["dimensions"];
  const styleCharacteristics = Array.from(new Map(analyses.flatMap(analysis => analysis.styleCharacteristics).map(item => [item.label.toLowerCase(), item])).values()).slice(0, 5);
  const observations = analyses.flatMap(analysis => analysis.observations).slice(0, 12);
  const rawAnalysis = { dimensions, styleCharacteristics, observations, sourceCount: analysesRows.length };
  const dnaValues = {
    teacherId,
    explanationStyle: dimensions.explanation_style,
    analogyUsage: dimensions.analogy_usage,
    exampleUsage: dimensions.real_world_example_usage,
    questioningStyle: dimensions.questioning_style,
    conceptProgression: dimensions.concept_progression,
    feedbackStyle: dimensions.feedback_style,
    tone: dimensions.tone,
    visualPreference: dimensions.visual_structural_preference,
    confidence: analysesRows.length >= 4 ? "established" : analysesRows.length >= 2 ? "developing" : "early",
    sourceCount: analysesRows.length,
    rawAnalysis,
    updatedAt: now,
  };
  await db.insert(teachingDnaTable).values(dnaValues).onDuplicateKeyUpdate({ set: dnaValues });
  const dnaRows = await db.select().from(teachingDnaTable).where(eq(teachingDnaTable.teacherId, teacherId)).limit(1);
  const dna = dnaRows[0];
  if (!dna) throw new Error("Teaching DNA could not be saved.");

  const evidence = Object.entries(input.result.dimensions).filter(([, detail]) => detail.status === "observed" && detail.evidenceExcerpt.trim()).map(([dimension, detail]) => ({
    teachingDnaId: dna.id,
    teachingMaterialId: input.materialId,
    dimension,
    score: detail.score,
    confidence: Math.round(detail.confidence * 100),
    explanation: detail.explanation,
    evidenceExcerpt: detail.evidenceExcerpt,
    createdAt: now,
  }));
  if (evidence.length) await db.insert(teachingDnaEvidence).values(evidence);
  await updateTeachingMaterialStatus(input.materialId, "analyzed", "Teaching DNA generated", null, teacherId);
  return dna;
}

export async function getTeachingDNA(teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return undefined;
  const dnaRows = await db.select().from(teachingDnaTable).where(eq(teachingDnaTable.teacherId, teacherId)).limit(1);
  const dna = dnaRows[0];
  if (!dna) return undefined;
  const evidence = await db.select().from(teachingDnaEvidence).where(eq(teachingDnaEvidence.teachingDnaId, dna.id)).orderBy(desc(teachingDnaEvidence.createdAt));
  const materials = await db.select().from(teachingMaterials).where(eq(teachingMaterials.teacherId, teacherId)).orderBy(desc(teachingMaterials.createdAt));
  return { ...dna, evidence, materials: materials.filter(material => evidence.some(item => item.teachingMaterialId === material.id)), rawAnalysis: asAnalysis(dna.rawAnalysis) };
}

export async function getTeachingAnalysis(materialId: number, teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(teachingAnalyses).where(and(eq(teachingAnalyses.teachingMaterialId, materialId), eq(teachingAnalyses.teacherId, teacherId))).orderBy(desc(teachingAnalyses.createdAt)).limit(1);
  const material = await getTeachingMaterial(materialId, teacherId);
  return rows[0] && material ? { ...rows[0], analysisJson: asAnalysis(rows[0].analysisJson), material } : undefined;
}

export async function getEvidenceForMaterials(materialIds: number[], teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db || materialIds.length === 0) return [];
  const dna = await getTeachingDNA(teacherId);
  if (!dna) return [];
  return dna.evidence.filter(item => materialIds.includes(item.teachingMaterialId));
}

export { DEMO_TEACHER_ID };
