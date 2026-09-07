import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { extractTeachingText, normalizePastedTeachingText } from "./material-extraction";
import { analyzeTeachingMaterial } from "./teachingDna";
import {
  DEMO_TEACHER_ID,
  createTeachingMaterial,
  getTeachingAnalysis,
  getTeachingDNA,
  getTeachingMaterial,
  getStudentContext,
  getInsightsDashboard,
  listDemoStudents,
  listTeachingMaterials,
  createTwinInteraction,
  saveLearningSignal,
  saveTeachingAnalysis,
  updateTeachingMaterialContent,
  updateTeachingMaterialStatus,
} from "./db";
import { TRPCError } from "@trpc/server";
import { evaluateStudentAnswer, generateClassroomInsight, generateIntervention, generateTwinExplanation } from "./praxisTwin";

const MAX_BASE64_CHARS = 7_000_000;
const materialInput = z.object({
  title: z.string().trim().min(2).max(255),
  classId: z.string().trim().max(128).optional(),
  source: z.enum(["paste", "file"]),
  content: z.string().max(70_000).optional(),
  fileName: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(160).optional(),
  fileBase64: z.string().max(MAX_BASE64_CHARS).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  materials: router({
    list: publicProcedure.query(() => listTeachingMaterials(DEMO_TEACHER_ID)),
    getAnalysis: publicProcedure.input(z.object({ materialId: z.number().int().positive() })).query(({ input }) => getTeachingAnalysis(input.materialId, DEMO_TEACHER_ID)),
    create: publicProcedure.input(materialInput).mutation(async ({ input }) => {
      try {
        if (input.source === "paste") {
          if (!input.content) throw new Error("Paste some teaching material before continuing.");
          const content = normalizePastedTeachingText(input.content);
          return await createTeachingMaterial({
            teacherId: DEMO_TEACHER_ID,
            title: input.title,
            classId: input.classId,
            type: "TEXT",
            content,
          });
        }

        if (!input.fileBase64 || !input.fileName) throw new Error("Choose a PDF, DOCX, or TXT file before continuing.");
        const content = await extractTeachingText({ fileName: input.fileName, mimeType: input.mimeType, base64: input.fileBase64 });
        const stored = await storagePut(`${DEMO_TEACHER_ID}-teaching-materials/${input.fileName}`, Buffer.from(input.fileBase64, "base64"), input.mimeType || "application/octet-stream");
        return await createTeachingMaterial({
          teacherId: DEMO_TEACHER_ID,
          title: input.title,
          classId: input.classId,
          type: input.fileName.split(".").pop()?.toUpperCase() || "FILE",
          content,
          fileUrl: stored.url,
        });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "We could not save that material." });
      }
    }),
    analyze: publicProcedure.input(z.object({ materialId: z.number().int().positive() })).mutation(async ({ input }) => {
      const material = await getTeachingMaterial(input.materialId, DEMO_TEACHER_ID);
      if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Teaching material not found." });
      try {
        await updateTeachingMaterialStatus(material.id, "processing", "Reading material", null, DEMO_TEACHER_ID);
        if (!material.content || material.content.trim().length < 40) throw new Error("There is not enough readable teaching text to analyze.");
        await updateTeachingMaterialStatus(material.id, "processing", "Finding patterns", null, DEMO_TEACHER_ID);
        const result = await analyzeTeachingMaterial({ title: material.title, subject: material.classId || undefined, content: material.content });
        await updateTeachingMaterialStatus(material.id, "processing", "Building Teaching DNA", null, DEMO_TEACHER_ID);
        await updateTeachingMaterialStatus(material.id, "processing", "Generating insights", null, DEMO_TEACHER_ID);
        return await saveTeachingAnalysis({ materialId: material.id, teacherId: DEMO_TEACHER_ID, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Praxis could not analyze this material.";
        await updateTeachingMaterialStatus(material.id, "failed", "Analysis failed", message, DEMO_TEACHER_ID).catch(() => undefined);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
  }),
  teachingDna: router({
    get: publicProcedure.query(() => getTeachingDNA(DEMO_TEACHER_ID)),
    getByTeacher: publicProcedure.input(z.object({ teacherId: z.number().int().positive() })).query(({ input }) => getTeachingDNA(input.teacherId)),
  }),
  insights: router({
    dashboard: publicProcedure.query(() => getInsightsDashboard(DEMO_TEACHER_ID)),
  }),
  twin: router({
    students: publicProcedure.query(() => listDemoStudents(DEMO_TEACHER_ID)),
    context: publicProcedure.input(z.object({ studentId: z.number().int().positive().nullable() })).query(({ input }) => getStudentContext(input.studentId, DEMO_TEACHER_ID)),
    generate: publicProcedure.input(z.object({ studentId: z.number().int().positive().nullable(), request: z.string().trim().min(8).max(1000) })).mutation(async ({ input }) => {
      try {
        const generated = await generateTwinExplanation({ teacherId: DEMO_TEACHER_ID, studentId: input.studentId, request: input.request });
        const interaction = await createTwinInteraction({ teacherId: DEMO_TEACHER_ID, studentId: input.studentId, concept: generated.result.concept, teacherRequest: input.request, generatedResponse: generated.result });
        return { ...generated.result, interactionId: interaction?.id ?? null };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Praxis Twin could not generate an explanation." });
      }
    }),
    evaluate: publicProcedure.input(z.object({ interactionId: z.number().int().positive(), studentId: z.number().int().positive(), interaction: z.object({ response: z.string(), strategies_used: z.array(z.string()), personalization: z.array(z.string()), follow_up_question: z.string(), why_taught_this_way: z.object({ teaching_style: z.array(z.string()), student_adaptation: z.array(z.string()) }), concept: z.string() }), answer: z.string().trim().min(1).max(1200) })).mutation(async ({ input }) => {
      try {
        const signal = await evaluateStudentAnswer({ teacherId: DEMO_TEACHER_ID, studentId: input.studentId, interaction: input.interaction as any, answer: input.answer });
        await saveLearningSignal({ interactionId: input.interactionId, studentId: input.studentId, masteryScore: signal.mastery_estimate, confidenceScore: signal.confidence_signal === "high" ? 82 : signal.confidence_signal === "medium" ? 58 : 34, misconceptions: signal.misconception_detected ? [signal.misconception_detected] : [], strengths: signal.correctness === "correct" ? ["Applied the explanation to the follow-up question"] : [], recommendedStrategy: signal.recommended_next_step, learningSignal: { ...signal, studentAnswer: input.answer }, teacherId: DEMO_TEACHER_ID });
        return signal;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Praxis Twin could not evaluate that response." });
      }
    }),
    intervention: publicProcedure.input(z.object({ studentId: z.number().int().positive(), concept: z.string().min(1).max(160), learningSignal: z.object({ correctness: z.string(), mastery_estimate: z.number(), confidence_signal: z.string(), misconception_detected: z.string(), observation: z.string(), recommended_next_step: z.string(), intervention_focus: z.string() }) })).mutation(async ({ input }) => {
      try { return await generateIntervention({ teacherId: DEMO_TEACHER_ID, studentId: input.studentId, concept: input.concept, learningSignal: input.learningSignal as any }); }
      catch (error) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Praxis could not generate an intervention." }); }
    }),
    classroomInsight: publicProcedure.mutation(async () => {
      try { return await generateClassroomInsight({ teacherId: DEMO_TEACHER_ID }); }
      catch (error) { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Praxis could not generate a classroom insight." }); }
    }),
  }),
});

export type AppRouter = typeof appRouter;
