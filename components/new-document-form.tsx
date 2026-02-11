"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  CalendarClock,
  DatabaseZap,
  FileSearch,
  FileUp,
  LoaderCircle,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Stage = {
  limit: number;
  label: string;
  detail: string;
  Icon: typeof FileUp;
};

const STAGES: Stage[] = [
  {
    limit: 24,
    label: "Upload e preparo",
    detail: "Enviando arquivo e preparando entrada.",
    Icon: FileUp
  },
  {
    limit: 49,
    label: "Leitura do documento",
    detail: "Extraindo texto útil do PDF.",
    Icon: FileSearch
  },
  {
    limit: 84,
    label: "Extração estruturada",
    detail: "Modelo gerando checklist, prazos e evidências.",
    Icon: BrainCircuit
  },
  {
    limit: 99,
    label: "Persistência",
    detail: "Validando schema e salvando no banco.",
    Icon: DatabaseZap
  },
  {
    limit: 100,
    label: "Finalização",
    detail: "Abrindo documento processado.",
    Icon: LoaderCircle
  }
];

const MIN_ESTIMATE_SECONDS = 60;
const MAX_ESTIMATE_SECONDS = 120;

function estimateDurationSeconds(formData: FormData) {
  const file = formData.get("file");
  const pastedText = String(formData.get("pasted_text") ?? "").trim();

  const fileWeight = file instanceof File ? file.size / (1024 * 1024) : 0;
  const textWeight = pastedText.length / 8000;

  const estimate = Math.round(62 + fileWeight * 12 + textWeight * 7);
  return Math.min(MAX_ESTIMATE_SECONDS, Math.max(MIN_ESTIMATE_SECONDS, estimate));
}

function getStageByProgress(progress: number) {
  return STAGES.find((stage) => progress <= stage.limit) ?? STAGES[STAGES.length - 1];
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${String(restSeconds).padStart(2, "0")}`;
}

export function NewDocumentForm() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const testDocsDriveUrl = process.env.NEXT_PUBLIC_TEST_DOCS_DRIVE_URL?.trim();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const activeStage = getStageByProgress(progress);
  const ActiveIcon = activeStage.Icon;

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startProgressTicker(estimate: number) {
    stopTimer();

    const startedAt = Date.now();
    setElapsedSeconds(0);
    setProgress(5);

    timerRef.current = setInterval(() => {
      const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setElapsedSeconds(elapsed);

      const completion = Math.min(0.96, elapsed / estimate);
      const target = Math.min(96, Math.round(6 + completion * 90));

      setProgress((previous) => {
        if (previous >= target) {
          return previous;
        }
        return Math.min(target, previous + 2);
      });
    }, 350);
  }

  useEffect(() => {
    return () => stopTimer();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const estimate = estimateDurationSeconds(formData);

    setLoading(true);
    startProgressTicker(estimate);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload?.needsTextFallback) {
          setError("PDF com texto insuficiente. Cole o texto completo no campo de fallback.");
          return;
        }
        throw new Error(payload?.error ?? "Falha ao processar documento");
      }

      setProgress(100);
      stopTimer();
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push(`/document/${payload.documentId}`);
    } catch (submitError) {
      console.error(submitError);
      setError("Não foi possí­vel gerar o plano. Tente novamente.");
    } finally {
      stopTimer();
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid">
      {loading ? (
        <Card className="processing-card">
          <div className="processing-header">
            <div className="processing-icon-wrap">
              <ActiveIcon size={20} className="processing-icon-spin" />
            </div>
            <div>
              <strong>{activeStage.label}</strong>
              <p className="small">{activeStage.detail}</p>
            </div>
          </div>

          <div className="processing-bar">
            <div
              className="processing-bar-value"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>

          <div className="row processing-meta">
            <span>{progress}%</span>
            <span className="row small">
              <Timer size={14} />
              {formatElapsed(elapsedSeconds)} / ~1-2 min
            </span>
          </div>
        </Card>
      ) : null}

      <Card>
        <label htmlFor="title">Tí­tulo do documento</label>
        <input
          id="title"
          name="title"
          required
          placeholder="Ex: Edital Processo Seletivo"
          disabled={loading}
        />
      </Card>

      <Card className="grid">
        <div>
          <label htmlFor="file">Upload PDF (nativo)</label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf"
            className="df-file-input"
            disabled={loading}
          />
          {testDocsDriveUrl ? (
            <p className="small row" style={{ marginTop: 8 }}>
              <a
                href={testDocsDriveUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="df-button df-button-secondary df-button-sm"
              >
                Documentos de teste
              </a>
              Abra a pasta no Drive, baixe 1 PDF e envie aqui.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="pasted_text">Fallback: colar texto</label>
          <textarea
            id="pasted_text"
            name="pasted_text"
            placeholder="Cole aqui quando o PDF estiver escaneado ou sem texto útil"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="base_date">Data base (opcional)</label>
          <input id="base_date" name="base_date" type="date" disabled={loading} />
          <p className="small row">
            <CalendarClock size={14} />
            Fallback opcional quando o documento tiver prazo relativo sem data de referencia explicita.
          </p>
        </div>
      </Card>

      {error ? <div className="df-badge df-badge-uncertain">{error}</div> : null}

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Button className="df-generate-plan-button" disabled={loading} type="submit">
          {loading ? "Processando..." : "Gerar plano"}
        </Button>
      </div>
    </form>
  );
}
