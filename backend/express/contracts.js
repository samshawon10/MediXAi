import { z } from "zod";

const text = z.string().max(2000);
const score = z.number().min(0).max(1).nullable();
const candidate = z.object({ condition: text, confidence: score });
export const inputSchema = z.object({
  symptoms: z.string().trim().min(1).max(2000)
    .refine((s) => /[a-zA-Z\u0980-\u09ff]/u.test(s) && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(s)),
  language: z.enum(["en", "bn"]).default("en"),
}).strict();
export const riskSchema = z.object({
  available: z.boolean(), level: z.enum(["HIGH", "CRITICAL", "UNASSESSED", "UNAVAILABLE"]),
  score: z.null(), urgent: z.boolean(), method: text.optional(),
  reasons: z.array(z.object({ symptom: text, level: z.enum(["HIGH", "CRITICAL"]), basis: text })).max(30),
  guidance: text, limitation: text, contextNote: text.optional(),
  sources: z.array(z.string().url().refine(s => s.startsWith("https://www.nhs.uk/") || s.startsWith("https://medlineplus.gov/"))).max(10).optional(),
});
export const infoSchema = z.object({
  name: text, model: text, version: text, classes: z.number().int().positive(),
  vectorizer: z.literal("TF-IDF"), limitation: text,
  explainability: text.optional(), riskEngine: text.optional(),
  research: z.object({
    dataset: text.nullable(), nTrain: z.number().int().nonnegative().nullable(),
    nTest: z.number().int().nonnegative().nullable(), randomState: z.number().int().nullable(),
    testSize: score, features: z.number().int().positive(), labels: z.array(text).max(1000),
    backgroundRows: z.number().int().nonnegative().nullable(),
    evaluation: z.object({ source: text, verifiedAt: text, accuracy: score, precision: score, recall: score, f1: score,
      confusionMatrix: z.array(z.array(z.number().int().nonnegative()).max(1000)).max(1000),
    }).nullable(),
  }).nullable().optional(),
});
export const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]), modelLoaded: z.boolean(),
  shapAvailable: z.boolean(), riskEngineAvailable: z.boolean(),
});
export const analysisSchema = z.object({
  success: z.literal(true), input: inputSchema,
  normalizedSymptoms: z.array(text).max(1000), unrecognizedSymptoms: z.array(text).max(1000),
  prediction: candidate.extend({ scoreType: text, alternatives: z.array(candidate).max(3) }),
  predictions: z.array(candidate).max(3), model: infoSchema,
  modelPredictions: z.array(candidate.extend({ model: text, scoreType: text })).length(4).optional(),
  finalPrediction: z.object({ condition: text, method: z.literal("equal-weight hard voting"),
    votes: z.number().int().min(1).max(4), totalModels: z.literal(4), tied: z.boolean(),
    tiedConditions: z.array(text).max(4), tieBreak: z.literal("alphabetical condition name"),
  }).optional(),
  explanation: z.object({
    available: z.boolean(), method: z.literal("SHAP"), explainer: text.optional(),
    target: text.optional(), units: text.optional(), baseValue: z.number().optional(),
    outputValue: z.number().optional(), absentFeatureImpact: z.number().optional(),
    features: z.array(z.object({ feature: text, impact: z.number(), direction: z.enum(["positive", "negative"]) })).max(1000),
    message: text.optional(), note: text.optional(),
  }),
  risk: riskSchema,
  education: z.object({ available: z.literal(false), condition: text, message: text }),
  disclaimer: text,
});
