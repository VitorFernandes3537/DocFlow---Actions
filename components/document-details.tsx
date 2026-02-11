"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, FileDown, FileText, Map } from "lucide-react";
import type { ItemStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { ChecklistItemCard } from "@/components/document/checklist-item-card";
import { getItemLabel } from "@/components/ui/icon-map";

type ItemRow = {
  id: string;
  type: "task" | "deadline" | "required_doc" | "warning";
  title: string;
  description: string;
  due_date: string | null;
  due_date_raw: string | null;
  conditional: boolean;
  dependencies: string[];
  evidence_snippet: string;
  evidence_ref: string | null;
  confidence: "high" | "medium" | "low" | "uncertain";
  status: ItemStatus;
};

type Props = {
  documentId: string;
  items: ItemRow[];
};

export function DocumentDetails({ documentId, items }: Props) {
  const [rows, setRows] = useState(items);
  const [activeItemId, setActiveItemId] = useState<string | null>(items[0]?.id ?? null);
  const [openChecklistItemId, setOpenChecklistItemId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeItem = useMemo(
    () => rows.find((item) => item.id === activeItemId) ?? rows[0] ?? null,
    [activeItemId, rows]
  );

  const doneCount = useMemo(() => rows.filter((item) => item.status === "done").length, [rows]);
  const pendingCount = rows.length - doneCount;

  async function toggleStatus(id: string, current: ItemStatus) {
    const nextStatus: ItemStatus = current === "done" ? "pending" : "done";
    setSavingId(id);

    try {
      const response = await fetch(`/api/items/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        throw new Error("Nao foi possivel salvar o status");
      }

      setRows((previous) =>
        previous.map((row) =>
          row.id === id
            ? {
                ...row,
                status: nextStatus
              }
            : row
        )
      );
    } catch (error) {
      console.error(error);
      alert("Falha ao atualizar status.");
    } finally {
      setSavingId(null);
    }
  }

  function toggleChecklistAccordion(id: string) {
    setActiveItemId(id);
    setOpenChecklistItemId((previous) => (previous === id ? null : id));
  }

  return (
    <div className="document-layout">
      <aside className="checklist-sidebar">
        <Card>
          <CardTitle>Resumo de execucao</CardTitle>
          <CardSubtitle>Status da trilha de tarefas deste documento.</CardSubtitle>
          <div className="row" style={{ marginTop: 10 }}>
            <Badge tone="ok">
              <Check size={12} />
              {doneCount} concluidos
            </Badge>
            <Badge tone="info">
              <AlertTriangle size={12} />
              {pendingCount} pendentes
            </Badge>
          </div>
        </Card>

        <Card className="checklist-card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <CardTitle>Checklist</CardTitle>
            <Badge tone="info">{rows.length}</Badge>
          </div>
          <CardSubtitle>
            Toque no card para expandir e visualizar os detalhes.
          </CardSubtitle>

          <div className="checklist-scroll">
            <div className="checklist-list">
              {rows.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  open={openChecklistItemId === item.id}
                  active={activeItem?.id === item.id}
                  saving={savingId === item.id}
                  onToggleOpen={toggleChecklistAccordion}
                  onToggleStatus={toggleStatus}
                />
              ))}
            </div>
          </div>
        </Card>
      </aside>

      <section className="document-main">
        <Card>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <CardTitle>Painel de analise</CardTitle>
              <CardSubtitle>Abra a timeline, veja documentos exigidos e exporte os prazos em ICS.</CardSubtitle>
            </div>
            <div className="row">
              <Link
                href={`/document/${documentId}/timeline`}
                className="df-button df-button-primary df-button-sm"
              >
                <Map size={14} />
                Abrir timeline
              </Link>
              <Link
                href={`/document/${documentId}/required-docs`}
                className="df-button df-button-secondary df-button-sm"
              >
                <FileText size={14} />
                Ver documentos exigidos
              </Link>
              <a
                href={`/api/export?documentId=${documentId}&format=ics`}
                className="df-button df-button-secondary df-button-sm"
              >
                <FileDown size={14} />
                Exportar ICS
              </a>
            </div>
          </div>
        </Card>

        {activeItem ? (
          <Card className="evidence-card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <CardTitle>{activeItem.title}</CardTitle>
                <CardSubtitle>{activeItem.description || "Sem resumo adicional."}</CardSubtitle>
              </div>
              <div className="row">
                <Badge tone="info">{getItemLabel(activeItem.type)}</Badge>
                {activeItem.conditional ? (
                  <Tooltip content="Condicional significa que o item depende de clausula como se, caso, desde que ou conforme.">
                    <Badge tone="warn">Condicional</Badge>
                  </Tooltip>
                ) : null}
              </div>
            </div>

            <div className="pdf-shell">
              <div className="pdf-toolbar">
                <span className="pdf-dot pdf-dot-red" />
                <span className="pdf-dot pdf-dot-yellow" />
                <span className="pdf-dot pdf-dot-green" />
              </div>
              <div className="pdf-page">
                <strong>Trecho localizado no PDF</strong>
                <pre className="pdf-highlight snippet">{activeItem.evidence_snippet}</pre>
              </div>
            </div>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="small row">
                <Clock size={13} />
                {activeItem.due_date ? `Prazo calculado: ${activeItem.due_date}` : "Sem prazo calculado"}
              </span>
              <Dropdown label="Detalhes extras">
                <div className="grid" style={{ gap: 6 }}>
                  <span className="small">Referencia: {activeItem.evidence_ref ?? "n/a"}</span>
                  <span className="small">Confianca: {activeItem.confidence}</span>
                  {activeItem.dependencies.length > 0 ? (
                    <span className="small">Dependencias: {activeItem.dependencies.join(" | ")}</span>
                  ) : null}
                </div>
              </Dropdown>
            </div>
          </Card>
        ) : null}

      </section>
    </div>
  );
}
