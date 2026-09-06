import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  teachingAnalyses,
  teachingDna as teachingDnaTable,
  teachingDnaEvidence,
  teachingMaterials,
  studentProgress,
  students,
  twinInteractions,
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

const DEMO_CLASS_ID = "Biology 204 · Cell Systems";
const DEMO_CONCEPT = "Cellular respiration";

const demoStudents = [
  { name: "Daniel", masteryScore: 42, confidenceScore: 28, misconceptions: ["ATP vs glucose"], strengths: ["Understands cells need usable energy"], preferredExplanationStyle: "Real-world examples", recommendedStrategy: "Use a fuel-versus-wallet analogy before adding ATP synthesis." },
  { name: "Amara", masteryScore: 71, confidenceScore: 58, misconceptions: ["Electron transport chain"], strengths: ["Strong conceptual overview"], preferredExplanationStyle: "Step-by-step", recommendedStrategy: "Sequence the electron carriers with one concrete checkpoint per step." },
  { name: "Michael", masteryScore: 89, confidenceScore: 84, misconceptions: [], strengths: ["Connects mechanism to application", "Explains ATP role accurately"], preferredExplanationStyle: "Conceptual detail", recommendedStrategy: "Invite transfer to a novel biological context." },
  { name: "Sarah", masteryScore: 63, confidenceScore: 46, misconceptions: ["Fermentation and oxygen limitation"], strengths: ["Asks productive questions"], preferredExplanationStyle: "Question-driven", recommendedStrategy: "Start with a prediction question, then compare aerobic and anaerobic paths." },
];

export async function ensureDemoStudents(teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return [];
  const existing = await db.select().from(students).where(eq(students.teacherId, teacherId));
  if (existing.length < demoStudents.length) {
    const existingNames = new Set(existing.map(student => student.name));
    for (const demo of demoStudents.filter(item => !existingNames.has(item.name))) {
      await db.insert(students).values({ teacherId, classId: DEMO_CLASS_ID, name: demo.name, isDemo: true, createdAt: Date.now() });
    }
  }
  const seeded = await db.select().from(students).where(eq(students.teacherId, teacherId));
  for (const student of seeded) {
    const progress = await db.select().from(studentProgress).where(and(eq(studentProgress.studentId, student.id), eq(studentProgress.concept, DEMO_CONCEPT))).limit(1);
    if (!progress[0]) {
      const demo = demoStudents.find(item => item.name === student.name) ?? demoStudents[0];
      await db.insert(studentProgress).values({ studentId: student.id, classId: DEMO_CLASS_ID, concept: DEMO_CONCEPT, masteryScore: demo.masteryScore, confidenceScore: demo.confidenceScore, misconceptions: demo.misconceptions, strengths: demo.strengths, preferredExplanationStyle: demo.preferredExplanationStyle, recommendedStrategy: demo.recommendedStrategy, updatedAt: Date.now() });
    }
  }
  return db.select().from(students).where(eq(students.teacherId, teacherId));
}

export async function listDemoStudents(teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return [];
  const seeded = await ensureDemoStudents(teacherId);
  const result = [];
  for (const student of seeded) {
    const progress = await db.select().from(studentProgress).where(and(eq(studentProgress.studentId, student.id), eq(studentProgress.concept, DEMO_CONCEPT))).limit(1);
    result.push({ ...student, progress: progress[0] });
  }
  return result;
}

export async function getStudentContext(studentId: number | null, teacherId = DEMO_TEACHER_ID) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureDemoStudents(teacherId);
  if (!studentId) return { student: null, progress: null };
  const studentRows = await db.select().from(students).where(and(eq(students.id, studentId), eq(students.teacherId, teacherId))).limit(1);
  const student = studentRows[0];
  if (!student) return undefined;
  const progressRows = await db.select().from(studentProgress).where(and(eq(studentProgress.studentId, student.id), eq(studentProgress.concept, DEMO_CONCEPT))).orderBy(desc(studentProgress.updatedAt)).limit(1);
  return { student, progress: progressRows[0] };
}

export async function getRecentTwinInteractions(teacherId = DEMO_TEACHER_ID, studentId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(twinInteractions.teacherId, teacherId)];
  if (studentId) filters.push(eq(twinInteractions.studentId, studentId));
  return db.select().from(twinInteractions).where(and(...filters)).orderBy(desc(twinInteractions.createdAt)).limit(5);
}

export async function createTwinInteraction(input: { teacherId?: number; studentId?: number | null; concept: string; teacherRequest: string; generatedResponse: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const teacherId = input.teacherId ?? DEMO_TEACHER_ID;
  await db.insert(twinInteractions).values({ teacherId, studentId: input.studentId ?? null, concept: input.concept, teacherRequest: input.teacherRequest, generatedResponse: input.generatedResponse, createdAt: Date.now() });
  return db.select().from(twinInteractions).where(eq(twinInteractions.teacherId, teacherId)).orderBy(desc(twinInteractions.id)).limit(1).then(rows => rows[0]);
}

export async function saveLearningSignal(input: { interactionId: number; studentId: number; masteryScore: number; confidenceScore: number; misconceptions: string[]; strengths: string[]; recommendedStrategy: string; learningSignal: unknown; teacherId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const teacherId = input.teacherId ?? DEMO_TEACHER_ID;
  await db.update(twinInteractions).set({ studentAnswer: (input.learningSignal as { studentAnswer?: string }).studentAnswer ?? null, learningSignal: input.learningSignal }).where(and(eq(twinInteractions.id, input.interactionId), eq(twinInteractions.teacherId, teacherId)));
  await db.update(studentProgress).set({ masteryScore: input.masteryScore, confidenceScore: input.confidenceScore, misconceptions: input.misconceptions, strengths: input.strengths, recommendedStrategy: input.recommendedStrategy, updatedAt: Date.now() }).where(and(eq(studentProgress.studentId, input.studentId), eq(studentProgress.concept, DEMO_CONCEPT)));
  return getStudentContext(input.studentId, teacherId);
}

export { DEMO_CLASS_ID, DEMO_CONCEPT };

export { DEMO_TEACHER_ID };
