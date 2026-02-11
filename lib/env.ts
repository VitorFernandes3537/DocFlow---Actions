import { z } from "zod";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_TEST_DOCS_DRIVE_URL: z.string().url().optional()
});

const ServerEnvSchema = PublicEnvSchema.extend({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  OPENAI_MAX_INPUT_CHARS: z.coerce.number().int().min(10000).max(500000).default(120000)
});

let cachedPublicEnv: z.infer<typeof PublicEnvSchema> | null = null;
let cachedServerEnv: z.infer<typeof ServerEnvSchema> | null = null;

export function getPublicEnv() {
  if (!cachedPublicEnv) {
    cachedPublicEnv = PublicEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_TEST_DOCS_DRIVE_URL: process.env.NEXT_PUBLIC_TEST_DOCS_DRIVE_URL || undefined
    });
  }

  return cachedPublicEnv;
}

export function getServerEnv() {
  if (!cachedServerEnv) {
    cachedServerEnv = ServerEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_TEST_DOCS_DRIVE_URL: process.env.NEXT_PUBLIC_TEST_DOCS_DRIVE_URL || undefined,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      OPENAI_MAX_INPUT_CHARS: process.env.OPENAI_MAX_INPUT_CHARS ?? 120000
    });
  }

  return cachedServerEnv;
}
