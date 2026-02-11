import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createOpenAIClient } from "@/lib/openai";
import { buildExtractionPrompt } from "@/lib/prompts";
import { ExtractionPayloadSchema } from "@/lib/types";
import { hasSufficientText, normalizeItems } from "@/lib/utils";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

const inputSchema = z.object({
  title: z.string().min(3),
  baseDate: z.string().nullable(),
  pastedText: z.string().nullable()
});

function cleanJson(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return trimmed;
}

async function parsePdfText(data: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Server runtimes (incl. Vercel) are more stable with fake worker mode.
  // This avoids worker path/resolution issues in bundled deployments.
  const loadingTask = (pdfjs as any).getDocument({
    data,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    stopAtErrors: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS
  } as any);

  let pdfDocument: Awaited<typeof loadingTask.promise> | null = null;
  const chunks: string[] = [];

  try {
    pdfDocument = await loadingTask.promise;

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent({
          includeMarkedContent: true,
          disableNormalization: false
        });

        const pageText = (textContent.items as Array<{ str?: string }>)
          .map((item) => item.str ?? "")
          .filter(Boolean)
          .join(" ")
          .trim();

        if (pageText.length > 0) {
          chunks.push(pageText);
        }
      } catch (pageError) {
        console.warn("pdf page extraction warning", { pageNumber, pageError });
      }
    }
  } finally {
    try {
      if (pdfDocument) {
        await pdfDocument.destroy();
      } else {
        await loadingTask.destroy();
      }
    } catch {
      // No-op: cleanup best effort.
    }
  }

  return chunks.join("\n\n").trim();
}

async function parsePdfTextWithRetry(data: Uint8Array, attempts = 2) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const text = await parsePdfText(data);
      if (text.length > 0) {
        return text;
      }

      throw new Error("Empty text extracted from PDF");
    } catch (error) {
      lastError = error;
      console.error("pdf parse attempt failed", { attempt, error });

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  throw lastError;
}

async function callExtractionModel(documentText: string, baseDate: string | null) {
  const env = getServerEnv();
  const openai = createOpenAIClient();
  const userPrompt = buildExtractionPrompt(documentText, baseDate);

  let lastRaw = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Voce e um extrator de obrigacoes e prazos. Retorne somente JSON valido e nunca invente itens sem evidencia."
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content ?? "";
    lastRaw = content;

    try {
      const json = JSON.parse(cleanJson(content));
      const parsed = ExtractionPayloadSchema.parse(json);
      return {
        raw: content,
        parsed
      };
    } catch (error) {
      console.error("extract parse error", { attempt, error });
      if (attempt === 1) {
        throw new Error("LLM retornou JSON invalido apos retry");
      }
    }
  }

  throw new Error(`Falha na extracao. Raw: ${lastRaw.slice(0, 1000)}`);
}

export async function POST(request: Request) {
  try {
    const env = getServerEnv();
    const supabase = await createServerSupabaseClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const baseDateRaw = String(formData.get("base_date") ?? "").trim();
    const pastedTextRaw = String(formData.get("pasted_text") ?? "").trim();
    const file = formData.get("file");

    const validatedInput = inputSchema.parse({
      title,
      baseDate: baseDateRaw || null,
      pastedText: pastedTextRaw || null
    });

    const baseDate = validatedInput.baseDate;

    let sourceType: "pdf" | "pasted" = "pasted";
    let storagePath: string | null = null;
    let docText = validatedInput.pastedText ?? "";
    let parsedPdfText = "";

    if (file instanceof File && file.size > 0) {
      sourceType = "pdf";

      const pdfBytes = new Uint8Array(await file.arrayBuffer());

      try {
        parsedPdfText = await parsePdfTextWithRetry(pdfBytes, 2);
      } catch (parseError) {
        console.error("pdf parse error", parseError);
      }

      if (hasSufficientText(parsedPdfText)) {
        docText = parsedPdfText;
      } else if (!validatedInput.pastedText) {
        const extractedChars = parsedPdfText.trim().length;
        return NextResponse.json(
          {
            error: "PDF sem texto util. Use fallback de texto.",
            needsTextFallback: true,
            extractedChars
          },
          { status: 422 }
        );
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, new Blob([pdfBytes], { type: file.type || "application/pdf" }), {
          cacheControl: "3600",
          contentType: file.type || "application/pdf",
          upsert: false
        });

      if (uploadError) {
        console.error("storage upload error", uploadError);
        return NextResponse.json({ error: "Falha no upload do PDF" }, { status: 500 });
      }
    }

    if (!docText || docText.length < 80) {
      return NextResponse.json(
        {
          error: "Texto insuficiente para extracao. Envie PDF nativo ou cole texto completo."
        },
        { status: 422 }
      );
    }

    const totalInputChars = docText.length;
    const maxInputChars = env.OPENAI_MAX_INPUT_CHARS;
    const boundedText = docText.slice(0, maxInputChars);
    const wasTruncated = totalInputChars > maxInputChars;

    console.info("extract_input_stats", {
      totalInputChars,
      sentInputChars: boundedText.length,
      maxInputChars,
      wasTruncated
    });

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        title: validatedInput.title,
        source_type: sourceType,
        storage_path: storagePath,
        base_date: baseDate
      })
      .select("id")
      .single();

    if (documentError || !document) {
      console.error("documents insert error", documentError);
      return NextResponse.json({ error: "Falha ao salvar documento" }, { status: 500 });
    }

    const extraction = await callExtractionModel(boundedText, baseDate);

    const normalizedItems = normalizeItems(extraction.parsed.items, baseDate);

    const hasRelativeWithoutBase = normalizedItems.some(
      (item) => item.due_date_raw && !item.due_date && item.confidence === "uncertain"
    );

    const { error: rawError } = await supabase.from("raw_extractions").upsert(
      {
        document_id: document.id,
        payload: {
          raw_response: extraction.raw,
          normalized_items: normalizedItems,
          base_date: baseDate,
          fallback_text_used: Boolean(validatedInput.pastedText),
          pdf_text_sufficient: hasSufficientText(parsedPdfText),
          total_input_chars: totalInputChars,
          sent_input_chars: boundedText.length,
          max_input_chars: maxInputChars,
          was_truncated: wasTruncated
        }
      },
      { onConflict: "document_id" }
    );

    if (rawError) {
      console.error("raw_extractions upsert error", rawError);
    }

    const rows = normalizedItems.map((item) => ({
      document_id: document.id,
      type: item.type,
      title: item.title,
      description: item.description,
      due_date: item.due_date,
      due_date_raw: item.due_date_raw,
      conditional: item.conditional,
      dependencies: item.dependencies,
      evidence_snippet: item.evidence_snippet,
      evidence_ref: item.evidence_ref,
      confidence: item.confidence
    }));

    const { error: itemsError } = await supabase.from("extracted_items").insert(rows);

    if (itemsError) {
      console.error("extracted_items insert error", itemsError);
      return NextResponse.json({ error: "Falha ao salvar itens extraidos" }, { status: 500 });
    }

    return NextResponse.json({
      documentId: document.id,
      itemsCount: rows.length,
      hasRelativeWithoutBase,
      inputStats: {
        totalInputChars,
        sentInputChars: boundedText.length,
        maxInputChars,
        wasTruncated
      }
    });
  } catch (error) {
    console.error("/api/extract error", error);
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
