"use client";

import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible } from "@/components/ui/collapsible";
import { getItemIcon, getItemLabel } from "@/components/ui/icon-map";
import type { ItemStatus } from "@/lib/types";

type ChecklistItem = {
  id: string;
  type: "task" | "deadline" | "required_doc" | "warning";
  title: string;
  description: string;
  due_date: string | null;
  confidence: "high" | "medium" | "low" | "uncertain";
  status: ItemStatus;
};

type ChecklistItemCardProps = {
  item: ChecklistItem;
  open: boolean;
  active: boolean;
  saving: boolean;
  onToggleOpen: (id: string) => void;
  onToggleStatus: (id: string, status: ItemStatus) => void;
};

function getConfidenceTone(confidence: ChecklistItem["confidence"]) {
  if (confidence === "uncertain") {
    return "uncertain";
  }
  if (confidence === "low") {
    return "warn";
  }
  return "ok";
}

export function ChecklistItemCard({
  item,
  open,
  active,
  saving,
  onToggleOpen,
  onToggleStatus
}: ChecklistItemCardProps) {
  const Icon = getItemIcon(item.type);

  return (
    <div
      className={`checklist-item ${active ? "checklist-item-active" : ""} ${
        open ? "checklist-item-open" : ""
      }`}
    >
      <Collapsible
        open={open}
        onOpenChange={() => onToggleOpen(item.id)}
        triggerClassName="checklist-trigger"
        trigger={
          <>
            <div className="checklist-trigger-top">
              <span className="checklist-item-icon">
                <Icon size={15} />
                {getItemLabel(item.type)}
              </span>
              <div className="checklist-trigger-meta">
                <Badge tone={getConfidenceTone(item.confidence)}>{item.confidence}</Badge>
                <ChevronDown
                  size={16}
                  className={`checklist-chevron ${open ? "checklist-chevron-open" : ""}`}
                />
              </div>
            </div>
            <h4 className="checklist-title">{item.title}</h4>
          </>
        }
      >
        <p>{item.description || "Sem descricao detalhada."}</p>
        <div className="row checklist-footer-row">
          {item.due_date ? (
            <span className="small">{item.due_date}</span>
          ) : (
            <span className="small">Sem prazo absoluto</span>
          )}
          <Button
            size="sm"
            variant={item.status === "done" ? "secondary" : "soft"}
            disabled={saving}
            onClick={(event) => {
              event.stopPropagation();
              onToggleStatus(item.id, item.status);
            }}
          >
            {item.status === "done" ? "Concluido" : "Concluir"}
          </Button>
        </div>
      </Collapsible>
    </div>
  );
}
