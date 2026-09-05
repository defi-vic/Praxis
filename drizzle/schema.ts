import { bigint, boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const teachingMaterials = mysqlTable("teachingMaterials", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  classId: varchar("classId", { length: 128 }),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  content: text("content").notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }),
  isDemo: boolean("isDemo").default(false).notNull(),
  analysisStatus: varchar("analysisStatus", { length: 32 }).default("uploaded").notNull(),
  analysisStage: varchar("analysisStage", { length: 64 }),
  analysisError: text("analysisError"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export const teachingAnalyses = mysqlTable("teachingAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  teachingMaterialId: int("teachingMaterialId").notNull(),
  teacherId: int("teacherId").notNull(),
  analysisJson: json("analysisJson").notNull(),
  observationCount: int("observationCount").default(0).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export const teachingDna = mysqlTable("teachingDna", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull().unique(),
  explanationStyle: json("explanationStyle").notNull(),
  analogyUsage: json("analogyUsage").notNull(),
  exampleUsage: json("exampleUsage").notNull(),
  questioningStyle: json("questioningStyle").notNull(),
  conceptProgression: json("conceptProgression").notNull(),
  feedbackStyle: json("feedbackStyle").notNull(),
  tone: json("tone").notNull(),
  visualPreference: json("visualPreference").notNull(),
  confidence: varchar("confidence", { length: 32 }).notNull(),
  sourceCount: int("sourceCount").default(0).notNull(),
  rawAnalysis: json("rawAnalysis").notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export const teachingDnaEvidence = mysqlTable("teachingDnaEvidence", {
  id: int("id").autoincrement().primaryKey(),
  teachingDnaId: int("teachingDnaId").notNull(),
  teachingMaterialId: int("teachingMaterialId").notNull(),
  dimension: varchar("dimension", { length: 128 }).notNull(),
  score: int("score").notNull(),
  confidence: int("confidence").notNull(),
  explanation: text("explanation").notNull(),
  evidenceExcerpt: text("evidenceExcerpt").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type TeachingMaterial = typeof teachingMaterials.$inferSelect;
export type TeachingAnalysis = typeof teachingAnalyses.$inferSelect;
export type TeachingDNA = typeof teachingDna.$inferSelect;
export type TeachingDNAEvidence = typeof teachingDnaEvidence.$inferSelect;
