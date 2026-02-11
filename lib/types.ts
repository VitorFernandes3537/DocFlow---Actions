import { z } from "zod";

export const ItemTypeSchema = z.enum([
  "task",
  "deadline",
  "required_doc",
  "warning"
]);

export const ConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "uncertain"
]);

export const ExtractionItemSchema = z.object({
  id: z.string().min(1),
  type: ItemTypeSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  due_date: z.string().nullable().default(null),
  due_date_raw: z.string().nullable().default(null),
  conditional: z.boolean().default(false),
  dependencies: z.array(z.string()).default([]),
  evidence_snippet: z.string().min(20),
  evidence_ref: z.string().nullable().default(null),
  confidence: ConfidenceSchema
});

export const ExtractionPayloadSchema = z.object({
  document_summary: z.object({
    title: z.string().default(""),
    purpose: z.string().default(""),
    target_audience: z.string().default("")
  }),
  base_date_needed: z.boolean().default(false),
  items: z.array(ExtractionItemSchema).min(1)
});

export type ExtractionPayload = z.infer<typeof ExtractionPayloadSchema>;
export type ExtractionItem = z.infer<typeof ExtractionItemSchema>;

export type ItemStatus = "pending" | "done";

export const CONDITIONAL_TERMS = [
  "exceto",
  "salvo",
  "conforme",
  "retificado",
  "retificacao",
  "desde que",
  "caso",
  "se",
  "mediante",
  "errata",
  "anexo"
];
