"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

type TimelineRow = {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  due_date_raw: string | null;
  confidence: "high" | "medium" | "low" | "uncertain";
  conditional: boolean;
  evidence_snippet: string;
};

type TimelineViewProps = {
  items: TimelineRow[];
};

function getConfidenceTone(confidence: TimelineRow["confidence"]) {
  if (confidence === "uncertain") {
    return "uncertain";
  }
  if (confidence === "low") {
    return "warn";
  }
  return "ok";
}

function splitActionSteps(description: string) {
  const parts = description
    .split(/\n|\u2022|;|\|/g)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 5);
}

export function TimelineView({ items }: TimelineViewProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (items.length > 0 && !activeId) {
      setActiveId(items[0].id);
    }
  }, [activeId, items]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => {
      setIsMobileView(query.matches);
    };

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const root = listRef.current;
    if (!root || isMobileView) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
          return;
        }

        const id = visible.target.getAttribute("data-timeline-id");
        if (id) {
          setActiveId(id);
        }
      },
      {
        root,
        rootMargin: "-15% 0px -42% 0px",
        threshold: [0.36, 0.6]
      }
    );

    const nodes = root.querySelectorAll<HTMLElement>("[data-timeline-id]");
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [isMobileView, items]);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [activeId, items]
  );

  const activeIndex = useMemo(
    () => items.findIndex((item) => item.id === activeItem?.id),
    [activeItem?.id, items]
  );

  const progress = items.length > 1 && activeIndex >= 0 ? (activeIndex / (items.length - 1)) * 100 : 0;

  function selectItem(id: string, openDetail = false) {
    const target = listRef.current?.querySelector<HTMLElement>(`[data-timeline-id="${id}"]`);
    if (target && !isMobileView) {
      target.scrollIntoView({
        block: "center",
        behavior: "smooth"
      });
    }
    setActiveId(id);
    if (openDetail && isMobileView) {
      setMobileDetailOpen(true);
    }
  }

  if (items.length === 0) {
    return <p className="small">Nenhum prazo absoluto encontrado neste documento.</p>;
  }

  return (
    <div className="df-timeline-page-layout">
      <div className="df-timeline-page-list" ref={listRef}>
        <div className="df-timeline-page-line" />
        <div className="df-timeline-page-progress" style={{ height: `${progress}%` }} />
        {items.map((item, index) => (
          <article
            key={item.id}
            data-timeline-id={item.id}
            className={cn("df-timeline-page-node", item.id === activeItem?.id && "df-timeline-page-node-active")}
          >
            <button
              type="button"
              className="df-timeline-page-dot"
              onClick={() => selectItem(item.id, true)}
              aria-label={`Ir para etapa ${index + 1}`}
            />
            <button
              type="button"
              className="df-timeline-page-card"
              onClick={() => selectItem(item.id, true)}
            >
              <span className="timeline-date">{item.due_date}</span>
              <strong>{item.title}</strong>
              <p className="small">{item.description || "Sem detalhe adicional."}</p>
              <span className="small">Etapa {index + 1}</span>
            </button>
          </article>
        ))}
      </div>

      {!isMobileView ? (
        <aside className="df-timeline-page-detail">
          <span className="small">Execucao dinamica</span>
          <h2>{activeItem?.title}</h2>
          <p>{activeItem?.description || "Sem descricao adicional."}</p>
          <div className="row">
            {activeItem?.due_date ? (
              <Badge tone="info">
                <CalendarClock size={12} />
                {activeItem.due_date}
              </Badge>
            ) : null}
            {activeItem ? (
              <Badge tone={getConfidenceTone(activeItem.confidence)}>{activeItem.confidence}</Badge>
            ) : null}
            {activeItem?.conditional ? (
              <Tooltip content="Este ponto depende de uma condicao no edital.">
                <Badge tone="warn">Condicional</Badge>
              </Tooltip>
            ) : null}
          </div>
          {activeItem?.due_date_raw && activeItem.due_date_raw !== activeItem.due_date ? (
            <p className="small">Regra original: {activeItem.due_date_raw}</p>
          ) : null}

          <div className="df-timeline-actions-box">
            <strong className="row" style={{ gap: 6 }}>
              <ListChecks size={16} />
              O que fazer agora
            </strong>
            <ul>
              {splitActionSteps(activeItem?.description ?? "").map((step, index) => (
                <li key={`${activeItem?.id}-step-${index}`}>{step}</li>
              ))}
            </ul>
          </div>

          <div className="df-timeline-evidence-box">
            <span className="small">Evidencia</span>
            <pre className="snippet">{activeItem?.evidence_snippet}</pre>
          </div>
        </aside>
      ) : null}

      <Modal
        open={isMobileView && mobileDetailOpen && Boolean(activeItem)}
        onOpenChange={setMobileDetailOpen}
        title={activeItem?.title ?? "Detalhes da etapa"}
      >
        {activeItem ? (
          <div className="df-timeline-mobile-modal">
            <p>{activeItem.description || "Sem descricao adicional."}</p>
            <div className="row">
              {activeItem.due_date ? (
                <Badge tone="info">
                  <CalendarClock size={12} />
                  {activeItem.due_date}
                </Badge>
              ) : null}
              <Badge tone={getConfidenceTone(activeItem.confidence)}>{activeItem.confidence}</Badge>
              {activeItem.conditional ? (
                <Tooltip content="Este ponto depende de uma condicao no edital.">
                  <Badge tone="warn">Condicional</Badge>
                </Tooltip>
              ) : null}
            </div>
            {activeItem.due_date_raw && activeItem.due_date_raw !== activeItem.due_date ? (
              <p className="small">Regra original: {activeItem.due_date_raw}</p>
            ) : null}
            <div className="df-timeline-actions-box">
              <strong className="row" style={{ gap: 6 }}>
                <ListChecks size={16} />
                O que fazer agora
              </strong>
              <ul>
                {splitActionSteps(activeItem.description).map((step, index) => (
                  <li key={`${activeItem.id}-modal-step-${index}`}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="df-timeline-evidence-box">
              <span className="small">Evidencia</span>
              <pre className="snippet">{activeItem.evidence_snippet}</pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
